import Workspace from '../models/Workspace.js';
import { WORKSPACE_ROLES } from '../utils/constants.js';
import logger from '../utils/logger.js';

const ROLE_HIERARCHY = {
  [WORKSPACE_ROLES.OWNER]: 4,
  [WORKSPACE_ROLES.ADMIN]: 3,
  [WORKSPACE_ROLES.MEMBER]: 2,
  [WORKSPACE_ROLES.VIEWER]: 1,
};

/**
 * Load workspace and verify user is a member.
 * Attaches req.workspace and req.userRole.
 */
export const loadWorkspace = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId || req.params.id;

    if (!workspaceId) {
      return res.status(400).json({ success: false, message: 'Workspace ID is required' });
    }

    const workspace = await Workspace.findById(workspaceId)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .lean();

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    // Find the requesting user's membership
    const membership = workspace.members.find(
      m => m.user._id.toString() === req.user.id
    );

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this workspace',
      });
    }

    req.workspace = workspace;
    req.userRole = membership.role;
    next();
  } catch (error) {
    logger.error('Load workspace middleware error:', error);
    res.status(500).json({ success: false, message: 'Failed to load workspace' });
  }
};

/**
 * Factory: require at least a given workspace role
 * Usage: requireWorkspaceRole(WORKSPACE_ROLES.ADMIN)
 */
export const requireWorkspaceRole = (minimumRole) => {
  return (req, res, next) => {
    const userLevel = ROLE_HIERARCHY[req.userRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        message: `This action requires at least ${minimumRole} role`,
      });
    }
    next();
  };
};

/**
 * Require workspace owner only
 */
export const requireOwner = (req, res, next) => {
  if (req.userRole !== WORKSPACE_ROLES.OWNER) {
    return res.status(403).json({
      success: false,
      message: 'Only the workspace owner can perform this action',
    });
  }
  next();
};

/**
 * Require workspace owner or admin
 */
export const requireAdminOrOwner = (req, res, next) => {
  const level = ROLE_HIERARCHY[req.userRole] || 0;
  if (level < ROLE_HIERARCHY[WORKSPACE_ROLES.ADMIN]) {
    return res.status(403).json({
      success: false,
      message: 'Admin or Owner role required',
    });
  }
  next();
};

/**
 * Block viewer-only role from write operations
 */
export const denyViewer = (req, res, next) => {
  if (req.userRole === WORKSPACE_ROLES.VIEWER) {
    return res.status(403).json({
      success: false,
      message: 'Viewers cannot perform write operations',
    });
  }
  next();
};

export default { loadWorkspace, requireWorkspaceRole, requireOwner, requireAdminOrOwner, denyViewer };
