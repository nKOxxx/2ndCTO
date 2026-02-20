/**
 * Health Check Service
 * Monitors all system dependencies
 */

const { supabase } = require('../db');
const Redis = require('ioredis');

class HealthService {
  constructor() {
    this.checks = new Map();
    this.startTime = Date.now();
  }
  
  /**
   * Check database connectivity
   */
  async checkDatabase() {
    try {
      const start = Date.now();
      const { data, error } = await supabase
        .from('repositories')
        .select('id', { count: 'exact', head: true });
      
      if (error) throw error;
      
      return {
        status: 'healthy',
        responseTime: Date.now() - start,
        message: 'Connected'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
  
  /**
   * Check Redis connectivity
   */
  async checkRedis() {
    try {
      const redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        connectTimeout: 5000
      });
      
      const start = Date.now();
      await redis.ping();
      const responseTime = Date.now() - start;
      
      await redis.disconnect();
      
      return {
        status: 'healthy',
        responseTime,
        message: 'Connected'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
  
  /**
   * Check GitHub API connectivity
   */
  async checkGitHub() {
    try {
      const axios = require('axios');
      const start = Date.now();
      
      const response = await axios.get('https://api.github.com/status', {
        timeout: 5000,
        headers: {
          'User-Agent': '2ndCTO-HealthCheck'
        }
      });
      
      return {
        status: response.status === 200 ? 'healthy' : 'degraded',
        responseTime: Date.now() - start,
        message: response.data?.status || 'Unknown'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
  
  /**
   * Check disk space
   */
  async checkDiskSpace() {
    try {
      const { execSync } = require('child_process');
      const os = require('os');
      
      let usage = null;
      
      if (process.platform === 'darwin' || process.platform === 'linux') {
        const output = execSync('df -h /tmp 2>/dev/null | tail -1').toString();
        const parts = output.trim().split(/\s+/);
        usage = {
          total: parts[1],
          used: parts[2],
          available: parts[3],
          percent: parts[4]
        };
      } else {
        const total = os.totalmem();
        const free = os.freemem();
        usage = {
          total: Math.round(total / 1024 / 1024) + 'MB',
          used: Math.round((total - free) / 1024 / 1024) + 'MB',
          available: Math.round(free / 1024 / 1024) + 'MB',
          percent: Math.round(((total - free) / total) * 100) + '%'
        };
      }
      
      const percentNum = parseInt(usage.percent);
      
      return {
        status: percentNum > 90 ? 'critical' : percentNum > 80 ? 'warning' : 'healthy',
        usage
      };
    } catch (error) {
      return {
        status: 'unknown',
        error: error.message
      };
    }
  }
  
  /**
   * Get memory usage
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
      external: Math.round(usage.external / 1024 / 1024) + 'MB'
    };
  }
  
  /**
   * Run all health checks
   */
  async getFullHealth() {
    const [db, redis, github, disk] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkGitHub(),
      this.checkDiskSpace()
    ]);
    
    const allHealthy = db.status === 'healthy' && 
                       redis.status === 'healthy' &&
                       github.status !== 'unhealthy';
    
    const anyCritical = db.status === 'unhealthy' || 
                        redis.status === 'unhealthy';
    
    return {
      status: anyCritical ? 'critical' : allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      version: process.env.npm_package_version || '1.1.0',
      environment: process.env.NODE_ENV || 'development',
      dependencies: {
        database: db,
        redis,
        github: github
      },
      system: {
        disk,
        memory: this.getMemoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      }
    };
  }
  
  /**
   * Quick health check (for load balancers)
   */
  async getBasicHealth() {
    // Demo mode - always return ok
    if (process.env.DEMO_MODE === 'true') {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        demo: true
      };
    }

    const db = await this.checkDatabase();
    
    return {
      status: db.status === 'healthy' ? 'ok' : 'error',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new HealthService();
