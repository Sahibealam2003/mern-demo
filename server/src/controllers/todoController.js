import {
  createTodo,
  getTodoById,
  getTodos,
  updateTodo,
  deleteTodo,
  restoreTodo,
  permanentlyDeleteTodo,
  duplicateTodo,
  togglePin,
  toggleFavorite,
  archiveTodo,
  assignTodo,
  addChecklistItem,
  updateChecklistItem,
  removeChecklistItem,
  addAttachment,
  removeAttachment,
} from '../services/todoService.js';
import { createTaskAssignmentNotification } from '../services/notificationService.js';
import { sendTaskAssignmentEmailService } from '../services/emailService.js';
import { uploadTodoAttachment, deleteFile } from '../services/uploadService.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * Create todo
 * @route POST /api/workspaces/:workspaceId/todos
 */
export const create = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    const todo = await createTodo(workspaceId, userId, req.body);

    await Activity.create({
      user: userId,
      workspace: workspaceId,
      action: 'TODO_CREATED',
      description: `Created todo "${todo.title}"`,
      relatedModel: 'Todo',
      relatedId: todo._id,
    });

    // Emit socket event
    if (req.io) {
      req.io.to(`workspace:${workspaceId}`).emit('todo:created', todo);
    }

    res.status(201).json({ success: true, message: 'Todo created', data: { todo } });
  } catch (error) {
    logger.error('Create todo controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get todos with filters
 * @route GET /api/workspaces/:workspaceId/todos
 */
export const getAll = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const {
      page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc',
      status, priority, assignedTo, labels, isPinned, isFavorite,
      isArchived, dueDate, search,
    } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (assignedTo) filters.assignedTo = assignedTo;
    if (labels) filters.labels = labels.split(',');
    if (isPinned !== undefined) filters.isPinned = isPinned === 'true';
    if (isFavorite !== undefined) filters.isFavorite = isFavorite === 'true';
    if (isArchived !== undefined) filters.isArchived = isArchived === 'true';
    if (dueDate) filters.dueDate = dueDate;
    if (search) filters.search = search;

    const result = await getTodos(workspaceId, filters, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error('Get todos controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get single todo
 * @route GET /api/workspaces/:workspaceId/todos/:id
 */
export const getOne = async (req, res) => {
  try {
    const todo = await getTodoById(req.params.id);
    res.status(200).json({ success: true, data: { todo } });
  } catch (error) {
    logger.error('Get todo controller error:', error);
    res.status(404).json({ success: false, message: error.message });
  }
};

/**
 * Update todo
 * @route PUT /api/workspaces/:workspaceId/todos/:id
 */
export const update = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    const allowedFields = [
      'title', 'description', 'priority', 'status', 'dueDate',
      'labels', 'color', 'notes', 'reminder',
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    const todo = await updateTodo(req.params.id, updateData, userId);

    await Activity.create({
      user: userId,
      workspace: workspaceId,
      action: 'TODO_UPDATED',
      description: `Updated todo "${todo.title}"`,
      relatedModel: 'Todo',
      relatedId: todo._id,
    });

    if (req.io) {
      req.io.to(`workspace:${workspaceId}`).emit('todo:updated', todo);
    }

    res.status(200).json({ success: true, message: 'Todo updated', data: { todo } });
  } catch (error) {
    logger.error('Update todo controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete todo (soft delete)
 * @route DELETE /api/workspaces/:workspaceId/todos/:id
 */
export const remove = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    const todo = await deleteTodo(req.params.id, userId);

    await Activity.create({
      user: userId,
      workspace: workspaceId,
      action: 'TODO_DELETED',
      description: `Deleted todo "${todo.title}"`,
      relatedModel: 'Todo',
      relatedId: todo._id,
    });

    if (req.io) {
      req.io.to(`workspace:${workspaceId}`).emit('todo:deleted', { id: todo._id });
    }

    res.status(200).json({ success: true, message: 'Todo deleted' });
  } catch (error) {
    logger.error('Delete todo controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Restore deleted todo
 * @route POST /api/workspaces/:workspaceId/todos/:id/restore
 */
export const restore = async (req, res) => {
  try {
    const todo = await restoreTodo(req.params.id);
    if (req.io) {
      req.io.to(`workspace:${req.params.workspaceId}`).emit('todo:restored', todo);
    }
    res.status(200).json({ success: true, message: 'Todo restored', data: { todo } });
  } catch (error) {
    logger.error('Restore todo controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Permanently delete todo
 * @route DELETE /api/workspaces/:workspaceId/todos/:id/permanent
 */
export const permanentDelete = async (req, res) => {
  try {
    await permanentlyDeleteTodo(req.params.id);
    res.status(200).json({ success: true, message: 'Todo permanently deleted' });
  } catch (error) {
    logger.error('Permanent delete controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Duplicate todo
 * @route POST /api/workspaces/:workspaceId/todos/:id/duplicate
 */
export const duplicate = async (req, res) => {
  try {
    const todo = await duplicateTodo(req.params.id, req.user.id);
    if (req.io) {
      req.io.to(`workspace:${req.params.workspaceId}`).emit('todo:created', todo);
    }
    res.status(201).json({ success: true, message: 'Todo duplicated', data: { todo } });
  } catch (error) {
    logger.error('Duplicate todo controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Toggle pin
 * @route POST /api/workspaces/:workspaceId/todos/:id/pin
 */
export const pin = async (req, res) => {
  try {
    const todo = await togglePin(req.params.id);
    if (req.io) {
      req.io.to(`workspace:${req.params.workspaceId}`).emit('todo:updated', todo);
    }
    res.status(200).json({ success: true, data: { todo } });
  } catch (error) {
    logger.error('Toggle pin controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Toggle favorite
 * @route POST /api/workspaces/:workspaceId/todos/:id/favorite
 */
export const favorite = async (req, res) => {
  try {
    const todo = await toggleFavorite(req.params.id);
    res.status(200).json({ success: true, data: { todo } });
  } catch (error) {
    logger.error('Toggle favorite controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Archive/unarchive todo
 * @route POST /api/workspaces/:workspaceId/todos/:id/archive
 */
export const archive = async (req, res) => {
  try {
    const { archived = true } = req.body;
    const todo = await archiveTodo(req.params.id, archived);
    res.status(200).json({ success: true, data: { todo } });
  } catch (error) {
    logger.error('Archive todo controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Assign todo to users
 * @route POST /api/workspaces/:workspaceId/todos/:id/assign
 */
export const assign = async (req, res) => {
  try {
    const { userIds } = req.body;
    const { workspaceId } = req.params;
    const assignerId = req.user.id;

    const todo = await assignTodo(req.params.id, userIds, assignerId);

    // Notify each assigned user
    for (const userId of userIds) {
      if (userId !== assignerId) {
        await createTaskAssignmentNotification(userId, assignerId, todo._id, workspaceId, {
          todoTitle: todo.title,
          message: `${req.user.name} assigned you "${todo.title}"`,
        });

        // Send email notification
        const user = await User.findById(userId);
        if (user) {
          await sendTaskAssignmentEmailService(user, todo, req.user, req.workspace);
        }
      }
    }

    await Activity.create({
      user: assignerId,
      workspace: workspaceId,
      action: 'TODO_ASSIGNED',
      description: `Assigned todo "${todo.title}" to ${userIds.length} user(s)`,
      relatedModel: 'Todo',
      relatedId: todo._id,
    });

    if (req.io) {
      req.io.to(`workspace:${workspaceId}`).emit('todo:updated', todo);
    }

    res.status(200).json({ success: true, message: 'Todo assigned', data: { todo } });
  } catch (error) {
    logger.error('Assign todo controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Add checklist item
 * @route POST /api/workspaces/:workspaceId/todos/:id/checklist
 */
export const addChecklist = async (req, res) => {
  try {
    const { text } = req.body;
    const todo = await addChecklistItem(req.params.id, { text, completed: false });
    res.status(200).json({ success: true, data: { todo } });
  } catch (error) {
    logger.error('Add checklist controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update checklist item
 * @route PUT /api/workspaces/:workspaceId/todos/:id/checklist/:itemId
 */
export const updateChecklist = async (req, res) => {
  try {
    const todo = await updateChecklistItem(req.params.id, req.params.itemId, req.body);
    res.status(200).json({ success: true, data: { todo } });
  } catch (error) {
    logger.error('Update checklist controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Remove checklist item
 * @route DELETE /api/workspaces/:workspaceId/todos/:id/checklist/:itemId
 */
export const removeChecklist = async (req, res) => {
  try {
    const todo = await removeChecklistItem(req.params.id, req.params.itemId);
    res.status(200).json({ success: true, data: { todo } });
  } catch (error) {
    logger.error('Remove checklist controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Upload attachment
 * @route POST /api/workspaces/:workspaceId/todos/:id/attachments
 */
export const uploadAttachmentHandler = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const attachment = await uploadTodoAttachment(req.files.file, req.params.id, req.user.id);
    const todo = await addAttachment(req.params.id, attachment);

    res.status(200).json({ success: true, message: 'Attachment uploaded', data: { todo } });
  } catch (error) {
    logger.error('Upload attachment controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Remove attachment
 * @route DELETE /api/workspaces/:workspaceId/todos/:id/attachments/:attachmentId
 */
export const removeAttachmentHandler = async (req, res) => {
  try {
    const todo = await getTodoById(req.params.id);
    const attachment = todo.attachments.find(a => a._id.toString() === req.params.attachmentId);

    if (attachment && attachment.publicId) {
      await deleteFile(attachment.publicId);
    }

    const updated = await removeAttachment(req.params.id, req.params.attachmentId);
    res.status(200).json({ success: true, data: { todo: updated } });
  } catch (error) {
    logger.error('Remove attachment controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  create, getAll, getOne, update, remove, restore, permanentDelete, duplicate,
  pin, favorite, archive, assign, addChecklist, updateChecklist, removeChecklist,
  uploadAttachmentHandler, removeAttachmentHandler,
};
