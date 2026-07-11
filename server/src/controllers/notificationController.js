import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
} from '../services/notificationService.js';
import logger from '../utils/logger.js';

/**
 * Get user notifications
 * @route GET /api/notifications
 */
export const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20, read, type } = req.query;

    const result = await getUserNotifications(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      read: read !== undefined ? read === 'true' : null,
      type: type || null,
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error('Get notifications controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get unread count
 * @route GET /api/notifications/unread-count
 */
export const unreadCount = async (req, res) => {
  try {
    const count = await getUnreadCount(req.user.id);
    res.status(200).json({ success: true, data: { count } });
  } catch (error) {
    logger.error('Get unread count controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Mark notification as read
 * @route PUT /api/notifications/:id/read
 */
export const markRead = async (req, res) => {
  try {
    const notification = await markAsRead(req.params.id, req.user.id);
    res.status(200).json({ success: true, data: { notification } });
  } catch (error) {
    logger.error('Mark read controller error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Mark all as read
 * @route PUT /api/notifications/read-all
 */
export const markAllRead = async (req, res) => {
  try {
    const count = await markAllAsRead(req.user.id);
    res.status(200).json({ success: true, message: `Marked ${count} notifications as read` });
  } catch (error) {
    logger.error('Mark all read controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete notification
 * @route DELETE /api/notifications/:id
 */
export const remove = async (req, res) => {
  try {
    await deleteNotification(req.params.id, req.user.id);
    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    logger.error('Delete notification controller error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Delete all read notifications
 * @route DELETE /api/notifications/read
 */
export const removeAllRead = async (req, res) => {
  try {
    const count = await deleteAllRead(req.user.id);
    res.status(200).json({ success: true, message: `Deleted ${count} read notifications` });
  } catch (error) {
    logger.error('Delete all read controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export default { getAll, unreadCount, markRead, markAllRead, remove, removeAllRead };
