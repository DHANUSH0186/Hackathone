const socket = io();
const doctorCurrent = document.getElementById('doctorCurrent');
const doctorAverage = document.getElementById('doctorAverage');
const doctorWait = document.getElementById('doctorWait');
const doctorQueue = document.getElementById('doctorQueue');
const prescriptionInput = document.getElementById('prescriptionInput');
const labTestsInput = document.getElementById('labTestsInput');
const doctorPatientHistory = document.getElementById('doctorPatientHistory');
const savePrescriptionBtn = document.getElementById('savePrescriptionBtn');
const completeBtn = document.getElementById('completeBtn');
const logoutBtn = document.getElementById('logoutBtn');

function renderDoctor(data) {
  const currentText = data.current && data.current.token
    ? `${data.current.token} — ${data.current.name || 'Unknown patient'}`
    : 'No patient in room';
  doctorCurrent.textContent = currentText;
  doctorAverage.textContent = typeof data.averageMinutes === 'number' ? `${data.averageMinutes} min` : '--';
  doctorWait.textContent = typeof data.estimatedWaitMinutes === 'number' ? `${data.estimatedWaitMinutes} min` : '--';
  doctorQueue.innerHTML = Array.isArray(data.queue) && data.queue.length
    ? data.queue.map(item => `<div class="queue-item"><span>${item.token || '--'}</span><strong>${item.name || '--'}</strong></div>`).join('')
    : '<div class="queue-item">No upcoming patients</div>';
  completeBtn.disabled = !data.current;

  if (data.current) {
    prescriptionInput.value = data.current.prescription || '';
    labTestsInput.value = data.current.labTests || '';
    document.getElementById('doctorPrescription').textContent = data.current.prescription || 'No prescriptions assigned yet.';
    document.getElementById('doctorLabTests').textContent = data.current.labTests || 'No lab tests assigned yet.';
    savePrescriptionBtn.disabled = false;

    if (Array.isArray(data.patientHistory) && data.patientHistory.length) {
      doctorPatientHistory.innerHTML = data.patientHistory
        .map(entry => `
          <li>
            <strong>${new Date(entry.timestamp).toLocaleString()}</strong>
            <div>${entry.prescription || 'No prescription details.'}</div>
            <div>${entry.labTests || 'No lab test details.'}</div>
          </li>
        `)
        .join('');
    } else {
      doctorPatientHistory.innerHTML = '<li>No history available.</li>';
    }
  } else {
    prescriptionInput.value = '';
    labTestsInput.value = '';
    document.getElementById('doctorPrescription').textContent = 'No prescriptions assigned yet.';
    document.getElementById('doctorLabTests').textContent = 'No lab tests assigned yet.';
    doctorPatientHistory.innerHTML = '<li>No history available.</li>';
    savePrescriptionBtn.disabled = true;
  }

  const averageNote = document.getElementById('averageNote');
  if (averageNote) {
    averageNote.textContent = data.manualAverageOverride ? 'Manual override active' : '';
  }
}

socket.on('queueUpdate', renderDoctor);

savePrescriptionBtn.addEventListener('click', async () => {
  const prescription = prescriptionInput.value.trim();
  const labTests = labTestsInput.value.trim();

  const response = await fetch('/api/current-notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prescription, labTests })
  });

  if (!response.ok) {
    console.error('Error saving patient notes');
  }
});

completeBtn.addEventListener('click', async () => {
  const response = await fetch('/api/complete', { method: 'POST' });
  if (!response.ok) {
    console.error('Error completing current patient');
  }
});

logoutBtn.addEventListener('click', logout);

window.addEventListener('DOMContentLoaded', async () => {
  await redirectIfUnauthorized(['doctor']);
  const response = await fetch('/api/status');
  if (response.ok) {
    renderDoctor(await response.json());
  }
});
