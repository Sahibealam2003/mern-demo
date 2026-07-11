import Notification from '../models/Notification.js';
import { getCachedData, setCachedData, deleteCachedData } from './cacheService.js';
import { CACHE_TTL } from '../utils/constants.js';
import logger from '../utils/logger.js';

/**
 * Notification service for managing in-app notifications
 */

/**
 * Create a notification
 * @param {Object} data - Notification data
 * @returns {Promise<Object>} Created notification
 */
export const createNotification = async (data) => {
  try {
    const notification = await Notification.create(data);
    
    // Invalidate user notifications cache
    await deleteCachedData(`notifications:user:${data.recipient}`);
    
    logger.info(`Notification created for user ${data.recipient}`);
    return notification;
  } catch (error) {
    logger.error('Create notification error:', error);
    throw error;
  }
};

/**
 * Create multiple notifications (bulk)
 * @param {Array} notificationsData - Array of notification data objects
 * @returns {Promise<Array>} Created notifications
 */
export const createBulkNotifications = async (notificationsData) => {
  try {
    const notifications = await Notification.insertMany(notificationsData);
    
    // Invalidate cache for all recipients
    const uniqueRecipients = [...new Set(notificationsData.map(n => n.recipient))];
    for (const recipientId of uniqueRecipients) {
      await deleteCachedData(`notifications:user:${recipientId}`);
    }
    
    logger.info(`${notifications.length} notifications created`);
    return notifications;
  } catch (error) {
    logger.error('Create bulk notifications error:', error);
    throw error;
  }
};

/**
 * Get user notifications with pagination
 * @param {String} userId - User ID
 * @param {Object} options - Query options (page, limit, read status)
 * @returns {Promise<Object>} Notifications with pagination
 */
export const getUserNotifications = async (userId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      read = null,
      type = null,
    } = options;

    const skip = (page - 1) * limit;
    
    const query = { recipient: userId };
    if (read !== null) {
      query.read = read;
    }
    if (type) {
      query.type = type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .populate('sender', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: userId, read: false }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  } catch (error) {
    logger.error('Get user notifications error:', error);
    throw error;
  }
};

/**
 * Get unread notification count
 * @param {String} userId - User ID
 * @returns {Promise<Number>} Unread count
 */
