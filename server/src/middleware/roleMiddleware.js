import { WORKSPACE_ROLES } from '../utils/constants.js';

/**
 * Middleware: require one of the given system-level roles (e.g. 'admin')
 * Usage: requireRole('admin')
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access restricted. Required role: ${roles.join(' or ')}`,
      });
    }

    next();
  };
};

/**
 * Middleware: require one of the given workspace-level roles
 * Must be used AFTER loadWorkspace (which sets req.userRole)
 * Usage: requireWorkspaceRole('OWNER', 'ADMIN')
 */
export const requireWorkspaceRole = (...roles) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(403).json({
        success: false,
        message: 'Workspace membership not verified',
      });
    }

    if (!roles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: `This action requires one of the following workspace roles: ${roles.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Middleware: require at least a minimum workspace role level
 * VIEWER < MEMBER < ADMIN < OWNER
 * Usage: requireMinRole('MEMBER')
 */
const ROLE_LEVEL = {
  [WORKSPACE_ROLES.VIEWER]: 1,
  [WORKSPACE_ROLES.MEMBER]: 2,
  [WORKSPACE_ROLES.ADMIN]: 3,
  [WORKSPACE_ROLES.OWNER]: 4,
};

export const requireMinRole = (minimumRole) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(403).json({
        success: false,
        message: 'Workspace membership not verified',
      });
    }

    const userLevel = ROLE_LEVEL[req.userRole] || 0;
    const minLevel = ROLE_LEVEL[minimumRole] || 0;

    if (userLevel < minLevel) {
      return res.status(403).json({
        success: false,
        message: `This action requires at least ${minimumRole} role`,
      });
    }

    next();
  };
};

export default { requireRole, requireWorkspaceRole, requireMinRole };
