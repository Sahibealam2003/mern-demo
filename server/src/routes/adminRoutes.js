import { Router } from 'express';
import { getUsers, toggleBlockUser, deleteUser, getWorkspaces, getAnalytics, getActivities } from '../controllers/adminController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(protect, requireAdmin);

// Users
router.get('/users', getUsers);
router.put('/users/:id/block', toggleBlockUser);
router.delete('/users/:id', deleteUser);

// Workspaces
router.get('/workspaces', getWorkspaces);

// Analytics & Activity
router.get('/analytics', getAnalytics);
router.get('/activities', getActivities);

export default router;
