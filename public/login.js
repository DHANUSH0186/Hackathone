const loginForm = document.getElementById('loginForm');
const roleSelect = document.getElementById('role');
const userCredentials = document.getElementById('userCredentials');
const patientCredentials = document.getElementById('patientCredentials');
const loginError = document.getElementById('loginError');

function updateFormFields() {
  const role = roleSelect.value;
  if (role === 'patient') {
    userCredentials.classList.add('hidden');
    patientCredentials.classList.remove('hidden');
  } else {
    userCredentials.classList.remove('hidden');
    patientCredentials.classList.add('hidden');
  }
}

roleSelect.addEventListener('change', updateFormFields);
updateFormFields();

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  loginError.textContent = '';
  const role = roleSelect.value;
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

    if (role === 'receptionist') {
      window.location.href = '/receptionist.html';
    } else if (role === 'doctor') {
      window.location.href = '/doctor.html';
    } else {
      window.location.href = '/patient.html';
    }
  } catch (error) {
    loginError.textContent = error.message;
    loginError.style.color = '#dc2626';
  }
});
