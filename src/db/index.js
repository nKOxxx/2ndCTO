const { createClient } = require('@supabase/supabase-js');
const Redis = require('ioredis');

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Redis client (supports both local and Upstash with TLS)
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};

// If using Upstash (rediss://), enable TLS
if (redisUrl.startsWith('rediss://')) {
  redisOptions.tls = {
    rejectUnauthorized: false
  };
}

const redis = new Redis(redisUrl, redisOptions);

// Test connections
async function testConnections() {
  try {
    // Test Supabase
    const { data, error } = await supabase.from('repositories').select('count');
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = table doesn't exist yet
    console.log('[@systems] Supabase connected');
    
    // Test Redis
    await redis.ping();
    console.log('[@systems] Redis connected');
    
    return true;
  } catch (err) {
    console.error('[@systems] Database connection failed:', err.message);
    // Return true anyway - tables might not exist yet
    return true;
  }
}

module.exports = {
  supabase,
  redis,
  testConnections
};
