import Todo from '../models/Todo.js';
import Activity from '../models/Activity.js';
import Comment from '../models/Comment.js';
import { getCachedData, setCachedData, deleteCachedData } from './cacheService.js';
import { CACHE_TTL, TODO_STATUS, TODO_PRIORITY } from '../utils/constants.js';
import logger from '../utils/logger.js';

/**
 * Todo service for managing todos
 */

/**
 * Create a new todo
 * @param {String} workspaceId - Workspace ID
 * @param {String} userId - Creator user ID
 * @param {Object} data - Todo data
 * @returns {Promise<Object>} Created todo
 */
export const createTodo = async (workspaceId, userId, data) => {
  try {
    const todo = await Todo.create({
      ...data,
      workspace: workspaceId,
      createdBy: userId,
    });

    // Populate references
    await todo.populate([
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'assignedTo', select: 'name email avatar' },
    ]);

    // Invalidate workspace todos cache
    await deleteCachedData(`todos:workspace:${workspaceId}`);

    logger.info(`Todo created: ${todo._id} in workspace ${workspaceId}`);
    return todo;
  } catch (error) {
    logger.error('Create todo error:', error);
    throw error;
  }
};

/**
 * Get todo by ID
 * @param {String} todoId - Todo ID
 * @param {Boolean} includeDeleted - Include soft-deleted todos
 * @returns {Promise<Object>} Todo
 */
export const getTodoById = async (todoId, includeDeleted = false) => {
  try {
    const query = { _id: todoId };
    if (!includeDeleted) {
      query.deletedAt = null;
    }

    const todo = await Todo.findOne(query)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .populate('workspace', 'name')
      .lean();

    if (!todo) {
      throw new Error('Todo not found');
    }

    return todo;
  } catch (error) {
    logger.error('Get todo by ID error:', error);
    throw error;
  }
};

/**
 * Get todos with filters and pagination
 * @param {String} workspaceId - Workspace ID
 * @param {Object} filters - Filter options
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} Todos with pagination
 */
