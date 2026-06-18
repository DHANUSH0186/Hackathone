const socket = io();
const patientCurrent = document.getElementById('patientCurrent');
const patientAhead = document.getElementById('patientAhead');
const patientWait = document.getElementById('patientWait');
const patientAverage = document.getElementById('patientAverage');
const patientPrescription = document.getElementById('patientPrescription');
const patientLabTests = document.getElementById('patientLabTests');
const patientHistory = document.getElementById('patientHistory');
const logoutBtn = document.getElementById('logoutBtn');

function renderPatient(data) {
  patientCurrent.textContent = data.current && data.current.token ? data.current.token : '--';
  patientAhead.textContent = typeof data.tokensAhead === 'number' ? data.tokensAhead : '--';
  patientWait.textContent = typeof data.estimatedWaitMinutes === 'number' ? `${data.estimatedWaitMinutes} min` : '--';
  patientAverage.textContent = typeof data.averageMinutes === 'number' ? `${data.averageMinutes} min` : '--';
  patientPrescription.textContent = data.patientPrescription || 'No prescriptions have been assigned yet.';
  patientLabTests.textContent = data.patientLabTests || 'No lab tests have been assigned yet.';
  document.getElementById('doctorName').textContent = data.assignedDoctor || '--';

  if (Array.isArray(data.patientHistory) && data.patientHistory.length) {
    patientHistory.innerHTML = data.patientHistory
      .map(entry => `
        <li>
          <strong>${new Date(entry.timestamp).toLocaleString()}</strong>
          <div>${entry.prescription || 'No prescription details.'}</div>
          <div>${entry.labTests || 'No lab test details.'}</div>
        </li>
      `)
      .join('');
  } else {
    patientHistory.innerHTML = '<li>No history available.</li>';
  }
}

socket.on('queueUpdate', renderPatient);

logoutBtn.addEventListener('click', logout);

window.addEventListener('DOMContentLoaded', async () => {
  const user = await redirectIfUnauthorized(['patient']);
  if (!user) return;
  const response = await fetch('/api/status');
  if (response.ok) {
    renderPatient(await response.json());
  }
});
