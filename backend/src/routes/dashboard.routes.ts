import { Router } from 'express';
import { getDashboardMetrics } from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/errors';

const router = Router();

router.use(requireAuth);

router.get('/summary', asyncHandler(getDashboardMetrics));

export default router;
