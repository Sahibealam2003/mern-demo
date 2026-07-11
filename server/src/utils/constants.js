/**
 * Application-wide constants
 */

// Todo status options
export const TODO_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
};

// Todo priority levels
export const TODO_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

// Workspace member roles
export const WORKSPACE_ROLES = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

// User roles
export const USER_ROLES = {
  USER: 'User',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'SuperAdmin',
};

// Notification types
export const NOTIFICATION_TYPES = {
  ASSIGNMENT: 'assignment',
  COMMENT: 'comment',
  DUE_DATE: 'due_date',
  INVITATION: 'invitation',
  MENTION: 'mention',
  SYSTEM: 'system',
};

// Activity actions
export const ACTIVITY_ACTIONS = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  RESTORED: 'restored',
  ARCHIVED: 'archived',
  COMPLETED: 'completed',
  ASSIGNED: 'assigned',
  UNASSIGNED: 'unassigned',
  COMMENTED: 'commented',
  MENTIONED: 'mentioned',
  INVITED: 'invited',
  JOINED: 'joined',
  LEFT: 'left',
  ROLE_CHANGED: 'role_changed',
  TRANSFERRED_OWNERSHIP: 'transferred_ownership',
};

// Entity types
export const ENTITY_TYPES = {
  TODO: 'Todo',
  COMMENT: 'Comment',
  WORKSPACE: 'Workspace',
  MEMBER: 'Member',
  USER: 'User',
};

// Invitation status
export const INVITATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
};

// Cache TTL (in seconds)
export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
};

// Rate limit settings
export const RATE_LIMITS = {
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
  },
  API: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
  },
  UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour
  },
};

// File upload settings
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  ALLOWED_ALL_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
};

// JWT token expiry
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: '15m', // 15 minutes
  REFRESH_TOKEN: '7d', // 7 days
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET: 60 * 60 * 1000, // 1 hour
  INVITATION: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

// Sort options
export const SORT_OPTIONS = {
  CREATED_AT_DESC: { createdAt: -1 },
  CREATED_AT_ASC: { createdAt: 1 },
  UPDATED_AT_DESC: { updatedAt: -1 },
  UPDATED_AT_ASC: { updatedAt: 1 },
  TITLE_ASC: { title: 1 },
  TITLE_DESC: { title: -1 },
  PRIORITY_DESC: { priority: -1, createdAt: -1 },
  DUE_DATE_ASC: { dueDate: 1 },
  DUE_DATE_DESC: { dueDate: -1 },
};

// Error codes
export const ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  
  // Authorization errors
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // File upload errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  
  // Workspace errors
  WORKSPACE_NOT_FOUND: 'WORKSPACE_NOT_FOUND',
  NOT_WORKSPACE_MEMBER: 'NOT_WORKSPACE_MEMBER',
  CANNOT_REMOVE_OWNER: 'CANNOT_REMOVE_OWNER',
  
  // Todo errors
  TODO_NOT_FOUND: 'TODO_NOT_FOUND',
  TODO_DELETED: 'TODO_DELETED',
  
  // Invitation errors
  INVITATION_EXPIRED: 'INVITATION_EXPIRED',
  INVITATION_ALREADY_ACCEPTED: 'INVITATION_ALREADY_ACCEPTED',
};

// Success messages
export const SUCCESS_MESSAGES = {
  // Authentication
  REGISTRATION_SUCCESS: 'Registration successful. Please verify your email.',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  EMAIL_VERIFIED: 'Email verified successfully',
  PASSWORD_RESET_EMAIL_SENT: 'Password reset email sent',
  PASSWORD_RESET_SUCCESS: 'Password reset successful',
  PASSWORD_CHANGED: 'Password changed successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  
  // Workspace
  WORKSPACE_CREATED: 'Workspace created successfully',
  WORKSPACE_UPDATED: 'Workspace updated successfully',
  WORKSPACE_DELETED: 'Workspace deleted successfully',
  MEMBER_INVITED: 'Invitation sent successfully',
  MEMBER_ADDED: 'Member added successfully',
  MEMBER_REMOVED: 'Member removed successfully',
  ROLE_UPDATED: 'Member role updated successfully',
  OWNERSHIP_TRANSFERRED: 'Ownership transferred successfully',
  
  // Todo
  TODO_CREATED: 'Task created successfully',
  TODO_UPDATED: 'Task updated successfully',
  TODO_DELETED: 'Task deleted successfully',
  TODO_RESTORED: 'Task restored successfully',
  TODO_DUPLICATED: 'Task duplicated successfully',
  TODO_ARCHIVED: 'Task archived successfully',
  TODO_COMPLETED: 'Task marked as completed',
  
  // Comment
  COMMENT_CREATED: 'Comment added successfully',
  COMMENT_UPDATED: 'Comment updated successfully',
  COMMENT_DELETED: 'Comment deleted successfully',
  
  // Notification
  NOTIFICATION_READ: 'Notification marked as read',
  ALL_NOTIFICATIONS_READ: 'All notifications marked as read',
  NOTIFICATION_DELETED: 'Notification deleted',
  
  // General
  OPERATION_SUCCESS: 'Operation completed successfully',
};

