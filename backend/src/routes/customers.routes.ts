import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
} from '../controllers/customers.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/errors';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(getCustomers));
router.get('/:id', asyncHandler(getCustomerById));
router.post('/', asyncHandler(createCustomer));
router.patch('/:id', asyncHandler(updateCustomer));

export default router;
