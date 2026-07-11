import { Router } from 'express';
import {
  create,
  getAll,
  getOne,
  update,
  remove,
  invite,
  acceptInvite,
  rejectInvite,
  getPendingInvitations,
  removeMemberFromWorkspace,
  leave,
  updateRole,
  transfer,
  getStats,
  getActivity,
} from '../controllers/workspaceController.js';
import { protect } from '../middleware/authMiddleware.js';
import { loadWorkspace, requireAdminOrOwner, requireOwner, denyViewer } from '../middleware/workspaceMiddleware.js';
import {
  validate,
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteUserSchema,
  updateRoleSchema,
  transferOwnershipSchema,
} from '../middleware/validationMiddleware.js';

const router = Router();

// All workspace routes require authentication
router.use(protect);

// Invitations (no workspace load needed)
router.get('/invitations/pending', getPendingInvitations);
router.post('/invitations/:token/accept', acceptInvite);
router.post('/invitations/:token/reject', rejectInvite);

// Workspace CRUD
router.get('/', getAll);
router.post('/', validate(createWorkspaceSchema), create);

// Routes that need workspace loaded
router.get('/:id', loadWorkspace, getOne);
router.put('/:id', loadWorkspace, requireAdminOrOwner, validate(updateWorkspaceSchema), update);
router.delete('/:id', loadWorkspace, requireOwner, remove);

// Members management
router.post('/:id/invite', loadWorkspace, requireAdminOrOwner, validate(inviteUserSchema), invite);
router.delete('/:id/members/:memberId', loadWorkspace, requireAdminOrOwner, removeMemberFromWorkspace);
router.post('/:id/leave', loadWorkspace, leave);
router.put('/:id/members/:memberId/role', loadWorkspace, requireAdminOrOwner, validate(updateRoleSchema), updateRole);
router.post('/:id/transfer', loadWorkspace, requireOwner, validate(transferOwnershipSchema), transfer);

// Stats & activity
router.get('/:id/stats', loadWorkspace, getStats);
router.get('/:id/activity', loadWorkspace, getActivity);

export default router;
