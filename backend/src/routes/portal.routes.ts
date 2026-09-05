import { Router } from 'express';
import {
  getPortalQuotations,
  getPortalQuotationById,
  addPortalComment,
  counterDiscount,
  acceptPortalQuotation,
  getPortalQuotationPdf,
} from '../controllers/portal.controller';
import { requirePortalAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/errors';

const router = Router();

router.use(requirePortalAuth);

router.get('/quotations', asyncHandler(getPortalQuotations));
router.get('/quotations/:id', asyncHandler(getPortalQuotationById));
router.get('/quotations/:id/pdf', asyncHandler(getPortalQuotationPdf));
router.post('/quotations/:id/comments', asyncHandler(addPortalComment));
router.post('/quotations/:id/counter-discount', asyncHandler(counterDiscount));
router.post('/quotations/:id/confirm', asyncHandler(acceptPortalQuotation));

export default router;
