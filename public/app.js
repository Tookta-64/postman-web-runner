let folderData = [];
let executionResults = [];
let confirmModal, summaryModal;

document.addEventListener('DOMContentLoaded', () => {
  confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
  summaryModal = new bootstrap.Modal(document.getElementById('summaryModal'));

  document.getElementById('fileInput').addEventListener('change', handleFileUpload);
  document.getElementById('btnSubmit').addEventListener('click', () => confirmModal.show());
  document.getElementById('btnGo').addEventListener('click', startExecution);
  document.getElementById('btnExportCsv').addEventListener('click', downloadCSV);
  document.getElementById('btnCloseSummary').addEventListener('click', confirmCloseSummary);

  document.addEventListener('change', validateForm);
  document.addEventListener('input', validateForm);
});

// อ่านไฟล์แล้วเรนเดอร์ลง UI
async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('collection', file);

  try {
    const res = await fetch('/api/validate-collection', { method: 'POST', body: formData });
    const data = await res.json();

    if (!data.success) {
      alert(data.message || "อ่านไฟล์ไม่สำเร็จ");
      e.target.value = '';
      document.getElementById('configSection').classList.add('d-none');
    } else {
      folderData = data.data;
      renderFolders(folderData);
      document.getElementById('configSection').classList.remove('d-none');
    }
  } catch (err) {
    console.error("Upload error:", err);
    alert("เกิดข้อผิดพลาดในการอ่านไฟล์ Collection");
    e.target.value = '';
  }
}

