import { Router } from 'express';
import {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  submitForApproval,
  getQuotationPdf,
  emailQuotationToCustomer,
  addQuotationComment,
} from '../controllers/quotations.controller';
import { getApprovals, takeApprovalAction, getAuditLog } from '../controllers/approvals.controller';
import { getUpsellSuggestions } from '../controllers/upsell.controller';
import {
  calculateFulfillmentPreview,
  confirmFulfillment,
  getFulfillment,
} from '../controllers/fulfillment.controller';
import {
  generateBillingSchedule,
  getBilling,
  updateBillingLine,
  getInstallmentPdf,
  sendInstallmentReminder,
} from '../controllers/billing.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/errors';

const router = Router();

router.use(requireAuth);

// Core Quotations CRUD
router.get('/', asyncHandler(getQuotations));
router.post('/', asyncHandler(createQuotation));
router.get('/:id', asyncHandler(getQuotationById));
router.patch('/:id', asyncHandler(updateQuotation));
router.delete('/:id', asyncHandler(deleteQuotation));
router.post('/:id/submit-for-approval', asyncHandler(submitForApproval));
router.get('/:id/pdf', asyncHandler(getQuotationPdf));
router.post('/:id/send-email', asyncHandler(emailQuotationToCustomer));
router.post('/:id/comments', asyncHandler(addQuotationComment));
router.post('/:id/messages', asyncHandler(addQuotationComment));

// Approval & Audit Trail
router.get('/:id/approvals', asyncHandler(getApprovals));
router.post('/:id/approvals/:stepId/action', asyncHandler(takeApprovalAction));
router.get('/:id/audit-log', asyncHandler(getAuditLog));

// Upsell Suggestions
router.get('/:id/upsell-suggestions', asyncHandler(getUpsellSuggestions));

// Fulfillment Auto-Split
router.post('/:id/fulfillment/calculate', asyncHandler(calculateFulfillmentPreview));
router.post('/:id/fulfillment/confirm', asyncHandler(confirmFulfillment));
router.get('/:id/fulfillment', asyncHandler(getFulfillment));

// Subscription Billing
router.post('/:id/billing/generate-schedule', asyncHandler(generateBillingSchedule));
router.get('/:id/billing', asyncHandler(getBilling));
router.patch('/:id/billing/lines/:lineId', asyncHandler(updateBillingLine));
router.get('/:id/billing/installments/:billingId/pdf', asyncHandler(getInstallmentPdf));
router.post('/:id/billing/installments/:billingId/send-reminder', asyncHandler(sendInstallmentReminder));

export default router;
