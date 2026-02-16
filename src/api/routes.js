const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { createRepo, getRepoById, updateRepoStatus } = require('../ingestion/github');
const { queueRepoIngestion } = require('../queue');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: '2ndCTO' });
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
    const { supabase } = require('../db');
    
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

module.exports = router;
