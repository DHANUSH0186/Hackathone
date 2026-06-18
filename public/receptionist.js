const socket = io();
const addForm = document.getElementById('addPatientForm');
const nameInput = document.getElementById('patientName');
const lastAdded = document.getElementById('lastAdded');
const callNextBtn = document.getElementById('callNextBtn');
const avgTimeInput = document.getElementById('avgTime');
const saveAvgBtn = document.getElementById('saveAvgBtn');
const currentToken = document.getElementById('currentToken');
const tokensAhead = document.getElementById('tokensAhead');
const estimatedWait = document.getElementById('estimatedWait');
const averageMinutes = document.getElementById('averageMinutes');
const queueList = document.getElementById('queueList');

function renderQueue(data) {
  currentToken.textContent = data.current ? `${data.current.token} — ${data.current.name}` : 'No patient yet';
  tokensAhead.textContent = data.tokensAhead;
  estimatedWait.textContent = `${data.estimatedWaitMinutes} min`;
  averageMinutes.textContent = `${data.averageMinutes} min`;
  avgTimeInput.value = data.averageMinutes;
  queueList.innerHTML = data.queue.length
    ? data.queue.map(item => `<div class="queue-item"><span>${item.token}</span><strong>${item.name}</strong></div>`).join('')
    : '<div class="queue-item">No patients waiting</div>';
}

socket.on('queueUpdate', renderQueue);

addForm.addEventListener('submit', async event => {
  event.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;
  const response = await fetch('/api/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  const body = await response.json();
  if (!response.ok) {
    lastAdded.textContent = body.error || 'Could not add patient';
    lastAdded.style.color = '#dc2626';
    return;
  }
  nameInput.value = '';
  lastAdded.style.color = '#0f766e';
  lastAdded.textContent = `Assigned ${body.token} to ${body.name}`;
  setTimeout(() => (lastAdded.textContent = ''), 5000);
});

callNextBtn.addEventListener('click', async () => {
  const response = await fetch('/api/next', { method: 'POST' });
  if (!response.ok) {
    console.error('Call next failed');
  }
});

saveAvgBtn.addEventListener('click', async () => {
  const minutes = Number(avgTimeInput.value);
  if (!minutes || minutes <= 0) return;
  const response = await fetch('/api/set-average', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ minutes })
  });
  if (!response.ok) {
    console.error('Set average failed');
  }
});

window.addEventListener('DOMContentLoaded', async () => {
  const response = await fetch('/api/status');
  if (response.ok) {
    renderQueue(await response.json());
  }
});
