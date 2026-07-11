import { Router } from 'express';
import {
  create,
  getAll,
  getOne,
  update,
  remove,
  restore,
  permanentDelete,
  duplicate,
  pin,
  favorite,
  archive,
  assign,
  addChecklist,
  updateChecklist,
  removeChecklist,
  uploadAttachmentHandler,
  removeAttachmentHandler,
} from '../controllers/todoController.js';
import { protect } from '../middleware/authMiddleware.js';
import { loadWorkspace, denyViewer } from '../middleware/workspaceMiddleware.js';
import {
  validate,
  createTodoSchema,
  updateTodoSchema,
  assignTodoSchema,
  checklistItemSchema,
  updateChecklistItemSchema,
  todoQuerySchema,
} from '../middleware/validationMiddleware.js';

// mergeParams: true so :workspaceId from parent router is accessible
const router = Router({ mergeParams: true });

// All todo routes require auth + workspace membership
router.use(protect, loadWorkspace);

// CRUD
router.get('/', validate(todoQuerySchema, 'query'), getAll);
router.post('/', denyViewer, validate(createTodoSchema), create);
router.get('/:id', getOne);
router.put('/:id', denyViewer, validate(updateTodoSchema), update);
router.delete('/:id', denyViewer, remove);

// Lifecycle
router.post('/:id/restore', denyViewer, restore);
router.delete('/:id/permanent', denyViewer, permanentDelete);
router.post('/:id/duplicate', denyViewer, duplicate);

// Toggle actions
router.post('/:id/pin', denyViewer, pin);
router.post('/:id/favorite', favorite);
router.post('/:id/archive', denyViewer, archive);

// Assignment
router.post('/:id/assign', denyViewer, validate(assignTodoSchema), assign);

// Checklist
router.post('/:id/checklist', denyViewer, validate(checklistItemSchema), addChecklist);
router.put('/:id/checklist/:itemId', denyViewer, validate(updateChecklistItemSchema), updateChecklist);
router.delete('/:id/checklist/:itemId', denyViewer, removeChecklist);

// Attachments
router.post('/:id/attachments', denyViewer, uploadAttachmentHandler);
router.delete('/:id/attachments/:attachmentId', denyViewer, removeAttachmentHandler);

export default router;
