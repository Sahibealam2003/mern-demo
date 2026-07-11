import { getCache, setCache, deleteCache, deleteCachePattern } from '../config/redis.js';
import { CACHE_TTL } from '../utils/constants.js';
import logger from '../utils/logger.js';

/**
 * Cache service for managing Redis cache operations
 */

/**
 * Generate cache key for workspace
 */
const getWorkspaceKey = (workspaceId) => `workspace:${workspaceId}`;
const getWorkspaceMembersKey = (workspaceId) => `workspace:${workspaceId}:members`;
const getWorkspaceTodosKey = (workspaceId, filters = '') => {
  const filterKey = filters ? `:${JSON.stringify(filters)}` : '';
  return `workspace:${workspaceId}:todos${filterKey}`;
};

/**
 * Generate cache key for user
 */
const getUserKey = (userId) => `user:${userId}`;
const getUserWorkspacesKey = (userId) => `user:${userId}:workspaces`;
const getUserNotificationsKey = (userId) => `user:${userId}:notifications`;

/**
 * Generate cache key for todo
 */
const getTodoKey = (todoId) => `todo:${todoId}`;
const getTodoCommentsKey = (todoId) => `todo:${todoId}:comments`;

/**
 * Cache workspace data
 */
export const cacheWorkspace = async (workspaceId, data, ttl = CACHE_TTL.MEDIUM) => {
  try {
    const key = getWorkspaceKey(workspaceId);
    await setCache(key, data, ttl);
    logger.debug(`Cached workspace: ${workspaceId}`);
    return true;
  } catch (error) {
    logger.error('Cache workspace error:', error);
    return false;
  }
};

/**
 * Get cached workspace data
 */
export const getWorkspaceCache = async (workspaceId) => {
  try {
    const key = getWorkspaceKey(workspaceId);
    const data = await getCache(key);
    if (data) {
      logger.debug(`Cache hit: workspace ${workspaceId}`);
    }
    return data;
  } catch (error) {
    logger.error('Get workspace cache error:', error);
    return null;
  }
};

/**
 * Invalidate workspace cache
 */
export const invalidateWorkspaceCache = async (workspaceId) => {
  try {
    await deleteCachePattern(`workspace:${workspaceId}*`);
    logger.debug(`Invalidated cache: workspace ${workspaceId}`);
    return true;
  } catch (error) {
    logger.error('Invalidate workspace cache error:', error);
    return false;
  }
};

/**
 * Cache workspace members
 */
export const cacheWorkspaceMembers = async (workspaceId, members, ttl = CACHE_TTL.MEDIUM) => {
  try {
    const key = getWorkspaceMembersKey(workspaceId);
    await setCache(key, members, ttl);
    return true;
  } catch (error) {
    logger.error('Cache workspace members error:', error);
    return false;
  }
};

/**
 * Get cached workspace members
 */
export const getWorkspaceMembersCache = async (workspaceId) => {
  try {
    const key = getWorkspaceMembersKey(workspaceId);
    return await getCache(key);
  } catch (error) {
    logger.error('Get workspace members cache error:', error);
    return null;
  }
};

/**
 * Cache workspace todos
 */
export const cacheTodos = async (workspaceId, filters, todos, ttl = CACHE_TTL.SHORT) => {
  try {
    const key = getWorkspaceTodosKey(workspaceId, filters);
    await setCache(key, todos, ttl);
    return true;
  } catch (error) {
    logger.error('Cache todos error:', error);
    return false;
  }
};

/**
 * Get cached workspace todos
 */
export const getTodosCache = async (workspaceId, filters) => {
  try {
    const key = getWorkspaceTodosKey(workspaceId, filters);
    return await getCache(key);
  } catch (error) {
    logger.error('Get todos cache error:', error);
    return null;
  }
};

/**
 * Invalidate todos cache for workspace
 */
export const invalidateTodosCache = async (workspaceId) => {
  try {
    await deleteCachePattern(`workspace:${workspaceId}:todos*`);
    logger.debug(`Invalidated todos cache: workspace ${workspaceId}`);
    return true;
  } catch (error) {
    logger.error('Invalidate todos cache error:', error);
    return false;
  }
};

/**
 * Cache user data
 */
export const cacheUser = async (userId, data, ttl = CACHE_TTL.LONG) => {
  try {
    const key = getUserKey(userId);
    await setCache(key, data, ttl);
    return true;
  } catch (error) {
    logger.error('Cache user error:', error);
    return false;
  }
};

/**
 * Get cached user data
 */
export const getUserCache = async (userId) => {
  try {
    const key = getUserKey(userId);
    return await getCache(key);
  } catch (error) {
    logger.error('Get user cache error:', error);
    return null;
  }
};

/**
 * Invalidate user cache
 */
export const invalidateUserCache = async (userId) => {
  try {
    await deleteCachePattern(`user:${userId}*`);
    logger.debug(`Invalidated cache: user ${userId}`);
    return true;
  } catch (error) {
    logger.error('Invalidate user cache error:', error);
    return false;
  }
};

