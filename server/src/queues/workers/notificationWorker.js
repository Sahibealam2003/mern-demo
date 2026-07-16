import { Worker } from 'bullmq';
import { getRedisClient } from '../../config/redis.js';
import {
  createNotification,
  createBulkNotifications,
  createDueDateReminderNotification,
} from '../../services/notificationService.js';
import { sendSocketNotification } from '../../socket/handlers/notificationHandler.js';
import logger from '../../utils/logger.js';

let notificationWorker = null;

/**
 * Process a single notification job
 */
const processNotificationJob = async (job) => {
  const { name, data } = job;
  logger.debug(`Processing notification job: ${name} (${job.id})`);

  // Lazy-import getIO to avoid circular deps at module load time
  let io = null;
  try {
    const { getIO } = await import('../../socket/index.js');
    io = getIO();
  } catch {
    // Socket.IO may not be initialized in test environments
  }

  switch (name) {
    case 'send-notification': {
      const notification = await createNotification(data);

      if (io && notification) {
        sendSocketNotification(io, data.recipient.toString(), notification);
      }
      break;
    }

    case 'send-bulk-notification': {
      // data.recipients: Array of recipient user IDs
      // data.template: common notification fields (type, title, message, ...)
      const notificationsData = data.recipients.map((recipientId) => ({
        ...data.template,
        recipient: recipientId,
      }));

      const notifications = await createBulkNotifications(notificationsData);

      if (io) {
        for (const notif of notifications) {
          sendSocketNotification(io, notif.recipient.toString(), notif);
        }
      }
      break;
    }

    case 'due-date-reminder': {
      const notification = await createDueDateReminderNotification(
        data.userId,
        data.todoId,
        {
          todoTitle: data.todoTitle,
          message: `"${data.todoTitle}" is due soon`,
        }
      );

      if (io && notification) {
        sendSocketNotification(io, data.userId, notification);
      }
      break;
    }

    default:
      logger.warn(`Unknown notification job type: ${name}`);
  }

  logger.info(`Notification job completed: ${name}`);
};

/**
 * Start the notification worker
 */
export const startNotificationWorker = () => {
  try {
    const connection = getRedisClient();
    if (!connection) {
      logger.warn('Redis not available — notification worker not started');
      return null;
    }

    notificationWorker = new Worker('notification', processNotificationJob, {
      connection,
      concurrency: 10,
    });

    notificationWorker.on('completed', (job) => {
      logger.debug(`Notification worker: job ${job.id} completed`);
    });

    notificationWorker.on('failed', (job, err) => {
      logger.error(`Notification worker: job ${job?.id} failed — ${err.message}`);
    });

    notificationWorker.on('error', (err) => {
      logger.error('Notification worker error:', err);
    });

    logger.info('Notification worker started');
    return notificationWorker;
  } catch (error) {
    logger.error('Failed to start notification worker:', error);
    return null;
  }
};

/**
 * Gracefully close the notification worker
 */
export const closeNotificationWorker = async () => {
  if (notificationWorker) {
    await notificationWorker.close();
    notificationWorker = null;
    logger.info('Notification worker closed');
  }
};

export default { startNotificationWorker, closeNotificationWorker };
