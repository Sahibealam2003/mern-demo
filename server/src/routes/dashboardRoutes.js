import { Router } from 'express';
import { getSummary, getProductivity } from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect);

router.get('/', getSummary);
router.get('/productivity', getProductivity);

export default router;
