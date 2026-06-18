const socket = io();
const patientCurrent = document.getElementById('patientCurrent');
const patientAhead = document.getElementById('patientAhead');
const patientWait = document.getElementById('patientWait');
const patientAverage = document.getElementById('patientAverage');

function renderPatient(data) {
  patientCurrent.textContent = data.current ? `${data.current.token}` : 'Waiting to start';
  patientAhead.textContent = data.tokensAhead;
  patientWait.textContent = `${data.estimatedWaitMinutes} min`;
  patientAverage.textContent = `${data.averageMinutes} min`;
}

socket.on('queueUpdate', renderPatient);

window.addEventListener('DOMContentLoaded', async () => {
  const response = await fetch('/api/status');
  if (response.ok) {
    renderPatient(await response.json());
  }
});
