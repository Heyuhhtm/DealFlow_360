import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../lib/errors';
import { z } from 'zod';
import { calculateLineTotal, calculateOrderTotals, calculateOrderMargin } from '../services/pricing.service';
import { calculateBlendedRiskScore, determineApprovalRequirements } from '../services/risk.service';
import { QuotationStatus, ApprovalRole, ApprovalStatus } from '@prisma/client';

export const portalCommentSchema = z.object({
  lineId: z.string().uuid().optional(),
  message: z.string().min(1, 'Message is required'),
});

export const counterDiscountSchema = z.object({
  proposedDiscountPercent: z.number().min(0).max(100),
  justification: z.string().min(1, 'Justification is required'),
  lineId: z.string().uuid().optional(),
});

export const getPortalQuotationById = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const customerId = req.customer?.customerId;

  if (!customerId) {
    throw new AppError('Portal authentication required', 401);
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          tier: true,
          email: true,
        },
      },
      lines: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true,
              billingCycle: true,
            },
          },
        },
      },
      portalComments: {
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  if (!quotation) {
    throw new AppError('Quotation not found', 404);
  }

  // Guard: Customer ownership
  if (quotation.customerId !== customerId) {
    res.status(403).json({
      error: {
        message: 'Forbidden: You do not have permission to view this quotation',
        statusCode: 403,
      },
    });
    return;
  }

  // Customer scoped view (no internal rep details or internal approval steps)
  const scopedResponse = {
    id: quotation.id,
    customer: quotation.customer,
    status: quotation.status,
    subtotal: quotation.subtotal,
    totalDiscount: quotation.totalDiscount,
    total: quotation.total,
    lines: quotation.lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      productName: l.product.name,
      category: l.product.category,
      billingCycle: l.product.billingCycle,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPercent: l.discountPercent,
      lineTotal: l.lineTotal,
    })),
    portalComments: quotation.portalComments.map((c) => ({
      id: c.id,
      lineId: c.lineId,
      author: c.author,
      message: c.message,
      createdAt: c.createdAt,
    })),
    createdAt: quotation.createdAt,
    updatedAt: quotation.updatedAt,
  };

  res.status(200).json(scopedResponse);
};

export const getPortalQuotations = async (req: Request, res: Response): Promise<void> => {
  const customerId = req.customer?.customerId;

  if (!customerId) {
    throw new AppError('Portal authentication required', 401);
  }

  const quotations = await prisma.quotation.findMany({
    where: { customerId },
    select: {
      id: true,
      status: true,
      total: true,
      subtotal: true,
      totalDiscount: true,
      createdAt: true,
      lastActivityAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.status(200).json(quotations);
};

export const addPortalComment = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const customerId = req.customer?.customerId;
  const { lineId, message } = portalCommentSchema.parse(req.body);

  if (!customerId) {
    throw new AppError('Portal authentication required', 401);
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id },
  });

  if (!quotation) {
    throw new AppError('Quotation not found', 404);
  }

  if (quotation.customerId !== customerId) {
    res.status(403).json({
      error: {
        message: 'Forbidden: You do not have permission to comment on this quotation',
        statusCode: 403,
      },
    });
    return;
  }

  const author = req.customer?.email || 'Customer';

  const comment = await prisma.portalComment.create({
    data: {
      quotationId: id,
      lineId: lineId || null,
      author,
      message,
    },
  });

  await prisma.quotation.update({
    where: { id },
    data: { lastActivityAt: new Date() },
  });

  res.status(201).json({
    id: comment.id,
    lineId: comment.lineId,
    author: comment.author,
    message: comment.message,
    createdAt: comment.createdAt,
  });
};

