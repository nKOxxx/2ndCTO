/**
 * Cleanup Service
 * Automatically remove old data to prevent disk/storage issues
 */

const fs = require('fs').promises;
const path = require('path');
const { supabase } = require('../db');
const { RESOURCE_LIMITS } = require('../config/limits');

const CLONE_DIR = process.env.CLONE_DIR || path.join(require('os').tmpdir(), '2ndcto-clones');

class CleanupService {
  constructor() {
    this.isRunning = false;
    this.interval = null;
  }
  
  /**
   * Start automatic cleanup (runs every 15 minutes)
   */
  start() {
    if (this.interval) return;
    
    console.log('[@systems] Starting cleanup service');
    
    // Run immediately
    this.runCleanup();
    
    // Then every 15 minutes
    this.interval = setInterval(() => {
      this.runCleanup();
    }, 15 * 60 * 1000);
  }
  
  /**
   * Stop cleanup service
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('[@systems] Cleanup service stopped');
    }
  }
  
  /**
   * Run all cleanup tasks
   */
  async runCleanup() {
    if (this.isRunning) {
      console.log('[@systems] Cleanup already running, skipping');
      return;
    }
    
    this.isRunning = true;
    console.log('[@systems] Running cleanup tasks...');
    
    try {
      await Promise.all([
        this.cleanupOldClones(),
        this.cleanupOldMetrics(),
        this.cleanupFailedJobs(),
        this.cleanupOrphanedFiles()
      ]);
      
      console.log('[@systems] Cleanup completed');
    } catch (error) {
      console.error('[@systems] Cleanup error:', error.message);
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Delete clone directories older than MAX_CLONE_AGE_MS
   */
  async cleanupOldClones() {
    try {
      const entries = await fs.readdir(CLONE_DIR, { withFileTypes: true });
      const now = Date.now();
      const maxAge = RESOURCE_LIMITS.MAX_CLONE_AGE_MS;
      let deleted = 0;
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const dirPath = path.join(CLONE_DIR, entry.name);
        const stats = await fs.stat(dirPath);
        const age = now - stats.mtime.getTime();
        
        if (age > maxAge) {
          await fs.rm(dirPath, { recursive: true, force: true });
          deleted++;
          console.log(`[@systems] Deleted old clone: ${entry.name} (${Math.round(age / 60000)} min old)`);
        }
      }
      
      if (deleted > 0) {
        console.log(`[@systems] Cleaned up ${deleted} old clone directories`);
      }
    } catch (error) {
      // Directory might not exist yet
      if (error.code !== 'ENOENT') {
        console.error('[@systems] Clone cleanup error:', error.message);
      }
    }
  }
  
  /**
   * Delete metrics older than 90 days
   */
  async cleanupOldMetrics() {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90); // 90 days ago
      
      const { error, count } = await supabase
        .from('repo_metrics')
        .delete()
        .lt('measured_at', cutoff.toISOString());
      
      if (error) throw error;
      
      if (count > 0) {
        console.log(`[@systems] Deleted ${count} old metric records`);
      }
    } catch (error) {
      console.error('[@systems] Metrics cleanup error:', error.message);
    }
  }
  
  /**
   * Clean up failed/stuck jobs older than 24 hours
   */
  async cleanupFailedJobs() {
    try {
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - 24);
      
      // Clean up failed analysis jobs
      const { error: analysisError, count: analysisCount } = await supabase
        .from('analysis_jobs')
        .delete()
        .eq('status', 'failed')
        .lt('created_at', cutoff.toISOString());
      
      if (analysisError) throw analysisError;
      
      // Clean up old pending jobs (stuck)
      const { error: pendingError, count: pendingCount } = await supabase
        .from('analysis_jobs')
        .delete()
        .eq('status', 'pending')
        .lt('created_at', cutoff.toISOString());
      
      if (pendingError) throw pendingError;
      
      const total = (analysisCount || 0) + (pendingCount || 0);
      if (total > 0) {
        console.log(`[@systems] Cleaned up ${total} old job records`);
      }
    } catch (error) {
      console.error('[@systems] Job cleanup error:', error.message);
    }
  }
  
  /**
   * Delete orphaned code files (files without parent repo)
   */
  async cleanupOrphanedFiles() {
    try {
      // Get all active repo IDs
      const { data: repos, error: repoError } = await supabase
        .from('repositories')
        .select('id');
      
      if (repoError) throw repoError;
      
      const repoIds = repos.map(r => r.id);
      
      // Delete files not belonging to any active repo
      const { error, count } = await supabase
        .from('code_files')
        .delete()
        .not('repo_id', 'in', `(${repoIds.join(',')})`);
      
      if (error) throw error;
      
      if (count > 0) {
        console.log(`[@systems] Deleted ${count} orphaned file records`);
      }
    } catch (error) {
      console.error('[@systems] Orphan cleanup error:', error.message);
    }
  }
  
  /**
   * Force cleanup of a specific repo's data
   */
  async cleanupRepo(repoId) {
    try {
      console.log(`[@systems] Force cleanup for repo ${repoId}`);
      
      // Delete from all tables
      await Promise.all([
        supabase.from('code_files').delete().eq('repo_id', repoId),
        supabase.from('code_entities').delete().eq('repo_id', repoId),
        supabase.from('security_findings').delete().eq('repo_id', repoId),
        supabase.from('repo_metrics').delete().eq('repo_id', repoId),
        supabase.from('analysis_jobs').delete().eq('repo_id', repoId)
      ]);
      
      // Delete clone directory if exists
      try {
        const { data: repo } = await supabase
          .from('repositories')
          .select('owner, name')
          .eq('id', repoId)
          .single();
        
        if (repo) {
          const clonePath = path.join(CLONE_DIR, `${repo.owner}-${repo.name}`);
          await fs.rm(clonePath, { recursive: true, force: true });
        }
      } catch (e) {
        // Ignore clone cleanup errors
      }
      
      console.log(`[@systems] Repo ${repoId} cleanup completed`);
    } catch (error) {
      console.error(`[@systems] Repo cleanup error for ${repoId}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Get disk usage stats
   */
  async getDiskUsage() {
    try {
      // This is platform-specific, simplified version
      const { execSync } = require('child_process');
      
      let usage = null;
      
      try {
        // macOS/Linux
        const output = execSync(`du -sh ${CLONE_DIR} 2>/dev/null || echo "0B"`).toString();
        usage = output.split('\t')[0];
      } catch (e) {
        usage = 'Unknown';
      }
      
      return {
        cloneDirectory: CLONE_DIR,
        usage: usage,
        maxAge: RESOURCE_LIMITS.MAX_CLONE_AGE_MS / 1000 / 60 + ' minutes'
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

// Singleton instance
const cleanupService = new CleanupService();

module.exports = cleanupService;