// Render UI รองรับ Auth Type Selection (OAuth 2.0 vs API Key)
function renderFolders(folders) {
  const container = document.getElementById('foldersContainer');
  container.innerHTML = '';

  folders.forEach((f, fIdx) => {
    let rowsHtml = f.requests.map((r, rIdx) => `
      <tr>
        <td class="text-center align-middle">${rIdx + 1}</td>
        <td class="align-middle text-break">${r.pathUri}</td>
        <td class="text-center align-middle"><span class="badge bg-secondary">${r.method}</span></td>
        <td class="text-center align-middle">
          <input class="form-check-input req-loc-${fIdx}" type="radio" name="reqLoc_${fIdx}_${rIdx}" value="On-Premise">
        </td>
        <td class="text-center align-middle">
          <input class="form-check-input req-loc-${fIdx}" type="radio" name="reqLoc_${fIdx}_${rIdx}" value="On-Cloud">
        </td>
        <td class="text-center align-middle">
          <input class="form-check-input req-loc-${fIdx}" type="radio" name="reqLoc_${fIdx}_${rIdx}" value="Cloud Alloy">
        </td>
      </tr>
    `).join('');

    container.innerHTML += `
      <!-- Header Folder Card -->
      <div class="card shadow-sm p-4 mb-3 border rounded-3 folder-card" data-fidx="${fIdx}">
        <h4 class="fw-bold mb-3">{${f.folderName}}</h4>
        
        <!-- Selection Auth Type (OAuth 2.0 Default) -->
        <div class="row g-3 mb-3 align-items-center">
          <div class="col-md-3">
            <label class="fw-bold form-label mb-0">Authentication Type:</label>
          </div>
          <div class="col-md-9 d-flex gap-4">
            <div class="form-check">
              <input class="form-check-input auth-type-radio" type="radio" name="authType_${fIdx}" id="authOAuth_${fIdx}" value="OAUTH" checked onchange="toggleAuthType(${fIdx})">
              <label class="form-check-label fw-bold" for="authOAuth_${fIdx}">OAuth 2.0</label>
            </div>
            <div class="form-check">
              <input class="form-check-input auth-type-radio" type="radio" name="authType_${fIdx}" id="authApiKey_${fIdx}" value="API_KEY" onchange="toggleAuthType(${fIdx})">
              <label class="form-check-label fw-bold" for="authApiKey_${fIdx}">API Key</label>
            </div>
          </div>
        </div>

        <!-- Inputs สำหรับ OAuth 2.0 -->
        <div class="row g-3 mb-3 bg-light p-2 rounded align-items-center" id="oauthSection_${fIdx}">
          <div class="col-md-6">
            <input type="text" class="form-control client-id" placeholder="Client ID">
          </div>
          <div class="col-md-6">
            <input type="password" class="form-control client-secret" placeholder="Client Secret">
          </div>
          <div class="col-12 mt-2">
            <div class="d-flex align-items-center gap-4">
              <span class="fw-bold">Get Token Location:</span>
              <div class="form-check">
                <input class="form-check-input token-loc" type="radio" name="tokenLoc_${fIdx}" id="tokenPrem_${fIdx}" value="On-Premise">
                <label class="form-check-label fw-bold" for="tokenPrem_${fIdx}">On-Premise</label>
              </div>
              <div class="form-check">
                <input class="form-check-input token-loc" type="radio" name="tokenLoc_${fIdx}" id="tokenCloud_${fIdx}" value="On-Cloud">
                <label class="form-check-label fw-bold" for="tokenCloud_${fIdx}">On-Cloud</label>
              </div>
              <div class="form-check">
                <input class="form-check-input token-loc" type="radio" name="tokenLoc_${fIdx}" id="tokenAlloy_${fIdx}" value="Cloud Alloy">
                <label class="form-check-label fw-bold" for="tokenAlloy_${fIdx}">Cloud Alloy</label>
              </div>
            </div>
          </div>
        </div>

        <!-- Input สำหรับ API Key (เริ่มต้นเป็น Disabled สีเทา) -->
        <div class="row g-3 mb-3 p-2 rounded" id="apiKeySection_${fIdx}">
          <div class="col-md-12">
            <input type="text" class="form-control api-key" placeholder="API Key" disabled style="background-color: #e9ecef;">
          </div>
        </div>
      </div>

      <!-- Table Request List Card -->
      <div class="card shadow-sm p-3 mb-4 border rounded-3">
        <div class="table-responsive">
          <table class="table table-bordered table-hover align-middle mb-0">
            <thead class="table-light text-center">
              <tr>
                <th style="width: 50px;">No</th>
                <th>Path</th>
                <th style="width: 100px;">Method</th>
                <th style="width: 130px;">
                  <div class="mb-1 text-muted small">Location<br>(select all)</div>
                  <div class="form-check d-inline-block">
                    <input class="form-check-input header-select-all" type="radio" name="headerSelectAll_${fIdx}" value="On-Premise" onchange="selectAllLocation(${fIdx}, 'On-Premise')">
                    <label class="form-check-label fw-bold">On-Premise</label>
                  </div>
                </th>
                <th style="width: 130px;">
                  <div class="mb-1 text-muted small">Location<br>(select all)</div>
                  <div class="form-check d-inline-block">
                    <input class="form-check-input header-select-all" type="radio" name="headerSelectAll_${fIdx}" value="On-Cloud" onchange="selectAllLocation(${fIdx}, 'On-Cloud')">
                    <label class="form-check-label fw-bold">On-Cloud</label>
                  </div>
                </th>
                <th style="width: 130px;">
                  <div class="mb-1 text-muted small">Location<br>(select all)</div>
                  <div class="form-check d-inline-block">
                    <input class="form-check-input header-select-all" type="radio" name="headerSelectAll_${fIdx}" value="Cloud Alloy" onchange="selectAllLocation(${fIdx}, 'Cloud Alloy')">
                    <label class="form-check-label fw-bold">Cloud Alloy</label>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  validateForm();
}

// ฟังก์ชัน Toggle สถานะการกรอกข้อมูลตามประเภท Auth
function toggleAuthType(fIdx) {
  const card = document.querySelector(`.folder-card[data-fidx="${fIdx}"]`);
  const authType = card.querySelector(`input[name="authType_${fIdx}"]:checked`).value;
  
  const clientId = card.querySelector('.client-id');
  const clientSecret = card.querySelector('.client-secret');
  const tokenLocs = card.querySelectorAll('.token-loc');
  const apiKey = card.querySelector('.api-key');

  if (authType === 'OAUTH') {
    // เลือก OAuth 2.0: เปิด OAuth inputs, ปิด API Key
    clientId.disabled = false;
    clientSecret.disabled = false;
    tokenLocs.forEach(radio => radio.disabled = false);

    apiKey.disabled = true;
    apiKey.value = '';
    apiKey.style.backgroundColor = '#e9ecef';
  } else {
    // เลือก API Key: ปิด OAuth inputs, เปิด API Key
    clientId.disabled = true;
    clientSecret.disabled = true;
    clientId.value = '';
    clientSecret.value = '';
    
    tokenLocs.forEach(radio => {
      radio.disabled = true;
      radio.checked = false;
    });

    apiKey.disabled = false;
    apiKey.style.backgroundColor = '#ffffff';
  }

  validateForm();
}

function selectAllLocation(fIdx, value) {
  const radios = document.querySelectorAll(`.req-loc-${fIdx}[value="${value}"]`);
  radios.forEach(r => {
    r.checked = true;
  });
  validateForm();
}

// Validation ฟอร์มรองรับทั้ง 2 แบบ
function validateForm() {
  const envSelected = document.querySelector('.env-radio:checked');
  if (!envSelected) {
    document.getElementById('btnSubmit').disabled = true;
    return;
  }

  let isAllValid = true;
  const folderCards = document.querySelectorAll('.folder-card');

  folderCards.forEach((card, fIdx) => {
    const authTypeRadio = card.querySelector(`.auth-type-radio:checked`);
    const authType = authTypeRadio ? authTypeRadio.value : 'OAUTH';

    if (authType === 'OAUTH') {
      const cId = card.querySelector('.client-id').value.trim();
      const cSec = card.querySelector('.client-secret').value.trim();
      const tokenLoc = card.querySelector(`.token-loc:checked`);
      if (!cId || !cSec || !tokenLoc) isAllValid = false;
    } else if (authType === 'API_KEY') {
      const apiKeyVal = card.querySelector('.api-key').value.trim();
      if (!apiKeyVal) isAllValid = false;
    }

    const reqCount = folderData[fIdx].requests.length;
    for (let rIdx = 0; rIdx < reqCount; rIdx++) {
      const reqLoc = document.querySelector(`input[name="reqLoc_${fIdx}_${rIdx}"]:checked`);
      if (!reqLoc) isAllValid = false;
    }
  });

  document.getElementById('btnSubmit').disabled = !isAllValid;
}

async function startExecution() {
  confirmModal.hide();

  const env = document.querySelector('.env-radio:checked').value;
  const folderCards = document.querySelectorAll('.folder-card');
  const folderConfigs = [];

  folderCards.forEach((card, fIdx) => {
    const authType = card.querySelector(`.auth-type-radio:checked`).value;
    const requests = [];

    folderData[fIdx].requests.forEach((r, rIdx) => {
      const apiLoc = document.querySelector(`input[name="reqLoc_${fIdx}_${rIdx}"]:checked`).value;
      requests.push({
        method: r.method,
        pathUri: r.pathUri,
        rawItem: r.rawItem,
        apiLocation: apiLoc
      });
    });

    const tokenLocElem = card.querySelector(`.token-loc:checked`);

    folderConfigs.push({
      folderName: folderData[fIdx].folderName,
      authType: authType,
      clientId: authType === 'OAUTH' ? card.querySelector('.client-id').value.trim() : '',
      clientSecret: authType === 'OAUTH' ? card.querySelector('.client-secret').value.trim() : '',
      tokenLocation: (authType === 'OAUTH' && tokenLocElem) ? tokenLocElem.value : '',
      apiKey: authType === 'API_KEY' ? card.querySelector('.api-key').value.trim() : '',
      requests: requests
    });
  });

  try {
    const res = await fetch('/api/run-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ env, folderConfigs })
    });
    const data = await res.json();

    if (!data.success) {
      alert(data.message);
    } else {
      executionResults = data.results;
      document.getElementById('sumTotal').innerText = data.summary.total;
      document.getElementById('sumSuccess').innerText = data.summary.successCount;
      document.getElementById('sumError').innerText = data.summary.errorCount;
      
      renderTerminalLogs(executionResults);
      summaryModal.show();
    }
  } catch (err) {
    alert("เกิดข้อผิดพลาดในการเชื่อมต่อโปรเซสทดสอบ");
  }
}

function renderTerminalLogs(results) {
  const container = document.getElementById('terminalLogContainer');
  if (!container) return;

  container.innerHTML = '';

  results.forEach((r, idx) => {
    const isSuccess = r.statusCode >= 200 && r.statusCode < 300;
    const statusColor = isSuccess ? '#198754' : '#dc3545';
    const statusText = isSuccess ? 'SUCCESS' : 'ERROR';

    let rawResponse = r.responseMsg || '';
    
    try {
      const parsed = JSON.parse(rawResponse);
      rawResponse = JSON.stringify(parsed, null, 2);
    } catch (e) {}

    const lines = rawResponse.split('\n');
    let displayResponse = rawResponse;
    
    if (lines.length > 3) {
      displayResponse = lines.slice(0, 3).join('\n') + ' ...';
    } else if (rawResponse.length > 300) {
      displayResponse = rawResponse.substring(0, 300) + ' ...';
    }

    const logHtml = `
      <div class="mb-3 pb-2 border-bottom">
        <div><span style="color: ${statusColor}; font-weight: bold;">[${r.no || idx + 1}] ${statusText} (${r.statusCode})</span> : <span class="text-primary font-monospace fw-bold">${r.method}</span> <span class="text-dark">${r.pathUri}</span></div>
        <div class="text-muted"><span class="fw-semibold">Target Environment</span> : ${r.locationApi || '-'} (${r.ip || '-'})</div>
        <div class="text-muted"><span class="fw-semibold">System</span>             : ${r.system || '-'}</div>
        <div class="d-flex align-items-start mt-1">
          <span class="text-muted fw-semibold" style="min-width: 140px;">Response Body</span> :&nbsp;
          <pre class="m-0 text-dark bg-light p-2 rounded border font-monospace w-100" style="white-space: pre-wrap; word-break: break-all; max-height: 4.5em; overflow: hidden; font-size: 0.82rem;">${displayResponse}</pre>
        </div>
      </div>
    `;

    container.innerHTML += logHtml;
  });
}

function downloadCSV() {
  if (!executionResults || executionResults.length === 0) return;

  const headers = ["No","System","Location GetToken","Location API","Method","Path URI","Status code","response masg","Resolve IP","Domain","cURL"];
  let csvContent = "\uFEFF";
  csvContent += headers.map(h => `"${h}"`).join(",") + "\n";

  executionResults.forEach(r => {
    const row = [
      r.no,
      r.system,
      r.locationGetToken,
      r.locationApi,
      r.method,
      r.pathUri,
      r.statusCode,
      (r.responseMsg || "").replace(/"/g, '""').replace(/[\r\n]+/g, " "),
      r.ip,
      r.domain,
      (r.curlCmd || "").replace(/"/g, '""')
    ];
    csvContent += row.map(v => `"${v}"`).join(",") + "\n";
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "api_test_result_unified.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function confirmCloseSummary() {
  if (confirm("คุณแน่ใจหรือว่าต้องการปิดหน้าสรุปผลลัพธ์นี้?")) {
    summaryModal.hide();
  }
}