/**
 * CSP Nonce Generator
 * Creates unique nonces for inline scripts/styles
 */

const crypto = require('crypto');

/**
 * Generate a random nonce
 */
function generateNonce() {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Middleware to add nonce to response locals
 */
function nonceMiddleware(req, res, next) {
  res.locals.nonce = generateNonce();
  next();
}

/**
 * Get CSP header with nonce
 */
function getCSPHeader(nonce) {
  return {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", `'nonce-${nonce}'`],
      styleSrc: ["'self'", `'nonce-${nonce}'`],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  };
}

module.exports = {
  generateNonce,
  nonceMiddleware,
  getCSPHeader
};
