import mongoose from 'mongoose';

const labelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  color: {
    type: String,
    default: '#3b82f6',
  },
});

const checklistItemSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  completedAt: {
    type: Date,
  },
});

const attachmentSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const todoSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Todo title is required'],
      trim: true,
      maxlength: [200, 'Title must not exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Description must not exceed 5000 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'archived'],
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    dueDate: {
      type: Date,
      index: true,
    },
    reminder: {
      type: Date,
    },
    labels: [labelSchema],
    color: {
      type: String,
      default: null,
    },
    checklist: [checklistItemSchema],
    attachments: [attachmentSchema],
    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    ],
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for efficient queries
todoSchema.index({ workspace: 1, status: 1 });
todoSchema.index({ workspace: 1, priority: 1 });
todoSchema.index({ workspace: 1, dueDate: 1 });
todoSchema.index({ workspace: 1, createdBy: 1 });
todoSchema.index({ workspace: 1, assignedTo: 1 });
todoSchema.index({ workspace: 1, deletedAt: 1 });
todoSchema.index({ workspace: 1, isPinned: -1, createdAt: -1 });
todoSchema.index({ dueDate: 1, status: 1 }); // For reminder queries

// Virtual for comment count (to be populated)
todoSchema.virtual('commentCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'todo',
  count: true,
});

// Virtual to check if todo is overdue
todoSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate || this.status === 'completed' || this.status === 'archived') {
    return false;
  }
  return this.dueDate < new Date();
});

// Virtual for completion percentage
todoSchema.virtual('completionPercentage').get(function () {
  if (!this.checklist || this.checklist.length === 0) {
    return this.status === 'completed' ? 100 : 0;
  }
  
  const completedItems = this.checklist.filter((item) => item.completed).length;
  return Math.round((completedItems / this.checklist.length) * 100);
});

// Method to check if todo is deleted
todoSchema.methods.isDeleted = function () {
  return this.deletedAt !== null;
};

// Method to soft delete
todoSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
};

// Method to restore
todoSchema.methods.restore = function () {
  this.deletedAt = null;
};

// Method to check if user is assigned
todoSchema.methods.isAssignedTo = function (userId) {
  return this.assignedTo.some((id) => id.toString() === userId.toString());
};

// Method to assign users
todoSchema.methods.assignUsers = function (userIds, assignedBy) {
  // Remove duplicates and existing assignments
  const newAssignees = userIds.filter(
    (id) => !this.assignedTo.some((existingId) => existingId.toString() === id.toString())
  );

  this.assignedTo.push(...newAssignees);
  this.assignedBy = assignedBy;
  this.assignedAt = new Date();
};

// Method to unassign user
todoSchema.methods.unassignUser = function (userId) {
  const index = this.assignedTo.findIndex((id) => id.toString() === userId.toString());
  if (index > -1) {
    this.assignedTo.splice(index, 1);
  }
};

// Method to add checklist item
todoSchema.methods.addChecklistItem = function (text) {
  this.checklist.push({ text, completed: false });
};

// Method to toggle checklist item
todoSchema.methods.toggleChecklistItem = function (itemId, userId) {
  const item = this.checklist.id(itemId);
  if (item) {
    item.completed = !item.completed;
    if (item.completed) {
      item.completedBy = userId;
      item.completedAt = new Date();
    } else {
      item.completedBy = null;
      item.completedAt = null;
    }
  }
};

// Method to add attachment
todoSchema.methods.addAttachment = function (attachmentData) {
  this.attachments.push(attachmentData);
};

// Method to remove attachment
todoSchema.methods.removeAttachment = function (attachmentId) {
  const index = this.attachments.findIndex((att) => att._id.toString() === attachmentId.toString());
  if (index > -1) {
    this.attachments.splice(index, 1);
  }
};

// Static method to find workspace todos with filters
todoSchema.statics.findWorkspaceTodos = function (workspaceId, filters = {}, options = {}) {
  const query = { workspace: workspaceId };

  // Apply filters
  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.priority) {
    query.priority = filters.priority;
  }

  if (filters.assignedTo) {
    query.assignedTo = filters.assignedTo;
  }

  if (filters.createdBy) {
    query.createdBy = filters.createdBy;
  }

  if (filters.isPinned !== undefined) {
    query.isPinned = filters.isPinned;
  }

  if (filters.isFavorite !== undefined) {
    query.isFavorite = filters.isFavorite;
  }

  // Handle deleted filter
  if (filters.includeDeleted) {
    // Include both deleted and non-deleted
  } else if (filters.onlyDeleted) {
    query.deletedAt = { $ne: null };
  } else {
    // Default: exclude deleted
    query.deletedAt = null;
  }

  // Date range filters
  if (filters.dueDateFrom || filters.dueDateTo) {
    query.dueDate = {};
    if (filters.dueDateFrom) {
      query.dueDate.$gte = new Date(filters.dueDateFrom);
    }
    if (filters.dueDateTo) {
      query.dueDate.$lte = new Date(filters.dueDateTo);
    }
  }

  // Search in title and description
  if (filters.search) {
    query.$or = [
      { title: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
    ];
  }

  // Label filter
  if (filters.label) {
    query['labels.name'] = filters.label;
  }

  // Build the query
  let queryBuilder = this.find(query)
    .populate('createdBy', 'name email avatar')
    .populate('assignedTo', 'name email avatar')
    .populate('assignedBy', 'name email avatar');

  // Sorting
  const sortOptions = {};
  if (options.sortBy) {
    sortOptions[options.sortBy] = options.sortOrder === 'asc' ? 1 : -1;
  } else {
    // Default sort: pinned first, then by creation date
    sortOptions.isPinned = -1;
    sortOptions.createdAt = -1;
  }
  queryBuilder = queryBuilder.sort(sortOptions);

  // Pagination
  if (options.limit) {
    const page = options.page || 1;
    const skip = (page - 1) * options.limit;
    queryBuilder = queryBuilder.skip(skip).limit(options.limit);
  }

  return queryBuilder;
};

// Static method to find overdue todos
todoSchema.statics.findOverdueTodos = function (workspaceId) {
  return this.find({
    workspace: workspaceId,
    dueDate: { $lt: new Date() },
    status: { $nin: ['completed', 'archived'] },
    deletedAt: null,
  })
    .populate('createdBy', 'name email avatar')
    .populate('assignedTo', 'name email avatar');
};

// Static method to find todos with upcoming reminders
todoSchema.statics.findTodosWithUpcomingReminders = function (minutes = 15) {
  const now = new Date();
  const future = new Date(now.getTime() + minutes * 60000);

  return this.find({
    reminder: { $gte: now, $lte: future },
    status: { $nin: ['completed', 'archived'] },
    deletedAt: null,
  })
    .populate('createdBy', 'name email avatar')
    .populate('assignedTo', 'name email avatar')
    .populate('workspace', 'name');
};

const Todo = mongoose.model('Todo', todoSchema);

export default Todo;