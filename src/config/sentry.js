/**
 * Error Tracking & Monitoring
 * Sentry integration for production error tracking
 */

const Sentry = require('@sentry/node');

/**
 * Initialize Sentry (only in production)
 */
function initSentry() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[@sentry] Skipping Sentry initialization (development mode)');
    return;
  }
  
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    console.warn('[@sentry] SENTRY_DSN not set, error tracking disabled');
    return;
  }
  
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    release: process.env.npm_package_version || '1.0.0',
    
    // Performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions
    
    // Error filtering
    beforeSend(event) {
      // Filter out known errors
      if (event.exception?.values?.[0]?.type === 'ValidationError') {
        return null; // Don't report validation errors
      }
      
      // Sanitize sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers?.['x-api-key'];
        delete event.request.headers?.['authorization'];
      }
      
      return event;
    },
    
    // Ignore common errors
    ignoreErrors: [
      'Validation failed',
      'Not found',
      'Rate limit exceeded',
      /^Timeout/,
      /^ECONNRESET/,
      /^ENOTFOUND/
    ]
  });
  
  console.log('[@sentry] Error tracking initialized');
}

/**
 * Express error handler for Sentry
 */
function sentryErrorHandler() {
  if (process.env.NODE_ENV !== 'production' || !process.env.SENTRY_DSN) {
    return (err, req, res, next) => next(err);
  }
  
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Only report 500+ errors
      return !error.status || error.status >= 500;
    }
  });
}

/**
 * Express request handler for Sentry
 */
function sentryRequestHandler() {
  if (process.env.NODE_ENV !== 'production' || !process.env.SENTRY_DSN) {
    return (req, res, next) => next();
  }
  
  return Sentry.Handlers.requestHandler();
}

/**
 * Capture exception manually
 */
function captureException(error, context = {}) {
  if (process.env.NODE_ENV !== 'production' || !process.env.SENTRY_DSN) {
    console.error('[@error]', error.message, context);
    return;
  }
  
  Sentry.withScope((scope) => {
    if (context.user) {
      scope.setUser({
        id: context.user.id,
        username: context.user.username
      });
    }
    
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    if (context.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    
    Sentry.captureException(error);
  });
}

/**
 * Capture message
 */
function captureMessage(message, level = 'info') {
  if (process.env.NODE_ENV !== 'production' || !process.env.SENTRY_DSN) {
    console.log(`[@sentry] ${message}`);
    return;
  }
  
  Sentry.captureMessage(message, level);
}

/**
 * Performance monitoring - start transaction
 */
function startTransaction(name, op) {
  if (process.env.NODE_ENV !== 'production' || !process.env.SENTRY_DSN) {
    return {
      finish: () => {},
      setData: () => {}
    };
  }
  
  const transaction = Sentry.startTransaction({
    name,
    op
  });
  
  return transaction;
}

module.exports = {
  initSentry,
  sentryErrorHandler,
  sentryRequestHandler,
  captureException,
  captureMessage,
  startTransaction,
  Sentry
};
