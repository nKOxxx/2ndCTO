require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const routes = require('./api/routes');
const { testConnections } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
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

// Start server
async function start() {
  // Test database connections
  const connected = await testConnections();
  if (!connected) {
    console.error('[@systems] Failed to connect to databases. Exiting.');
    process.exit(1);
  }
  
  app.listen(PORT, () => {
    console.log(`[@systems] 2ndCTO API running on port ${PORT}`);
  });
}

start();
