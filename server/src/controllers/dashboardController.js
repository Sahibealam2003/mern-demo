import Todo from '../models/Todo.js';
import Workspace from '../models/Workspace.js';
import Activity from '../models/Activity.js';
import Notification from '../models/Notification.js';
import { TODO_STATUS } from '../utils/constants.js';
import logger from '../utils/logger.js';

/**
 * Get dashboard summary for current user
 * @route GET /api/dashboard
 */
export const getSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all workspace IDs the user is a member of
    const workspaces = await Workspace.find({ 'members.user': userId }).select('_id name').lean();
    const workspaceIds = workspaces.map(w => w._id);

    const now = new Date();

    const [
      totalTodos,
      completedTodos,
      pendingTodos,
      overdueTodos,
      assignedToMe,
      unreadNotifications,
    ] = await Promise.all([
      Todo.countDocuments({ workspace: { $in: workspaceIds }, deletedAt: null }),
      Todo.countDocuments({ workspace: { $in: workspaceIds }, status: TODO_STATUS.COMPLETED, deletedAt: null }),
      Todo.countDocuments({ workspace: { $in: workspaceIds }, status: { $ne: TODO_STATUS.COMPLETED }, deletedAt: null }),
      Todo.countDocuments({ workspace: { $in: workspaceIds }, status: { $ne: TODO_STATUS.COMPLETED }, dueDate: { $lt: now }, deletedAt: null }),
      Todo.countDocuments({ assignedTo: userId, deletedAt: null }),
      Notification.countDocuments({ recipient: userId, read: false }),
    ]);

    // Recent activity across workspaces
    const recentActivity = await Activity.find({ workspace: { $in: workspaceIds } })
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Due soon (next 3 days)
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const dueSoon = await Todo.find({
      workspace: { $in: workspaceIds },
      status: { $ne: TODO_STATUS.COMPLETED },
      dueDate: { $gte: now, $lte: threeDaysFromNow },
      deletedAt: null,
    })
      .populate('workspace', 'name')
      .sort({ dueDate: 1 })
      .limit(5)
      .lean();

    // Priority breakdown
    const priorityBreakdown = await Todo.aggregate([
      { $match: { workspace: { $in: workspaceIds }, deletedAt: null, status: { $ne: TODO_STATUS.COMPLETED } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    const priorityMap = {};
    priorityBreakdown.forEach(p => { priorityMap[p._id] = p.count; });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalTodos,
          completedTodos,
          pendingTodos,
          overdueTodos,
          assignedToMe,
          unreadNotifications,
          completionRate: totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0,
          totalWorkspaces: workspaces.length,
        },
        priorityBreakdown: {
          HIGH: priorityMap['HIGH'] || 0,
          MEDIUM: priorityMap['MEDIUM'] || 0,
          LOW: priorityMap['LOW'] || 0,
        },
        workspaces: workspaces.slice(0, 5),
        recentActivity,
        dueSoon,
      },
    });
  } catch (error) {
    logger.error('Get dashboard summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get productivity stats for last N days
 * @route GET /api/dashboard/productivity
 */
export const getProductivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;
    const daysInt = Math.min(parseInt(days), 30);

    const workspaces = await Workspace.find({ 'members.user': userId }).select('_id').lean();
    const workspaceIds = workspaces.map(w => w._id);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysInt);
    startDate.setHours(0, 0, 0, 0);

    // Todos completed per day
    const completedPerDay = await Todo.aggregate([
      {
        $match: {
          workspace: { $in: workspaceIds },
          status: TODO_STATUS.COMPLETED,
          updatedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Todos created per day
    const createdPerDay = await Todo.aggregate([
      {
        $match: {
          workspace: { $in: workspaceIds },
          createdAt: { $gte: startDate },
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: { completedPerDay, createdPerDay, days: daysInt },
    });
  } catch (error) {
    logger.error('Get productivity error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export default { getSummary, getProductivity };
