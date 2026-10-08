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

// อ่านไฟล์ Collection และเรนเดอร์ลง UI
async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('collection', file);

  try {
    document.getElementById('configSection').classList.add('d-none');
    
    const res = await fetch('/api/validate-collection', { method: 'POST', body: formData });
    const data = await res.json();

    if (!data.success) {
      alert(data.message || "อ่านไฟล์ Collection ไม่สำเร็จ หรือรูปแบบ JSON ไม่ถูกต้อง");
      e.target.value = '';
    } else {
      folderData = data.data;
      renderFolders(folderData);
      document.getElementById('configSection').classList.remove('d-none');
    }
  } catch (err) {
    console.error("Upload and validate error:", err);
    alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับ Server เพื่ออ่านไฟล์ Collection");
    e.target.value = '';
  }
}

// Render UI สำหรับการตั้งค่าของแต่ละโฟลเดอร์
function renderFolders(folders) {
  const container = document.getElementById('foldersContainer');
  container.innerHTML = '';

  if (!folders || folders.length === 0) {
    container.innerHTML = '<div class="alert alert-warning text-center">ไม่พบ Request ภายในโฟลเดอร์ของ Collection นี้</div>';
    return;
  }

  folders.forEach((f, fIdx) => {
    let rowsHtml = f.requests.map((r, rIdx) => `
      <tr>
        <td class="text-center align-middle">${rIdx + 1}</td>
        <td class="align-middle text-break">${r.pathUri}</td>
        <td class="text-center align-middle"><span class="badge bg-secondary method-badge">${r.method}</span></td>
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
      <div class="card shadow-sm mb-4 border rounded-3 folder-card" data-fidx="${fIdx}">
        <div class="card-body">
          <h4 class="fw-bold mb-3 text-secondary">{${f.folderName}}</h4>
          
          <div class="group-auth p-3 border rounded-3 mb-3 bg-white">
            <div class="d-flex align-items-center mb-3">
              <label class="fw-bold form-label mb-0 me-4 text-nowrap">Authentication Type:</label>
              <div class="form-check me-4">
                <input class="form-check-input auth-type-radio" type="radio" name="authType_${fIdx}" id="authOAuth_${fIdx}" value="OAUTH" checked onchange="toggleAuthType(${fIdx})">
                <label class="form-check-label" for="authOAuth_${fIdx}">OAuth 2.0</label>
              </div>
              <div class="form-check">
                <input class="form-check-input auth-type-radio" type="radio" name="authType_${fIdx}" id="authApiKey_${fIdx}" value="API_KEY" onchange="toggleAuthType(${fIdx})">
                <label class="form-check-label" for="authApiKey_${fIdx}">API Key</label>
              </div>
            </div>

            <div class="d-flex align-items-start mb-3">
              <div id="oauthSection_${fIdx}" class="flex-grow-1 oauth-inputs">
                <div class="row g-2">
                  <div class="col-sm-6">
                    <input type="text" class="form-control form-control-sm client-id" placeholder="Client ID" title="Client ID สำหรับ OAuth 2.0">
                  </div>
                  <div class="col-sm-6">
                    <input type="password" class="form-control form-control-sm client-secret" placeholder="Client Secret" title="Client Secret สำหรับ OAuth 2.0">
                  </div>
                </div>
              </div>
              <div class="px-2 text-secondary fw-bold align-self-center fs-5">+</div>
              <div id="apiKeySection_${fIdx}" class="apikey-input">
                <input type="text" class="form-control form-control-sm api-key" placeholder="API Key" title="API Key" disabled style="background-color: #e9ecef; width: 220px;">
              </div>
            </div>

            <div id="get-token-location-row-${fIdx}" class="d-flex align-items-center mt-2 pt-2 border-top">
              <label class="fw-bold form-label mb-0 me-4 text-nowrap">Get Token Location:</label>
              <div class="form-check me-3">
                <input class="form-check-input token-loc" type="radio" name="tokenLoc_${fIdx}" id="tokenPrem_${fIdx}" value="On-Premise">
                <label class="form-check-label" for="tokenPrem_${fIdx}">On-Premise</label>
              </div>
              <div class="form-check me-3">
                <input class="form-check-input token-loc" type="radio" name="tokenLoc_${fIdx}" id="tokenCloud_${fIdx}" value="On-Cloud">
                <label class="form-check-label" for="tokenCloud_${fIdx}">On-Cloud</label>
              </div>
              <div class="form-check">
                <input class="form-check-input token-loc" type="radio" name="tokenLoc_${fIdx}" id="tokenAlloy_${fIdx}" value="Cloud Alloy">
                <label class="form-check-label" for="tokenAlloy_${fIdx}">Cloud Alloy</label>
              </div>
            </div>
          </div>

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
                      <label class="form-check-label fw-bold small">On-Premise</label>
                    </div>
                  </th>
                  <th style="width: 130px;">
                    <div class="mb-1 text-muted small">Location<br>(select all)</div>
                    <div class="form-check d-inline-block">
                      <input class="form-check-input header-select-all" type="radio" name="headerSelectAll_${fIdx}" value="On-Cloud" onchange="selectAllLocation(${fIdx}, 'On-Cloud')">
                      <label class="form-check-label fw-bold small">On-Cloud</label>
                    </div>
                  </th>
                  <th style="width: 130px;">
                    <div class="mb-1 text-muted small">Location<br>(select all)</div>
                    <div class="form-check d-inline-block">
                      <input class="form-check-input header-select-all" type="radio" name="headerSelectAll_${fIdx}" value="Cloud Alloy" onchange="selectAllLocation(${fIdx}, 'Cloud Alloy')">
                      <label class="form-check-label fw-bold small">Cloud Alloy</label>
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
      </div>
    `;
  });

  validateForm();
}

// Toggle Auth Type Selection
function toggleAuthType(fIdx) {
  const card = document.querySelector(`.folder-card[data-fidx="${fIdx}"]`);
  const authType = card.querySelector(`input[name="authType_${fIdx}"]:checked`).value;
  
  const clientId = card.querySelector('.client-id');
  const clientSecret = card.querySelector('.client-secret');
  const apiKey = card.querySelector('.api-key');
  
  const tokenLocRow = card.querySelector(`#get-token-location-row-${fIdx}`);
  const tokenLocs = tokenLocRow.querySelectorAll('.token-loc');

  if (authType === 'OAUTH') {
    clientId.disabled = false;
    clientSecret.disabled = false;
    clientId.style.backgroundColor = '';
    clientSecret.style.backgroundColor = '';
    
    apiKey.disabled = true;
    apiKey.value = '';
    apiKey.style.backgroundColor = '#e9ecef';

    tokenLocRow.classList.remove('text-muted');
    tokenLocs.forEach(radio => radio.disabled = false);

  } else if (authType === 'API_KEY') {
    clientId.disabled = true;
    clientSecret.disabled = true;
    clientId.value = '';
    clientSecret.value = '';
    clientId.style.backgroundColor = '#e9ecef';
    clientSecret.style.backgroundColor = '#e9ecef';

    apiKey.disabled = false;
    apiKey.style.backgroundColor = '';

    tokenLocRow.classList.add('text-muted');
    tokenLocs.forEach(radio => {
      radio.disabled = true;
      radio.checked = false;
    });
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

function validateForm() {
  const btnSubmit = document.getElementById('btnSubmit');
  
  const envSelected = document.querySelector('.env-radio:checked');
  if (!envSelected) {
    btnSubmit.disabled = true;
    return;
  }

  let isAllValid = true;
  const folderCards = document.querySelectorAll('.folder-card');

  if (folderCards.length === 0) {
    isAllValid = false;
  } else {
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
        if (!reqLoc) {
          isAllValid = false;
          break;
        }
      }
    });
  }

  btnSubmit.disabled = !isAllValid;
}

