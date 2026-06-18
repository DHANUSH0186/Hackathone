const express = require('express');
const { requireRole } = require('../middleware/authorize');
const {
  snapshot,
  addPatient,
  advanceQueue,
  setAverageMinutes,
  setCurrentPatientNotes
} = require('../lib/queue');
const { getDoctors } = require('../lib/users');

const router = express.Router();

router.get('/status', (req, res) => {
  const user = req.session.user;
  const responseData = snapshot({
    role: user?.role,
    username: user?.username,
    token: user?.token
  });
  res.json(responseData);
});

router.post('/add', requireRole(['receptionist']), (req, res) => {
  const name = (req.body.name || '').trim();
  const assignedDoctor = (req.body.assignedDoctor || '').trim();

  if (!name) {
    return res.status(400).json({ error: 'Patient name is required.' });
  }

  if (!assignedDoctor) {
    return res.status(400).json({ error: 'Please assign a doctor before admitting the patient.' });
  }

  const doctors = getDoctors();
  const doctor = doctors.find(doc => doc.username === assignedDoctor);
  if (!doctor) {
    return res.status(400).json({ error: 'Assigned doctor is not recognized.' });
  }

  const patient = addPatient(name, assignedDoctor);
  const current = snapshot();
  req.app.get('io').emit('queueUpdate', current);
  res.json({ ...patient, current });
});

router.post('/next', requireRole(['receptionist', 'doctor']), (req, res) => {
  const current = advanceQueue();
  req.app.get('io').emit('queueUpdate', current);
  res.json({ current });
});

router.post('/complete', requireRole(['doctor']), (req, res) => {
  const current = advanceQueue();
  req.app.get('io').emit('queueUpdate', current);
  res.json({ current });
});

router.post('/set-average', requireRole(['receptionist']), (req, res) => {
  const minutes = Number(req.body.minutes);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return res.status(400).json({ error: 'Average minutes must be a positive number.' });
  }
  const current = setAverageMinutes(minutes);
  req.app.get('io').emit('queueUpdate', current);
  res.json(current);
});

router.post('/current-notes', requireRole(['doctor']), (req, res) => {
  const prescription = req.body.prescription;
  const labTests = req.body.labTests;

  try {
    const current = setCurrentPatientNotes({ prescription, labTests });
    req.app.get('io').emit('queueUpdate', current);
    res.json(current);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
