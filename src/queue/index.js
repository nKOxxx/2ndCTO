const Queue = require('bull');
const path = require('path');

// Create queues
const repoQueue = new Queue('repo-ingestion', process.env.REDIS_URL || 'redis://localhost:6379');
const analysisQueue = new Queue('code-analysis', process.env.REDIS_URL || 'redis://localhost:6379');

// Queue event handlers
repoQueue.on('completed', (job, result) => {
  console.log(`[@systems] Ingestion completed: ${job.id}`);
});

repoQueue.on('failed', (job, err) => {
  console.error(`[@systems] Ingestion failed: ${job.id}`, err.message);
});

// Add jobs
async function queueRepoIngestion(repoId) {
  const job = await repoQueue.add({ repoId }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    timeout: 300000 // 5 minutes
  });
  console.log(`[@systems] Queued ingestion: ${job.id} for repo ${repoId}`);
  return job.id;
}

async function queueAnalysis(repoId) {
  const job = await analysisQueue.add({ repoId }, {
    attempts: 2,
    timeout: 600000 // 10 minutes
  });
  console.log(`[@systems] Queued analysis: ${job.id} for repo ${repoId}`);
  return job.id;
}

module.exports = {
  repoQueue,
  analysisQueue,
  queueRepoIngestion,
  queueAnalysis
};
