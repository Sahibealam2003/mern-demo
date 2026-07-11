import Workspace from '../models/Workspace.js';
import Invitation from '../models/Invitation.js';
import Todo from '../models/Todo.js';
import Activity from '../models/Activity.js';
import { getCachedData, setCachedData, deleteCachedData } from './cacheService.js';
import { CACHE_TTL, WORKSPACE_ROLES } from '../utils/constants.js';
import { generateToken } from '../utils/helpers.js';
import logger from '../utils/logger.js';

/**
 * Workspace service for managing workspaces
 */

/**
 * Create a new workspace
 * @param {String} userId - Creator user ID
 * @param {Object} data - Workspace data
 * @returns {Promise<Object>} Created workspace
 */
export const createWorkspace = async (userId, data) => {
  try {
    const workspace = await Workspace.create({
      ...data,
      owner: userId,
      members: [{
        user: userId,
        role: WORKSPACE_ROLES.OWNER,
        joinedAt: new Date(),
      }],
    });

    // Invalidate user workspaces cache
    await deleteCachedData(`workspaces:user:${userId}`);

    logger.info(`Workspace created: ${workspace._id} by user ${userId}`);
    return workspace;
  } catch (error) {
    logger.error('Create workspace error:', error);
    throw error;
  }
};

/**
 * Get workspace by ID
 * @param {String} workspaceId - Workspace ID
 * @param {Boolean} useCache - Use cache if available
 * @returns {Promise<Object>} Workspace
 */
