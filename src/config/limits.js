/**
 * Resource Limits Configuration
 * Prevent abuse and control costs
 */

const RESOURCE_LIMITS = {
  // Repository analysis limits
  MAX_REPO_SIZE_MB: parseInt(process.env.MAX_REPO_SIZE_MB) || 500, // 500MB max
  MAX_FILES_PER_REPO: parseInt(process.env.MAX_FILES_PER_REPO) || 1000,
  MAX_FILE_SIZE_BYTES: parseInt(process.env.MAX_FILE_SIZE_BYTES) || 100 * 1024, // 100KB per file
  
  // Analysis timeouts
  CLONE_TIMEOUT_MS: parseInt(process.env.CLONE_TIMEOUT_MS) || 5 * 60 * 1000, // 5 minutes
  ANALYSIS_TIMEOUT_MS: parseInt(process.env.ANALYSIS_TIMEOUT_MS) || 10 * 60 * 1000, // 10 minutes
  
  // Concurrent job limits
  MAX_CONCURRENT_CLONES: parseInt(process.env.MAX_CONCURRENT_CLONES) || 3,
  MAX_CONCURRENT_ANALYSES: parseInt(process.env.MAX_CONCURRENT_ANALYSES) || 5,
  MAX_CONCURRENT_MODERNIZATIONS: parseInt(process.env.MAX_CONCURRENT_MODERNIZATIONS) || 2,
  
  // Storage limits
  MAX_CLONE_AGE_MS: parseInt(process.env.MAX_CLONE_AGE_MS) || 60 * 60 * 1000, // 1 hour
  MAX_STORED_FILES_PER_REPO: parseInt(process.env.MAX_STORED_FILES_PER_REPO) || 500,
  
  // API limits
  MAX_REQUEST_SIZE_MB: parseInt(process.env.MAX_REQUEST_SIZE_MB) || 10,
  MAX_RESPONSE_SIZE_MB: parseInt(process.env.MAX_RESPONSE_SIZE_MB) || 50,
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // Database limits
  MAX_FINDINGS_PER_REPO: parseInt(process.env.MAX_FINDINGS_PER_REPO) || 1000,
  MAX_ENTITIES_PER_REPO: parseInt(process.env.MAX_ENTITIES_PER_REPO) || 10000,
  
  // Cost controls
  DAILY_ANALYSIS_QUOTA: parseInt(process.env.DAILY_ANALYSIS_QUOTA) || 100,
  MONTHLY_COST_LIMIT_USD: parseInt(process.env.MONTHLY_COST_LIMIT_USD) || 50
};

/**
 * Check if resource usage is within limits
 */
function checkResourceLimits(resource, currentUsage) {
  const limits = {
    repoSize: RESOURCE_LIMITS.MAX_REPO_SIZE_MB * 1024 * 1024,
    fileCount: RESOURCE_LIMITS.MAX_FILES_PER_REPO,
    fileSize: RESOURCE_LIMITS.MAX_FILE_SIZE_BYTES,
    findings: RESOURCE_LIMITS.MAX_FINDINGS_PER_REPO,
    entities: RESOURCE_LIMITS.MAX_ENTITIES_PER_REPO
  };
  
  if (limits[resource] && currentUsage > limits[resource]) {
    return {
      allowed: false,
      limit: limits[resource],
      current: currentUsage,
      message: `Resource limit exceeded: ${resource}`
    };
  }
  
  return { allowed: true };
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get resource usage stats
 */
async function getResourceStats(supabase) {
  try {
    // Get counts
    const { count: repoCount } = await supabase
      .from('repositories')
      .select('*', { count: 'exact', head: true });
    
    const { count: fileCount } = await supabase
      .from('code_files')
      .select('*', { count: 'exact', head: true });
    
    const { count: findingCount } = await supabase
      .from('security_findings')
      .select('*', { count: 'exact', head: true });
    
    // Get today's analyses
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: todayAnalyses } = await supabase
      .from('repo_metrics')
      .select('*', { count: 'exact', head: true })
      .gte('measured_at', today.toISOString());
    
    return {
      repositories: {
        count: repoCount || 0,
        limit: null // No hard limit
      },
      files: {
        count: fileCount || 0,
        limit: null
      },
      findings: {
        count: findingCount || 0,
        limit: RESOURCE_LIMITS.MAX_FINDINGS_PER_REPO * (repoCount || 1)
      },
      dailyAnalyses: {
        count: todayAnalyses || 0,
        limit: RESOURCE_LIMITS.DAILY_ANALYSIS_QUOTA,
        remaining: RESOURCE_LIMITS.DAILY_ANALYSIS_QUOTA - (todayAnalyses || 0)
      }
    };
  } catch (error) {
    console.error('[@systems] Failed to get resource stats:', error.message);
    return null;
  }
}

module.exports = {
  RESOURCE_LIMITS,
  checkResourceLimits,
  formatBytes,
  getResourceStats
};
