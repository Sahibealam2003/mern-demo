import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    todo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Todo',
      required: true,
      index: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: [2000, 'Comment must not exceed 2000 characters'],
    },
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    attachments: [
      {
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
        },
        size: {
          type: Number,
        },
      },
    ],
    edited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
commentSchema.index({ todo: 1, createdAt: -1 });
commentSchema.index({ workspace: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });

// Virtual for replies
commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment',
});

// Virtual to check if comment has replies
commentSchema.virtual('hasReplies').get(function () {
  return this.replies && this.replies.length > 0;
});

// Method to check if user is author
commentSchema.methods.isAuthor = function (userId) {
  return this.author.toString() === userId.toString();
};

// Method to extract mentions from content
commentSchema.methods.extractMentions = function () {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions = [];
  let match;

  while ((match = mentionRegex.exec(this.content)) !== null) {
    mentions.push(match[2]); // User ID
  }

  return mentions;
};

// Pre-save middleware to extract mentions
commentSchema.pre('save', function (next) {
  if (this.isModified('content')) {
    const extractedMentions = this.extractMentions();
    this.mentions = extractedMentions;
  }
  next();
});

// Static method to find todo comments with replies
commentSchema.statics.findTodoComments = function (todoId, options = {}) {
  const query = {
    todo: todoId,
    parentComment: null, // Only top-level comments
  };

  let queryBuilder = this.find(query)
    .populate('author', 'name email avatar')
    .populate({
      path: 'replies',
      populate: {
        path: 'author',
        select: 'name email avatar',
      },
    })
    .sort({ createdAt: options.sortOrder === 'asc' ? 1 : -1 });

  if (options.limit) {
    const page = options.page || 1;
    const skip = (page - 1) * options.limit;
    queryBuilder = queryBuilder.skip(skip).limit(options.limit);
  }

  return queryBuilder;
};

// Static method to find user's comments
commentSchema.statics.findUserComments = function (userId, options = {}) {
  let queryBuilder = this.find({ author: userId })
    .populate('todo', 'title')
    .populate('workspace', 'name')
    .sort({ createdAt: -1 });

  if (options.limit) {
    queryBuilder = queryBuilder.limit(options.limit);
  }

  return queryBuilder;
};

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;