/**
 * Cache user workspaces
 */
export const cacheUserWorkspaces = async (userId, workspaces, ttl = CACHE_TTL.MEDIUM) => {
  try {
    const key = getUserWorkspacesKey(userId);
    await setCache(key, workspaces, ttl);
    return true;
  } catch (error) {
    logger.error('Cache user workspaces error:', error);
    return false;
  }
};

/**
 * Get cached user workspaces
 */
export const getUserWorkspacesCache = async (userId) => {
  try {
    const key = getUserWorkspacesKey(userId);
    return await getCache(key);
  } catch (error) {
    logger.error('Get user workspaces cache error:', error);
    return null;
  }
};

/**
 * Cache todo data
 */
export const cacheTodo = async (todoId, data, ttl = CACHE_TTL.SHORT) => {
  try {
    const key = getTodoKey(todoId);
    await setCache(key, data, ttl);
    return true;
  } catch (error) {
    logger.error('Cache todo error:', error);
    return false;
  }
};

/**
 * Get cached todo data
 */
export const getTodoCache = async (todoId) => {
  try {
    const key = getTodoKey(todoId);
    return await getCache(key);
  } catch (error) {
    logger.error('Get todo cache error:', error);
    return null;
  }
};

/**
 * Invalidate todo cache
 */
export const invalidateTodoCache = async (todoId) => {
  try {
    const key = getTodoKey(todoId);
    await deleteCache(key);
    logger.debug(`Invalidated cache: todo ${todoId}`);
    return true;
  } catch (error) {
    logger.error('Invalidate todo cache error:', error);
    return false;
  }
};

/**
 * Cache todo comments
 */
export const cacheTodoComments = async (todoId, comments, ttl = CACHE_TTL.SHORT) => {
  try {
    const key = getTodoCommentsKey(todoId);
    await setCache(key, comments, ttl);
    return true;
  } catch (error) {
    logger.error('Cache todo comments error:', error);
    return false;
  }
};

/**
 * Get cached todo comments
 */
export const getTodoCommentsCache = async (todoId) => {
  try {
    const key = getTodoCommentsKey(todoId);
    return await getCache(key);
  } catch (error) {
    logger.error('Get todo comments cache error:', error);
    return null;
  }
};

/**
 * Invalidate todo comments cache
 */
export const invalidateTodoCommentsCache = async (todoId) => {
  try {
    const key = getTodoCommentsKey(todoId);
    await deleteCache(key);
    return true;
  } catch (error) {
    logger.error('Invalidate todo comments cache error:', error);
    return false;
  }
};

/**
 * Cache user notifications
 */
export const cacheUserNotifications = async (userId, notifications, ttl = CACHE_TTL.SHORT) => {
  try {
    const key = getUserNotificationsKey(userId);
    await setCache(key, notifications, ttl);
    return true;
  } catch (error) {
    logger.error('Cache user notifications error:', error);
    return false;
  }
};

/**
 * Get cached user notifications
 */
export const getUserNotificationsCache = async (userId) => {
  try {
    const key = getUserNotificationsKey(userId);
    return await getCache(key);
  } catch (error) {
    logger.error('Get user notifications cache error:', error);
    return null;
  }
};

/**
 * Invalidate user notifications cache
 */
export const invalidateUserNotificationsCache = async (userId) => {
  try {
    const key = getUserNotificationsKey(userId);
    await deleteCache(key);
    return true;
  } catch (error) {
    logger.error('Invalidate user notifications cache error:', error);
    return false;
  }
};

/**
 * Invalidate all caches related to a workspace (cascade)
 */
export const invalidateWorkspaceCascade = async (workspaceId) => {
  try {
    await deleteCachePattern(`workspace:${workspaceId}*`);
    logger.info(`Cascade invalidated all workspace caches: ${workspaceId}`);
    return true;
  } catch (error) {
    logger.error('Cascade invalidate workspace error:', error);
    return false;
  }
};

/**
 * Invalidate all caches related to a user (cascade)
 */
export const invalidateUserCascade = async (userId) => {
  try {
    await deleteCachePattern(`user:${userId}*`);
    logger.info(`Cascade invalidated all user caches: ${userId}`);
    return true;
  } catch (error) {
    logger.error('Cascade invalidate user error:', error);
    return false;
  }
};

export default {
  cacheWorkspace,
  getWorkspaceCache,
  invalidateWorkspaceCache,
  cacheWorkspaceMembers,
  getWorkspaceMembersCache,
  cacheTodos,
  getTodosCache,
  invalidateTodosCache,
  cacheUser,
  getUserCache,
  invalidateUserCache,
  cacheUserWorkspaces,
  getUserWorkspacesCache,
  cacheTodo,
  getTodoCache,
  invalidateTodoCache,
  cacheTodoComments,
  getTodoCommentsCache,
  invalidateTodoCommentsCache,
  cacheUserNotifications,
  getUserNotificationsCache,
  invalidateUserNotificationsCache,
  invalidateWorkspaceCascade,
  invalidateUserCascade,
};