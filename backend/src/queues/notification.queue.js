const { Queue } = require('bullmq');
const { createRedisClient } = require('./redis.connection');
const logger = require('../utils/logger');

let notificationQueue = null;
let isQueueEnabled = false;

try {
  const connection = createRedisClient();
  if (connection) {
    notificationQueue = new Queue('notifications', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          count: 500, // Keep last 500 completed jobs for audit
        },
        removeOnFail: {
          count: 200, // Keep last 200 failed jobs for debugging
        },
      },
    });

    notificationQueue.on('error', (err) => {
      logger.warn(`[BullMQ:Queue] Notification queue error: ${err.message}`, { service: 'queues' });
    });

    isQueueEnabled = true;
    logger.info('BullMQ Notification Queue initialized successfully.', { service: 'queues' });
  }
} catch (err) {
  logger.warn(`[BullMQ:Queue] Failed to initialize BullMQ: ${err.message}. Falling back to direct dispatch.`, { service: 'queues' });
  notificationQueue = null;
  isQueueEnabled = false;
}

/**
 * Enqueue a single notification delivery job.
 */
async function enqueueNotification(payload, jobOptions = {}) {
  if (isQueueEnabled && notificationQueue) {
    try {
      const jobName = payload.type || 'alert';
      return await notificationQueue.add(jobName, payload, jobOptions);
    } catch (err) {
      logger.warn(`[BullMQ:Queue] Failed to enqueue job: ${err.message}. Executing fallback dispatch.`, { service: 'queues' });
    }
  }

  // Fallback: direct asynchronous execution
  const notificationService = require('../services/notification.service');
  return notificationService.createDirect(payload);
}

/**
 * Enqueue bulk notifications efficiently.
 * @param {Array<object>} notificationsList - array of notification payload objects
 */
async function enqueueBulkNotifications(notificationsList, jobOptions = {}) {
  if (!Array.isArray(notificationsList) || notificationsList.length === 0) return [];

  if (isQueueEnabled && notificationQueue) {
    try {
      const jobs = notificationsList.map((payload) => ({
        name: payload.type || 'bulk-alert',
        data: payload,
        opts: jobOptions,
      }));
      return await notificationQueue.addBulk(jobs);
    } catch (err) {
      logger.warn(`[BullMQ:Queue] Bulk enqueue failed: ${err.message}. Executing chunked direct fallback.`, { service: 'queues' });
    }
  }

  // Fallback: chunked direct execution without blocking
  const notificationService = require('../services/notification.service');
  const results = [];
  const BATCH_SIZE = 25;
  for (let i = 0; i < notificationsList.length; i += BATCH_SIZE) {
    const batch = notificationsList.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(batch.map(item => notificationService.createDirect(item)));
    results.push(...settled);
  }
  return results;
}

module.exports = {
  notificationQueue,
  enqueueNotification,
  enqueueBulkNotifications,
  isQueueEnabled: () => isQueueEnabled,
};
