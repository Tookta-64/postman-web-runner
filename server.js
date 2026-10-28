const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const axios = require('axios');
const https = require('https');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'public')));

// Bypass SSL Certificate Validation
const httpsAgent = new https.Agent({  
  rejectUnauthorized: false
});

// ตารางการตั้งค่า Environment Mapping
const ENV_CONFIG = {
  SIT: {
    APIM: { Name: "APIM Cloud (SIT)", Domain: "sit-digital-service-bus.cdc.ais.th", IP: "104.43.101.213" },
    PREM: { Name: "API7 Prem (SIT)", Domain: "sit-esb.ais.th", IP: "110.49.140.84" },
    ALLOY: { Name: "Cloud Alloy (SIT)", Domain: "sit-esb-al.ais.th", IP: "134.185.172.55" }
  },
  UAT: {
    APIM: { Name: "APIM Cloud (UAT)", Domain: "uat-digital-service-bus.cdc.ais.th", IP: "104.43.101.213" },
    PREM: { Name: "API7 Prem (UAT)", Domain: "uat-esb.ais.th", IP: "110.49.140.83" },
    ALLOY: { Name: "Cloud Alloy (UAT)", Domain: "uat-esb-al.ais.th", IP: "134.185.162.61" }
  },
  PRODUCTION: {
    APIM: { Name: "APIM Cloud (PRD)", Domain: "digital-service-bus.cloud.ais.th", IP: "20.247.199.19" },
    PREM_SILA: { Name: "API7 SILA (PRD)", Domain: "esb.ais.th", IP: "110.49.132.212" },
    PREM_TLS: { Name: "API7 TLS (PRD)", Domain: "esb.ais.th", IP: "110.49.128.250" },
    ALLOY_DC: { Name: "Cloud Alloy DC (PRD)", Domain: "esb-al.ais.th", IP: "134.185.170.151" },
    ALLOY_DR: { Name: "Cloud Alloy DR (PRD)", Domain: "esb-al.ais.th", IP: "168.107.143.216" }
  }
};

app.post('/api/validate-collection', (req, res) => {
  if (!req.files || !req.files.collection) {
    return res.status(400).json({ success: false, message: "กรุณาแนบไฟล์ Collection" });
  }

  try {
    const file = req.files.collection;
    const jsonContent = JSON.parse(file.data.toString('utf8'));

    if (!jsonContent.item || !Array.isArray(jsonContent.item)) {
      return res.json({ success: false, message: "ไฟล์ Collection รูปแบบ JSON ไม่ถูกต้อง" });
    }

    const folderStructure = [];

    // Helper ดึงค่า Parameter จาก Postman Body
    function extractBodyParam(body, keyName) {
      if (!body) return "";
      if (body.mode === 'urlencoded' && Array.isArray(body.urlencoded)) {
        const found = body.urlencoded.find(p => p.key === keyName);
        return found ? found.value : "";
      }
      if (body.mode === 'formdata' && Array.isArray(body.formdata)) {
        const found = body.formdata.find(p => p.key === keyName);
        return found ? found.value : "";
      }
      if (body.mode === 'raw' && body.raw) {
        const match = body.raw.match(new RegExp(`"${keyName}"\\s*:\\s*"([^"]+)"`));
        return match ? match[1] : "";
      }
      return "";
    }

    // Helper สกัดรายการ Requests และดึง Credentials
    function processFolderItems(items) {
      let requests = [];
      let extractedClientId = "";
      let extractedClientSecret = "";
      let extractedApiKey = "";

      function traverse(itemList) {
        for (const item of itemList) {
          if (item.item) {
            traverse(item.item);
          } else if (item.request) {
            let rawUrl = "";
            if (typeof item.request === 'string') {
              rawUrl = item.request;
            } else if (item.request.url) {
              if (typeof item.request.url === 'string') {
                rawUrl = item.request.url;
              } else if (item.request.url.raw) {
                rawUrl = item.request.url.raw;
              } else if (Array.isArray(item.request.url.path)) {
                rawUrl = "/" + item.request.url.path.join("/");
              }
            }

            let pathUri = rawUrl;
            const match = rawUrl.match(/https?:\/\/[^\/]+(?<pathQuery>\/.*)/);
            if (match && match.groups && match.groups.pathQuery) {
              pathUri = match.groups.pathQuery;
            }
            pathUri = pathUri.replace(/\{\{[^}]+\}\}/g, '1');
            if (!pathUri.startsWith('/')) pathUri = '/' + pathUri;

            // ดึง client_id และ client_secret จาก /auth/v3.2/oauth/token
            if (pathUri.includes('/auth/v3.2/oauth/token')) {
              if (item.request.body) {
                const cId = extractBodyParam(item.request.body, 'client_id');
                const cSec = extractBodyParam(item.request.body, 'client_secret');
                if (cId) extractedClientId = cId;
                if (cSec) extractedClientSecret = cSec;
              }
              continue; // กรองออก ไม่นำเข้า List Test
            }

            // ดึง x-api-key จาก Header ใน Request
            if (item.request.header && Array.isArray(item.request.header)) {
              const apiKeyHeader = item.request.header.find(h => h.key && h.key.toLowerCase() === 'x-api-key');
              if (apiKeyHeader && apiKeyHeader.value) {
                extractedApiKey = apiKeyHeader.value;
              }
            }

            requests.push({
              id: item.id || Math.random().toString(36).substr(2, 9),
              name: item.name,
              method: (item.request.method || 'GET').toUpperCase(),
              pathUri: pathUri,
              rawItem: {
                name: item.name,
                request: item.request
              }
            });
          }
        }
      }

      traverse(items);
      return { requests, extractedClientId, extractedClientSecret, extractedApiKey };
    }

    for (const topItem of jsonContent.item) {
      if (topItem.item) {
        const { requests, extractedClientId, extractedClientSecret, extractedApiKey } = processFolderItems(topItem.item);
        if (requests.length > 0) {
          folderStructure.push({
            folderName: topItem.name,
            clientId: extractedClientId,
            clientSecret: extractedClientSecret,
            apiKey: extractedApiKey,
            requests: requests
          });
        }
      } else if (topItem.request) {
        const { requests, extractedClientId, extractedClientSecret, extractedApiKey } = processFolderItems([topItem]);
        if (requests.length > 0) {
          folderStructure.push({
            folderName: "Root Requests",
            clientId: extractedClientId,
            clientSecret: extractedClientSecret,
            apiKey: extractedApiKey,
            requests: requests
          });
        }
      }
    }

    return res.json({
      success: true,
      data: folderStructure
    });

  } catch (err) {
    return res.json({ success: false, message: "เกิดข้อผิดพลาดในการอ่านไฟล์ Collection" });
  }
});