export const getTodos = async (workspaceId, filters = {}, options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;

    // Build query
    const query = {
      workspace: workspaceId,
      deletedAt: null,
    };

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
    if (filters.labels && filters.labels.length > 0) {
      query.labels = { $in: filters.labels };
    }
    if (filters.isPinned !== undefined) {
      query.isPinned = filters.isPinned;
    }
    if (filters.isFavorite !== undefined) {
      query.isFavorite = filters.isFavorite;
    }
    if (filters.isArchived !== undefined) {
      query.isArchived = filters.isArchived;
    }
    if (filters.dueDate) {
      if (filters.dueDate === 'overdue') {
        query.dueDate = { $lt: new Date() };
        query.status = { $ne: TODO_STATUS.COMPLETED };
      } else if (filters.dueDate === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        query.dueDate = { $gte: today, $lt: tomorrow };
      } else if (filters.dueDate === 'week') {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        query.dueDate = { $gte: today, $lte: nextWeek };
      }
    }
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    // Build sort
    const sort = {};
    if (sortBy === 'dueDate') {
      sort.dueDate = sortOrder === 'desc' ? -1 : 1;
      sort.createdAt = -1; // Secondary sort
    } else if (sortBy === 'priority') {
      // Priority order: HIGH > MEDIUM > LOW
      sort.priority = sortOrder === 'desc' ? -1 : 1;
      sort.createdAt = -1;
    } else {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const [todos, total] = await Promise.all([
      Todo.find(query)
        .populate('createdBy', 'name email avatar')
        .populate('assignedTo', 'name email avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Todo.countDocuments(query),
    ]);

    return {
      todos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Get todos error:', error);
    throw error;
  }
};

/**
 * Update todo
 * @param {String} todoId - Todo ID
 * @param {Object} data - Update data
 * @param {String} userId - User ID performing the update
 * @returns {Promise<Object>} Updated todo
 */
export const updateTodo = async (todoId, data, userId) => {
  try {
    const todo = await Todo.findOneAndUpdate(
      { _id: todoId, deletedAt: null },
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .populate('workspace', 'name');

    if (!todo) {
      throw new Error('Todo not found');
    }

    // Invalidate cache
    await deleteCachedData(`todos:workspace:${todo.workspace._id}`);

    logger.info(`Todo updated: ${todoId} by user ${userId}`);
    return todo;
  } catch (error) {
    logger.error('Update todo error:', error);
    throw error;
  }
};

/**
 * Delete todo (soft delete)
 * @param {String} todoId - Todo ID
 * @param {String} userId - User ID performing the deletion
 * @returns {Promise<Object>} Deleted todo
 */
export const deleteTodo = async (todoId, userId) => {
  try {
    const todo = await Todo.findOneAndUpdate(
      { _id: todoId, deletedAt: null },
      { deletedAt: new Date(), deletedBy: userId },
      { new: true }
    );

    if (!todo) {
      throw new Error('Todo not found');
    }

    // Invalidate cache
    await deleteCachedData(`todos:workspace:${todo.workspace}`);

    logger.info(`Todo soft deleted: ${todoId} by user ${userId}`);
    return todo;
  } catch (error) {
    logger.error('Delete todo error:', error);
    throw error;
  }
};

/**
 * Restore deleted todo
 * @param {String} todoId - Todo ID
 * @returns {Promise<Object>} Restored todo
 */
export const restoreTodo = async (todoId) => {
  try {
    const todo = await Todo.findOneAndUpdate(
      { _id: todoId, deletedAt: { $ne: null } },
      { deletedAt: null, deletedBy: null },
      { new: true }
    )
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar');

    if (!todo) {
      throw new Error('Todo not found');
    }

    // Invalidate cache
    await deleteCachedData(`todos:workspace:${todo.workspace}`);

    logger.info(`Todo restored: ${todoId}`);
    return todo;
  } catch (error) {
    logger.error('Restore todo error:', error);
    throw error;
  }
};

/**
 * Permanently delete todo
 * @param {String} todoId - Todo ID
 * @returns {Promise<Boolean>} Success status
 */
export const permanentlyDeleteTodo = async (todoId) => {
  try {
    const todo = await Todo.findById(todoId);
    if (!todo) {
      throw new Error('Todo not found');
    }

    const workspaceId = todo.workspace;

    // Delete related data
    await Promise.all([
      Comment.deleteMany({ todo: todoId }),
      Activity.deleteMany({ relatedModel: 'Todo', relatedId: todoId }),
      todo.deleteOne(),
    ]);

    // Invalidate cache
    await deleteCachedData(`todos:workspace:${workspaceId}`);

    logger.info(`Todo permanently deleted: ${todoId}`);
    return true;
  } catch (error) {
    logger.error('Permanently delete todo error:', error);
    throw error;
  }
};

/**
 * Duplicate todo
 * @param {String} todoId - Todo ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Duplicated todo
 */
export const duplicateTodo = async (todoId, userId) => {
  try {
    const originalTodo = await Todo.findOne({ _id: todoId, deletedAt: null }).lean();
    if (!originalTodo) {
      throw new Error('Todo not found');
    }

    // Create duplicate
    const duplicate = await Todo.create({
      ...originalTodo,
      _id: undefined,
      title: `${originalTodo.title} (Copy)`,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await duplicate.populate([
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'assignedTo', select: 'name email avatar' },
    ]);

    // Invalidate cache
    await deleteCachedData(`todos:workspace:${duplicate.workspace}`);

    logger.info(`Todo duplicated: ${todoId} -> ${duplicate._id}`);
    return duplicate;
  } catch (error) {
    logger.error('Duplicate todo error:', error);
    throw error;
  }
};

/**
 * Toggle todo pin status
 * @param {String} todoId - Todo ID
 * @returns {Promise<Object>} Updated todo
 */
export const togglePin = async (todoId) => {
  try {
    const todo = await Todo.findOne({ _id: todoId, deletedAt: null });
    if (!todo) {
      throw new Error('Todo not found');
    }

    todo.isPinned = !todo.isPinned;
    await todo.save();

    await todo.populate([
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'assignedTo', select: 'name email avatar' },
    ]);

    // Invalidate cache
    await deleteCachedData(`todos:workspace:${todo.workspace}`);

    return todo;
  } catch (error) {
    logger.error('Toggle pin error:', error);
    throw error;
  }
};

/**
 * Toggle todo favorite status
 * @param {String} todoId - Todo ID
 * @returns {Promise<Object>} Updated todo
 */
export const toggleFavorite = async (todoId) => {
  try {
    const todo = await Todo.findOne({ _id: todoId, deletedAt: null });
    if (!todo) {
      throw new Error('Todo not found');
    }

    todo.isFavorite = !todo.isFavorite;
    await todo.save();

    await todo.populate([
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'assignedTo', select: 'name email avatar' },
    ]);

    // Invalidate cache
    await deleteCachedData(`todos:workspace:${todo.workspace}`);

    return todo;
  } catch (error) {
    logger.error('Toggle favorite error:', error);
    throw error;
  }
};

/**
 * Archive/Unarchive todo
 * @param {String} todoId - Todo ID
 * @param {Boolean} archive - Archive status
 * @returns {Promise<Object>} Updated todo
 */
export const archiveTodo = async (todoId, archive = true) => {
  try {
    const todo = await Todo.findOneAndUpdate(
      { _id: todoId, deletedAt: null },
      { isArchived: archive },
      { new: true }
    )
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar');

    if (!todo) {
      throw new Error('Todo not found');
    }

    // Invalidate cache
    await deleteCachedData(`todos:workspace:${todo.workspace}`);

    logger.info(`Todo ${archive ? 'archived' : 'unarchived'}: ${todoId}`);
    return todo;
  } catch (error) {
    logger.error('Archive todo error:', error);
    throw error;
  }
};

/**
 * Assign todo to users
 * @param {String} todoId - Todo ID
 * @param {Array} userIds - Array of user IDs
 * @param {String} assignerId - Assigner user ID
 * @returns {Promise<Object>} Updated todo
 */
export const assignTodo = async (todoId, userIds, assignerId) => {
  try {
    const todo = await Todo.findOneAndUpdate(
      { _id: todoId, deletedAt: null },
      {
        assignedTo: userIds,
        assignedBy: assignerId,
        assignedAt: new Date(),
      },
      { new: true }
    )
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .populate('workspace', 'name');

    if (!todo) {
      throw new Error('Todo not found');
    }

    // Invalidate cache
    await deleteCachedData(`todos:workspace:${todo.workspace._id}`);

    logger.info(`Todo assigned: ${todoId} to ${userIds.length} users`);
    return todo;
  } catch (error) {
    logger.error('Assign todo error:', error);
    throw error;
  }
};

/**
 * Add checklist item to todo
 * @param {String} todoId - Todo ID
 * @param {Object} item - Checklist item {text, completed}
 * @returns {Promise<Object>} Updated todo
 */
export const addChecklistItem = async (todoId, item) => {
  try {
    const todo = await Todo.findOneAndUpdate(
      { _id: todoId, deletedAt: null },
      { $push: { checklist: item } },
      { new: true }
    )
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar');

    if (!todo) {
      throw new Error('Todo not found');
    }

    return todo;
  } catch (error) {
    logger.error('Add checklist item error:', error);
    throw error;
  }
};

/**
 * Update checklist item
 * @param {String} todoId - Todo ID
 * @param {String} itemId - Checklist item ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated todo
 */
export const updateChecklistItem = async (todoId, itemId, data) => {
  try {
    const todo = await Todo.findOne({ _id: todoId, deletedAt: null });
    if (!todo) {
      throw new Error('Todo not found');
    }

    const item = todo.checklist.id(itemId);
    if (!item) {
      throw new Error('Checklist item not found');
    }

    Object.assign(item, data);
    await todo.save();

    await todo.populate([
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'assignedTo', select: 'name email avatar' },
    ]);

    return todo;
  } catch (error) {
    logger.error('Update checklist item error:', error);
    throw error;
  }
};

/**
 * Remove checklist item
 * @param {String} todoId - Todo ID
 * @param {String} itemId - Checklist item ID
 * @returns {Promise<Object>} Updated todo
 */
export const removeChecklistItem = async (todoId, itemId) => {
  try {
    const todo = await Todo.findOneAndUpdate(
      { _id: todoId, deletedAt: null },
      { $pull: { checklist: { _id: itemId } } },
      { new: true }
    )
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar');

    if (!todo) {
      throw new Error('Todo not found');
    }

    return todo;
  } catch (error) {
    logger.error('Remove checklist item error:', error);
    throw error;
  }
};

/**
 * Add attachment to todo
 * @param {String} todoId - Todo ID
 * @param {Object} attachment - Attachment data
 * @returns {Promise<Object>} Updated todo
 */
export const addAttachment = async (todoId, attachment) => {
  try {
    const todo = await Todo.findOneAndUpdate(
      { _id: todoId, deletedAt: null },
      { $push: { attachments: attachment } },
      { new: true }
    )
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar');

    if (!todo) {
      throw new Error('Todo not found');
    }

    return todo;
  } catch (error) {
    logger.error('Add attachment error:', error);
    throw error;
  }
};

/**
 * Remove attachment from todo
 * @param {String} todoId - Todo ID
 * @param {String} attachmentId - Attachment ID
 * @returns {Promise<Object>} Updated todo
 */
export const removeAttachment = async (todoId, attachmentId) => {
  try {
    const todo = await Todo.findOneAndUpdate(
      { _id: todoId, deletedAt: null },
      { $pull: { attachments: { _id: attachmentId } } },
      { new: true }
    )
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar');

    if (!todo) {
      throw new Error('Todo not found');
    }

    return todo;
  } catch (error) {
    logger.error('Remove attachment error:', error);
    throw error;
  }
};

/**
 * Get user todos (assigned to user)
 * @param {String} userId - User ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} User todos
 */
export const getUserTodos = async (userId, filters = {}) => {
  try {
    const query = {
      assignedTo: userId,
      deletedAt: null,
    };

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.workspace) {
      query.workspace = filters.workspace;
    }

    const todos = await Todo.find(query)
      .populate('createdBy', 'name email avatar')
      .populate('workspace', 'name')
      .sort({ dueDate: 1, createdAt: -1 })
      .lean();

    return todos;
  } catch (error) {
    logger.error('Get user todos error:', error);
    throw error;
  }
};

/**
 * Get overdue todos
 * @param {String} workspaceId - Workspace ID
 * @returns {Promise<Array>} Overdue todos
 */
export const getOverdueTodos = async (workspaceId) => {
  try {
    const todos = await Todo.find({
      workspace: workspaceId,
      status: { $ne: TODO_STATUS.COMPLETED },
      dueDate: { $lt: new Date() },
      deletedAt: null,
    })
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .sort({ dueDate: 1 })
      .lean();

    return todos;
  } catch (error) {
    logger.error('Get overdue todos error:', error);
    throw error;
  }
};

export default {
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
  getUserTodos,
  getOverdueTodos,
};
