import { Router } from 'express';
import { getProducts, getProductById, createProduct } from '../controllers/products.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/errors';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(getProducts));
router.get('/:id', asyncHandler(getProductById));
router.post('/', asyncHandler(createProduct));

export default router;
