/**
 * Rate Limiting Configuration
 * Protect against abuse and DDoS
 */

const rateLimit = require('express-rate-limit');

// General API rate limit: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful health checks
  skip: (req) => req.path === '/api/health'
});

// Stricter limit for expensive operations: 10 per hour
const analysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 analyses per hour per IP
  message: {
    error: 'Analysis limit exceeded',
    message: 'Maximum 10 repository analyses per hour. Please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Very strict for code modernization: 5 per hour
const modernizationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 modernization jobs per hour
  message: {
    error: 'Modernization limit exceeded',
    message: 'Maximum 5 code modernization jobs per hour.',
    retryAfter: '1 hour'
  }
});

// Even stricter for login/auth attempts: 5 per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    error: 'Too many authentication attempts',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true // Don't count successful logins
});

// Redis store for rate limiting (shared across server instances)
const createRedisStore = (redisClient) => {
  if (!redisClient) return undefined;
  
  return {
    incr: (key) => redisClient.incr(key),
    decrement: (key) => redisClient.decr(key),
    resetKey: (key) => redisClient.del(key),
    // Default TTL handler
  };
};

module.exports = {
  apiLimiter,
  analysisLimiter,
  modernizationLimiter,
  authLimiter,
  createRedisStore
};
