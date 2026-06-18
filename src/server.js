const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const queueRoutes = require('./routes/queue');
const { ensureRole } = require('./middleware/authorize');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const publicPath = path.join(__dirname, '..', 'public');

const sessionMiddleware = session({
  secret: 'clinic-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 }
});

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
app.set('io', io);

app.use('/api', authRoutes);
app.use('/api', queueRoutes);

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

app.use((err, req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(err.status || 500).json({ error: err.message || 'API server error.' });
  }
  next(err);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'login.html'));
});

app.get('/receptionist.html', ensureRole(['receptionist']), (req, res) => {
  res.sendFile(path.join(publicPath, 'receptionist.html'));
});

app.get('/doctor.html', ensureRole(['doctor']), (req, res) => {
  res.sendFile(path.join(publicPath, 'doctor.html'));
});

app.get('/patient.html', ensureRole(['patient']), (req, res) => {
  res.sendFile(path.join(publicPath, 'patient.html'));
});

app.use(express.static(publicPath));
app.use('/socket.io', express.static(path.join(__dirname, '..', 'node_modules', 'socket.io', 'client-dist')));

io.on('connection', socket => {
  socket.emit('queueUpdate', require('./lib/queue').snapshot());
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Clinic Queue Manager running at http://localhost:${PORT}`);
});
