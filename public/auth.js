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
  const data = await fetchJson('/api/me');
  return data.user;
}

async function redirectIfUnauthorized(allowedRoles) {
  try {
    const user = await getCurrentUser();
    if (!user || (allowedRoles && !allowedRoles.includes(user.role))) {
      window.location.href = '/';
      return null;
    }
    const roleLabel = document.getElementById('userRole');
    const detailLabel = document.getElementById('userDetails');
    if (roleLabel) {
      roleLabel.textContent = user.role;
    }
    if (detailLabel) {
      detailLabel.textContent = user.name || user.token || user.username || '';
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
