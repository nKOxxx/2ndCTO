const Queue = require('bull');
const Redis = require('ioredis');

// Parse Redis URL for Bull
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let redisOptions = {};

// If using rediss:// (TLS), configure Bull properly
if (redisUrl.startsWith('rediss://')) {
  redisOptions = {
    redis: {
      tls: {
        rejectUnauthorized: false
      }
    }
  };
}

// Create queues with proper config
const repoQueue = new Queue('repo-ingestion', redisUrl, redisOptions);
const analysisQueue = new Queue('code-analysis', redisUrl, redisOptions);

// Queue event handlers
repoQueue.on('completed', (job, result) => {
  console.log(`[@systems] Ingestion completed: ${job.id}`);
});

repoQueue.on('failed', (job, err) => {
  console.error(`[@systems] Ingestion failed: ${job.id}`, err.message);
});

repoQueue.on('error', (err) => {
  console.error(`[@systems] Queue error:`, err.message);
});

// Add jobs
async function queueRepoIngestion(repoId) {
  try {
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
  } catch (error) {
    console.error(`[@systems] Failed to queue:`, error.message);
    throw error;
  }
}

async function queueAnalysis(repoId, repoPath = null) {
  try {
    const job = await analysisQueue.add({ repoId, repoPath }, {
      attempts: 2,
      timeout: 600000 // 10 minutes
    });
    console.log(`[@systems] Queued analysis: ${job.id} for repo ${repoId}`);
    return job.id;
  } catch (error) {
    console.error(`[@systems] Failed to queue analysis:`, error.message);
    throw error;
  }
}

module.exports = {
  repoQueue,
  analysisQueue,
  queueRepoIngestion,
  queueAnalysis
};
