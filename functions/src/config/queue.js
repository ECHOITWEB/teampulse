const Bull = require('bull');
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');

// Queue configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create queues for different job types
const queues = {
  // AI processing queue
  aiProcessing: new Bull('ai-processing', REDIS_URL, {
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  }),
  
  // Message processing queue
  messageProcessing: new Bull('message-processing', REDIS_URL, {
    defaultJobOptions: {
      removeOnComplete: 200,
      removeOnFail: 100,
      attempts: 2
    }
  }),
  
  // Analytics queue
  analytics: new Bull('analytics', REDIS_URL, {
    defaultJobOptions: {
      removeOnComplete: 500,
      removeOnFail: 200,
      attempts: 1
    }
  }),
  
  // Notification queue
  notifications: new Bull('notifications', REDIS_URL, {
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3
    }
  }),
  
  // File processing queue
  fileProcessing: new Bull('file-processing', REDIS_URL, {
    defaultJobOptions: {
      removeOnComplete: 50,
      removeOnFail: 25,
      attempts: 2,
      timeout: 60000 // 1 minute timeout
    }
  })
};

// Set up Bull Board for monitoring
const serverAdapter = new ExpressAdapter();
const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: Object.values(queues).map(queue => new BullAdapter(queue)),
  serverAdapter: serverAdapter
});

serverAdapter.setBasePath('/admin/queues');

// Queue event handlers
Object.entries(queues).forEach(([name, queue]) => {
  queue.on('completed', (job) => {
    console.log(`✅ Job ${job.id} in ${name} queue completed`);
  });
  
  queue.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} in ${name} queue failed:`, err.message);
  });
  
  queue.on('stalled', (job) => {
    console.warn(`⚠️ Job ${job.id} in ${name} queue stalled`);
  });
});

// Queue utility functions
class QueueService {
  // Add AI processing job
  async addAIJob(data, options = {}) {
    return await queues.aiProcessing.add('process-ai-message', data, {
      priority: options.priority || 0,
      delay: options.delay || 0,
      ...options
    });
  }
  
  // Add message processing job
  async addMessageJob(data, options = {}) {
    return await queues.messageProcessing.add('process-message', data, {
      priority: options.priority || 0,
      ...options
    });
  }
  
  // Add analytics job
  async addAnalyticsJob(data, options = {}) {
    return await queues.analytics.add('update-analytics', data, {
      delay: options.delay || 5000, // Default 5 second delay
      ...options
    });
  }
  
  // Add notification job
  async addNotificationJob(data, options = {}) {
    return await queues.notifications.add('send-notification', data, {
      priority: options.priority || 0,
      ...options
    });
  }
  
  // Add file processing job
  async addFileJob(data, options = {}) {
    return await queues.fileProcessing.add('process-file', data, {
      priority: options.priority || 0,
      ...options
    });
  }
  
  // Get queue statistics
  async getQueueStats() {
    const stats = {};
    
    for (const [name, queue] of Object.entries(queues)) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount()
      ]);
      
      stats[name] = {
        waiting,
        active,
        completed,
        failed,
        delayed
      };
    }
    
    return stats;
  }
  
  // Clean old jobs
  async cleanQueues(grace = 3600000) { // Default 1 hour grace period
    const results = {};
    
    for (const [name, queue] of Object.entries(queues)) {
      const cleaned = await queue.clean(grace);
      results[name] = cleaned.length;
    }
    
    return results;
  }
  
  // Pause/resume queues
  async pauseQueue(queueName) {
    if (queues[queueName]) {
      await queues[queueName].pause();
      return true;
    }
    return false;
  }
  
  async resumeQueue(queueName) {
    if (queues[queueName]) {
      await queues[queueName].resume();
      return true;
    }
    return false;
  }
  
  // Get specific queue
  getQueue(name) {
    return queues[name];
  }
  
  // Get all queues
  getAllQueues() {
    return queues;
  }
}

module.exports = {
  queues,
  serverAdapter,
  QueueService: new QueueService()
};