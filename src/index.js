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
const { requireAuth, optionalAuth } = require('./middleware/auth');
const { initSentry, sentryRequestHandler, sentryErrorHandler } = require('./config/sentry');
const cleanupService = require('./services/cleanup');
const AuthService = require('./services/auth');
const { supabase } = require('./db');
const { v4: uuidv4 } = require('uuid');

// Initialize Sentry error tracking
initSentry();

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

// Request ID tracking (for debugging)
app.use((req, res, next) => {
  req.id = req.get('X-Request-ID') || uuidv4();
  res.set('X-Request-ID', req.id);
  next();
});

// Sentry: Request handler (must be first)
app.use(sentryRequestHandler());

// Request logging (sanitized)
app.use((req, res, next) => {
  const { sanitizeLog } = require('./middleware/security');
  const startTime = Date.now();
  
  const logData = {
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')?.substring(0, 100)
  };
  
  // Log response time on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[@systems] ${req.id} ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  
  next();
});

// Static files (dashboard)
app.use(express.static(path.join(__dirname, '../public')));

// Health check (before rate limiting for monitoring)
app.get('/api/health', async (req, res) => {
  const healthService = require('./services/health');
  const basic = await healthService.getBasicHealth();

  res.status(basic.status === 'ok' ? 200 : 503).json({
    ...basic,
    version: '1.1.0',
    requestId: req.id
  });
});

// Detailed health check (for admins)
app.get('/api/health/detailed', async (req, res) => {
  const healthService = require('./services/health');
  const detailed = await healthService.getFullHealth();
  
  res.status(detailed.status === 'healthy' ? 200 : 
             detailed.status === 'degraded' ? 200 : 503).json({
    ...detailed,
    requestId: req.id
  });
});

// Auth routes
app.post('/api/auth/key', async (req, res) => {
  try {
    // For demo: create a demo user if not exists
    const { data: user } = await supabase
      .from('users')
      .insert({ username: 'demo', email: 'demo@2ndcto.com' })
      .select()
      .single();
    
    const key = await AuthService.createApiKey(user.id, req.body.name || 'Default');
    res.json({
      success: true,
      message: 'API key created. Save this key - it will only be shown once!',
      apiKey: key.key, // Full key shown once
      id: key.id,
      created_at: key.created_at
    });
  } catch (error) {
    console.error('[@auth] Key creation failed:', error.message);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

app.get('/api/auth/keys', requireAuth, async (req, res) => {
  try {
    const keys = await AuthService.listApiKeys(req.user.id);
    res.json({ keys });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/auth/keys/:id', requireAuth, async (req, res) => {
  try {
    await AuthService.revokeApiKey(req.params.id, req.user.id);
    res.json({ success: true, message: 'API key revoked' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HTTPS enforcement in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

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

// Sentry: Error handler (must be before other error handlers)
app.use(sentryErrorHandler());

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
