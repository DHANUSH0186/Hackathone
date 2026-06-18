const db = require('./db');

const defaultUsers = [
  { role: 'receptionist', username: 'receptionist', password: 'desk123', name: 'Receptionist' },
  { role: 'doctor', username: 'doctor', password: 'doc123', name: 'Doctor' }
];

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function ensureDefaultUsers() {
  const existing = db.prepare('SELECT COUNT(*) AS count FROM users').get();
  if (existing.count === 0) {
    const insert = db.prepare(
      'INSERT INTO users (role, username, password, name) VALUES (@role, @username, @password, @name)'
    );
    const insertMany = db.transaction(users => {
      for (const user of users) {
        insert.run(user);
      }
    });
    insertMany(defaultUsers.map(user => ({
      role: user.role,
      username: normalizeUsername(user.username),
      password: user.password,
      name: user.name
    })));
  }
}

function findUser(role, username) {
  const normalized = normalizeUsername(username);
  return db
    .prepare('SELECT * FROM users WHERE role = ? AND username = ?')
    .get(role, normalized) || null;
}

function verifyUser(role, username, password) {
  const user = findUser(role, username);
  if (!user) return null;
  return user.password === password ? user : null;
}

function isUsernameTaken(username) {
  const normalized = normalizeUsername(username);
  const row = db.prepare('SELECT COUNT(*) AS count FROM users WHERE username = ?').get(normalized);
  return row.count > 0;
}

function addUser({ role, username, password, name }) {
  const normalizedUsername = normalizeUsername(username);
  if (!role || !username || !password || !name) {
    throw new Error('Role, username, password, and name are required.');
  }
  if (isUsernameTaken(normalizedUsername)) {
    throw new Error('Username already exists.');
  }
  const insert = db.prepare(
    'INSERT INTO users (role, username, password, name) VALUES (?, ?, ?, ?)'
  );
  insert.run(role, normalizedUsername, password, name);
  return { role, username: normalizedUsername, password, name };
}

function getDoctorName() {
  const rows = db.prepare('SELECT name FROM users WHERE role = ?').all('doctor');
  if (!rows.length) {
    return 'No doctor registered';
  }
  return rows.map(row => row.name).join(', ');
}

function getDoctors() {
  return db.prepare('SELECT username, name FROM users WHERE role = ?').all('doctor');
}

ensureDefaultUsers();

module.exports = {
  findUser,
  verifyUser,
  addUser,
  isUsernameTaken,
  getDoctorName,
  getDoctors
};
