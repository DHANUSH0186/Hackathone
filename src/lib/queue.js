const db = require('./db');

const defaultState = {
  manualAverageMinutes: 10,
  manualAverageOverride: false
};

function formatToken(number) {
  return `T${String(number).padStart(3, '0')}`;
}

function normalizeToken(token) {
  if (!token) return '';
  const normalized = String(token).trim().toUpperCase();
  return normalized.startsWith('T') ? normalized : `T${normalized}`;
}

function getSetting(key, defaultValue) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, String(value));
}

function initializeSettings() {
  const existing = db.prepare('SELECT COUNT(*) AS count FROM settings').get();
  if (!existing.count) {
    setSetting('manualAverageMinutes', defaultState.manualAverageMinutes);
    setSetting('manualAverageOverride', defaultState.manualAverageOverride);
  }
}

function getAverageDurationMinutes() {
  const manualOverride = getSetting('manualAverageOverride', 'false') === 'true';
  const manualAverage = Number(getSetting('manualAverageMinutes', defaultState.manualAverageMinutes));
  if (manualOverride) {
    return manualAverage;
  }
  const row = db.prepare('SELECT AVG(durationMs) AS avgMs FROM completed_durations').get();
  if (!row || !row.avgMs) {
    return manualAverage;
  }
  return Math.max(1, row.avgMs / 60000);
}

function getManualAverageOverride() {
  return getSetting('manualAverageOverride', 'false') === 'true';
}

function getNextTokenNumber() {
  const row = db.prepare(
    'SELECT token FROM queue_entries ORDER BY CAST(substr(token, 2) AS INTEGER) DESC LIMIT 1'
  ).get();
  if (!row?.token) {
    return 1;
  }
  const number = Number(row.token.slice(1));
  return Number.isFinite(number) ? number + 1 : 1;
}

function findPatient(token) {
  const normalized = normalizeToken(token);
  return db
    .prepare('SELECT * FROM queue_entries WHERE token = ? AND status IN ("waiting", "current")')
    .get(normalized) || null;
}

function getPatientHistory(token) {
  const normalized = normalizeToken(token);
  return db
    .prepare('SELECT * FROM patient_histories WHERE token = ? ORDER BY timestamp DESC')
    .all(normalized);
}

