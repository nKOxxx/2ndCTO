const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const glob = require('glob');
const { updateRepoStatus } = require('./github');
const { supabase } = require('../db');

const CLONE_DIR = process.env.CLONE_DIR || path.join(os.tmpdir(), '2ndcto-clones');

// Ensure clone directory exists
async function ensureCloneDir() {
  try {
    await fs.mkdir(CLONE_DIR, { recursive: true });
  } catch (err) {
    console.error('[@systems] Failed to create clone dir:', err.message);
  }
}

// Clone repository
async function cloneRepository(repo) {
  await ensureCloneDir();
  
  const repoPath = path.join(CLONE_DIR, `${repo.owner}-${repo.name}`);
  
  // Remove if exists
  try {
    await fs.rm(repoPath, { recursive: true, force: true });
  } catch (err) {
    // Ignore
  }
  
  console.log(`[@systems] Cloning ${repo.full_name}...`);
  
  const git = simpleGit();
  
  try {
    await git.clone(repo.clone_url, repoPath, [
      '--depth', '1', // Shallow clone for speed
      '--single-branch',
      '--branch', repo.default_branch || 'main'
    ]);
    
    console.log(`[@systems] Cloned to ${repoPath}`);
    return repoPath;
    
  } catch (error) {
    console.error('[@systems] Clone failed:', error.message);
    throw error;
  }
}

// Get all code files
async function getCodeFiles(repoPath) {
  const patterns = [
    '**/*.js',
    '**/*.jsx',
    '**/*.ts',
    '**/*.tsx',
    '**/*.py',
    '**/*.go',
    '**/*.rs',
    '**/*.java',
    '**/*.c',
    '**/*.cpp',
    '**/*.h'
  ];
  
  const files = [];
  
  for (const pattern of patterns) {
    const matches = await glob.glob(pattern, {
      cwd: repoPath,
      ignore: [
        '**/node_modules/**',
        '**/vendor/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/*.min.js',
        '**/*.test.js',
        '**/*.spec.js'
      ],
      absolute: true
    });
    files.push(...matches);
  }
  
  // Limit total files
  const maxFiles = 1000;
  if (files.length > maxFiles) {
    console.log(`[@systems] Limiting to ${maxFiles} files (found ${files.length})`);
    return files.slice(0, maxFiles);
  }
  
  return files;
}

// Read file content
async function readFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (err) {
    console.error(`[@systems] Failed to read ${filePath}:`, err.message);
    return null;
  }
}

// Get file stats
async function getFileStats(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      modified: stats.mtime
    };
  } catch (err) {
    return { size: 0, modified: null };
  }
}

// Store file in database
async function storeFile(repoId, filePath, relativePath, content, stats) {
  const lines = content.split('\n').length;
  
  const { data, error } = await supabase
    .from('code_files')
    .upsert({
      repo_id: repoId,
      file_path: relativePath,
      content: content.substring(0, 50000), // Limit content
      language: detectLanguage(relativePath),
      line_count: lines,
      size_bytes: stats.size,
      last_modified: stats.modified
    }, {
      onConflict: 'repo_id,file_path'
    })
    .select()
    .single();
  
  if (error) {
    console.error('[@systems] Failed to store file:', error.message);
    return null;
  }
  
  return data;
}

// Detect language from extension
function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.go': 'go',
    '.rs': 'rust',
    '.java': 'java',
    '.c': 'c',
    '.cpp': 'cpp',
    '.h': 'c'
  };
  return map[ext] || 'unknown';
}

// Full ingestion process
async function ingestRepository(repoId) {
  const startTime = Date.now();
  
  try {
    // Get repo from DB
    const { getRepoById } = require('./github');
    const repo = await getRepoById(repoId);
    
    if (!repo) {
      throw new Error('Repository not found');
    }
    
    // Update status
    await updateRepoStatus(repoId, 'cloning');
    
    // Clone
    const repoPath = await cloneRepository(repo);
    
    // Update status
    await updateRepoStatus(repoId, 'parsing');
    
    // Get files
    const files = await getCodeFiles(repoPath);
    console.log(`[@systems] Found ${files.length} code files`);
    
    // Store files
    let stored = 0;
    for (const file of files) {
      const relativePath = path.relative(repoPath, file);
      const content = await readFile(file);
      
      if (!content || content.length > 100000) {
        continue; // Skip large files
      }
      
      const stats = await getFileStats(file);
      await storeFile(repoId, file, relativePath, content, stats);
      stored++;
      
      if (stored % 100 === 0) {
        console.log(`[@systems] Stored ${stored}/${files.length} files`);
      }
    }
    
    // Update status
    await updateRepoStatus(repoId, 'completed');
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[@systems] Ingestion complete: ${stored} files in ${duration}s`);
    
    // Cleanup
    try {
      await fs.rm(repoPath, { recursive: true, force: true });
    } catch (err) {
      console.error('[@systems] Cleanup failed:', err.message);
    }
    
    return {
      success: true,
      filesStored: stored,
      duration: duration
    };
    
  } catch (error) {
    console.error('[@systems] Ingestion failed:', error.message);
    await updateRepoStatus(repoId, 'failed', error.message);
    throw error;
  }
}

module.exports = {
  cloneRepository,
  getCodeFiles,
  ingestRepository,
  detectLanguage
};