// Helper Function สำหรับ Request Token (เฉพาะ OAuth 2.0 ผ่าน /auth/v3.2/oauth/token)
async function fetchToken(envName, location, clientId, clientSecret) {
  const envGroup = ENV_CONFIG[envName];
  let targetConfig = null;

  if (location === 'On-Cloud') {
    targetConfig = envGroup.APIM;
  } else if (location === 'Cloud Alloy') {
    targetConfig = (envName === 'PRODUCTION') ? envGroup.ALLOY_DC : envGroup.ALLOY;
  } else {
    targetConfig = (envName === 'PRODUCTION') ? envGroup.PREM_SILA : envGroup.PREM;
  }

  try {
    const tokenUrl = `https://${targetConfig.Domain}/auth/v3.2/oauth/token`;
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const response = await axios.post(tokenUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      httpsAgent: httpsAgent,
      timeout: 10000
    });

    if (response.data && response.data.access_token) {
      return response.data.access_token;
    }
  } catch (error) {
    console.error(`Token Fetch Error (${location}):`, error.message);
  }
  return null;
}

// API รัน Test
app.post('/api/run-test', async (req, res) => {
  const { env, folderConfigs } = req.body;

  const results = [];
  let itemNo = 0;
  let successCount = 0;
  let errorCount = 0;

  // 1. จัดการ Authentication ตามประเภท (OAuth2.0 หรือ API Key)
  for (const fConfig of folderConfigs) {
    const authType = fConfig.authType || 'OAUTH';

    if (authType === 'OAUTH') {
      const token = await fetchToken(env, fConfig.tokenLocation, fConfig.clientId, fConfig.clientSecret);
      if (!token) {
        return res.json({
          success: false,
          errorFolder: fConfig.folderName,
          message: `ไม่สามารถ Get Token ของโฟลเดอร์ "${fConfig.folderName}" ได้ กรุณาตรวจสอบ Client ID / Client Secret`
        });
      }
      fConfig.token = token;
    } else if (authType === 'API_KEY') {
      if (!fConfig.apiKey) {
        return res.json({
          success: false,
          errorFolder: fConfig.folderName,
          message: `กรุณากรอก API Key ของโฟลเดอร์ "${fConfig.folderName}"`
        });
      }
    }
  }

  // 2. เรียกใช้งาน API ตามแต่ละ Request
  for (const fConfig of folderConfigs) {
    const authType = fConfig.authType || 'OAUTH';

    for (const reqItem of fConfig.requests) {
      itemNo++;
      const pathUri = reqItem.pathUri;
      const apiLocation = reqItem.apiLocation;
      
      const envGroup = ENV_CONFIG[env];
      let targetConfigs = [];

      if (apiLocation === 'On-Cloud') {
        targetConfigs.push(envGroup.APIM);
      } else if (apiLocation === 'Cloud Alloy') {
        if (env === 'PRODUCTION') {
          targetConfigs.push({ ...envGroup.ALLOY_DC, labelName: ' (DC)' });
          targetConfigs.push({ ...envGroup.ALLOY_DR, labelName: ' (DR)' });
        } else {
          targetConfigs.push(envGroup.ALLOY);
        }
      } else {
        if (env === 'PRODUCTION') {
          targetConfigs.push({ ...envGroup.PREM_SILA, labelName: ' (SILA)' });
          targetConfigs.push({ ...envGroup.PREM_TLS, labelName: ' (TLS)' });
        } else {
          targetConfigs.push(envGroup.PREM);
        }
      }

      for (const targetConfig of targetConfigs) {
        const fullUrl = `https://${targetConfig.Domain}${pathUri}`;
        const method = reqItem.method || 'GET';
        const rawReq = reqItem.rawItem ? reqItem.rawItem.request : {};
        
        let headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0'
        };

        if (authType === 'OAUTH') {
          headers['Authorization'] = `Bearer ${fConfig.token}`;
        } else if (authType === 'API_KEY') {
          headers['x-api-key'] = fConfig.apiKey;
        }

        if (rawReq.header && Array.isArray(rawReq.header)) {
          rawReq.header.forEach(h => {
            if (!h.disabled && h.key && h.value && h.key !== 'Host' && h.key !== 'Authorization' && h.key !== 'x-api-key') {
              headers[h.key] = h.value;
            }
          });
        }

        let dataBody = null;
        if (rawReq.body && rawReq.body.mode === 'raw' && rawReq.body.raw) {
          dataBody = rawReq.body.raw;
          if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
        }

        let curlCmd = `curl '${fullUrl}' -X ${method}`;
        Object.keys(headers).forEach(k => { curlCmd += ` -H '${k}: ${headers[k]}'`; });
        if (dataBody) curlCmd += ` -d '${dataBody.replace(/[\r\n]+/g, '')}'`;

        let statusCode = "000";
        let responseMsg = "";

        try {
          const resp = await axios({
            method: method,
            url: fullUrl,
            headers: headers,
            data: dataBody,
            httpsAgent: httpsAgent,
            timeout: 15000
          });
          statusCode = resp.status.toString();
          responseMsg = typeof resp.data === 'object' ? JSON.stringify(resp.data) : String(resp.data);
          successCount++;
        } catch (err) {
          errorCount++;
          if (err.response) {
            statusCode = err.response.status.toString();
            responseMsg = typeof err.response.data === 'object' ? JSON.stringify(err.response.data) : String(err.response.data);
          } else {
            statusCode = "000";
            responseMsg = err.message || "Connection Failed";
          }
        }

        let pathPrefix = "";
        const m = pathUri.match(/^\/([^\/]+)/);
        if (m) pathPrefix = m[1].replace(/-px$/, "");
        const systemVal = pathPrefix ? `${fConfig.folderName} to ${pathPrefix}` : fConfig.folderName;

        results.push({
          no: itemNo,
          system: systemVal + (targetConfig.labelName || ''),
          locationGetToken: authType === 'OAUTH' ? fConfig.tokenLocation : 'API Key',
          locationApi: apiLocation + (targetConfig.labelName || ''),
          method: method,
          pathUri: pathUri,
          statusCode: statusCode,
          responseMsg: responseMsg,
          ip: targetConfig.IP,
          domain: targetConfig.Domain,
          curlCmd: curlCmd
        });
      }
    }
  }

  return res.json({
    success: true,
    summary: {
      total: itemNo,
      successCount: successCount,
      errorCount: errorCount
    },
    results: results
  });
});

app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});