import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import Todo from '../models/Todo.js';
import Activity from '../models/Activity.js';
import logger from '../utils/logger.js';

/**
 * Get all users (admin)
 * @route GET /api/admin/users
 */
export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, isBlocked } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (isBlocked !== undefined) {
      query.isBlocked = isBlocked === 'true';
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    logger.error('Admin get users error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Block/unblock user (admin)
 * @route PUT /api/admin/users/:id/block
 */
export const toggleBlockUser = async (req, res) => {
  try {
    const { blocked } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: blocked },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    logger.info(`User ${blocked ? 'blocked' : 'unblocked'}: ${user.email} by admin ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: `User ${blocked ? 'blocked' : 'unblocked'} successfully`,
      data: { user },
    });
  } catch (error) {
    logger.error('Toggle block user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete user (admin)
 * @route DELETE /api/admin/users/:id
 */
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Remove from all workspaces
    await Workspace.updateMany(
      { 'members.user': req.params.id },
      { $pull: { members: { user: req.params.id } } }
    );

    await user.deleteOne();

    logger.info(`User deleted: ${user.email} by admin ${req.user.id}`);

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all workspaces (admin)
 * @route GET /api/admin/workspaces
 */
export const getWorkspaces = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const [workspaces, total] = await Promise.all([
      Workspace.find(query)
        .populate('owner', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Workspace.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        workspaces,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    logger.error('Admin get workspaces error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get system analytics (admin)
 * @route GET /api/admin/analytics
 */
export const getAnalytics = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      blockedUsers,
      totalWorkspaces,
      totalTodos,
      completedTodos,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isBlocked: false }),
      User.countDocuments({ isBlocked: true }),
      Workspace.countDocuments(),
      Todo.countDocuments({ deletedAt: null }),
      Todo.countDocuments({ status: 'COMPLETED', deletedAt: null }),
    ]);

    // New users in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsersPerDay = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: { total: totalUsers, active: activeUsers, blocked: blockedUsers },
        workspaces: { total: totalWorkspaces },
        todos: {
          total: totalTodos,
          completed: completedTodos,
          completionRate: totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0,
        },
        charts: { newUsersPerDay },
      },
    });
  } catch (error) {
    logger.error('Get analytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get recent activities (admin)
 * @route GET /api/admin/activities
 */
export const getActivities = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      Activity.find()
        .populate('user', 'name email avatar')
        .populate('workspace', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Activity.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        activities,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    logger.error('Get admin activities error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export default { getUsers, toggleBlockUser, deleteUser, getWorkspaces, getAnalytics, getActivities };