// Email templates
export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  VERIFICATION: 'verification',
  PASSWORD_RESET: 'password_reset',
  INVITATION: 'invitation',
  TASK_ASSIGNMENT: 'task_assignment',
  TASK_DUE: 'task_due',
  COMMENT_NOTIFICATION: 'comment_notification',
};

// Socket.IO events
export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Workspace
  JOIN_WORKSPACE: 'join_workspace',
  LEAVE_WORKSPACE: 'leave_workspace',
  
  // Todo events
  TODO_CREATED: 'todo:created',
  TODO_UPDATED: 'todo:updated',
  TODO_DELETED: 'todo:deleted',
  TODO_RESTORED: 'todo:restored',
  TODO_ASSIGNED: 'todo:assigned',
  
  // Comment events
  COMMENT_CREATED: 'comment:created',
  COMMENT_UPDATED: 'comment:updated',
  COMMENT_DELETED: 'comment:deleted',
  
  // Notification events
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  
  // User presence
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  USER_TYPING: 'user:typing',
  USER_STOP_TYPING: 'user:stop_typing',
  
  // Workspace events
  MEMBER_JOINED: 'member:joined',
  MEMBER_LEFT: 'member:left',
  MEMBER_ROLE_CHANGED: 'member:role_changed',
};

// BullMQ job names
export const JOB_NAMES = {
  SEND_EMAIL: 'send-email',
  SEND_VERIFICATION_EMAIL: 'send-verification-email',
  SEND_PASSWORD_RESET_EMAIL: 'send-password-reset-email',
  SEND_INVITATION_EMAIL: 'send-invitation-email',
  SEND_TASK_ASSIGNMENT_EMAIL: 'send-task-assignment-email',
  SEND_DUE_DATE_REMINDER: 'send-due-date-reminder',
  CREATE_NOTIFICATION: 'create-notification',
  SEND_BULK_NOTIFICATIONS: 'send-bulk-notifications',
  CLEANUP_OLD_ACTIVITIES: 'cleanup-old-activities',
  CLEANUP_OLD_NOTIFICATIONS: 'cleanup-old-notifications',
  EXPIRE_INVITATIONS: 'expire-invitations',
};

// Cookie options for refresh tokens
export const COOKIE_OPTIONS = {
  REFRESH_TOKEN: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/',
  },
  // Options to use when clearing the cookie
  CLEAR: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    path: '/',
  },
};

// Default user settings
export const DEFAULT_USER_SETTINGS = {
  emailNotifications: true,
  pushNotifications: true,
  theme: 'system',
  language: 'en',
};

// Default workspace settings
export const DEFAULT_WORKSPACE_SETTINGS = {
  allowMemberInvites: true,
  defaultMemberRole: WORKSPACE_ROLES.MEMBER,
  todoAssignment: true,
  commentPermissions: 'members',
};

export default {
  TODO_STATUS,
  TODO_PRIORITY,
  WORKSPACE_ROLES,
  USER_ROLES,
  NOTIFICATION_TYPES,
  ACTIVITY_ACTIONS,
  ENTITY_TYPES,
  INVITATION_STATUS,
  CACHE_TTL,
  RATE_LIMITS,
  FILE_UPLOAD,
  TOKEN_EXPIRY,
  PAGINATION,
  SORT_OPTIONS,
  ERROR_CODES,
  SUCCESS_MESSAGES,
  EMAIL_TEMPLATES,
  SOCKET_EVENTS,
  JOB_NAMES,
  DEFAULT_USER_SETTINGS,
  DEFAULT_WORKSPACE_SETTINGS,
};