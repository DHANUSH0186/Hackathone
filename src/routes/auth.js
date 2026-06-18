const express = require('express');
const { isTokenValid, addPatient, normalizeToken, findPatient } = require('../lib/queue');
const { verifyUser, addUser, getDoctorName, getDoctors } = require('../lib/users');

const router = express.Router();

router.get('/me', (req, res) => {
  const user = req.session.user || null;
  let doctorName = getDoctorName();
  if (user?.role === 'doctor') {
    doctorName = user.name;
  } else if (user?.role === 'patient' && user.token) {
    const patient = findPatient(user.token);
    const doctor = getDoctors().find(doc => doc.username === patient?.assignedDoctor);
    doctorName = doctor ? doctor.name : doctorName;
  }
  res.json({ user, doctorName });
});

router.get('/doctors', (req, res) => {
  res.json({ doctors: getDoctors() });
});

router.post('/login', (req, res) => {
  const { role, username, password, token } = req.body;
  if (role === 'patient') {
    const normalizedToken = normalizeToken(token);
    if (!normalizedToken) {
      return res.status(400).json({ error: 'Token is required for patient login.' });
    }
    if (!isTokenValid(normalizedToken)) {
      return res.status(400).json({ error: 'Token not found in the clinic queue.' });
    }
    req.session.user = { role: 'patient', token: normalizedToken };
    return res.json({ user: req.session.user });
  }

  const user = verifyUser(role, username, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  req.session.user = { role: user.role, name: user.name, username: user.username };
  res.json({ user: req.session.user });
});

router.post('/register', (req, res) => {
  const role = req.body.role || 'patient';
  const name = (req.body.name || '').trim();
  if (!name) {
    return res.status(400).json({ error: 'Full name is required.' });
  }

  if (role === 'patient') {
    const { token } = addPatient(name);
    req.session.user = { role: 'patient', token, name };
    return res.json({ token, name, role });
  }

  const username = (req.body.username || '').trim();
  const password = (req.body.password || '').trim();
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required for staff accounts.' });
  }

  try {
    const user = addUser({ role, username, password, name });
    req.session.user = { role: user.role, name: user.name, username: user.username };
    return res.json({ user: req.session.user });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Failed to log out.' });
    }
    res.json({ ok: true });
  });
});

module.exports = router;