async function startExecution() {
  confirmModal.hide();

  summaryModal.show();
  const summaryModalEl = document.getElementById('summaryModal');
  const modalHeader = summaryModalEl.querySelector('.modal-header');
  const btnGoToSum = document.getElementById('btnGoToSummary');
  modalHeader.innerHTML = '<h5 class="modal-title"><span class="spinner-border spinner-border-sm me-2"></span>กำลังรัน Test API...</h5>';
  summaryModalEl.querySelector('.modal-body').classList.add('opacity-50');
  modalHeader.classList.remove('bg-success');
  modalHeader.classList.add('bg-primary');
  if (btnGoToSum) btnGoToSum.classList.add('d-none');
  const summaryFooter = summaryModalEl.querySelector('.modal-footer');
  summaryFooter.querySelectorAll('button:not(#btnGoToSummary)').forEach(b => b.classList.add('d-none'));

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
      summaryModal.hide();
    } else {
      executionResults = data.results;
      
      document.getElementById('sumTotal').innerText = data.summary.total;
      document.getElementById('sumSuccess').innerText = data.summary.successCount;
      document.getElementById('sumError').innerText = data.summary.errorCount;
      
      renderTerminalLogs(executionResults);
      
      modalHeader.innerHTML = '<h5 class="modal-title"><i class="bi bi-check-circle-fill me-2"></i>การรัน API เสร็จสมบูรณ์!</h5>';
      summaryModalEl.querySelector('.modal-body').classList.remove('opacity-50');
      modalHeader.classList.remove('bg-primary');
      modalHeader.classList.add('bg-success');
      if (btnGoToSum) btnGoToSum.classList.remove('d-none');
      summaryFooter.querySelectorAll('button:not(#btnGoToSummary)').forEach(b => b.classList.remove('d-none'));
    }
  } catch (err) {
    alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับ Server เพื่อรัน API");
    summaryModal.hide();
  }
}

