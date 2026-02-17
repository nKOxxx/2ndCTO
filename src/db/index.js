const { createClient } = require('@supabase/supabase-js');
const Redis = require('ioredis');

// Connection pool configuration
const POOL_CONFIG = {
  supabase: {
    maxConnections: parseInt(process.env.SUPABASE_MAX_CONNECTIONS) || 20,
    connectionTimeoutMs: 30000,
    idleTimeoutMs: 600000
  },
  redis: {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    keepAlive: 30000
  }
};

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    db: { schema: 'public' },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Connection metrics
let connectionMetrics = {
  supabase: { queries: 0, errors: 0 },
  redis: { commands: 0, errors: 0 }
};

// Initialize Redis with pooling
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisOptions = {
  ...POOL_CONFIG.redis,
  retryStrategy: (times) => {
    if (times > 3) {
      console.error('[@systems] Redis max retries exceeded');
      return null;
    }
    return Math.min(times * 100, 3000);
  }
};

if (redisUrl.startsWith('rediss://')) {
  redisOptions.tls = { rejectUnauthorized: false };
}

const redis = new Redis(redisUrl, redisOptions);

redis.on('connect', () => {
  console.log('[@systems] Redis connected');
});

redis.on('error', (err) => {
  connectionMetrics.redis.errors++;
  console.error('[@systems] Redis error:', err.message);
});

// Wrap Redis commands for metrics
const originalSendCommand = redis.sendCommand.bind(redis);
redis.sendCommand = function(...args) {
  connectionMetrics.redis.commands++;
  return originalSendCommand(...args);
};

// Supabase query wrapper with metrics
async function supabaseQuery(queryFn) {
  const startTime = Date.now();
  connectionMetrics.supabase.queries++;

  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;

    if (duration > 1000) {
      console.warn(`[@systems] Slow query: ${duration}ms`);
    }

    return result;
  } catch (error) {
    connectionMetrics.supabase.errors++;
    throw error;
  }
}

// Get connection metrics
function getConnectionMetrics() {
  return {
    ...connectionMetrics,
    timestamp: new Date().toISOString()
  };
}

// Test connections
async function testConnections() {
  try {
    const { data, error } = await supabase.from('repositories').select('count');
    if (error && error.code !== 'PGRST116') throw error;
    console.log('[@systems] Supabase connected');

    await redis.ping();
    console.log('[@systems] Redis connected');

    return true;
  } catch (err) {
    console.error('[@systems] Database connection failed:', err.message);
    return true;
  }
}

// Graceful shutdown
async function closeConnections() {
  console.log('[@systems] Closing database connections...');
  await redis.quit();
}

module.exports = {
  supabase,
  redis,
  testConnections,
  closeConnections,
  supabaseQuery,
  getConnectionMetrics,
  POOL_CONFIG
};
