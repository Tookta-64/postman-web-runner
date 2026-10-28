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

    // เช็ค Default Auth Type จากการดึงค่า: ถ้าพบ API Key ใน collection ให้เลือก API Key เป็นหลัก ถ้าไม่มีเลือก OAuth 2.0
    const defaultIsApiKey = !!f.apiKey && !f.clientId;

    container.innerHTML += `
      <div class="card shadow-sm mb-4 border rounded-3 folder-card" data-fidx="${fIdx}">
        <div class="card-body">
          <h4 class="fw-bold mb-3 text-secondary">{${f.folderName}}</h4>
          
          <!-- Authentication Section -->
          <div class="group-auth p-3 border rounded-3 mb-3 bg-white">
            
            <!-- 1. เลือก Authentication Type (บังคับเลือก 1 อย่างใน folder) -->
            <div class="d-flex align-items-center mb-3">
              <label class="fw-bold form-label mb-0 me-4 text-nowrap" style="width: 160px;">Authentication Type:</label>
              <div class="d-flex gap-4">
                <div class="form-check">
                  <input class="form-check-input auth-type-radio" type="radio" name="authType_${fIdx}" id="authOAuth_${fIdx}" value="OAUTH" ${!defaultIsApiKey ? 'checked' : ''} onchange="toggleAuthType(${fIdx})">
                  <label class="form-check-label fw-bold" for="authOAuth_${fIdx}">OAuth 2.0</label>
                </div>
                <div class="form-check">
                  <input class="form-check-input auth-type-radio" type="radio" name="authType_${fIdx}" id="authApiKey_${fIdx}" value="API_KEY" ${defaultIsApiKey ? 'checked' : ''} onchange="toggleAuthType(${fIdx})">
                  <label class="form-check-label fw-bold" for="authApiKey_${fIdx}">API Key</label>
                </div>
              </div>
            </div>

            <!-- 2. OAuth 2.0 Inputs (มีปุ่ม Eye Icon ดู Secret) -->
            <div class="d-flex align-items-center mb-3">
              <label class="fw-bold form-label mb-0 me-4 text-nowrap" style="width: 160px;">OAuth 2.0:</label>
              <div id="oauthSection_${fIdx}" class="flex-grow-1 oauth-inputs">
                <div class="row g-2">
                  <div class="col-sm-6">
                    <input type="text" class="form-control form-control-sm client-id" placeholder="Client ID" value="${f.clientId || ''}">
                  </div>
                  <div class="col-sm-6">
                    <div class="input-group input-group-sm">
                      <input type="password" class="form-control client-secret" id="clientSecret_${fIdx}" placeholder="Client Secret" value="${f.clientSecret || ''}">
                      <button class="btn btn-outline-secondary btn-eye" type="button" onclick="toggleSecretVisibility(${fIdx})">
                        <i class="bi bi-eye" id="eyeIcon_${fIdx}"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 3. API Key Input -->
            <div class="d-flex align-items-center mb-3">
              <label class="fw-bold form-label mb-0 me-4 text-nowrap" style="width: 160px;">API Key:</label>
              <div id="apiKeySection_${fIdx}" class="flex-grow-1 apikey-input">
                <input type="text" class="form-control form-control-sm api-key" placeholder="API Key" value="${f.apiKey || ''}">
              </div>
            </div>

            <!-- 4. Location Authen -->
            <div id="location-authen-row-${fIdx}" class="d-flex align-items-center mt-2 pt-2 border-top">
              <label class="fw-bold form-label mb-0 me-4 text-nowrap" style="width: 160px;">Location Authen:</label>
              <div class="d-flex gap-4">
                <div class="form-check">
                  <input class="form-check-input token-loc" type="radio" name="tokenLoc_${fIdx}" id="tokenPrem_${fIdx}" value="On-Premise">
                  <label class="form-check-label" for="tokenPrem_${fIdx}">On-Premise</label>
                </div>
                <div class="form-check">
                  <input class="form-check-input token-loc" type="radio" name="tokenLoc_${fIdx}" id="tokenCloud_${fIdx}" value="On-Cloud">
                  <label class="form-check-label" for="tokenCloud_${fIdx}">On-Cloud</label>
                </div>
                <div class="form-check">
                  <input class="form-check-input token-loc" type="radio" name="tokenLoc_${fIdx}" id="tokenAlloy_${fIdx}" value="Cloud Alloy">
                  <label class="form-check-label" for="tokenAlloy_${fIdx}">Cloud Alloy</label>
                </div>
              </div>
            </div>

          </div>

          <!-- Requests Table -->
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

  // เรียกสลับสถานะ Enable/Disable ช่องกรอกข้อมูลตาม Auth Type ของแต่ละโฟลเดอร์
  folders.forEach((_, fIdx) => toggleAuthType(fIdx));
}

// ฟังก์ชันควบคุมเปิด-ปิดช่องกรอก ให้ใช้งานได้เพียง 1 สิทธิ์การใช้งานต่อ 1 โฟลเดอร์
function toggleAuthType(fIdx) {
  const card = document.querySelector(`.folder-card[data-fidx="${fIdx}"]`);
  const authType = card.querySelector(`input[name="authType_${fIdx}"]:checked`).value;
  
  const clientId = card.querySelector('.client-id');
  const clientSecret = card.querySelector('.client-secret');
  const btnEye = card.querySelector('.btn-eye');
  const apiKey = card.querySelector('.api-key');

  if (authType === 'OAUTH') {
    // 1. เลือก OAuth 2.0 -> เปิดใช้งาน Client ID/Secret, ปิด API Key (สีเทา)
    clientId.disabled = false;
    clientSecret.disabled = false;
    if (btnEye) btnEye.disabled = false;
    clientId.style.backgroundColor = '';
    clientSecret.style.backgroundColor = '';
    
    apiKey.disabled = true;
    apiKey.style.backgroundColor = '#e9ecef';

  } else if (authType === 'API_KEY') {
    // 2. เลือก API Key -> ปิดใช้งาน Client ID/Secret (สีเทา), เปิดใช้งาน API Key
    clientId.disabled = true;
    clientSecret.disabled = true;
    if (btnEye) btnEye.disabled = true;
    clientId.style.backgroundColor = '#e9ecef';
    clientSecret.style.backgroundColor = '#e9ecef';

    apiKey.disabled = false;
    apiKey.style.backgroundColor = '';
  }

  validateForm();
}

// ฟังก์ชันเปิด-ปิดการซ่อนรหัสผ่าน Client Secret (ปุ่มดวงตา)
function toggleSecretVisibility(fIdx) {
  const secretInput = document.getElementById(`clientSecret_${fIdx}`);
  const eyeIcon = document.getElementById(`eyeIcon_${fIdx}`);

  if (secretInput.disabled) return;

  if (secretInput.type === 'password') {
    secretInput.type = 'text';
    eyeIcon.classList.remove('bi-eye');
    eyeIcon.classList.add('bi-eye-slash');
  } else {
    secretInput.type = 'password';
    eyeIcon.classList.remove('bi-eye-slash');
    eyeIcon.classList.add('bi-eye');
  }
}