export const counterDiscount = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const customerId = req.customer?.customerId;
  const { proposedDiscountPercent, justification, lineId } = counterDiscountSchema.parse(req.body);

  if (!customerId) {
    throw new AppError('Portal authentication required', 401);
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      lines: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!quotation) {
    throw new AppError('Quotation not found', 404);
  }

  if (quotation.customerId !== customerId) {
    res.status(403).json({
      error: {
        message: 'Forbidden: You do not have permission to counter this quotation',
        statusCode: 403,
      },
    });
    return;
  }

  // Find line or default to first line if lineId not provided
  let targetLineId = lineId;
  if (!targetLineId && quotation.lines.length > 0) {
    targetLineId = quotation.lines[0].id;
  }

  const calculatedLines = quotation.lines.map((l) => {
    const isTarget = l.id === targetLineId;
    const discountPercent = isTarget ? proposedDiscountPercent : l.discountPercent;
    const lineTotal = calculateLineTotal(l.quantity, l.unitPrice, discountPercent);
    return {
      id: l.id,
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPercent,
      lineTotal,
      marginPercent: l.product.marginPercent,
      discountCeiling: l.product.discountCeiling,
    };
  });

  const { subtotal, totalDiscount, total } = calculateOrderTotals(calculatedLines);
  const marginPercent = calculateOrderMargin(calculatedLines);
  const blendedRiskScore = calculateBlendedRiskScore(calculatedLines);
  const { requiresManagerApproval, requiresFinanceApproval } = determineApprovalRequirements(blendedRiskScore);

  let newQuotationStatus: QuotationStatus = QuotationStatus.UNDER_NEGOTIATION;
  let reenteredApproval = false;

  if (blendedRiskScore > 0) {
    newQuotationStatus = QuotationStatus.PENDING_APPROVAL;
    reenteredApproval = true;
  } else if (quotation.status === QuotationStatus.APPROVED) {
    newQuotationStatus = QuotationStatus.APPROVED;
  }

  await prisma.$transaction(async (tx) => {
    // Update line
    if (targetLineId) {
      const targetLine = calculatedLines.find((l) => l.id === targetLineId);
      if (targetLine) {
        await tx.quotationLine.update({
          where: { id: targetLineId },
          data: {
            discountPercent: targetLine.discountPercent,
            lineTotal: targetLine.lineTotal,
          },
        });
      }
    }

    // If re-entered approval, regenerate pending approval steps
    if (reenteredApproval) {
      await tx.approvalStep.deleteMany({
        where: { quotationId: id, status: ApprovalStatus.PENDING },
      });

      await tx.approvalStep.create({
        data: {
          quotationId: id,
          approverRole: ApprovalRole.SALES_MANAGER,
          status: ApprovalStatus.PENDING,
          sequence: 1,
        },
      });

      if (requiresFinanceApproval) {
        await tx.approvalStep.create({
          data: {
            quotationId: id,
            approverRole: ApprovalRole.FINANCE,
            status: ApprovalStatus.PENDING,
            sequence: 2,
          },
        });
      }
    }

    // Update Quotation totals and status
    await tx.quotation.update({
      where: { id },
      data: {
        status: newQuotationStatus,
        subtotal,
        totalDiscount,
        total,
        marginPercent,
        blendedRiskScore,
        requiresManagerApproval,
        requiresFinanceApproval,
        lastActivityAt: new Date(),
      },
    });

    // Write audit log
    await tx.auditLogEntry.create({
      data: {
        quotationId: id,
        userId: quotation.repId,
        action: 'COUNTER_DISCOUNT',
        detail: `Customer proposed discount ${proposedDiscountPercent}%. Justification: "${justification}". New status: ${newQuotationStatus}`,
      },
    });

    // Also record portal comment
    await tx.portalComment.create({
      data: {
        quotationId: id,
        lineId: targetLineId || null,
        author: req.customer?.email || 'Customer',
        message: `Proposed counter-discount: ${proposedDiscountPercent}%. Reason: ${justification}`,
      },
    });
  });

  res.status(200).json({
    quotationStatus: newQuotationStatus,
    reenteredApproval,
    blendedRiskScore,
  });
};

export const acceptPortalQuotation = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const customerId = req.customer?.customerId;

  if (!customerId) {
    throw new AppError('Portal authentication required', 401);
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id },
  });

  if (!quotation) {
    throw new AppError('Quotation not found', 404);
  }

  if (quotation.customerId !== customerId) {
    res.status(403).json({
      error: {
        message: 'Forbidden: You do not have permission to confirm this quotation',
        statusCode: 403,
      },
    });
    return;
  }

  if (quotation.status === QuotationStatus.CONFIRMED) {
    res.status(400).json({
      error: {
        message: 'This quotation is already confirmed',
        statusCode: 400,
      },
    });
    return;
  }

  if (quotation.status === QuotationStatus.PENDING_APPROVAL) {
    res.status(400).json({
      error: {
        message: 'Quotation cannot be confirmed while pending internal approval',
        statusCode: 400,
      },
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.quotation.update({
      where: { id },
      data: {
        status: QuotationStatus.CONFIRMED,
        lastActivityAt: new Date(),
      },
    });

    await tx.auditLogEntry.create({
      data: {
        quotationId: id,
        userId: quotation.repId,
        action: 'PORTAL_CONFIRMED',
        detail: `Quotation accepted and confirmed by customer (${req.customer?.email || 'Customer'})`,
      },
    });
  });

  res.status(200).json({
    quotationStatus: 'CONFIRMED',
  });
};

export const rejectPortalQuotation = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const customerId = req.customer?.customerId;

  if (!customerId) {
    throw new AppError('Portal authentication required', 401);
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id },
  });

  if (!quotation) {
    throw new AppError('Quotation not found', 404);
  }

  if (quotation.customerId !== customerId) {
    res.status(403).json({
      error: {
        message: 'Forbidden: You do not have permission to reject this quotation',
        statusCode: 403,
      },
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.quotation.update({
      where: { id },
      data: {
        status: QuotationStatus.REJECTED,
        lastActivityAt: new Date(),
      },
    });

    await tx.auditLogEntry.create({
      data: {
        quotationId: id,
        userId: quotation.repId,
        action: 'PORTAL_REJECTED',
        detail: `Quotation rejected by customer (${req.customer?.email || 'Customer'})`,
      },
    });
  });

  res.status(200).json({
    quotationStatus: 'REJECTED',
  });
};
