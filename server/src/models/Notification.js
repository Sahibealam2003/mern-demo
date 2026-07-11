import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['assignment', 'comment', 'due_date', 'invitation', 'mention', 'system'],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    actionUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

// TTL index to auto-delete old notifications after 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// Method to mark as read
notificationSchema.methods.markAsRead = function () {
  this.read = true;
  this.readAt = new Date();
};

// Static method to create notification
notificationSchema.statics.createNotification = async function (notificationData) {
  try {
    const notification = await this.create(notificationData);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Static method to get user notifications
notificationSchema.statics.getUserNotifications = function (userId, options = {}) {
  const query = { user: userId };

  if (options.unreadOnly) {
    query.read = false;
  }

  if (options.type) {
    query.type = options.type;
  }

  let queryBuilder = this.find(query).sort({ createdAt: -1 });

  if (options.limit) {
    const page = options.page || 1;
    const skip = (page - 1) * options.limit;
    queryBuilder = queryBuilder.skip(skip).limit(options.limit);
  }

  return queryBuilder;
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({ user: userId, read: false });
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = function (userId) {
  return this.updateMany(
    { user: userId, read: false },
    { read: true, readAt: new Date() }
  );
};

// Static method to delete old notifications
notificationSchema.statics.deleteOldNotifications = function (daysOld = 90) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - daysOld);
  
  return this.deleteMany({
    createdAt: { $lt: dateThreshold },
    read: true,
  });
};

// Static method to create task assignment notification
notificationSchema.statics.createAssignmentNotification = async function (userId, todoTitle, assignerName, todoId, workspaceId) {
  return this.createNotification({
    user: userId,
    type: 'assignment',
    title: 'New Task Assigned',
    message: `${assignerName} assigned you to "${todoTitle}"`,
    data: {
      todoId,
      workspaceId,
      assignerName,
    },
    actionUrl: `/workspaces/${workspaceId}/todos/${todoId}`,
  });
};

// Static method to create comment notification
notificationSchema.statics.createCommentNotification = async function (userId, todoTitle, commenterName, commentId, todoId, workspaceId) {
  return this.createNotification({
    user: userId,
    type: 'comment',
    title: 'New Comment',
    message: `${commenterName} commented on "${todoTitle}"`,
    data: {
      commentId,
      todoId,
      workspaceId,
      commenterName,
    },
    actionUrl: `/workspaces/${workspaceId}/todos/${todoId}#comment-${commentId}`,
  });
};

// Static method to create mention notification
notificationSchema.statics.createMentionNotification = async function (userId, mentionerName, context, commentId, todoId, workspaceId) {
  return this.createNotification({
    user: userId,
    type: 'mention',
    title: 'You were mentioned',
    message: `${mentionerName} mentioned you in a comment`,
    data: {
      commentId,
      todoId,
      workspaceId,
      mentionerName,
      context,
    },
    actionUrl: `/workspaces/${workspaceId}/todos/${todoId}#comment-${commentId}`,
  });
};

// Static method to create due date notification
notificationSchema.statics.createDueDateNotification = async function (userId, todoTitle, dueDate, todoId, workspaceId) {
  return this.createNotification({
    user: userId,
    type: 'due_date',
    title: 'Task Due Soon',
    message: `"${todoTitle}" is due soon`,
    data: {
      todoId,
      workspaceId,
      dueDate,
    },
    actionUrl: `/workspaces/${workspaceId}/todos/${todoId}`,
  });
};

// Static method to create invitation notification
notificationSchema.statics.createInvitationNotification = async function (userId, workspaceName, inviterName, invitationToken) {
  return this.createNotification({
    user: userId,
    type: 'invitation',
    title: 'Workspace Invitation',
    message: `${inviterName} invited you to join "${workspaceName}"`,
    data: {
      workspaceName,
      inviterName,
      invitationToken,
    },
    actionUrl: `/invitations/${invitationToken}`,
  });
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;