export const getUnreadCount = async (userId) => {
  try {
    const cacheKey = `notifications:unread:${userId}`;
    
    // Try cache first
    const cached = await getCachedData(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const count = await Notification.countDocuments({
      recipient: userId,
      read: false,
    });

    // Cache for short time (5 minutes)
    await setCachedData(cacheKey, count, CACHE_TTL.SHORT);

    return count;
  } catch (error) {
    logger.error('Get unread count error:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 * @param {String} notificationId - Notification ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Updated notification
 */
export const markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      throw new Error('Notification not found');
    }

    // Invalidate caches
    await deleteCachedData(`notifications:user:${userId}`);
    await deleteCachedData(`notifications:unread:${userId}`);

    return notification;
  } catch (error) {
    logger.error('Mark notification as read error:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 * @param {String} userId - User ID
 * @returns {Promise<Number>} Number of updated notifications
 */
export const markAllAsRead = async (userId) => {
  try {
    const result = await Notification.updateMany(
      { recipient: userId, read: false },
      { read: true, readAt: new Date() }
    );

    // Invalidate caches
    await deleteCachedData(`notifications:user:${userId}`);
    await deleteCachedData(`notifications:unread:${userId}`);

    logger.info(`Marked ${result.modifiedCount} notifications as read for user ${userId}`);
    return result.modifiedCount;
  } catch (error) {
    logger.error('Mark all as read error:', error);
    throw error;
  }
};

/**
 * Delete notification
 * @param {String} notificationId - Notification ID
 * @param {String} userId - User ID
 * @returns {Promise<Boolean>} Success status
 */
export const deleteNotification = async (notificationId, userId) => {
  try {
    const result = await Notification.deleteOne({
      _id: notificationId,
      recipient: userId,
    });

    if (result.deletedCount === 0) {
      throw new Error('Notification not found');
    }

    // Invalidate caches
    await deleteCachedData(`notifications:user:${userId}`);
    await deleteCachedData(`notifications:unread:${userId}`);

    return true;
  } catch (error) {
    logger.error('Delete notification error:', error);
    throw error;
  }
};

/**
 * Delete all read notifications
 * @param {String} userId - User ID
 * @returns {Promise<Number>} Number of deleted notifications
 */
export const deleteAllRead = async (userId) => {
  try {
    const result = await Notification.deleteMany({
      recipient: userId,
      read: true,
    });

    // Invalidate cache
    await deleteCachedData(`notifications:user:${userId}`);

    logger.info(`Deleted ${result.deletedCount} read notifications for user ${userId}`);
    return result.deletedCount;
  } catch (error) {
    logger.error('Delete all read notifications error:', error);
    throw error;
  }
};

/**
 * Create task assignment notification
 * @param {String} recipientId - Recipient user ID
 * @param {String} senderId - Sender user ID
 * @param {String} todoId - Todo ID
 * @param {String} workspaceId - Workspace ID
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Created notification
 */
export const createTaskAssignmentNotification = async (recipientId, senderId, todoId, workspaceId, metadata = {}) => {
  try {
    return await createNotification({
      recipient: recipientId,
      sender: senderId,
      type: 'TASK_ASSIGNED',
      title: 'New task assigned',
      message: metadata.message || 'You have been assigned a new task',
      relatedModel: 'Todo',
      relatedId: todoId,
      metadata: {
        workspaceId,
        todoTitle: metadata.todoTitle,
        ...metadata,
      },
    });
  } catch (error) {
    logger.error('Create task assignment notification error:', error);
    throw error;
  }
};

/**
 * Create comment notification
 * @param {String} recipientId - Recipient user ID
 * @param {String} senderId - Sender user ID
 * @param {String} todoId - Todo ID
 * @param {String} commentId - Comment ID
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Created notification
 */
export const createCommentNotification = async (recipientId, senderId, todoId, commentId, metadata = {}) => {
  try {
    return await createNotification({
      recipient: recipientId,
      sender: senderId,
      type: 'COMMENT',
      title: 'New comment',
      message: metadata.message || 'Someone commented on a task',
      relatedModel: 'Comment',
      relatedId: commentId,
      metadata: {
        todoId,
        todoTitle: metadata.todoTitle,
        ...metadata,
      },
    });
  } catch (error) {
    logger.error('Create comment notification error:', error);
    throw error;
  }
};

/**
 * Create mention notification
 * @param {String} recipientId - Recipient user ID
 * @param {String} senderId - Sender user ID
 * @param {String} commentId - Comment ID
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Created notification
 */
export const createMentionNotification = async (recipientId, senderId, commentId, metadata = {}) => {
  try {
    return await createNotification({
      recipient: recipientId,
      sender: senderId,
      type: 'MENTION',
      title: 'You were mentioned',
      message: metadata.message || 'Someone mentioned you in a comment',
      relatedModel: 'Comment',
      relatedId: commentId,
      metadata,
    });
  } catch (error) {
    logger.error('Create mention notification error:', error);
    throw error;
  }
};

/**
 * Create due date reminder notification
 * @param {String} recipientId - Recipient user ID
 * @param {String} todoId - Todo ID
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Created notification
 */
export const createDueDateReminderNotification = async (recipientId, todoId, metadata = {}) => {
  try {
    return await createNotification({
      recipient: recipientId,
      type: 'DUE_DATE_REMINDER',
      title: 'Task due soon',
      message: metadata.message || 'A task is due soon',
      relatedModel: 'Todo',
      relatedId: todoId,
      metadata,
    });
  } catch (error) {
    logger.error('Create due date reminder notification error:', error);
    throw error;
  }
};

/**
 * Create workspace invitation notification
 * @param {String} recipientId - Recipient user ID
 * @param {String} senderId - Sender user ID
 * @param {String} workspaceId - Workspace ID
 * @param {String} invitationId - Invitation ID
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Created notification
 */
export const createWorkspaceInvitationNotification = async (recipientId, senderId, workspaceId, invitationId, metadata = {}) => {
  try {
    return await createNotification({
      recipient: recipientId,
      sender: senderId,
      type: 'WORKSPACE_INVITATION',
      title: 'Workspace invitation',
      message: metadata.message || 'You have been invited to a workspace',
      relatedModel: 'Invitation',
      relatedId: invitationId,
      metadata: {
        workspaceId,
        workspaceName: metadata.workspaceName,
        ...metadata,
      },
    });
  } catch (error) {
    logger.error('Create workspace invitation notification error:', error);
    throw error;
  }
};

export default {
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  createTaskAssignmentNotification,
  createCommentNotification,
  createMentionNotification,
  createDueDateReminderNotification,
  createWorkspaceInvitationNotification,
};