export const getWorkspaceById = async (workspaceId, useCache = true) => {
  try {
    const cacheKey = `workspace:${workspaceId}`;

    if (useCache) {
      const cached = await getCachedData(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const workspace = await Workspace.findById(workspaceId)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .lean();

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Cache workspace
    await setCachedData(cacheKey, workspace, CACHE_TTL.MEDIUM);

    return workspace;
  } catch (error) {
    logger.error('Get workspace by ID error:', error);
    throw error;
  }
};

/**
 * Get user workspaces
 * @param {String} userId - User ID
 * @returns {Promise<Array>} User workspaces
 */
export const getUserWorkspaces = async (userId) => {
  try {
    const cacheKey = `workspaces:user:${userId}`;

    // Try cache first
    const cached = await getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    const workspaces = await Workspace.find({
      'members.user': userId,
    })
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort({ updatedAt: -1 })
      .lean();

    // Cache workspaces
    await setCachedData(cacheKey, workspaces, CACHE_TTL.MEDIUM);

    return workspaces;
  } catch (error) {
    logger.error('Get user workspaces error:', error);
    throw error;
  }
};

/**
 * Update workspace
 * @param {String} workspaceId - Workspace ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated workspace
 */
export const updateWorkspace = async (workspaceId, data) => {
  try {
    const workspace = await Workspace.findByIdAndUpdate(
      workspaceId,
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Invalidate caches
    await deleteCachedData(`workspace:${workspaceId}`);
    for (const member of workspace.members) {
      await deleteCachedData(`workspaces:user:${member.user._id || member.user}`);
    }

    logger.info(`Workspace updated: ${workspaceId}`);
    return workspace;
  } catch (error) {
    logger.error('Update workspace error:', error);
    throw error;
  }
};

/**
 * Delete workspace
 * @param {String} workspaceId - Workspace ID
 * @returns {Promise<Boolean>} Success status
 */
export const deleteWorkspace = async (workspaceId) => {
  try {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Delete all related data
    await Promise.all([
      Todo.deleteMany({ workspace: workspaceId }),
      Activity.deleteMany({ workspace: workspaceId }),
      Invitation.deleteMany({ workspace: workspaceId }),
    ]);

    // Delete workspace
    await workspace.deleteOne();

    // Invalidate caches
    await deleteCachedData(`workspace:${workspaceId}`);
    for (const member of workspace.members) {
      await deleteCachedData(`workspaces:user:${member.user}`);
    }

    logger.info(`Workspace deleted: ${workspaceId}`);
    return true;
  } catch (error) {
    logger.error('Delete workspace error:', error);
    throw error;
  }
};

/**
 * Get user role in workspace
 * @param {String} workspaceId - Workspace ID
 * @param {String} userId - User ID
 * @returns {Promise<String|null>} User role or null
 */
export const getUserRole = async (workspaceId, userId) => {
  try {
    const workspace = await Workspace.findById(workspaceId).select('members').lean();
    if (!workspace) {
      return null;
    }

    const member = workspace.members.find(m => m.user.toString() === userId.toString());
    return member ? member.role : null;
  } catch (error) {
    logger.error('Get user role error:', error);
    return null;
  }
};

/**
 * Check if user has permission
 * @param {String} workspaceId - Workspace ID
 * @param {String} userId - User ID
 * @param {String} requiredRole - Required role
 * @returns {Promise<Boolean>} Permission status
 */
export const hasPermission = async (workspaceId, userId, requiredRole) => {
  try {
    const userRole = await getUserRole(workspaceId, userId);
    if (!userRole) {
      return false;
    }

    const roleHierarchy = {
      [WORKSPACE_ROLES.OWNER]: 4,
      [WORKSPACE_ROLES.ADMIN]: 3,
      [WORKSPACE_ROLES.MEMBER]: 2,
      [WORKSPACE_ROLES.VIEWER]: 1,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  } catch (error) {
    logger.error('Check permission error:', error);
    return false;
  }
};

/**
 * Invite user to workspace
 * @param {String} workspaceId - Workspace ID
 * @param {String} inviterId - Inviter user ID
 * @param {String} email - Invitee email
 * @param {String} role - Assigned role
 * @returns {Promise<Object>} Created invitation
 */
export const inviteUser = async (workspaceId, inviterId, email, role) => {
  try {
    // Check if already a member
    const workspace = await Workspace.findById(workspaceId)
      .populate('members.user', 'email');
    
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const isMember = workspace.members.some(m => m.user.email === email);
    if (isMember) {
      throw new Error('User is already a member');
    }

    // Check for existing pending invitation
    const existingInvitation = await Invitation.findOne({
      workspace: workspaceId,
      email,
      status: 'PENDING',
    });

    if (existingInvitation) {
      throw new Error('Invitation already sent');
    }

    // Create invitation
    const invitation = await Invitation.create({
      workspace: workspaceId,
      invitedBy: inviterId,
      email,
      role,
      token: generateToken(32),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    logger.info(`User invited to workspace ${workspaceId}: ${email}`);
    return invitation;
  } catch (error) {
    logger.error('Invite user error:', error);
    throw error;
  }
};

/**
 * Accept workspace invitation
 * @param {String} token - Invitation token
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Workspace
 */
export const acceptInvitation = async (token, userId) => {
  try {
    const invitation = await Invitation.findOne({
      token,
      status: 'PENDING',
    }).populate('workspace');

    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = 'EXPIRED';
      await invitation.save();
      throw new Error('Invitation has expired');
    }

    // Add user to workspace
    const workspace = await Workspace.findByIdAndUpdate(
      invitation.workspace._id,
      {
        $push: {
          members: {
            user: userId,
            role: invitation.role,
            joinedAt: new Date(),
          },
        },
      },
      { new: true }
    ).populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    // Update invitation status
    invitation.status = 'ACCEPTED';
    invitation.acceptedAt = new Date();
    await invitation.save();

    // Invalidate caches
    await deleteCachedData(`workspace:${workspace._id}`);
    await deleteCachedData(`workspaces:user:${userId}`);

    logger.info(`Invitation accepted: ${invitation._id} by user ${userId}`);
    return workspace;
  } catch (error) {
    logger.error('Accept invitation error:', error);
    throw error;
  }
};

/**
 * Reject workspace invitation
 * @param {String} token - Invitation token
 * @returns {Promise<Boolean>} Success status
 */
export const rejectInvitation = async (token) => {
  try {
    const invitation = await Invitation.findOne({
      token,
      status: 'PENDING',
    });

    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    invitation.status = 'REJECTED';
    invitation.rejectedAt = new Date();
    await invitation.save();

    logger.info(`Invitation rejected: ${invitation._id}`);
    return true;
  } catch (error) {
    logger.error('Reject invitation error:', error);
    throw error;
  }
};

/**
 * Remove member from workspace
 * @param {String} workspaceId - Workspace ID
 * @param {String} memberId - Member user ID
 * @returns {Promise<Object>} Updated workspace
 */
export const removeMember = async (workspaceId, memberId) => {
  try {
    const workspace = await Workspace.findByIdAndUpdate(
      workspaceId,
      {
        $pull: { members: { user: memberId } },
      },
      { new: true }
    ).populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Invalidate caches
    await deleteCachedData(`workspace:${workspaceId}`);
    await deleteCachedData(`workspaces:user:${memberId}`);

    logger.info(`Member removed from workspace ${workspaceId}: ${memberId}`);
    return workspace;
  } catch (error) {
    logger.error('Remove member error:', error);
    throw error;
  }
};

/**
 * Update member role
 * @param {String} workspaceId - Workspace ID
 * @param {String} memberId - Member user ID
 * @param {String} newRole - New role
 * @returns {Promise<Object>} Updated workspace
 */
export const updateMemberRole = async (workspaceId, memberId, newRole) => {
  try {
    const workspace = await Workspace.findOneAndUpdate(
      { _id: workspaceId, 'members.user': memberId },
      { $set: { 'members.$.role': newRole } },
      { new: true }
    ).populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!workspace) {
      throw new Error('Workspace or member not found');
    }

    // Invalidate cache
    await deleteCachedData(`workspace:${workspaceId}`);

    logger.info(`Member role updated in workspace ${workspaceId}: ${memberId} to ${newRole}`);
    return workspace;
  } catch (error) {
    logger.error('Update member role error:', error);
    throw error;
  }
};

/**
 * Transfer workspace ownership
 * @param {String} workspaceId - Workspace ID
 * @param {String} newOwnerId - New owner user ID
 * @returns {Promise<Object>} Updated workspace
 */
export const transferOwnership = async (workspaceId, newOwnerId) => {
  try {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const oldOwnerId = workspace.owner;

    // Update owner
    workspace.owner = newOwnerId;

    // Update roles
    workspace.members = workspace.members.map(member => {
      if (member.user.toString() === newOwnerId.toString()) {
        return { ...member, role: WORKSPACE_ROLES.OWNER };
      }
      if (member.user.toString() === oldOwnerId.toString()) {
        return { ...member, role: WORKSPACE_ROLES.ADMIN };
      }
      return member;
    });

    await workspace.save();

    // Invalidate caches
    await deleteCachedData(`workspace:${workspaceId}`);
    await deleteCachedData(`workspaces:user:${oldOwnerId}`);
    await deleteCachedData(`workspaces:user:${newOwnerId}`);

    logger.info(`Ownership transferred for workspace ${workspaceId} to ${newOwnerId}`);
    return workspace;
  } catch (error) {
    logger.error('Transfer ownership error:', error);
    throw error;
  }
};

/**
 * Get workspace statistics
 * @param {String} workspaceId - Workspace ID
 * @returns {Promise<Object>} Workspace statistics
 */
export const getWorkspaceStats = async (workspaceId) => {
  try {
    const [
      totalTodos,
      completedTodos,
      pendingTodos,
      overdueTodos,
    ] = await Promise.all([
      Todo.countDocuments({ workspace: workspaceId, deletedAt: null }),
      Todo.countDocuments({ workspace: workspaceId, status: 'COMPLETED', deletedAt: null }),
      Todo.countDocuments({ workspace: workspaceId, status: { $ne: 'COMPLETED' }, deletedAt: null }),
      Todo.countDocuments({
        workspace: workspaceId,
        status: { $ne: 'COMPLETED' },
        dueDate: { $lt: new Date() },
        deletedAt: null,
      }),
    ]);

    return {
      totalTodos,
      completedTodos,
      pendingTodos,
      overdueTodos,
      completionRate: totalTodos > 0 ? (completedTodos / totalTodos * 100).toFixed(2) : 0,
    };
  } catch (error) {
    logger.error('Get workspace stats error:', error);
    throw error;
  }
};

export default {
  createWorkspace,
  getWorkspaceById,
  getUserWorkspaces,
  updateWorkspace,
  deleteWorkspace,
  getUserRole,
  hasPermission,
  inviteUser,
  acceptInvitation,
  rejectInvitation,
  removeMember,
  updateMemberRole,
  transferOwnership,
  getWorkspaceStats,
};
