const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { createRepo, getRepoById, updateRepoStatus } = require('../ingestion/github');
const { queueRepoIngestion } = require('../queue');
const { supabase } = require('../db');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: '2ndCTO', version: '0.2.0' });
});

// Add repository
router.post('/repos', async (req, res) => {
  try {
    const { owner, name, github_url } = req.body;
    
    if (!owner || !name) {
      return res.status(400).json({ error: 'owner and name required' });
    }
    
    console.log(`[@systems] Adding repo: ${owner}/${name}`);
    
    // Create/update in database
    const repo = await createRepo(owner, name);
    
    // Queue for ingestion
    if (repo.isNew || repo.analysis_status === 'failed') {
      await updateRepoStatus(repo.id, 'queued');
      await queueRepoIngestion(repo.id);
    }
    
    res.json({
      success: true,
      repo: {
        id: repo.id,
        owner: repo.owner,
        name: repo.name,
        status: repo.analysis_status,
        isNew: repo.isNew
      }
    });
    
  } catch (error) {
    console.error('[@systems] Add repo failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get repository
router.get('/repos/:id', async (req, res) => {
  try {
    const repo = await getRepoById(req.params.id);
    
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    
    res.json({ repo });
    
  } catch (error) {
    console.error('[@systems] Get repo failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get repo status
router.get('/repos/:id/status', async (req, res) => {
  try {
    const repo = await getRepoById(req.params.id);
    
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    
    res.json({
      id: repo.id,
      status: repo.analysis_status,
      risk_score: repo.risk_score,
      last_analyzed: repo.last_analyzed_at,
      error: repo.last_error
    });
    
  } catch (error) {
    console.error('[@systems] Get status failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Trigger analysis
router.post('/repos/:id/analyze', async (req, res) => {
  try {
    const repo = await getRepoById(req.params.id);
    
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    
    await updateRepoStatus(repo.id, 'queued');
    const jobId = await queueRepoIngestion(repo.id);
    
    res.json({
      success: true,
      message: 'Analysis queued',
      jobId
    });
    
  } catch (error) {
    console.error('[@systems] Analyze failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// List repositories
router.get('/repos', async (req, res) => {
  try {
    const { data: repos, error } = await supabase
      .from('repositories')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    res.json({ repos });
    
  } catch (error) {
    console.error('[@systems] List repos failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// WEEK 2: Get security findings
router.get('/repos/:id/security', async (req, res) => {
  try {
    const { severity, category, limit = 50 } = req.query;
    
    let query = supabase
      .from('security_findings')
      .select('*')
      .eq('repo_id', req.params.id)
      .order('severity', { ascending: false })
      .limit(parseInt(limit));
    
    if (severity) {
      query = query.eq('severity', severity);
    }
    
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data: findings, error } = await query;
    
    if (error) throw error;
    
    // Calculate summary
    const summary = {
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
      total: findings.length
    };
    
    res.json({ findings, summary });
    
  } catch (error) {
    console.error('[@systems] Get security findings failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// WEEK 2: Get code entities (functions, classes)
router.get('/repos/:id/entities', async (req, res) => {
  try {
    const { type, limit = 100 } = req.query;
    
    let query = supabase
      .from('code_entities')
      .select('*, code_files(file_path)')
      .eq('repo_id', req.params.id)
      .limit(parseInt(limit));
    
    if (type) {
      query = query.eq('type', type);
    }
    
    const { data: entities, error } = await query;
    
    if (error) throw error;
    
    res.json({ entities, count: entities.length });
    
  } catch (error) {
    console.error('[@systems] Get entities failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// WEEK 2: Get analysis report
router.get('/repos/:id/report', async (req, res) => {
  try {
    const repo = await getRepoById(req.params.id);
    
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    
    // Get findings
    const { data: findings } = await supabase
      .from('security_findings')
      .select('*')
      .eq('repo_id', req.params.id);
    
    // Get entities count
    const { data: entities } = await supabase
      .from('code_entities')
      .select('type')
      .eq('repo_id', req.params.id);
    
    // Build report
    const report = {
      repo: {
        id: repo.id,
        owner: repo.owner,
        name: repo.name,
        language: repo.language,
        stars: repo.stars
      },
      analysis: {
        status: repo.analysis_status,
        risk_score: repo.risk_score,
        last_analyzed: repo.last_analyzed_at
      },
      security: {
        summary: {
          critical: findings.filter(f => f.severity === 'critical').length,
          high: findings.filter(f => f.severity === 'high').length,
          medium: findings.filter(f => f.severity === 'medium').length,
          low: findings.filter(f => f.severity === 'low').length,
          total: findings.length
        },
        categories: findings.reduce((acc, f) => {
          acc[f.category] = (acc[f.category] || 0) + 1;
          return acc;
        }, {}),
        top_findings: findings
          .filter(f => ['critical', 'high'].includes(f.severity))
          .slice(0, 10)
      },
      entities: {
        total: entities.length,
        functions: entities.filter(e => e.type === 'function').length,
        classes: entities.filter(e => e.type === 'class').length
      }
    };
    
    res.json(report);
    
  } catch (error) {
    console.error('[@systems] Get report failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
