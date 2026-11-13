const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhooks');
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// -----------------------------------------------------------------------------
// CORS CONFIGURATION
// -----------------------------------------------------------------------------
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, server-to-server or webhooks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in dev to avoid blocking
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-GitHub-Event', 'X-Hub-Signature-256']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// -----------------------------------------------------------------------------
// SOCKET.IO REALTIME SERVER
// -----------------------------------------------------------------------------
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Attach socket.io instance to express app so routes can broadcast
app.set('socketio', io);

// Track active connected users and document editors
const activeUsers = new Map(); // socket.id -> { username, projectId }

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // 1. Join Project Room
  socket.on('join_project', ({ projectId, user }) => {
    const room = `project_${projectId}`;
    socket.join(room);
    activeUsers.set(socket.id, { user, projectId });

    console.log(`[Socket.io] User ${user ? user.username : 'Guest'} (${socket.id}) joined ${room}`);

    // Notify room of current online participants
    const roomUsers = Array.from(activeUsers.values())
      .filter(entry => entry.projectId === projectId && entry.user)
      .map(entry => entry.user);

    io.to(room).emit('room_users', roomUsers);
  });

  // 2. Typing indicator in collaborative Markdown editor
  socket.on('typing_context', ({ projectId, username, section, isTyping }) => {
    socket.to(`project_${projectId}`).emit('user_typing_context', {
      username,
      section: section || 'Contexto General',
      isTyping: Boolean(isTyping),
      timestamp: new Date()
    });
  });

  // 3. Collaborative live text draft stream
  socket.on('context_draft_change', ({ projectId, markdown, username }) => {
    socket.to(`project_${projectId}`).emit('live_context_stream', {
      markdown,
      lastEditor: username,
      timestamp: new Date()
    });
  });

  // 4. Task moved on Kanban board
  socket.on('task_moved', ({ projectId, task }) => {
    socket.to(`project_${projectId}`).emit('task_status_changed', task);
  });

  // 5. Disconnect
  socket.on('disconnect', () => {
    const session = activeUsers.get(socket.id);
    if (session) {
      const { projectId, user } = session;
      activeUsers.delete(socket.id);
      const room = `project_${projectId}`;

      const roomUsers = Array.from(activeUsers.values())
        .filter(entry => entry.projectId === projectId && entry.user)
        .map(entry => entry.user);

      io.to(room).emit('room_users', roomUsers);
      console.log(`[Socket.io] User ${user ? user.username : 'Guest'} left room ${room}`);
    }
  });
});

// -----------------------------------------------------------------------------
// ROUTE REGISTRATION
// -----------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'GitFlow Telemetry & Agile Hub',
    timestamp: new Date(),
    uptime: process.uptime(),
    activeSockets: io.engine.clientsCount
  });
});

// Root fallback / welcome
app.get('/', (req, res) => {
  res.json({
    name: 'GitFlow API Server',
    description: 'Gestor ágil y telemetría de código en tiempo real',
    endpoints: {
      auth: '/api/auth/github',
      webhooks: '/api/webhook/github',
      projects: '/api/projects',
      tasks: '/api/projects/:id/tasks',
      dashboard: '/api/projects/:id/dashboard'
    }
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error Uncaught]:', err);
  res.status(500).json({
    error: 'Error interno del servidor.',
    message: err.message
  });
});

// -----------------------------------------------------------------------------
// START SERVER
// -----------------------------------------------------------------------------
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 GitFlow Server running on port ${PORT}`);
    console.log(`📡 WebSocket ready on port ${PORT}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
}

module.exports = { app, server, io };
