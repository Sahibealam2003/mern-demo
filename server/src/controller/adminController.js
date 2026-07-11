const User = require("../model/userSchema");
const RefreshToken = require("../model/refreshTokenSchema");
const logger = require("../utils/logger");

/**
 * Get all users with pagination
 * GET /api/v1/admin/users
 * Strict Admin Role Access Only
 */
exports.getUsers = async (req, res, next) => {
  try {
    // Parse pagination params
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Search and filter options
    const filter = {};
    
    // Filter by role
    if (req.query.role) {
      filter.role = req.query.role;
    }
    
    // Filter by active status
    if (req.query.active !== undefined) {
      filter.active = req.query.active === "true";
    }
    
    // Search by name or email
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
      ];
    }

    // Execute queries in parallel for efficiency
    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password") // Always exclude password
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(), // Use lean for better performance
      User.countDocuments(filter),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    logger.info({
      message: "Admin fetched user list",
      adminId: req.user.id,
      page,
      limit,
      total,
    });

    return res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers: total,
          limit,
          hasNextPage,
          hasPrevPage,
        },
      },
    });
  } catch (error) {
    logger.error(`Admin get users failed: ${error.message}`, {
      adminId: req.user?.id,
    });
    next(error);
  }
};

/**
 * Get user by ID
 * GET /api/v1/admin/users/:id
 * Strict Admin Role Access Only
 */
exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Get active sessions count for this user
    const activeSessions = await RefreshToken.countDocuments({
      userId: id,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    logger.info({
      message: "Admin fetched user by ID",
      adminId: req.user.id,
      targetUserId: id,
    });

    return res.status(200).json({
      success: true,
      data: {
        user: {
          ...user.toObject(),
          activeSessions,
        },
      },
    });
  } catch (error) {
    logger.error(`Admin get user by ID failed: ${error.message}`, {
      adminId: req.user?.id,
      targetUserId: req.params.id,
    });
    next(error);
  }
};

/**
 * Update user (admin privileges)
 * PUT /api/v1/admin/users/:id
 * Strict Admin Role Access Only
 */
exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, active } = req.body;

    // Prevent admin from deactivating themselves
    if (id === req.user.id && active === false) {
      return res.status(400).json({
        success: false,
        message: "Cannot deactivate your own account",
        code: "SELF_DEACTIVATION_FORBIDDEN",
      });
    }

    // Build update object (only allow specific fields)
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (active !== undefined) updateData.active = active;

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // If user was deactivated, revoke all their tokens
    if (active === false) {
      await RefreshToken.updateMany(
        { userId: id, isRevoked: false },
        { isRevoked: true }
      );
      
      logger.warn({
        message: "Admin deactivated user - all sessions revoked",
        adminId: req.user.id,
        targetUserId: id,
      });
    }

    logger.info({
      message: "Admin updated user",
      adminId: req.user.id,
      targetUserId: id,
      updates: updateData,
    });

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: { user },
    });
  } catch (error) {
    logger.error(`Admin update user failed: ${error.message}`, {
      adminId: req.user?.id,
    });
    next(error);
  }
};

/**
 * Delete user (soft delete - deactivate)
 * DELETE /api/v1/admin/users/:id
 * Strict Admin Role Access Only
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
        code: "SELF_DELETION_FORBIDDEN",
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { active: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Revoke all tokens for this user
    await RefreshToken.updateMany(
      { userId: id, isRevoked: false },
      { isRevoked: true }
    );

    logger.warn({
      message: "Admin deleted (deactivated) user",
      adminId: req.user.id,
      targetUserId: id,
    });

    return res.status(200).json({
      success: true,
      message: "User deactivated successfully",
    });
  } catch (error) {
    logger.error(`Admin delete user failed: ${error.message}`, {
      adminId: req.user?.id,
    });
    next(error);
  }
};

/**
 * Revoke all sessions for a user
 * POST /api/v1/admin/users/:id/revoke-sessions
 * Strict Admin Role Access Only
 */
exports.revokeUserSessions = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await RefreshToken.updateMany(
      { userId: id, isRevoked: false },
      { isRevoked: true }
    );

    logger.warn({
      message: "Admin revoked user sessions",
      adminId: req.user.id,
      targetUserId: id,
      revokedCount: result.modifiedCount,
    });

    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount} session(s) revoked successfully`,
    });
  } catch (error) {
    logger.error(`Admin revoke sessions failed: ${error.message}`, {
      adminId: req.user?.id,
    });
    next(error);
  }
};

/**
 * Get admin dashboard stats
 * GET /api/v1/admin/stats
 * Strict Admin Role Access Only
 */
exports.getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      activeUsers,
      adminCount,
      totalSessions,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ active: true }),
      User.countDocuments({ role: "Admin" }),
      RefreshToken.countDocuments({
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          activeUsers,
          inactiveUsers: totalUsers - activeUsers,
          adminCount,
          totalActiveSessions: totalSessions,
        },
      },
    });
  } catch (error) {
    logger.error(`Admin get stats failed: ${error.message}`);
    next(error);
  }
};

module.exports = exports;