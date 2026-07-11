import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'created',
        'updated',
        'deleted',
        'restored',
        'archived',
        'completed',
        'assigned',
        'unassigned',
        'commented',
        'mentioned',
        'invited',
        'joined',
        'left',
        'role_changed',
        'transferred_ownership',
      ],
    },
    entityType: {
      type: String,
      required: true,
      enum: ['Todo', 'Comment', 'Workspace', 'Member', 'User'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    entityName: {
      type: String,
      trim: true,
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
activitySchema.index({ workspace: 1, createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
activitySchema.index({ action: 1, createdAt: -1 });

// TTL index to auto-delete old activities after 90 days
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// Virtual for formatted action text
activitySchema.virtual('actionText').get(function () {
  const actionMap = {
    created: 'created',
    updated: 'updated',
    deleted: 'deleted',
    restored: 'restored',
    archived: 'archived',
    completed: 'completed',
    assigned: 'assigned',
    unassigned: 'unassigned',
    commented: 'commented on',
    mentioned: 'mentioned in',
    invited: 'invited',
    joined: 'joined',
    left: 'left',
    role_changed: 'changed role in',
    transferred_ownership: 'transferred ownership of',
  };

  return actionMap[this.action] || this.action;
});

// Static method to log activity
activitySchema.statics.logActivity = async function (activityData) {
  try {
    const activity = await this.create(activityData);
    return activity;
  } catch (error) {
    console.error('Error logging activity:', error);
    return null;
  }
};

// Static method to get workspace activities
activitySchema.statics.getWorkspaceActivities = function (workspaceId, options = {}) {
  const query = { workspace: workspaceId };

  if (options.entityType) {
    query.entityType = options.entityType;
  }

  if (options.action) {
    query.action = options.action;
  }

  if (options.userId) {
    query.user = options.userId;
  }

  let queryBuilder = this.find(query)
    .populate('user', 'name email avatar')
    .sort({ createdAt: -1 });

  if (options.limit) {
    const page = options.page || 1;
    const skip = (page - 1) * options.limit;
    queryBuilder = queryBuilder.skip(skip).limit(options.limit);
  }

  return queryBuilder;
};

// Static method to get user activities
activitySchema.statics.getUserActivities = function (userId, options = {}) {
  const query = { user: userId };

  if (options.workspace) {
    query.workspace = options.workspace;
  }

  let queryBuilder = this.find(query)
    .populate('workspace', 'name')
    .sort({ createdAt: -1 });

  if (options.limit) {
    queryBuilder = queryBuilder.limit(options.limit);
  }

  return queryBuilder;
};

// Static method to get entity activities (audit trail)
activitySchema.statics.getEntityActivities = function (entityType, entityId, options = {}) {
  const query = {
    entityType,
    entityId,
  };

  return this.find(query)
    .populate('user', 'name email avatar')
    .sort({ createdAt: options.sortOrder === 'asc' ? 1 : -1 });
};

// Static method to delete old activities
activitySchema.statics.deleteOldActivities = function (daysOld = 90) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - daysOld);
  
  return this.deleteMany({
    createdAt: { $lt: dateThreshold },
  });
};

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;