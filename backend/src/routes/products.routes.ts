import { Router } from 'express';
import { getProducts, getProductById } from '../controllers/products.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/errors';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(getProducts));
router.get('/:id', asyncHandler(getProductById));

export default router;
