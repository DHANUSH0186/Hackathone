const registerForm = document.getElementById('registerForm');
const roleField = document.getElementById('role');
const roleButtons = document.querySelectorAll('.role-btn');
const registerName = document.getElementById('registerName');
const registerUsername = document.getElementById('registerUsername');
const registerPassword = document.getElementById('registerPassword');
const staffCredentials = document.getElementById('staffCredentials');
const registerError = document.getElementById('registerError');
const registerSuccess = document.getElementById('registerSuccess');

function setRole(role) {
  roleField.value = role;
  roleButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.role === role));
  if (role === 'patient') {
    staffCredentials.classList.add('hidden');
  } else {
    staffCredentials.classList.remove('hidden');
  }
}

roleButtons.forEach(button => {
  button.addEventListener('click', () => setRole(button.dataset.role));
});

setRole('receptionist');

registerForm.addEventListener('submit', async event => {
  event.preventDefault();
  registerError.textContent = '';
  registerSuccess.textContent = '';

  const role = roleField.value;
  const name = registerName.value.trim();
  const payload = { role, name };

  if (!name) {
    registerError.textContent = 'Please enter your full name.';
    registerError.style.color = '#dc2626';
    return;
  }

  if (role !== 'patient') {
    const username = registerUsername.value.trim();
    const password = registerPassword.value.trim();
    if (!username || !password) {
      registerError.textContent = 'Please enter a username and password.';
      registerError.style.color = '#dc2626';
      return;
    }
    payload.username = username;
    payload.password = password;
  }

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      registerError.textContent = 'Unexpected server response during registration.';
      registerError.style.color = '#dc2626';
      return;
    }

    if (!response.ok) {
      registerError.textContent = data.error || 'Registration failed';
      registerError.style.color = '#dc2626';
      return;
    }

    registerSuccess.textContent = role === 'patient'
      ? `Registered ${data.name} with token ${data.token}. Redirecting...`
      : `Created ${data.user.role} account for ${data.user.name}. Redirecting...`;
    registerSuccess.style.color = '#0f766e';

    setTimeout(() => {
      if (role === 'receptionist') {
        window.location.href = '/receptionist.html';
      } else if (role === 'doctor') {
        window.location.href = '/doctor.html';
      } else {
        window.location.href = '/patient.html';
      }
    }, 1200);
  } catch (error) {
    registerError.textContent = error.message;
    registerError.style.color = '#dc2626';
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
