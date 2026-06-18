const loginForm = document.getElementById('loginForm');
const roleField = document.getElementById('role');
const roleButtons = document.querySelectorAll('.role-btn');
const userCredentials = document.getElementById('userCredentials');
const patientCredentials = document.getElementById('patientCredentials');
const loginError = document.getElementById('loginError');
const loginTitle = document.getElementById('loginTitle');
const loginSubtext = document.getElementById('loginSubtext');
const heroTitle = document.getElementById('heroTitle');
const heroText = document.getElementById('heroText');

function setRole(role) {
  roleField.value = role;
  roleButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.role === role);
  });

  if (role === 'patient') {
    userCredentials.classList.add('hidden');
    patientCredentials.classList.remove('hidden');
    loginTitle.textContent = 'Patient access';
    loginSubtext.textContent = 'Enter your token to view live queue updates and your waiting status.';
    heroTitle.textContent = 'Track your visit';
    heroText.textContent = 'Patients can check token status, wait time, and personal notes from the doctor.';
    document.getElementById('token').placeholder = 'T001';
  } else if (role === 'doctor') {
    userCredentials.classList.remove('hidden');
    patientCredentials.classList.add('hidden');
    loginTitle.textContent = 'Doctor login';
    loginSubtext.textContent = 'Sign in to see your assigned queue, current patient, and save notes.';
    heroTitle.textContent = 'Doctor command center';
    heroText.textContent = 'Doctors can view their assigned patient queue, add prescriptions, and record lab instructions.';
  } else {
    userCredentials.classList.remove('hidden');
    patientCredentials.classList.add('hidden');
    loginTitle.textContent = 'Receptionist login';
    loginSubtext.textContent = 'Sign in to admit patients, assign doctors, and manage the clinic queue.';
    heroTitle.textContent = 'Reception desk';
    heroText.textContent = 'Receptionists admit patients, assign doctors, and keep the queue moving smoothly.';
  }

  document.getElementById('username').placeholder = role === 'doctor' ? 'doctor' : 'receptionist';
}

roleButtons.forEach(button => {
  button.addEventListener('click', () => setRole(button.dataset.role));
});

setRole('receptionist');

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  loginError.textContent = '';
  const role = roleField.value;
  const payload = { role };
  if (role === 'patient') {
    payload.token = document.getElementById('token').value.trim();
  } else {
    payload.username = document.getElementById('username').value.trim();
    payload.password = document.getElementById('password').value.trim();
  }

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      loginError.textContent = data.error || 'Login failed';
      loginError.style.color = '#dc2626';
      return;
    }

    const redirectRole = data.user?.role || role;
    if (redirectRole === 'receptionist') {
      window.location.href = '/receptionist.html';
    } else if (redirectRole === 'doctor') {
      window.location.href = '/doctor.html';
    } else {
      window.location.href = '/patient.html';
    }
  } catch (error) {
    loginError.textContent = error.message;
    loginError.style.color = '#dc2626';
  }
});

async function refreshStatus() {
  try {
    const response = await fetch('/api/status');
    if (!response.ok) return;
    const data = await response.json();
    document.getElementById('statusCurrent').textContent = data.current ? data.current.token : 'None';
    document.getElementById('statusAhead').textContent = data.tokensAhead;
    document.getElementById('statusWait').textContent = `${data.estimatedWaitMinutes} min`;
  } catch (error) {
    console.warn('Unable to refresh clinic status', error);
  }
}

refreshStatus();
setInterval(refreshStatus, 10000);
