import crypto from 'crypto';
import mongoose from 'mongoose';

/**
 * Async handler wrapper for Express route handlers
 * Eliminates need for try-catch blocks
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Generate URL-friendly slug from text
 * @param {string} text - Text to convert to slug
 * @returns {string} URL-friendly slug
 */
export const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
};

/**
 * Parse query filters for MongoDB
 * @param {Object} query - Express req.query object
 * @returns {Object} Parsed filters
 */
export const parseFilters = (query) => {
  const filters = {};

  // Status filter
  if (query.status) {
    filters.status = query.status;
  }

  // Priority filter
  if (query.priority) {
    filters.priority = query.priority;
  }

  // Assigned to filter
  if (query.assignedTo) {
    filters.assignedTo = query.assignedTo;
  }

  // Created by filter
  if (query.createdBy) {
    filters.createdBy = query.createdBy;
  }

  // Pinned filter
  if (query.isPinned !== undefined) {
    filters.isPinned = query.isPinned === 'true';
  }

  // Favorite filter
  if (query.isFavorite !== undefined) {
    filters.isFavorite = query.isFavorite === 'true';
  }

  // Search filter
  if (query.search) {
    filters.search = query.search.trim();
  }

  // Label filter
  if (query.label) {
    filters.label = query.label;
  }

  // Date range filters
  if (query.dueDateFrom) {
    filters.dueDateFrom = new Date(query.dueDateFrom);
  }

  if (query.dueDateTo) {
    filters.dueDateTo = new Date(query.dueDateTo);
  }

  // Deleted filter
  if (query.includeDeleted === 'true') {
    filters.includeDeleted = true;
  } else if (query.onlyDeleted === 'true') {
    filters.onlyDeleted = true;
  }

  return filters;
};

/**
 * Parse pagination options
 * @param {Object} query - Express req.query object
 * @returns {Object} Pagination options
 */
export const parsePagination = (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = Math.min(parseInt(query.limit, 10) || 10, 100); // Max 100 items per page
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  return {
    page,
    limit,
    sortBy,
    sortOrder,
    skip: (page - 1) * limit,
  };
};

/**
 * Build pagination metadata
 * @param {number} total - Total number of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 */
export const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);

  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Sanitize user object (remove sensitive fields)
 * @param {Object} user - User object
 * @returns {Object} Sanitized user object
 */
export const sanitizeUser = (user) => {
  if (!user) return null;

  const userObj = user.toObject ? user.toObject() : { ...user };

  delete userObj.password;
  delete userObj.emailVerificationToken;
  delete userObj.emailVerificationExpires;
  delete userObj.passwordResetToken;
  delete userObj.passwordResetExpires;
  delete userObj.__v;

  return userObj;
};

/**
 * Format date to readable string
 * @param {Date} date - Date to format
 * @param {string} format - Format string
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return null;

  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  const formatMap = {
    'YYYY-MM-DD': `${year}-${month}-${day}`,
    'YYYY-MM-DD HH:mm': `${year}-${month}-${day} ${hours}:${minutes}`,
    'MM/DD/YYYY': `${month}/${day}/${year}`,
    'DD/MM/YYYY': `${day}/${month}/${year}`,
  };

  return formatMap[format] || formatMap['YYYY-MM-DD'];
};

/**
 * Calculate time difference in readable format
 * @param {Date} date - Date to compare
 * @returns {string} Human-readable time difference
 */
export const timeAgo = (date) => {
  if (!date) return '';

  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);

    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generate random token
 * @param {number} length - Token length
 * @returns {string} Random token
 */
export const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Extract mentions from text (@[Name](userId))
 * @param {string} text - Text containing mentions
 * @returns {Array} Array of user IDs
 */
export const extractMentions = (text) => {
  if (!text) return [];

  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[2]); // User ID
  }

  return [...new Set(mentions)]; // Remove duplicates
};

/**
 * Check if value is valid MongoDB ObjectId
 * @param {string} id - ID to check
 * @returns {boolean} True if valid ObjectId
 */
export const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Build query for text search
 * @param {string} searchText - Text to search for
 * @param {Array} fields - Fields to search in
 * @returns {Object} MongoDB query object
 */
export const buildSearchQuery = (searchText, fields = ['title', 'description']) => {
  if (!searchText) return {};

  return {
    $or: fields.map((field) => ({
      [field]: { $regex: searchText, $options: 'i' },
    })),
  };
};

/**
 * Get client IP address from request
 * @param {Object} req - Express request object
 * @returns {string} IP address
 */
export const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    'Unknown'
  );
};

/**
 * Get user agent from request
 * @param {Object} req - Express request object
 * @returns {string} User agent string
 */
export const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'Unknown';
};

/**
 * Calculate completion percentage
 * @param {number} completed - Number of completed items
 * @param {number} total - Total number of items
 * @returns {number} Percentage (0-100)
 */
export const calculatePercentage = (completed, total) => {
  if (!total || total === 0) return 0;
  return Math.round((completed / total) * 100);
};

/**
 * Group array of objects by key
 * @param {Array} array - Array to group
 * @param {string} key - Key to group by
 * @returns {Object} Grouped object
 */
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
};

/**
 * Delay execution for specified milliseconds
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
export const delay = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Truncate string to specified length
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated string
 */
export const truncate = (str, length = 100) => {
  if (!str || str.length <= length) return str;
  return str.substring(0, length) + '...';
};

export default {
  asyncHandler,
  generateSlug,
  parseFilters,
  parsePagination,
  buildPaginationMeta,
  sanitizeUser,
  formatDate,
  timeAgo,
  isValidEmail,
  generateToken,
  extractMentions,
  isValidObjectId,
  buildSearchQuery,
  getClientIp,
  getUserAgent,
  calculatePercentage,
  groupBy,
  delay,
  capitalize,
  truncate,
};