import { z } from 'zod';
import logger from '../utils/logger.js';

/**
 * Factory: wrap a Zod schema into Express middleware
 * @param {z.ZodSchema} schema - Zod schema
 * @param {String} source - 'body' | 'query' | 'params'
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed; // replace with coerced/stripped values
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
        });
      }
      logger.error('Validation middleware error:', error);
      res.status(500).json({ success: false, message: 'Validation error' });
    }
  };
};

// ─── Auth schemas ────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  bio: z.string().max(200).optional(),
  settings: z.object({
    emailNotifications: z.boolean().optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    language: z.string().optional(),
  }).optional(),
});

// ─── Workspace schemas ────────────────────────────────────────────────────────

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  isPrivate: z.boolean().optional().default(false),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isPrivate: z.boolean().optional(),
});

export const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

export const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

export const transferOwnershipSchema = z.object({
  newOwnerId: z.string().min(1, 'New owner ID is required'),
});

// ─── Todo schemas ─────────────────────────────────────────────────────────────

export const createTodoSchema = z.object({
  priority: z.preprocess((v) => {
    if (typeof v === 'string') return v.toLowerCase();
    return v;
  }, z.enum(['low', 'medium', 'high', 'critical'])).optional().default('medium'),
  status: z.preprocess((v) => {
    if (typeof v !== 'string') return v;
    // UI -> backend
    if (v === 'TODO') return 'pending';
    if (v === 'IN_PROGRESS') return 'in_progress';
    if (v === 'REVIEW') return 'review';
    if (v === 'COMPLETED') return 'completed';
    return v;
  }, z.enum(['pending', 'in_progress', 'review', 'completed', 'archived'])).optional().default('pending'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),

  // UI sends YYYY-MM-DD; accept date-only or any valid datetime string
  dueDate: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (val === null || val === undefined || val === '') return true;
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return true;
        const d = new Date(val);
        return !Number.isNaN(d.getTime());
      },
      { message: 'Invalid datetime' }
    ),
  labels: z.array(z.string().max(30)).optional().default([]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  notes: z.string().max(5000).optional(),
  reminder: z.string().datetime().optional().nullable(),
});

export const updateTodoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  priority: z.preprocess((v) => {
    if (typeof v === 'string') return v.toLowerCase();
    return v;
  }, z.enum(['low', 'medium', 'high', 'critical'])).optional(),
  status: z.preprocess((v) => {
    if (typeof v !== 'string') return v;
    if (v === 'TODO') return 'pending';
    if (v === 'IN_PROGRESS') return 'in_progress';
    if (v === 'REVIEW') return 'review';
    if (v === 'COMPLETED') return 'completed';
    return v;
  }, z.enum(['pending', 'in_progress', 'review', 'completed', 'archived'])).optional(),
  // UI sends YYYY-MM-DD; accept date-only or any valid datetime string
  dueDate: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (val === null || val === undefined || val === '') return true;
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return true;
        const d = new Date(val);
        return !Number.isNaN(d.getTime());
      },
      { message: 'Invalid datetime' }
    ),
  labels: z.array(z.string().max(30)).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  notes: z.string().max(5000).optional(),
  reminder: z.string().datetime().optional().nullable(),
});

export const assignTodoSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user ID is required'),
});

export const checklistItemSchema = z.object({
  text: z.string().min(1, 'Item text is required').max(200),
});

export const updateChecklistItemSchema = z.object({
  text: z.string().min(1).max(200).optional(),
  completed: z.boolean().optional(),
});

// ─── Comment schemas ──────────────────────────────────────────────────────────

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(2000),
  parentComment: z.string().optional().nullable(),
  mentions: z.array(z.string()).optional().default([]),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const reactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});

// ─── Query schemas ────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const todoQuerySchema = paginationSchema.extend({
  sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'title']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  assignedTo: z.string().optional(),
  labels: z.string().optional(),
  isPinned: z.string().optional(),
  isFavorite: z.string().optional(),
  isArchived: z.string().optional(),
  dueDate: z.enum(['overdue', 'today', 'week']).optional(),
  search: z.string().max(100).optional(),
});

export default { validate };
