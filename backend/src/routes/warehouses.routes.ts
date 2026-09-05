import { Router } from 'express';
import { getWarehouses, getWarehouseById, replenishStock } from '../controllers/warehouses.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/errors';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(getWarehouses));
router.get('/:id', asyncHandler(getWarehouseById));
router.post('/:id/stock', asyncHandler(replenishStock));

export default router;
