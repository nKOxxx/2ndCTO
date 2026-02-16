const { Octokit } = require('octokit');
const { supabase } = require('../db');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Get repo info from GitHub
async function getRepoInfo(owner, name) {
  try {
    const { data } = await octokit.rest.repos.get({
      owner,
      repo: name
    });
    
    return {
      github_id: data.id,
      owner: data.owner.login,
      name: data.name,
      full_name: data.full_name,
      description: data.description,
      clone_url: data.clone_url,
      default_branch: data.default_branch,
      language: data.language,
      size_kb: Math.round(data.size / 1024),
      stars: data.stargazers_count,
      forks: data.forks_count,
      is_private: data.private,
      topics: data.topics || [],
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  } catch (error) {
    console.error('[@systems] GitHub API error:', error.message);
    throw error;
  }
}

// Create or update repo in database
async function createRepo(owner, name) {
  // Get info from GitHub
  const info = await getRepoInfo(owner, name);
  
  // Check if exists
  const { data: existing } = await supabase
    .from('repositories')
    .select('id')
    .eq('github_id', info.github_id)
    .single();
  
  if (existing) {
    // Update
    const { data, error } = await supabase
      .from('repositories')
      .update({
        ...info,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) throw error;
    return { ...data, isNew: false };
  }
  
  // Insert new
  const { data, error } = await supabase
    .from('repositories')
    .insert(info)
    .select()
    .single();
  
  if (error) throw error;
  return { ...data, isNew: true };
}

// Get repo by ID
async function getRepoById(id) {
  const { data, error } = await supabase
    .from('repositories')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

// Update status
async function updateRepoStatus(id, status, error = null) {
  const update = {
    analysis_status: status,
    updated_at: new Date().toISOString()
  };
  
  if (status === 'completed') {
    update.last_analyzed_at = new Date().toISOString();
  }
  
  if (error) {
    update.last_error = error;
  }
  
  await supabase
    .from('repositories')
    .update(update)
    .eq('id', id);
}

module.exports = {
  getRepoInfo,
  createRepo,
  getRepoById,
  updateRepoStatus,
  octokit
};
