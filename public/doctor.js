const socket = io();
const doctorCurrent = document.getElementById('doctorCurrent');
const doctorAverage = document.getElementById('doctorAverage');
const doctorWait = document.getElementById('doctorWait');
const doctorQueue = document.getElementById('doctorQueue');
const completeBtn = document.getElementById('completeBtn');

function renderDoctor(data) {
  doctorCurrent.textContent = data.current ? `${data.current.token} — ${data.current.name}` : 'No patient in room';
  doctorAverage.textContent = `${data.averageMinutes} min`;
  doctorWait.textContent = `${data.estimatedWaitMinutes} min`;
  doctorQueue.innerHTML = data.queue.length
    ? data.queue.map(item => `<div class="queue-item"><span>${item.token}</span><strong>${item.name}</strong></div>`).join('')
    : '<div class="queue-item">No upcoming patients</div>';
  completeBtn.disabled = !data.current;
}

socket.on('queueUpdate', renderDoctor);

completeBtn.addEventListener('click', async () => {
  const response = await fetch('/api/complete', {
    method: 'POST'
  });
  if (!response.ok) {
    console.error('Error completing current patient');
  }
});

window.addEventListener('DOMContentLoaded', async () => {
  const response = await fetch('/api/status');
  if (response.ok) {
    renderDoctor(await response.json());
  }
});
