import { getUnreadCount } from '../../services/notificationService.js';
import logger from '../../utils/logger.js';

/**
 * Register notification-related socket event handlers
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 */
export const registerNotificationHandlers = (socket, io) => {
  /**
   * Request current unread notification count
   */
  socket.on('notification:getUnreadCount', async () => {
    try {
      const count = await getUnreadCount(socket.user.id);
      socket.emit('notification:unreadCount', { count });
    } catch (error) {
      logger.error('notification:getUnreadCount socket error:', error);
    }
  });

  /**
   * Mark notification as read via socket (mirrors REST endpoint)
   * Payload: { notificationId }
   */
  socket.on('notification:markRead', async ({ notificationId }) => {
    if (!notificationId) return;
    try {
      // Import inline to avoid circular deps at module load time
      const { markAsRead } = await import('../../services/notificationService.js');
      await markAsRead(notificationId, socket.user.id);

      const count = await getUnreadCount(socket.user.id);
      socket.emit('notification:unreadCount', { count });
    } catch (error) {
      logger.error('notification:markRead socket error:', error);
    }
  });
};

/**
 * Utility: send a real-time notification to a specific user
 * Called from controllers / workers
 * @param {import('socket.io').Server} io
 * @param {String} userId
 * @param {Object} notification
 */
export const sendSocketNotification = (io, userId, notification) => {
  io.to(`user:${userId}`).emit('notification:new', notification);
};

export default registerNotificationHandlers;
