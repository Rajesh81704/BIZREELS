const { Worker } = require('bullmq');
const { createRedisClient } = require('./redis.connection');
const logger = require('../utils/logger');

let notificationWorker = null;

function initNotificationWorker() {
  if (notificationWorker) return notificationWorker;

  try {
    const connection = createRedisClient();
    if (!connection) {
      logger.warn('[BullMQ:Worker] Skipping worker initialization (no Redis client available)', { service: 'queues' });
      return null;
    }

    if (process.env.ENABLE_BULLMQ_WORKER === 'false' || process.env.REDIS_ENABLED === 'false') {
      logger.info('[BullMQ:Worker] Worker disabled via environment setting.', { service: 'queues' });
      return null;
    }

    notificationWorker = new Worker(
      'notifications',
      async (job) => {
        const notificationService = require('../services/notification.service');
        const payload = job.data;
        return await notificationService.createDirect(payload);
      },
      {
        connection,
        concurrency: 20, // Process 20 notifications simultaneously
        limiter: {
          max: 100,
          duration: 1000, // Max 100 jobs processed per second
        },
      }
    );

    notificationWorker.on('completed', (job) => {
      logger.debug(`[BullMQ:Worker] Job ${job.id} (${job.name}) completed.`, { service: 'queues' });
    });

    notificationWorker.on('failed', (job, err) => {
      logger.warn(`[BullMQ:Worker] Job ${job?.id} failed: ${err.message}`, { service: 'queues' });
    });

    notificationWorker.on('error', async (err) => {
      if (err.message && err.message.includes('max requests limit exceeded')) {
        logger.warn('[BullMQ:Worker] Redis request quota exceeded. Pausing worker to avoid spamming Redis. Notifications will fallback to direct database writes.', { service: 'queues' });
        try {
          await notificationWorker.pause(true);
        } catch {}
        return;
      }
      logger.warn(`[BullMQ:Worker] Worker error: ${err.message}`, { service: 'queues' });
    });

    logger.info('BullMQ Notification Worker initialized successfully (concurrency: 20).', { service: 'queues' });
    return notificationWorker;
  } catch (err) {
    logger.warn(`[BullMQ:Worker] Failed to start notification worker: ${err.message}`, { service: 'queues' });
    return null;
  }
}

async function closeNotificationWorker() {
  if (notificationWorker) {
    try {
      await notificationWorker.close();
      logger.info('BullMQ Notification Worker closed gracefully.', { service: 'queues' });
    } catch (err) {
      logger.warn(`[BullMQ:Worker] Error closing worker: ${err.message}`, { service: 'queues' });
    } finally {
      notificationWorker = null;
    }
  }
}

module.exports = {
  initNotificationWorker,
  closeNotificationWorker,
};
