/**
 * Admin Routes
 * System management endpoints (require admin authentication)
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../db');
const healthService = require('../services/health');
const cleanupService = require('../services/cleanup');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sanitizeLog } = require('../middleware/security');

// Simple admin check - in production, check admin role in database
const isAdmin = async (req, res, next) => {
  // For demo: check if user has specific email or admin flag
  // In production: check req.user.role === 'admin'
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];

  if (!req.user || !adminEmails.includes(req.user.email)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

// Apply auth and admin check to all routes
router.use(requireAuth, isAdmin);

/**
 * GET /api/admin/stats
 * System statistics
 */
router.get('/stats', async (req, res) => {
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

    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: keyCount } = await supabase
      .from('api_keys')
      .select('*', { count: 'exact', head: true });

    // Get today's API usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: todayRequests } = await supabase
      .from('api_usage')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // Get recent analysis jobs
    const { data: recentJobs } = await supabase
      .from('analysis_jobs')
      .select('status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      timestamp: new Date().toISOString(),
      counts: {
        repositories: repoCount || 0,
        files: fileCount || 0,
        findings: findingCount || 0,
        users: userCount || 0,
        apiKeys: keyCount || 0
      },
      usage: {
        todayRequests: todayRequests || 0,
        recentJobs: recentJobs || []
      },
      system: await healthService.getFullHealth()
    });
  } catch (error) {
    console.error('[@admin] Stats error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/audit
 * View audit log
 */
router.get('/audit', async (req, res) => {
  try {
    const { limit = 100, offset = 0, userId, action } = req.query;

    let query = supabase
      .from('audit_log')
      .select('*, users(email)')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (userId) query = query.eq('user_id', userId);
    if (action) query = query.eq('action', action);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      logs: data,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: count
      }
    });
  } catch (error) {
    console.error('[@admin] Audit error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/purge
 * Clear old data
 */
router.post('/purge', async (req, res) => {
  try {
    const { type, olderThanDays = 30 } = req.body;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    let result;

    switch (type) {
      case 'clones':
        await cleanupService.runCleanup();
        result = { message: 'Clone directories cleaned' };
        break;

      case 'metrics':
        await cleanupService.cleanupOldMetrics();
        result = { message: `Metrics older than ${olderThanDays} days deleted` };
        break;

      case 'jobs':
        await cleanupService.cleanupFailedJobs();
        result = { message: 'Failed jobs cleaned' };
        break;

      case 'orphaned':
        await cleanupService.cleanupOrphanedFiles();
        result = { message: 'Orphaned files cleaned' };
        break;

      case 'all':
        await cleanupService.runCleanup();
        result = { message: 'All cleanup tasks executed' };
        break;

      default:
        return res.status(400).json({
          error: 'Invalid purge type',
          validTypes: ['clones', 'metrics', 'jobs', 'orphaned', 'all']
        });
    }

    // Log admin action
    await supabase.from('audit_log').insert({
      user_id: req.user.id,
      action: 'admin_purge',
      resource_type: type,
      details: { olderThanDays },
      ip_address: req.ip
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[@admin] Purge error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/repos/:id
 * Force delete a repository and all its data
 */
router.delete('/repos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get repo info for logging
    const { data: repo } = await supabase
      .from('repositories')
      .select('owner, name')
      .eq('id', id)
      .single();

    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Force cleanup
    await cleanupService.cleanupRepo(id);

    // Delete repo record
    await supabase.from('repositories').delete().eq('id', id);

    // Log admin action
    await supabase.from('audit_log').insert({
      user_id: req.user.id,
      action: 'admin_delete_repo',
      resource_id: id,
      resource_type: 'repository',
      details: { owner: repo.owner, name: repo.name },
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: `Repository ${repo.owner}/${repo.name} deleted`
    });
  } catch (error) {
    console.error('[@admin] Delete repo error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/users
 * List all users
 */
router.get('/users', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const { data, error, count } = await supabase
      .from('users')
      .select('id, email, username, created_at, last_login, is_active', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;

    res.json({
      users: data,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: count
      }
    });
  } catch (error) {
    console.error('[@admin] Users error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/users/:id/suspend
 * Suspend a user
 */
router.post('/users/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await supabase
      .from('users')
      .update({ is_active: false, suspended_at: new Date().toISOString() })
      .eq('id', id);

    // Revoke all API keys
    await supabase
      .from('api_keys')
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq('user_id', id);

    // Log admin action
    await supabase.from('audit_log').insert({
      user_id: req.user.id,
      action: 'admin_suspend_user',
      resource_id: id,
      resource_type: 'user',
      details: { reason },
      ip_address: req.ip
    });

    res.json({ success: true, message: 'User suspended' });
  } catch (error) {
    console.error('[@admin] Suspend error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
