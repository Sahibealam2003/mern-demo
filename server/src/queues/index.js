import { emailQueue, closeEmailQueue } from './emailQueue.js';
import { notificationQueue, closeNotificationQueue } from './notificationQueue.js';
import { startEmailWorker, closeEmailWorker } from './workers/emailWorker.js';
import { startNotificationWorker, closeNotificationWorker } from './workers/notificationWorker.js';
import logger from '../utils/logger.js';
import { getRedisStatus } from '../config/redis.js';

let workersStarted = false;

/**
 * Initialize all BullMQ queues and start workers
 */
export const initializeQueues = () => {
  try {
    const { connected } = getRedisStatus();

    if (!connected) {
      logger.warn('Redis not connected — skipping BullMQ workers startup');
      return;
    }

    startEmailWorker();
    startNotificationWorker();
    workersStarted = true;
    logger.info('BullMQ queues and workers initialized');
  } catch (error) {
    logger.error('Failed to initialize queues:', error);
    // Non-fatal — app still works without background jobs
  }
};

/**
 * Gracefully close all queues and workers
 */
export const closeQueues = async () => {
  try {
    await Promise.all([
      closeEmailWorker(),
      closeNotificationWorker(),
      closeEmailQueue(),
      closeNotificationQueue(),
    ]);
    logger.info('BullMQ queues and workers closed');
  } catch (error) {
    logger.error('Error closing queues:', error);
  }
};

export { emailQueue, notificationQueue };
export default { initializeQueues, closeQueues };
