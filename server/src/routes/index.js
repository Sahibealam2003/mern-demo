import { Router } from 'express';
import authRoutes from './authRoutes.js';
import workspaceRoutes from './workspaceRoutes.js';
import todoRoutes from './todoRoutes.js';
import commentRoutes from './commentRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);

// Todo routes nested under workspace
router.use('/workspaces/:workspaceId/todos', todoRoutes);

// Comment routes nested under todo
router.use('/workspaces/:workspaceId/todos/:todoId/comments', commentRoutes);

router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/admin', adminRoutes);

export default router;
