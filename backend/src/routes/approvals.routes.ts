import { Router } from 'express';
import {
  getApprovals,
  getApprovalById,
  approveQuotation,
  rejectQuotation,
} from '../controllers/approvals.controller';

const router = Router();

router.get('/', getApprovals);
router.get('/:id', getApprovalById);
router.post('/:id/approve', approveQuotation);
router.post('/:id/reject', rejectQuotation);

export default router;
