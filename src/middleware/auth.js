/**
 * Authentication Middleware
 * API Key validation and user identification
 */

const AuthService = require('../services/auth');
const { sanitizeLog } = require('./security');

/**
 * Middleware to require API key authentication
 */
const requireAuth = async (req, res, next) => {
  try {
    // Get API key from header
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide an API key in the X-API-Key header'
      });
    }
    
    // Validate key
    const validation = await AuthService.validateApiKey(apiKey);
    
    if (!validation.valid) {
      // Log failed auth attempt
      console.warn(`[@security] Failed auth attempt from ${req.ip}: ${validation.error}`);
      
      return res.status(401).json({
        error: 'Authentication failed',
        message: validation.error
      });
    }
    
    // Attach user info to request
    req.user = {
      id: validation.userId,
      keyId: validation.keyId,
      ...validation.user
    };
    
    // Log successful auth (sanitized)
    console.log(`[@security] Authenticated request from user ${validation.userId}`);
    
    next();
  } catch (error) {
    console.error('[@security] Auth middleware error:', error.message);
    res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Middleware to optionally authenticate (attach user if key provided)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (apiKey) {
      const validation = await AuthService.validateApiKey(apiKey);
      
      if (validation.valid) {
        req.user = {
          id: validation.userId,
          keyId: validation.keyId,
          ...validation.user
        };
      }
    }
    
    next();
  } catch (error) {
    // Silently continue without auth
    next();
  }
};

/**
 * Middleware to track API usage
 */
const trackUsage = (endpoint) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Store original end function
    const originalEnd = res.end;
    
    // Override end to capture response
    res.end = function(...args) {
      // Restore original end
      res.end = originalEnd;
      res.end(...args);
      
      // Log usage if authenticated
      if (req.user?.keyId) {
        const responseTime = Date.now() - startTime;
        
        // Fire and forget - don't block response
        const { supabase } = require('../db');
        supabase.from('api_usage').insert({
          key_id: req.user.keyId,
          endpoint: endpoint || req.route?.path || req.path,
          method: req.method,
          status_code: res.statusCode,
          response_time_ms: responseTime,
          ip_address: req.ip,
          user_agent: req.get('user-agent')?.substring(0, 200)
        }).then(() => {}).catch(() => {});
      }
    };
    
    next();
  };
};

/**
 * Middleware to require specific role/permission
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // For now, just check if user exists
    // In future, add role checking here
    next();
  };
};

/**
 * Audit log middleware
 */
const auditLog = (action, resourceType) => {
  return async (req, res, next) => {
    // Store original end
    const originalEnd = res.end;
    
    res.end = function(...args) {
      res.end = originalEnd;
      res.end(...args);
      
      // Log audit event
      const { supabase } = require('../db');
      supabase.from('audit_log').insert({
        user_id: req.user?.id || null,
        action,
        resource_type: resourceType,
        resource_id: req.params.id || null,
        details: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          body: sanitizeLog(req.body)
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent')?.substring(0, 200)
      }).then(() => {}).catch(() => {});
    };
    
    next();
  };
};

module.exports = {
  requireAuth,
  optionalAuth,
  trackUsage,
  requireRole,
  auditLog
};
