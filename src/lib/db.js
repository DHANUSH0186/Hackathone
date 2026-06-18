const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'clinic.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS queue_entries (
    token TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    assignedDoctor TEXT,
    addedAt INTEGER NOT NULL,
    startAt INTEGER,
    status TEXT NOT NULL CHECK(status IN ('waiting','current','completed')),
    prescription TEXT,
    labTests TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS completed_durations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    durationMs INTEGER NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS patient_histories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    prescription TEXT,
    labTests TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`).run();

module.exports = db;
