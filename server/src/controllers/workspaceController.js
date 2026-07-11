import {
  createWorkspace,
  getWorkspaceById,
  getUserWorkspaces,
  updateWorkspace,
  deleteWorkspace,
  inviteUser,
  acceptInvitation,
  rejectInvitation,
  removeMember,
  updateMemberRole,
  transferOwnership,
  getWorkspaceStats,
} from '../services/workspaceService.js';
import {
  sendWorkspaceInvitationEmail,
} from '../services/emailService.js';
import {
  createWorkspaceInvitationNotification,
} from '../services/notificationService.js';
import Activity from '../models/Activity.js';
import Invitation from '../models/Invitation.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * Create workspace
 * @route POST /api/workspaces
 */
export const create = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, color, isPrivate } = req.body;

    const workspace = await createWorkspace(userId, { name, description, color, isPrivate });

    await Activity.create({
      user: userId,
      workspace: workspace._id,
      action: 'WORKSPACE_CREATED',
      description: `Created workspace "${workspace.name}"`,
    });

    res.status(201).json({
      success: true,
      message: 'Workspace created successfully',
      data: { workspace },
    });
  } catch (error) {
    logger.error('Create workspace controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all user workspaces
 * @route GET /api/workspaces
 */
export const getAll = async (req, res) => {
  try {
    const workspaces = await getUserWorkspaces(req.user.id);
    res.status(200).json({ success: true, data: { workspaces } });
  } catch (error) {
    logger.error('Get workspaces controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get workspace by ID
 * @route GET /api/workspaces/:id
 */
export const getOne = async (req, res) => {
  try {
    const workspace = await getWorkspaceById(req.params.id);
    res.status(200).json({ success: true, data: { workspace } });
  } catch (error) {
    logger.error('Get workspace controller error:', error);
    res.status(404).json({ success: false, message: error.message });
  }
};

/**
 * Update workspace
 * @route PUT /api/workspaces/:id
 */
export const update = async (req, res) => {
  try {
    const { name, description, color, isPrivate } = req.body;
    const workspace = await updateWorkspace(req.params.id, { name, description, color, isPrivate });

    await Activity.create({
      user: req.user.id,
      workspace: workspace._id,
      action: 'WORKSPACE_UPDATED',
      description: `Updated workspace "${workspace.name}"`,
    });

    res.status(200).json({ success: true, message: 'Workspace updated', data: { workspace } });
  } catch (error) {
    logger.error('Update workspace controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete workspace
 * @route DELETE /api/workspaces/:id
 */
export const remove = async (req, res) => {
  try {
    await deleteWorkspace(req.params.id);
    res.status(200).json({ success: true, message: 'Workspace deleted successfully' });
  } catch (error) {
    logger.error('Delete workspace controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Invite user to workspace
 * @route POST /api/workspaces/:id/invite
 */
export const invite = async (req, res) => {
  try {
    const { email, role } = req.body;
    const workspaceId = req.params.id;
    const inviterId = req.user.id;

    const invitation = await inviteUser(workspaceId, inviterId, email, role);

    // Send invitation email
    await sendWorkspaceInvitationEmail(
      email,
      req.workspace,
      req.user,
      invitation.token
    );

    // Notify existing user if they have an account
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await createWorkspaceInvitationNotification(
        existingUser._id,
        inviterId,
        workspaceId,
        invitation._id,
        {
          workspaceName: req.workspace.name,
          message: `${req.user.name} invited you to join "${req.workspace.name}"`,
        }
      );
    }

    await Activity.create({
      user: inviterId,
      workspace: workspaceId,
      action: 'MEMBER_INVITED',
      description: `Invited ${email} to workspace`,
    });

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      data: { invitation: { id: invitation._id, email, role, status: invitation.status } },
    });
  } catch (error) {
    logger.error('Invite user controller error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Accept workspace invitation
 * @route POST /api/workspaces/invitations/:token/accept
 */
export const acceptInvite = async (req, res) => {
  try {
    const workspace = await acceptInvitation(req.params.token, req.user.id);
    res.status(200).json({ success: true, message: 'Invitation accepted', data: { workspace } });
  } catch (error) {
    logger.error('Accept invitation controller error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Reject workspace invitation
 * @route POST /api/workspaces/invitations/:token/reject
 */
export const rejectInvite = async (req, res) => {
  try {
    await rejectInvitation(req.params.token);
    res.status(200).json({ success: true, message: 'Invitation rejected' });
  } catch (error) {
    logger.error('Reject invitation controller error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get pending invitations for current user
 * @route GET /api/workspaces/invitations/pending
 */
export const getPendingInvitations = async (req, res) => {
  try {
    const invitations = await Invitation.find({
      email: req.user.email,
      status: 'PENDING',
      expiresAt: { $gt: new Date() },
    })
      .populate('workspace', 'name description color')
      .populate('inviter', 'name email avatar')
      .lean();

    res.status(200).json({ success: true, data: { invitations } });
  } catch (error) {
    logger.error('Get pending invitations error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Remove member from workspace
 * @route DELETE /api/workspaces/:id/members/:memberId
 */
export const removeMemberFromWorkspace = async (req, res) => {
  try {
    const workspace = await removeMember(req.params.id, req.params.memberId);

    await Activity.create({
      user: req.user.id,
      workspace: req.params.id,
      action: 'MEMBER_REMOVED',
      description: `Removed a member from workspace`,
    });

    res.status(200).json({ success: true, message: 'Member removed', data: { workspace } });
  } catch (error) {
    logger.error('Remove member controller error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Leave workspace
 * @route POST /api/workspaces/:id/leave
 */
export const leave = async (req, res) => {
  try {
    const workspace = await removeMember(req.params.id, req.user.id);

    res.status(200).json({ success: true, message: 'Left workspace successfully' });
  } catch (error) {
    logger.error('Leave workspace controller error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Update member role
 * @route PUT /api/workspaces/:id/members/:memberId/role
 */
export const updateRole = async (req, res) => {
  try {
    const { role } = req.body;
    const workspace = await updateMemberRole(req.params.id, req.params.memberId, role);

    await Activity.create({
      user: req.user.id,
      workspace: req.params.id,
      action: 'MEMBER_ROLE_UPDATED',
      description: `Updated member role to ${role}`,
    });

    res.status(200).json({ success: true, message: 'Role updated', data: { workspace } });
  } catch (error) {
    logger.error('Update role controller error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Transfer workspace ownership
 * @route POST /api/workspaces/:id/transfer
 */
export const transfer = async (req, res) => {
  try {
    const { newOwnerId } = req.body;
    const workspace = await transferOwnership(req.params.id, newOwnerId);

    await Activity.create({
      user: req.user.id,
      workspace: req.params.id,
      action: 'OWNERSHIP_TRANSFERRED',
      description: `Transferred ownership of workspace`,
    });

    res.status(200).json({ success: true, message: 'Ownership transferred', data: { workspace } });
  } catch (error) {
    logger.error('Transfer ownership controller error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get workspace stats
 * @route GET /api/workspaces/:id/stats
 */
export const getStats = async (req, res) => {
  try {
    const stats = await getWorkspaceStats(req.params.id);
    res.status(200).json({ success: true, data: { stats } });
  } catch (error) {
    logger.error('Get workspace stats controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get workspace activity
 * @route GET /api/workspaces/:id/activity
 */
export const getActivity = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      Activity.find({ workspace: req.params.id })
        .populate('user', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Activity.countDocuments({ workspace: req.params.id }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        activities,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    logger.error('Get workspace activity controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export default { create, getAll, getOne, update, remove, invite, acceptInvite, rejectInvite, getPendingInvitations, removeMemberFromWorkspace, leave, updateRole, transfer, getStats, getActivity };
