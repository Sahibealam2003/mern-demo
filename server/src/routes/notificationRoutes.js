import { Router } from 'express';
import { getAll, unreadCount, markRead, markAllRead, remove, removeAllRead } from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect);

router.get('/', getAll);
router.get('/unread-count', unreadCount);
router.put('/read-all', markAllRead);
router.delete('/read', removeAllRead);
router.put('/:id/read', markRead);
router.delete('/:id', remove);

export default router;
