import { Router } from 'express';
import { create, getAll, update, remove, toggleReaction } from '../controllers/commentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { loadWorkspace, denyViewer } from '../middleware/workspaceMiddleware.js';
import {
  validate,
  createCommentSchema,
  updateCommentSchema,
  reactionSchema,
} from '../middleware/validationMiddleware.js';

// mergeParams so :workspaceId and :todoId from parent router are available
const router = Router({ mergeParams: true });

router.use(protect, loadWorkspace);

router.get('/', getAll);
router.post('/', denyViewer, validate(createCommentSchema), create);
router.put('/:id', denyViewer, validate(updateCommentSchema), update);
router.delete('/:id', denyViewer, remove);
router.post('/:id/reactions', denyViewer, validate(reactionSchema), toggleReaction);

export default router;
