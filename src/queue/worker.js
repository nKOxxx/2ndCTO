require('dotenv').config();
const { repoQueue, analysisQueue, queueAnalysis } = require('./index');
const { ingestRepository } = require('../ingestion/clone');
const CodeAnalyzer = require('../analysis');

const analyzer = new CodeAnalyzer();

console.log('[@systems] 2ndCTO Worker starting...');

// Process repo ingestion jobs
repoQueue.process(async (job) => {
  console.log(`[@systems] Processing ingestion job: ${job.id}`);
  const { repoId } = job.data;
  
  try {
    const result = await ingestRepository(repoId);
    console.log(`[@systems] Ingestion job ${job.id} completed`);
    
    // Queue analysis job with repo path
    await queueAnalysis(repoId, result.repoPath);
    console.log(`[@systems] Queued analysis for repo ${repoId}`);
    
    return result;
  } catch (error) {
    console.error(`[@systems] Ingestion job ${job.id} failed:`, error.message);
    throw error;
  }
});

// Process analysis jobs
analysisQueue.process(async (job) => {
  console.log(`[@systems] Processing analysis job: ${job.id}`);
  const { repoId, repoPath } = job.data;
  
  try {
    const result = await analyzer.analyzeRepo(repoId, repoPath);
    console.log(`[@systems] Analysis job ${job.id} completed:`, result.success ? 'success' : 'failed');
    
    // Cleanup clone directory
    if (repoPath) {
      try {
        const fs = require('fs').promises;
        await fs.rm(repoPath, { recursive: true, force: true });
        console.log(`[@systems] Cleaned up ${repoPath}`);
      } catch (err) {
        console.error('[@systems] Cleanup failed:', err.message);
      }
    }
    
    return result;
  } catch (error) {
    console.error(`[@systems] Analysis job ${job.id} failed:`, error.message);
    throw error;
  }
});

// Handle shutdown
process.on('SIGTERM', async () => {
  console.log('[@systems] Shutting down worker...');
  await repoQueue.close();
  await analysisQueue.close();
  process.exit(0);
});

console.log('[@systems] Worker ready');
