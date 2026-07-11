import Comment from '../models/Comment.js';
import Activity from '../models/Activity.js';
import { createCommentNotification, createMentionNotification } from '../services/notificationService.js';
import { getTodoById } from '../services/todoService.js';
import logger from '../utils/logger.js';

/**
 * Create comment
 * @route POST /api/workspaces/:workspaceId/todos/:todoId/comments
 */
export const create = async (req, res) => {
  try {
    const { todoId, workspaceId } = req.params;
    const userId = req.user.id;
    const { content, parentComment, mentions } = req.body;

    const comment = await Comment.create({
      todo: todoId,
      author: userId,
      content,
      parentComment: parentComment || null,
      mentions: mentions || [],
    });

    await comment.populate([
      { path: 'author', select: 'name email avatar' },
      { path: 'mentions', select: 'name email avatar' },
    ]);

    const todo = await getTodoById(todoId);

    // Notify todo assignees
    if (todo.assignedTo && todo.assignedTo.length > 0) {
      for (const assigned of todo.assignedTo) {
        const assignedId = assigned._id || assigned;
        if (assignedId.toString() !== userId) {
          await createCommentNotification(assignedId, userId, todoId, comment._id, {
            todoTitle: todo.title,
            message: `${req.user.name} commented on "${todo.title}"`,
          });
        }
      }
    }

    // Notify mentions
    if (mentions && mentions.length > 0) {
      for (const mentionedId of mentions) {
        if (mentionedId !== userId) {
          await createMentionNotification(mentionedId, userId, comment._id, {
            todoTitle: todo.title,
            message: `${req.user.name} mentioned you in a comment`,
          });
        }
      }
    }

    // Notify creator if different
    if (todo.createdBy && todo.createdBy._id.toString() !== userId) {
      await createCommentNotification(todo.createdBy._id, userId, todoId, comment._id, {
        todoTitle: todo.title,
        message: `${req.user.name} commented on "${todo.title}"`,
      });
    }

    await Activity.create({
      user: userId,
      workspace: workspaceId,
      action: 'COMMENT_ADDED',
      description: `Commented on "${todo.title}"`,
      relatedModel: 'Comment',
      relatedId: comment._id,
    });

    if (req.io) {
      req.io.to(`todo:${todoId}`).emit('comment:created', comment);
      req.io.to(`workspace:${workspaceId}`).emit('comment:created', { todoId, comment });
    }

    res.status(201).json({ success: true, message: 'Comment added', data: { comment } });
  } catch (error) {
    logger.error('Create comment controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get comments for a todo
 * @route GET /api/workspaces/:workspaceId/todos/:todoId/comments
 */
export const getAll = async (req, res) => {
  try {
    const { todoId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    // Get top-level comments only; replies are nested
    const [comments, total] = await Promise.all([
      Comment.find({ todo: todoId, parentComment: null, isDeleted: false })
        .populate('author', 'name email avatar')
        .populate('mentions', 'name email avatar')
        .populate({
          path: 'replies',
          populate: { path: 'author', select: 'name email avatar' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Comment.countDocuments({ todo: todoId, parentComment: null, isDeleted: false }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        comments,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    logger.error('Get comments controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update comment
 * @route PUT /api/workspaces/:workspaceId/todos/:todoId/comments/:id
 */
export const update = async (req, res) => {
  try {
    const { content } = req.body;

    const comment = await Comment.findOneAndUpdate(
      { _id: req.params.id, author: req.user.id, isDeleted: false },
      { content, isEdited: true, editedAt: new Date() },
      { new: true }
    ).populate('author', 'name email avatar');

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found or not authorized' });
    }

    if (req.io) {
      req.io.to(`todo:${req.params.todoId}`).emit('comment:updated', comment);
    }

    res.status(200).json({ success: true, data: { comment } });
  } catch (error) {
    logger.error('Update comment controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete comment (soft delete)
 * @route DELETE /api/workspaces/:workspaceId/todos/:todoId/comments/:id
 */
export const remove = async (req, res) => {
  try {
    const comment = await Comment.findOne({ _id: req.params.id, isDeleted: false });
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Only author or admin/owner can delete
    const isAuthor = comment.author.toString() === req.user.id;
    const isAdminOrOwner = ['admin', 'owner'].includes(req.userRole);

    if (!isAuthor && !isAdminOrOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    comment.isDeleted = true;
    comment.content = '[deleted]';
    await comment.save();

    if (req.io) {
      req.io.to(`todo:${req.params.todoId}`).emit('comment:deleted', { id: comment._id });
    }

    res.status(200).json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    logger.error('Delete comment controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Toggle reaction on comment
 * @route POST /api/workspaces/:workspaceId/todos/:todoId/comments/:id/reactions
 */
export const toggleReaction = async (req, res) => {
  try {
    const { emoji } = req.body;
    const userId = req.user.id;

    const comment = await Comment.findOne({ _id: req.params.id, isDeleted: false });
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const reactionIndex = comment.reactions.findIndex(
      r => r.emoji === emoji && r.user.toString() === userId
    );

    if (reactionIndex > -1) {
      comment.reactions.splice(reactionIndex, 1);
    } else {
      comment.reactions.push({ emoji, user: userId });
    }

    await comment.save();
    await comment.populate('author', 'name email avatar');

    if (req.io) {
      req.io.to(`todo:${req.params.todoId}`).emit('comment:updated', comment);
    }

    res.status(200).json({ success: true, data: { comment } });
  } catch (error) {
    logger.error('Toggle reaction controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export default { create, getAll, update, remove, toggleReaction };
