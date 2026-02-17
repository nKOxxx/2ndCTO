require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const routes = require('./api/routes');
const { testConnections } = require('./db');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Store io instance for use in routes
app.set('io', io);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Static files (dashboard)
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api', routes);

// Dashboard redirect
app.get('/', (req, res) => {
  res.redirect('/dashboard.html');
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[@systems] Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('[@systems] Client connected:', socket.id);
  
  // Join repo room for updates
  socket.on('subscribe', (repoId) => {
    socket.join(`repo:${repoId}`);
    console.log(`[@systems] Client ${socket.id} subscribed to repo:${repoId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('[@systems] Client disconnected:', socket.id);
  });
});

// Start server
async function start() {
  // Test database connections
  const connected = await testConnections();
  if (!connected) {
    console.error('[@systems] Failed to connect to databases. Exiting.');
    process.exit(1);
  }
  
  httpServer.listen(PORT, () => {
    console.log(`[@systems] 2ndCTO API running on port ${PORT}`);
    console.log(`[@systems] WebSocket server ready`);
  });
}

start();

// Export io for use in other modules
module.exports = { io };
