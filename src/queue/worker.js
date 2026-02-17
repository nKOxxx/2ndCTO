require('dotenv').config();
const { repoQueue, analysisQueue } = require('./index');
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
    
    // Queue analysis job after successful ingestion
    await analysisQueue.add({ repoId }, {
      attempts: 2,
      timeout: 600000 // 10 minutes
    });
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
  const { repoId } = job.data;
  
  try {
    const result = await analyzer.analyzeRepo(repoId);
    console.log(`[@systems] Analysis job ${job.id} completed:`, result.success ? 'success' : 'failed');
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
