import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../lib/errors';
import { z } from 'zod';
import { ApprovalStatus, QuotationStatus } from '@prisma/client';
import { getIO } from '../lib/socket';

export const approvalActionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'RETURN']),
  reason: z.string().optional(),
});

export const getApprovals = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);

  const steps = await prisma.approvalStep.findMany({
    where: { quotationId: id },
    include: {
      actedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      sequence: 'asc',
    },
  });

  const response = steps.map((s) => ({
    id: s.id,
    approverRole: s.approverRole,
    status: s.status,
    sequence: s.sequence,
    actedBy: s.actedBy ? s.actedBy.name : null,
    actedAt: s.actedAt,
    reason: s.reason,
  }));

  res.status(200).json(response);
};

export const takeApprovalAction = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const stepId = String(req.params.stepId);
  const { action, reason } = approvalActionSchema.parse(req.body);
  const user = req.user;

  if (!user) {
    throw new AppError('Authentication required', 401);
  }

  // Find the specific approval step
  const step = await prisma.approvalStep.findUnique({
    where: { id: stepId },
    include: { quotation: true },
  });

  if (!step || step.quotationId !== id) {
    throw new AppError('Approval step not found for this quotation', 404);
  }

  // Guard: Check role matches approverRole
  if (user.role !== (step.approverRole as string)) {
    res.status(403).json({
      error: {
        message: `Forbidden: Only ${step.approverRole} can act on this approval step`,
        statusCode: 403,
      },
    });
    return;
  }

  // Guard: Step must be PENDING
  if (step.status !== ApprovalStatus.PENDING) {
    res.status(400).json({
      error: {
        message: 'This approval step is no longer pending',
        statusCode: 400,
      },
    });
    return;
  }

  let nextQuotationStatus = step.quotation.status;
  let newStepStatus: ApprovalStatus = ApprovalStatus.PENDING;

  if (action === 'APPROVE') {
    newStepStatus = ApprovalStatus.APPROVED;
  } else if (action === 'REJECT') {
    newStepStatus = ApprovalStatus.REJECTED;
  } else if (action === 'RETURN') {
    newStepStatus = ApprovalStatus.RETURNED;
  }

  const result = await prisma.$transaction(async (tx) => {
    // Update the step
    const updatedStep = await tx.approvalStep.update({
      where: { id: stepId },
      data: {
        status: newStepStatus,
        actedById: user.userId,
        actedAt: new Date(),
        reason: reason || null,
      },
      include: {
        actedBy: {
          select: {
            name: true,
          },
        },
      },
    });

    if (action === 'REJECT') {
      nextQuotationStatus = QuotationStatus.REJECTED;
    } else if (action === 'RETURN') {
      nextQuotationStatus = QuotationStatus.DRAFT;
    } else if (action === 'APPROVE') {
      // Check if there are other subsequent pending steps
      const remainingSteps = await tx.approvalStep.findMany({
        where: {
          quotationId: id,
          id: { not: stepId },
          sequence: { gt: step.sequence },
          status: ApprovalStatus.PENDING,
        },
      });

      if (remainingSteps.length === 0) {
        nextQuotationStatus = QuotationStatus.APPROVED;
      }
    }

    // Update quotation status and lastActivityAt
    await tx.quotation.update({
      where: { id },
      data: {
        status: nextQuotationStatus,
        lastActivityAt: new Date(),
      },
    });

    // Write audit log entry
    await tx.auditLogEntry.create({
      data: {
        quotationId: id,
        userId: user.userId,
        action: action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : 'RETURNED',
        detail: `${step.approverRole} ${action.toLowerCase()}ed step ${step.sequence}.${reason ? ` Reason: ${reason}` : ''}`,
      },
    });

    return {
      step: {
        id: updatedStep.id,
        approverRole: updatedStep.approverRole,
        status: updatedStep.status,
        sequence: updatedStep.sequence,
        actedBy: updatedStep.actedBy?.name || user.name || null,
        actedAt: updatedStep.actedAt,
        reason: updatedStep.reason,
      },
      quotationStatus: nextQuotationStatus,
    };
  });

  // Broadcast real-time status update to both staff and customer portal
  try {
    const io = getIO();
    if (io) {
      io.to(`quotation:${id}`).emit('quotation-status-changed', {
        quotationId: id,
        newStatus: result.quotationStatus,
      });
      io.to(`quotation:${id}`).emit('quotation-updated', {
        quotationId: id,
        status: result.quotationStatus,
      });
    }
  } catch (err) {
    console.error('[Socket.io] Failed to emit approval action status event:', err);
  }

  res.status(200).json(result);
};

export const getAuditLog = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);

  const entries = await prisma.auditLogEntry.findMany({
    where: { quotationId: id },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const response = entries.map((e) => ({
    id: e.id,
    action: e.action,
    detail: e.detail,
    userName: e.user ? e.user.name : 'System',
    createdAt: e.createdAt,
  }));

  res.status(200).json(response);
};

export const getApprovalById = async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ error: { message: 'Use GET /api/quotations/:id/approvals', statusCode: 501 } });
};

export const approveQuotation = async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ error: { message: 'Use POST /api/quotations/:id/approvals/:stepId/action', statusCode: 501 } });
};

export const rejectQuotation = async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ error: { message: 'Use POST /api/quotations/:id/approvals/:stepId/action', statusCode: 501 } });
};
