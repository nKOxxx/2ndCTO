require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const routes = require('./api/routes');
const { testConnections } = require('./db');
const { securityHeaders } = require('./middleware/security');
const { apiLimiter } = require('./middleware/rate-limit');
const cleanupService = require('./services/cleanup');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Store io instance for use in routes
app.set('io', io);

// Security: Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security: Helmet with custom config
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Security: Additional headers
app.use(securityHeaders);

// CORS with restrictions in production
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || false
    : '*',
  credentials: true
}));

// Security: Rate limiting
app.use('/api', apiLimiter);

// Security: Body parser with limits
app.use(express.json({ 
  limit: '10mb',
  // Prevent prototype pollution
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch(e) {
      res.status(400).json({ error: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security: Disable X-Powered-By
app.disable('x-powered-by');

// Request logging (sanitized)
app.use((req, res, next) => {
  const { sanitizeLog } = require('./middleware/security');
  const logData = {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')?.substring(0, 100)
  };
  console.log(`[@systems] ${req.method} ${req.path} - ${sanitizeLog(logData)}`);
  next();
});

// Static files (dashboard)
app.use(express.static(path.join(__dirname, '../public')));

// Health check (before rate limiting for monitoring)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: '2ndCTO', 
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api', routes);

// Dashboard redirect
app.get('/', (req, res) => {
  res.redirect('/dashboard.html');
});

// Security: 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Security: Global error handler (sanitize errors)
app.use((err, req, res, next) => {
  console.error('[@systems] Error:', err.message);
  
  // Don't leak internal errors in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(err.status || 500).json({ 
    error: message,
    requestId: req.id // For tracking
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('[@systems] Client connected:', socket.id);
  
  // Rate limit socket connections
  const clientIp = socket.handshake.address;
  const connections = io.sockets.sockets.size;
  
  if (connections > 100) {
    console.warn(`[@systems] Too many connections (${connections}), rejecting ${socket.id}`);
    socket.disconnect();
    return;
  }
  
  // Join repo room for updates
  socket.on('subscribe', (repoId) => {
    // Validate repoId format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(repoId)) {
      socket.emit('error', { message: 'Invalid repository ID' });
      return;
    }
    
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
  
  // Start cleanup service
  cleanupService.start();
  
  httpServer.listen(PORT, () => {
    console.log(`[@systems] 2ndCTO API running on port ${PORT}`);
    console.log(`[@systems] WebSocket server ready`);
    console.log(`[@systems] Security hardening: ENABLED`);
    console.log(`[@systems] Rate limiting: ENABLED`);
    console.log(`[@systems] Auto-cleanup: ENABLED`);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[@systems] SIGTERM received, shutting down gracefully');
    cleanupService.stop();
    httpServer.close(() => {
      console.log('[@systems] Server closed');
      process.exit(0);
    });
  });
}

start();

// Export for testing
module.exports = { io, app };
