const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { createRepo, getRepoById, updateRepoStatus } = require('../ingestion/github');
const { queueRepoIngestion, modernizationQueue } = require('../queue');
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
    
    // Handle missing entities table/data
    const safeEntities = entities || [];
    
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
        total: safeEntities.length,
        functions: safeEntities.filter(e => e.type === 'function').length,
        classes: safeEntities.filter(e => e.type === 'class').length
      }
    };
    
    res.json(report);
    
  } catch (error) {
    console.error('[@systems] Get report failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// WEEK 3: Bus Factor Analysis
router.get('/repos/:id/bus-factor', async (req, res) => {
  try {
    const repo = await getRepoById(req.params.id);
    
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    
    // Get stored bus factor if available
    const { data: metrics, error: metricsError } = await supabase
      .from('repo_metrics')
      .select('bus_factor, measured_at')
      .eq('repo_id', req.params.id)
      .order('measured_at', { ascending: false })
      .limit(1)
      .single();
    
    if (metricsError || !metrics) {
      return res.json({
        repo_id: req.params.id,
        status: 'not_calculated',
        message: 'Bus factor not yet calculated. Re-analyze repo with git history.'
      });
    }
    
    res.json({
      repo_id: req.params.id,
      owner: repo.owner,
      name: repo.name,
      bus_factor: metrics.bus_factor,
      measured_at: metrics.measured_at,
      status: 'calculated'
    });
    
  } catch (error) {
    console.error('[@systems] Get bus factor failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// AI Insights endpoint
router.get('/repos/:id/insights', async (req, res) => {
  try {
    const repo = await getRepoById(req.params.id);
    
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    
    // Get report data
    const { data: findings } = await supabase
      .from('security_findings')
      .select('*')
      .eq('repo_id', req.params.id);
    
    const { data: entities } = await supabase
      .from('code_entities')
      .select('type')
      .eq('repo_id', req.params.id);
    
    // Generate AI insights
    const riskScore = repo.risk_score || 0;
    const summary = {
      critical: findings?.filter(f => f.severity === 'critical').length || 0,
      high: findings?.filter(f => f.severity === 'high').length || 0,
      medium: findings?.filter(f => f.severity === 'medium').length || 0,
      total: findings?.length || 0
    };
    
    const grade = riskScore >= 90 ? { letter: 'F', label: 'Critical', color: 'danger' } :
                  riskScore >= 70 ? { letter: 'D', label: 'Poor', color: 'warning' } :
                  riskScore >= 50 ? { letter: 'C', label: 'Fair', color: 'caution' } :
                  riskScore >= 30 ? { letter: 'B', label: 'Good', color: 'good' } :
                                    { letter: 'A', label: 'Excellent', color: 'success' };
    
    const insights = {
      summary: {
        grade,
        score: riskScore,
        text: riskScore >= 80 ? 'Critical attention required. Immediate action needed.' :
              riskScore >= 50 ? 'Moderate risks detected. Improvements recommended.' :
              'Healthy codebase with good practices.',
        tone: riskScore >= 80 ? 'urgent' : riskScore >= 50 ? 'caution' : 'positive'
      },
      priorities: [
        {
          rank: 1,
          title: summary.critical > 0 ? `Fix ${summary.critical} critical security issues` : 'Review security findings',
          impact: `Reduces risk by ~${Math.min(30, summary.critical * 10)} points`,
          effort: summary.critical > 0 ? '1-2 days' : '4-6 hours',
          type: 'security'
        },
        {
          rank: 2,
          title: 'Address knowledge concentration',
          impact: 'Improves team resilience',
          effort: '2-3 weeks',
          type: 'process'
        },
        {
          rank: 3,
          title: `Resolve ${summary.medium} medium-priority items`,
          impact: 'Reduces technical debt',
          effort: '3-5 days',
          type: 'quick-win'
        }
      ],
      recommendations: [
        {
          title: riskScore >= 70 ? 'Emergency Security Sprint' : 'Security Review',
          description: riskScore >= 70 ? 'Dedicate next sprint to critical fixes' : 'Schedule regular security reviews',
          timeline: riskScore >= 70 ? '1-2 weeks' : 'Ongoing',
          impact: riskScore >= 70 ? 'Reduces risk by 60-80%' : 'Maintains code health'
        },
        {
          title: 'Implement Automated Scanning',
          description: 'Add security scanning to CI/CD',
          timeline: '1 week',
          impact: 'Prevents 80% of issues'
        }
      ],
      generated_at: new Date().toISOString()
    };
    
    res.json(insights);
    
  } catch (error) {
    console.error('[@systems] AI insights failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// WEEK 3 PART 2: Code Modernization
router.post('/repos/:id/modernize', async (req, res) => {
  try {
    const repo = await getRepoById(req.params.id);
    
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    
    const { 
      targetLanguage = 'es2022',
      transformations = ['callbacks', 'vars', 'functions', 'modules'],
      files = []
    } = req.body;
    
    // Create modernization job
    const { data: job, error } = await supabase
      .from('modernization_jobs')
      .insert({
        repo_id: req.params.id,
        target_language: targetLanguage,
        transformations,
        file_count: files.length,
        status: 'queued',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Queue the modernization job
    await modernizationQueue.add({
      jobId: job.id,
      repoId: req.params.id,
      targetLanguage,
      transformations,
      files
    }, {
      attempts: 2,
      timeout: 600000 // 10 minutes
    });
    
    res.json({
      success: true,
      job_id: job.id,
      message: 'Modernization job queued',
      files_to_process: files.length,
      estimated_time: `${Math.ceil(files.length * 0.5)} minutes`
    });
    
  } catch (error) {
    console.error('[@systems] Modernize failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get modernization job status
router.get('/modernize/:jobId', async (req, res) => {
  try {
    const { data: job, error } = await supabase
      .from('modernization_jobs')
      .select('*')
      .eq('id', req.params.jobId)
      .single();
    
    if (error || !job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({
      job_id: job.id,
      status: job.status,
      progress: job.progress || 0,
      files_processed: job.files_processed || 0,
      files_total: job.file_count,
      results: job.results || null,
      error: job.error || null,
      created_at: job.created_at,
      completed_at: job.completed_at
    });
    
  } catch (error) {
    console.error('[@systems] Get modernize status failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Download modernized file
router.get('/modernize/:jobId/download/:fileId', async (req, res) => {
  try {
    const { data: job, error } = await supabase
      .from('modernization_jobs')
      .select('results')
      .eq('id', req.params.jobId)
      .single();
    
    if (error || !job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const file = job.results?.files?.find(f => f.id === req.params.fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.send(file.content);
    
  } catch (error) {
    console.error('[@systems] Download failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// WEEK 3: Trend Analysis for a repo
router.get('/repos/:id/trends', async (req, res) => {
  try {
    const repo = await getRepoById(req.params.id);
    
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: metrics, error } = await supabase
      .from('repo_metrics')
      .select('*')
      .eq('repo_id', req.params.id)
      .gte('measured_at', since)
      .order('measured_at', { ascending: true });
    
    if (error) throw error;
    
    if (!metrics || metrics.length === 0) {
      return res.json({
        repo_id: req.params.id,
        owner: repo.owner,
        name: repo.name,
        data_points: 0,
        message: 'No trend data available. Analyze repo multiple times to build trends.'
      });
    }
    
    // Calculate trend direction
    const first = metrics[0];
    const last = metrics[metrics.length - 1];
    
    const busFactorTrend = last.bus_factor - first.bus_factor;
    const riskScoreTrend = last.risk_score - first.risk_score;
    
    res.json({
      repo_id: req.params.id,
      owner: repo.owner,
      name: repo.name,
      period_days: parseInt(days),
      data_points: metrics.length,
      latest: {
        measured_at: last.measured_at,
        bus_factor: last.bus_factor,
        risk_score: last.risk_score,
        total_findings: last.total_findings,
        critical_findings: last.critical_findings
      },
      trends: {
        bus_factor: {
          change: busFactorTrend,
          direction: busFactorTrend > 0 ? 'improving' : busFactorTrend < 0 ? 'worsening' : 'stable'
        },
        risk_score: {
          change: riskScoreTrend,
          direction: riskScoreTrend < 0 ? 'improving' : riskScoreTrend > 0 ? 'worsening' : 'stable'
        }
      },
      history: metrics.map(m => ({
        measured_at: m.measured_at,
        bus_factor: m.bus_factor,
        risk_score: m.risk_score,
        total_findings: m.total_findings,
        critical_findings: m.critical_findings
      }))
    });
    
  } catch (error) {
    console.error('[@systems] Get trends failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// WEEK 3: Global trends across all repos
router.get('/trends', async (req, res) => {
  try {
    const { data: latestMetrics, error } = await supabase
      .from('repo_metrics')
      .select('*, repositories(owner, name)')
      .order('measured_at', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    
    if (!latestMetrics || latestMetrics.length === 0) {
      return res.json({
        repos_analyzed: 0,
        message: 'No trend data available.'
      });
    }
    
    // Aggregate stats
    const avgBusFactor = latestMetrics.reduce((sum, m) => sum + (m.bus_factor || 0), 0) / latestMetrics.length;
    const avgRiskScore = latestMetrics.reduce((sum, m) => sum + (m.risk_score || 0), 0) / latestMetrics.length;
    const criticalRepos = latestMetrics.filter(m => m.bus_factor <= 1.5).length;
    
    res.json({
      repos_analyzed: latestMetrics.length,
      summary: {
        avg_bus_factor: Math.round(avgBusFactor * 10) / 10,
        avg_risk_score: Math.round(avgRiskScore),
        critical_bus_factor_repos: criticalRepos,
        total_findings: latestMetrics.reduce((sum, m) => sum + (m.total_findings || 0), 0),
        critical_findings: latestMetrics.reduce((sum, m) => sum + (m.critical_findings || 0), 0)
      },
      repos: latestMetrics.map(m => ({
        id: m.repo_id,
        owner: m.repositories?.owner,
        name: m.repositories?.name,
        bus_factor: m.bus_factor,
        risk_score: m.risk_score,
        measured_at: m.measured_at
      }))
    });
    
  } catch (error) {
    console.error('[@systems] Get global trends failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