function addPatient(name, assignedDoctor = '') {
  const token = formatToken(getNextTokenNumber());
  const addedAt = Date.now();
  db.prepare(
    'INSERT INTO queue_entries (token, name, assignedDoctor, addedAt, status, prescription, labTests) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(token, name, assignedDoctor, addedAt, 'waiting', '', '');
  return { token, name, assignedDoctor };
}

function buildQueueItem(item) {
  return {
    token: item.token,
    name: item.name,
    assignedDoctor: item.assignedDoctor || 'Unassigned',
    prescription: item.prescription || '',
    labTests: item.labTests || ''
  };
}

function getCurrentEntry() {
  return db.prepare('SELECT * FROM queue_entries WHERE status = "current"').get() || null;
}

function recordCurrentDuration(current) {
  if (!current?.startAt) {
    return;
  }
  const durationMs = Date.now() - current.startAt;
  db.prepare('INSERT INTO completed_durations (durationMs) VALUES (?)').run(durationMs);
}

function advanceQueue() {
  const transaction = db.transaction(() => {
    const current = getCurrentEntry();
    if (current) {
      recordCurrentDuration(current);
      db.prepare('UPDATE queue_entries SET status = ? WHERE token = ?').run('completed', current.token);
    }

    const next = db
      .prepare('SELECT * FROM queue_entries WHERE status = ? ORDER BY addedAt ASC LIMIT 1')
      .get('waiting');

    if (next) {
      db.prepare(
        'UPDATE queue_entries SET status = ?, startAt = ?, prescription = ?, labTests = ? WHERE token = ?'
      ).run('current', Date.now(), '', '', next.token);
    }
  });
  transaction();
  return snapshot();
}

function setCurrentPatientNotes({ prescription, labTests } = {}) {
  const current = getCurrentEntry();
  if (!current) {
    throw new Error('No current patient to update.');
  }

  const updatedPrescription = typeof prescription === 'string' ? prescription.trim() : current.prescription || '';
  if (labTests !== undefined && typeof labTests !== 'string') {
    throw new Error('Lab test details must be text.');
  }
  const updatedLabTests = labTests !== undefined ? labTests.trim() : current.labTests || '';

  db.prepare(
    'UPDATE queue_entries SET prescription = ?, labTests = ? WHERE token = ?'
  ).run(updatedPrescription, updatedLabTests, current.token);

  db.prepare(
    'INSERT INTO patient_histories (token, timestamp, prescription, labTests) VALUES (?, ?, ?, ?)'
  ).run(current.token, Date.now(), updatedPrescription, updatedLabTests);

  return snapshot();
}

function setAverageMinutes(minutes) {
  setSetting('manualAverageMinutes', minutes);
  setSetting('manualAverageOverride', true);
  return snapshot();
}

function snapshot({ role, username, token } = {}) {
  const averageMinutes = getAverageDurationMinutes();
  const base = {
    averageMinutes: Number(averageMinutes.toFixed(1)),
    estimatedWaitMinutes: 0,
    manualAverageOverride: getManualAverageOverride()
  };

  if (role === 'doctor') {
    const queue = db
      .prepare('SELECT * FROM queue_entries WHERE status = ? AND assignedDoctor = ? ORDER BY addedAt ASC')
      .all('waiting', username)
      .map(buildQueueItem);
    const currentRow = db
      .prepare('SELECT * FROM queue_entries WHERE status = ? AND assignedDoctor = ?')
      .get('current', username);
    const current = currentRow ? buildQueueItem(currentRow) : null;
    return {
      ...base,
      queue,
      current,
      tokensAhead: queue.length,
      estimatedWaitMinutes: Number((queue.length * averageMinutes).toFixed(1)),
      patientHistory: current ? getPatientHistory(current.token) : []
    };
  }

  if (role === 'patient') {
    const normalized = normalizeToken(token);
    const patient = findPatient(normalized);
    const assignedDoctor = patient?.assignedDoctor || '';
    const current = patient?.status === 'current' ? buildQueueItem(patient) : null;
    const queue = assignedDoctor
      ? db
          .prepare('SELECT * FROM queue_entries WHERE status = ? AND assignedDoctor = ? ORDER BY addedAt ASC')
          .all('waiting', assignedDoctor)
          .map(buildQueueItem)
      : [];
    const position = queue.findIndex(item => item.token === normalized);
    return {
      ...base,
      current,
      tokensAhead: position >= 0 ? position : 0,
      estimatedWaitMinutes: Number(((position >= 0 ? position : 0) * averageMinutes).toFixed(1)),
      patientPrescription: current?.prescription || '',
      patientLabTests: current?.labTests || '',
      patientHistory: getPatientHistory(normalized),
      assignedDoctor
    };
  }

  const queue = db
    .prepare('SELECT * FROM queue_entries WHERE status = ? ORDER BY addedAt ASC')
    .all('waiting')
    .map(buildQueueItem);
  const currentRow = getCurrentEntry();
  return {
    ...base,
    queue,
    current: currentRow ? buildQueueItem(currentRow) : null,
    tokensAhead: queue.length,
    estimatedWaitMinutes: Number((queue.length * averageMinutes).toFixed(1))
  };
}

function isTokenValid(token) {
  const normalized = normalizeToken(token);
  const row = db
    .prepare('SELECT COUNT(*) AS count FROM queue_entries WHERE token = ? AND status IN ("waiting", "current")')
    .get(normalized);
  return row.count > 0;
}

function getState() {
  const queue = db.prepare('SELECT * FROM queue_entries ORDER BY addedAt ASC').all();
  const current = getCurrentEntry();
  return { queue, current, settings: {
    manualAverageMinutes: Number(getSetting('manualAverageMinutes', defaultState.manualAverageMinutes)),
    manualAverageOverride: getManualAverageOverride()
  }};
}

initializeSettings();

module.exports = {
  snapshot,
  addPatient,
  advanceQueue,
  setAverageMinutes,
  setCurrentPatientNotes,
  isTokenValid,
  getState,
  normalizeToken,
  findPatient,
  getPatientHistory
};
