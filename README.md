# Clinic Queue Manager

A live digital queue manager for a neighbourhood clinic.

## What it does

- Receptionist view (`/`) for adding patients, calling the next token, and setting the average consultation time.
- Patient waiting room view (`/patient.html`) that updates immediately via WebSocket without refreshing.
- Persistent clinic state stored in a local SQLite database (`clinic.db`) instead of flat JSON files.
- Estimated wait time calculated from actual consultation durations derived from previous "call next" intervals.

## Why this is a win

The receptionist can add a patient and assign a token in under 10 seconds with a single field and button. The patient screen updates live every time "Call next patient" is clicked. The wait estimate is based on real service intervals, not a hardcoded guess.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm start
```

If port `3000` is already in use, start on an alternate port:

```bash
PORT=3002 npm start
```

3. Open the login screen:

`http://localhost:3000`

If using a different port, open `http://localhost:3002` instead.

4. Login credentials:

- Receptionist: `receptionist` / `desk123`
- Doctor: `doctor` / `doc123`
- Patient: token from the queue (e.g. `T001` after adding a patient)

5. After login, you are redirected to the correct role page.

6. Patients can also register a new token directly from the login screen by clicking "Register your token".

7. If needed, the backend protects role pages and redirects unauthorized users to login.

## Demo moment

When the receptionist clicks "Call next patient" and the patient screen instantly shows the new current token with updated wait time, the owner will see the live queue control and know the clinic can move from paper slips to a smooth digital workflow.

## Possible extensions

- Persistent storage to survive server restarts
- SMS or WhatsApp token alerts
- Multiple rooms and service types
- Patient check-in QR code
- Doctor dashboard with consultation history

## File structure

- `server.js` — application entrypoint and server setup
- `routes/` — login/logout and queue API routes
- `middleware/` — role authorization helpers
- `lib/` — queue state and persistence logic
- `public/` — static HTML, CSS, and JS assets
