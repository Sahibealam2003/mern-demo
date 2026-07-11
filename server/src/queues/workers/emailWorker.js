import { Worker } from 'bullmq';
import { getRedisConnection } from '../../config/redis.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendInvitationEmail,
  sendTaskAssignmentEmail,
} from '../../config/email.js';
import logger from '../../utils/logger.js';

let emailWorker = null;

/**
 * Process a single email job
 */
const processEmailJob = async (job) => {
  const { name, data } = job;
  logger.debug(`Processing email job: ${name} (${job.id})`);

  switch (name) {
    case 'send-verification':
      await sendVerificationEmail(data.email, data.token, data.name);
      break;

    case 'send-password-reset':
      await sendPasswordResetEmail(data.email, data.token, data.name);
      break;

    case 'send-invitation':
      await sendInvitationEmail(
        data.email,
        data.workspaceName,
        data.inviterName,
        data.token
      );
      break;

    case 'send-task-assignment':
      await sendTaskAssignmentEmail(
        data.email,
        data.todoTitle,
        data.assignerName,
        data.workspaceName
      );
      break;

    case 'send-due-date-reminder':
      await sendTaskAssignmentEmail(
        data.email,
        `Reminder: ${data.todoTitle}`,
        'System',
        data.workspaceName
      );
      break;

    default:
      logger.warn(`Unknown email job type: ${name}`);
  }

  logger.info(`Email job completed: ${name} → ${data.email}`);
};

/**
 * Start the email worker
 */
export const startEmailWorker = () => {
  try {
    const connection = getRedisConnection();
    if (!connection) {
      logger.warn('Redis not available — email worker not started');
      return null;
    }

    emailWorker = new Worker('email', processEmailJob, {
      connection,
      concurrency: 5,
    });

    emailWorker.on('completed', (job) => {
      logger.debug(`Email worker: job ${job.id} completed`);
    });

    emailWorker.on('failed', (job, err) => {
      logger.error(`Email worker: job ${job?.id} failed — ${err.message}`);
    });

    emailWorker.on('error', (err) => {
      logger.error('Email worker error:', err);
    });

    logger.info('Email worker started');
    return emailWorker;
  } catch (error) {
    logger.error('Failed to start email worker:', error);
    return null;
  }
};

/**
 * Gracefully close the email worker
 */
export const closeEmailWorker = async () => {
  if (emailWorker) {
    await emailWorker.close();
    emailWorker = null;
    logger.info('Email worker closed');
  }
};

export default { startEmailWorker, closeEmailWorker };
