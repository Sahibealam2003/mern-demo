import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import logger from '../utils/logger.js';

let emailQueue = null;

const QUEUE_NAME = 'email';

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000, // 5s, 10s, 20s
  },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
};

/**
 * Get (or lazily create) the email queue.
 * Returns null if Redis is not available.
 */
export const getEmailQueue = () => {
  if (emailQueue) return emailQueue;

  try {
    const connection = getRedisConnection();
    if (!connection) return null;

    emailQueue = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });

    emailQueue.on('error', (err) => {
      logger.error('Email queue error:', err);
    });

    logger.info('Email queue created');
    return emailQueue;
  } catch (error) {
    logger.error('Failed to create email queue:', error);
    return null;
  }
};

/**
 * Add a "send verification email" job
 */
export const addVerificationEmailJob = async (data) => {
  const queue = getEmailQueue();
  if (!queue) return null;
  return queue.add('send-verification', data, { priority: 1 });
};

/**
 * Add a "send password reset email" job
 */
export const addPasswordResetEmailJob = async (data) => {
  const queue = getEmailQueue();
  if (!queue) return null;
  return queue.add('send-password-reset', data, { priority: 1 });
};

/**
 * Add a "send workspace invitation email" job
 */
export const addInvitationEmailJob = async (data) => {
  const queue = getEmailQueue();
  if (!queue) return null;
  return queue.add('send-invitation', data, { priority: 2 });
};

/**
 * Add a "send task assignment email" job
 */
export const addTaskAssignmentEmailJob = async (data) => {
  const queue = getEmailQueue();
  if (!queue) return null;
  return queue.add('send-task-assignment', data, { priority: 3 });
};

/**
 * Add a "send due date reminder email" job
 */
export const addDueDateReminderEmailJob = async (data) => {
  const queue = getEmailQueue();
  if (!queue) return null;
  return queue.add('send-due-date-reminder', data, {
    priority: 5,
    delay: data.delayMs || 0,
  });
};

/**
 * Close the queue connection
 */
export const closeEmailQueue = async () => {
  if (emailQueue) {
    await emailQueue.close();
    emailQueue = null;
  }
};

// Named export so index.js can import { emailQueue }
export { emailQueue };
export default { getEmailQueue, addVerificationEmailJob, addPasswordResetEmailJob, addInvitationEmailJob, addTaskAssignmentEmailJob, addDueDateReminderEmailJob, closeEmailQueue };
