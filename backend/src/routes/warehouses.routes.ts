import { Router } from 'express';
import {
  getWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  updateWarehouseStock,
  deleteWarehouse,
  replenishStock,
} from '../controllers/warehouses.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/errors';
import { UserRole } from '@prisma/client';

const router = Router();

// All warehouse routes require staff authentication
router.use(requireAuth);

// Read endpoints
router.get('/', asyncHandler(getWarehouses));
router.get('/:id', asyncHandler(getWarehouseById));

// Mutating CRUD endpoints - STRICTLY restricted to ADMIN role
router.post('/', requireRole(UserRole.ADMIN), asyncHandler(createWarehouse));
router.patch('/:id', requireRole(UserRole.ADMIN), asyncHandler(updateWarehouse));
router.patch('/:id/stock', requireRole(UserRole.ADMIN), asyncHandler(updateWarehouseStock));
router.delete('/:id', requireRole(UserRole.ADMIN), asyncHandler(deleteWarehouse));

// Deprecated / Quick restock endpoint
router.post('/:id/stock', asyncHandler(replenishStock));

export default router;
