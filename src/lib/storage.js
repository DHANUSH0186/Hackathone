const fs = require('fs');
const path = require('path');

const STORAGE_FILE = path.join(__dirname, '..', 'queue-state.json');

function loadState(defaultState) {
  try {
    if (!fs.existsSync(STORAGE_FILE)) {
      return { ...defaultState };
    }
    const raw = fs.readFileSync(STORAGE_FILE, 'utf8');
    const saved = JSON.parse(raw);
    return { ...defaultState, ...saved };
  } catch (error) {
    console.error('Failed to load saved queue state:', error.message);
    return { ...defaultState };
  }
}

function saveState(state) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Failed to persist queue state:', error.message);
  }
}

module.exports = { loadState, saveState };
