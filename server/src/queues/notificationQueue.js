import { Queue } from 'bullmq';
import { getRedisClient } from '../config/redis.js';
import logger from '../utils/logger.js';

let notificationQueue = null;

const QUEUE_NAME = 'notification';

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 3000 },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 50 },
};

/**
 * Get (or lazily create) the notification queue.
 * Returns null if Redis is not available.
 */
export const getNotificationQueue = () => {
  if (notificationQueue) return notificationQueue;

  try {
    const connection = getRedisClient();
    if (!connection) return null;

    notificationQueue = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });

    notificationQueue.on('error', (err) => {
      logger.error('Notification queue error:', err);
    });

    logger.info('Notification queue created');
    return notificationQueue;
  } catch (error) {
    logger.error('Failed to create notification queue:', error);
    return null;
  }
};

/**
 * Add an in-app + socket notification job
 */
export const addNotificationJob = async (data) => {
  const queue = getNotificationQueue();
  if (!queue) return null;
  return queue.add('send-notification', data, { priority: 2 });
};

/**
 * Add a bulk notification job (e.g. all workspace members)
 */
export const addBulkNotificationJob = async (data) => {
  const queue = getNotificationQueue();
  if (!queue) return null;
  return queue.add('send-bulk-notification', data, { priority: 3 });
};

/**
 * Schedule a due-date reminder notification
 * @param {Object} data
 * @param {Number} delayMs - Delay in milliseconds
 */
export const scheduleDueDateReminder = async (data, delayMs) => {
  const queue = getNotificationQueue();
  if (!queue) return null;
  return queue.add('due-date-reminder', data, {
    delay: delayMs,
    priority: 5,
    jobId: `due-reminder:${data.todoId}:${data.userId}`, // Prevent duplicates
  });
};

/**
 * Remove a scheduled due-date reminder (e.g. when todo is completed)
 */
export const cancelDueDateReminder = async (todoId, userId) => {
  const queue = getNotificationQueue();
  if (!queue) return;
  const jobId = `due-reminder:${todoId}:${userId}`;
  const job = await queue.getJob(jobId);
  if (job) {
    await job.remove();
    logger.debug(`Cancelled due date reminder: ${jobId}`);
  }
};

/**
 * Close the queue connection
 */
export const closeNotificationQueue = async () => {
  if (notificationQueue) {
    await notificationQueue.close();
    notificationQueue = null;
  }
};

export { notificationQueue };
export default { getNotificationQueue, addNotificationJob, addBulkNotificationJob, scheduleDueDateReminder, cancelDueDateReminder, closeNotificationQueue };
