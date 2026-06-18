const socket = io();
const addForm = document.getElementById('addPatientForm');
const nameInput = document.getElementById('patientName');
const assignedDoctorSelect = document.getElementById('assignedDoctor');
const callNextBtn = document.getElementById('callNextBtn');
const avgTimeInput = document.getElementById('avgTime');
const saveAvgBtn = document.getElementById('saveAvgBtn');
const actionStatus = document.getElementById('actionStatus');
const currentToken = document.getElementById('currentToken');
const tokensAhead = document.getElementById('tokensAhead');
const estimatedWait = document.getElementById('estimatedWait');
const averageMinutes = document.getElementById('averageMinutes');
const queueList = document.getElementById('queueList');
const logoutBtn = document.getElementById('logoutBtn');

function showStatus(message, type = 'success') {
  actionStatus.textContent = message;
  actionStatus.style.color = type === 'error' ? '#dc2626' : '#0f766e';
}

function renderQueue(data) {
  const currentText = data.current && data.current.token && data.current.name
    ? `${data.current.token} — ${data.current.name}`
    : '--';
  currentToken.textContent = currentText;
  tokensAhead.textContent = typeof data.tokensAhead === 'number' ? data.tokensAhead : '--';
  estimatedWait.textContent = typeof data.estimatedWaitMinutes === 'number' ? `${data.estimatedWaitMinutes} min` : '--';
  averageMinutes.textContent = typeof data.averageMinutes === 'number' ? `${data.averageMinutes} min` : '--';
  avgTimeInput.value = typeof data.averageMinutes === 'number' ? data.averageMinutes : '';

  if (!Array.isArray(data.queue) || data.queue.length === 0) {
    queueList.innerHTML = '<li class="queue-empty">No patients waiting</li>';
  } else {
    queueList.innerHTML = data.queue
      .map(item => `
        <li>
          <div class="queue-row">
            <span class="queue-token">${item.token || '--'}</span>
            <strong>${item.name || '--'}</strong>
          </div>
          <span class="queue-badge">Dr. ${item.assignedDoctor || 'Unassigned'}</span>
        </li>
      `)
      .join('');
  }

  const currentDoctorName = data.current?.assignedDoctor || '--';
  const doctorNameSpan = document.getElementById('doctorName');
  if (doctorNameSpan) {
    doctorNameSpan.textContent = currentDoctorName;
  }

  const averageNote = document.getElementById('averageNote');
  if (averageNote) {
    averageNote.textContent = data.manualAverageOverride ? 'Manual override active' : '';
  }
}

socket.on('queueUpdate', renderQueue);
socket.on('connect_error', () => {
  showStatus('Lost connection to queue updates.', 'error');
});

addForm.addEventListener('submit', async event => {
  event.preventDefault();
  const name = nameInput.value.trim();
  const assignedDoctor = assignedDoctorSelect.value;
  if (!name) {
    showStatus('Enter patient name before admitting.', 'error');
    return;
  }

  const response = await fetch('/api/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, assignedDoctor })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    showStatus(body.error || 'Could not add patient.', 'error');
    return;
  }

  nameInput.value = '';
  assignedDoctorSelect.value = '';
  showStatus(`Added ${body.token} for ${body.name}${assignedDoctor ? ` (Dr. ${assignedDoctor})` : ''}.`);
});

callNextBtn.addEventListener('click', async () => {
  const response = await fetch('/api/next', { method: 'POST' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    showStatus(body.error || 'Failed to call next patient.', 'error');
    return;
  }
  showStatus('Next patient called.');
});

saveAvgBtn.addEventListener('click', async () => {
  const minutes = Number(avgTimeInput.value);
  if (!minutes || minutes <= 0) {
    showStatus('Enter a valid average consultation time.', 'error');
    return;
  }

  const response = await fetch('/api/set-average', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ minutes })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    showStatus(body.error || 'Could not update average time.', 'error');
    return;
  }
  renderQueue(body);
  showStatus('Average time updated.');
});

logoutBtn.addEventListener('click', logout);

async function loadDoctorOptions() {
  const response = await fetch('/api/doctors');
  if (!response.ok) return;
  const data = await response.json().catch(() => null);
  if (!data || !Array.isArray(data.doctors)) return;
  assignedDoctorSelect.innerHTML = `
    <option value="">Any doctor</option>
    ${data.doctors.map(doc => `<option value="${doc.username}">${doc.name}</option>`).join('')}
  `;
}

window.addEventListener('DOMContentLoaded', async () => {
  const user = await redirectIfUnauthorized(['receptionist']);
  if (!user) return;
  await loadDoctorOptions();
  const response = await fetch('/api/status');
  if (response.ok) {
    renderQueue(await response.json());
  } else {
    showStatus('Unable to load queue status.', 'error');
  }
});
