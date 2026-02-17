/**
 * Security Middleware
 * Input validation, sanitization, and security headers
 */

const { body, param, validationResult } = require('express-validator');
const path = require('path');

// Validate repository name (prevent path traversal)
const validateRepoName = (name) => {
  if (!name || typeof name !== 'string') return false;
  
  // Allow alphanumeric, hyphens, underscores, dots
  // GitHub repo names: max 100 chars, can't start/end with hyphen
  const validPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,98}[a-zA-Z0-9]$/;
  
  // Block path traversal attempts
  const dangerousPattern = /(\.{2}|[\/\\]|%2e%2e|%2f|%5c)/i;
  
  return validPattern.test(name) && !dangerousPattern.test(name);
};

// Validate GitHub owner name
const validateOwnerName = (owner) => {
  if (!owner || typeof owner !== 'string') return false;
  
  // GitHub usernames: alphanumeric + hyphens, max 39 chars
  const validPattern = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
  
  return validPattern.test(owner);
};

// Sanitize file paths (prevent directory traversal)
const sanitizePath = (filePath) => {
  if (!filePath || typeof filePath !== 'string') return null;
  
  // Normalize and remove traversal attempts
  let normalized = path.normalize(filePath);
  
  // Remove any leading traversal
  normalized = normalized.replace(/^(\.\.[\/\\])+/, '');
  
  // Block absolute paths
  if (path.isAbsolute(normalized)) {
    normalized = normalized.replace(/^[\/\\]/, '');
  }
  
  // Block hidden files and common sensitive paths
  const blockedPaths = [
    /^\./,           // Hidden files
    /\.env/i,        // Environment files
    /\.git/i,        // Git internals
    /node_modules/i,  // Dependencies
    /\.ssh/i,        // SSH keys
    /\.aws/i,        // AWS credentials
    /etc\/passwd/i,  // System files
    /\.htaccess/i,   // Apache config
    /config\.json/i  // Config files
  ];
  
  for (const pattern of blockedPaths) {
    if (pattern.test(normalized)) {
      return null;
    }
  }
  
  return normalized;
};

// Validation middleware for POST /repos
const validateAddRepo = [
  body('owner')
    .trim()
    .notEmpty().withMessage('Owner is required')
    .isLength({ max: 39 }).withMessage('Owner name too long')
    .custom((value) => {
      if (!validateOwnerName(value)) {
        throw new Error('Invalid owner name format');
      }
      return true;
    }),
  
  body('name')
    .trim()
    .notEmpty().withMessage('Repository name is required')
    .isLength({ max: 100 }).withMessage('Repository name too long')
    .custom((value) => {
      if (!validateRepoName(value)) {
        throw new Error('Invalid repository name format');
      }
      return true;
    }),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array().map(e => ({
          field: e.path,
          message: e.msg
        }))
      });
    }
    next();
  }
];

// Validation middleware for UUID params
const validateUUID = [
  param('id')
    .trim()
    .notEmpty().withMessage('ID is required')
    .isUUID().withMessage('Invalid ID format'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid ID format',
        details: errors.array()
      });
    }
    next();
  }
];

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // HSTS (HTTPS only)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

// Request size limiter
const requestSizeLimiter = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || 0);
    const maxBytes = parseInt(maxSize) * 1024 * 1024;
    
    if (contentLength > maxBytes) {
      return res.status(413).json({
        error: 'Request entity too large',
        maxSize: maxSize
      });
    }
    
    next();
  };
};

// Sanitize logging (prevent secrets in logs)
const sanitizeLog = (obj) => {
  const sensitiveKeys = [
    'token', 'password', 'secret', 'key', 'auth',
    'authorization', 'cookie', 'session'
  ];
  
  const sanitized = { ...obj };
  
  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]';
    }
    
    // Recurse into nested objects (shallow only)
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeLog(sanitized[key]);
    }
  }
  
  return sanitized;
};

module.exports = {
  validateRepoName,
  validateOwnerName,
  sanitizePath,
  validateAddRepo,
  validateUUID,
  securityHeaders,
  requestSizeLimiter,
  sanitizeLog
};
