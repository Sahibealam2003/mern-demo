const express = require("express");
const router = express.Router();

// Controllers
const authController = require("../controller/authController");
const adminController = require("../controller/adminController");

// Middleware
const { authenticate } = require("../middleware/authMiddleware");
const { checkRole, requireAdmin } = require("../middleware/roleMiddleware");
const {
  validate,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  paginationSchema,
} = require("../utils/validation");

// Rate limiter imports
const rateLimit = require("express-rate-limit");

// Auth rate limiter - 5 requests per 15 minutes per IP
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per window
  message: {
    success: false,
    message: "Too many attempts, please try again after 15 minutes",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for login
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Too many failed login attempts, please try again after 15 minutes",
    code: "LOGIN_RATE_LIMIT_EXCEEDED",
  },
});

// ============================================
// Public Routes (Authentication)
// ============================================

/**
 * POST /api/v1/auth/register
 * Create a new user account with secure defaults
 * Rate limited: 5 requests per 15 minutes
 */
router.post(
  "/auth/register",
  authRateLimiter,
  validate(registerSchema),
  authController.register
);

/**
 * POST /api/v1/auth/login
 * Authenticate credentials and issue tokens
 * Rate limited: 5 failed attempts per 15 minutes
 */
router.post(
  "/auth/login",
  loginRateLimiter,
  validate(loginSchema),
  authController.login
);

// ============================================
// Protected Routes (Authentication)
// ============================================

/**
 * POST /api/v1/auth/logout
 * Clear refresh tokens and invalidate sessions
 * Requires: Authentication
 */
router.post("/auth/logout", authenticate, authController.logout);

/**
 * POST /api/v1/auth/refresh-token
 * Issue a new rotating access token
 */
router.post(
  "/auth/refresh-token",
  validate(refreshTokenSchema),
  authController.refreshToken
);

/**
 * GET /api/v1/auth/me
 * Retrieve current authenticated profile information
 * Requires: Authentication
 */
router.get("/auth/me", authenticate, authController.getMe);

// ============================================
// Admin Routes (Strict Admin Role Access)
// ============================================

/**
 * GET /api/v1/admin/users
 * Fetch total user management lists
 * Requires: Admin role
 */
router.get(
  "/admin/users",
  authenticate,
  requireAdmin,
  validate(paginationSchema, "query"),
  adminController.getUsers
);

/**
 * GET /api/v1/admin/users/:id
 * Get specific user by ID
 * Requires: Admin role
 */
router.get(
  "/admin/users/:id",
  authenticate,
  requireAdmin,
  adminController.getUserById
);

/**
 * PUT /api/v1/admin/users/:id
 * Update user (name, role, active status)
 * Requires: Admin role
 */
router.put(
  "/admin/users/:id",
  authenticate,
  requireAdmin,
  adminController.updateUser
);

/**
 * DELETE /api/v1/admin/users/:id
 * Deactivate user account
 * Requires: Admin role
 */
router.delete(
  "/admin/users/:id",
  authenticate,
  requireAdmin,
  adminController.deleteUser
);

/**
 * POST /api/v1/admin/users/:id/revoke-sessions
 * Revoke all sessions for a user
 * Requires: Admin role
 */
router.post(
  "/admin/users/:id/revoke-sessions",
  authenticate,
  requireAdmin,
  adminController.revokeUserSessions
);

/**
 * GET /api/v1/admin/stats
 * Get admin dashboard statistics
 * Requires: Admin role
 */
router.get("/admin/stats", authenticate, requireAdmin, adminController.getStats);

// ============================================
// Health Check (No Auth Required)
// ============================================

/**
 * GET /health
 * Health check endpoint
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;