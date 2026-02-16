const { createClient } = require('@supabase/supabase-js');
const Redis = require('ioredis');

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Test connections
async function testConnections() {
  try {
    // Test Supabase
    const { data, error } = await supabase.from('repositories').select('count');
    if (error) throw error;
    console.log('[@systems] Supabase connected');
    
    // Test Redis
    await redis.ping();
    console.log('[@systems] Redis connected');
    
    return true;
  } catch (err) {
    console.error('[@systems] Database connection failed:', err.message);
    return false;
  }
}

module.exports = {
  supabase,
  redis,
  testConnections
};