function renderTerminalLogs(results) {
  const container = document.getElementById('terminalLogContainer');
  if (!container) return;

  container.innerHTML = '';

  if (!results || results.length === 0) {
    container.innerHTML = '<div class="text-muted text-center py-4">ไม่พบผลลัพธ์การรัน API</div>';
    return;
  }

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
    
    if (lines.length > 4) {
      displayResponse = lines.slice(0, 4).join('\n') + ' ... [truncated]';
    } else if (rawResponse.length > 500) {
      displayResponse = rawResponse.substring(0, 500) + ' ... [truncated]';
    }

    const logHtml = `
      <div class="log-item mb-3 pb-2 border-bottom">
        <div class="d-flex justify-content-between">
          <div>
            <span style="color: ${statusColor}; font-weight: bold;">[${r.no || idx + 1}] ${statusText} (${r.statusCode})</span> : 
            <span class="text-secondary font-monospace fw-bold method-text">${r.method}</span> 
            <span class="text-dark fw-semibold path-text text-break">${r.pathUri}</span>
          </div>
          <div class="text-muted small align-self-center text-nowrap">${r.ip || '-'}</div>
        </div>
        
        <div class="log-details mt-1 pt-1 small text-muted font-monospace">
          System: ${r.system || '-'} | Token Location: ${r.locationGetToken || 'API Key'} | API Location: ${r.locationApi || '-'}
        </div>

        <div class="response-preview mt-2">
          <div class="text-muted small fw-semibold mb-1">Response Body (preview)</div>
          <pre class="m-0 text-dark bg-light p-2 rounded border font-monospace" style="white-space: pre-wrap; word-break: break-all; max-height: 5em; overflow: hidden; font-size: 0.8rem;">${displayResponse}</pre>
        </div>
      </div>
    `;

    container.innerHTML += logHtml;
  });
}

function downloadCSV() {
  if (!executionResults || executionResults.length === 0) {
    alert("ไม่พบข้อมูลสำหรับการ Export");
    return;
  }

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
  link.setAttribute("download", `api_test_results_${new Date().toISOString().substring(0,19).replace(/T/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function confirmCloseSummary() {
  if (confirm("คุณแน่ใจหรือว่าต้องการปิดหน้าสรุปผลลัพธ์นี้?")) {
    summaryModal.hide();
  }
}