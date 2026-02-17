require('dotenv').config();
const { repoQueue, analysisQueue } = require('./index');
const { ingestRepository } = require('../ingestion/clone');

console.log('[@systems] 2ndCTO Worker starting...');

// Process repo ingestion jobs
repoQueue.process(async (job) => {
  console.log(`[@systems] Processing ingestion job: ${job.id}`);
  const { repoId } = job.data;
  
  try {
    const result = await ingestRepository(repoId);
    console.log(`[@systems] Ingestion job ${job.id} completed`);
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
    // Week 2: Add security scanning, code quality analysis
    console.log(`[@systems] Analysis job ${job.id} placeholder (Week 2)`);
    return { success: true, repoId };
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
