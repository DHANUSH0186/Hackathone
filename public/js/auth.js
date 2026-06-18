async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (body && body.error) || 'Request failed';
    throw new Error(error);
  }
  return body;
}

async function getCurrentUser() {
  return await fetchJson('/api/me');
}

async function redirectIfUnauthorized(allowedRoles) {
  try {
    const data = await getCurrentUser();
    const user = data.user;
    if (!user || (allowedRoles && !allowedRoles.includes(user.role))) {
      window.location.href = '/';
      return null;
    }
    const roleLabel = document.getElementById('userRole');
    const detailLabel = document.getElementById('userDetails');
    const doctorNameLabel = document.getElementById('doctorName');
    if (roleLabel) {
      roleLabel.textContent = user.role;
    }
    if (detailLabel) {
      detailLabel.textContent = user.name || user.token || user.username || '';
    }
    if (doctorNameLabel) {
      doctorNameLabel.textContent = user.role === 'doctor'
        ? (user.username || user.name || '--')
        : (data.doctorName || '--');
    }
    return user;
  } catch (error) {
    window.location.href = '/';
    return null;
  }
}

async function logout() {
  await fetchJson('/api/logout', { method: 'POST' });
  window.location.href = '/';
}
