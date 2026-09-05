import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../lib/errors';
import { z } from 'zod';
import { calculateLineTotal, calculateOrderTotals, calculateOrderMargin } from '../services/pricing.service';
import { calculateBlendedRiskScore, determineApprovalRequirements } from '../services/risk.service';
import { QuotationStatus, ApprovalRole, ApprovalStatus } from '@prisma/client';
import { generateQuotationPDF } from '../services/pdf.service';
import { sendQuotationEmail } from '../services/email.service';
import { getIO } from '../lib/socket';
import { portalCommentSchema } from './portal.controller';

export const quotationLineSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  discountPercent: z.number().min(0).max(100).default(0),
});

export const createQuotationSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  lines: z.array(quotationLineSchema).min(1, 'At least one line is required'),
  submitForApproval: z.boolean().optional().default(false),
});

export const updateQuotationSchema = z.object({
  lines: z.array(quotationLineSchema).optional(),
  status: z.nativeEnum(QuotationStatus).optional(),
});

/**
 * Format a quotation database record into the API Contract JSON shape
 */
export function formatQuotationDetail(q: any) {
  return {
    id: q.id,
    customer: {
      id: q.customer.id,
      name: q.customer.name,
      email: q.customer.email,
      tier: q.customer.tier,
    },
    rep: {
      id: q.rep.id,
      name: q.rep.name,
    },
    status: q.status,
    blendedRiskScore: q.blendedRiskScore,
    requiresManagerApproval: q.requiresManagerApproval,
    requiresFinanceApproval: q.requiresFinanceApproval,
    subtotal: q.subtotal,
    totalDiscount: q.totalDiscount,
    total: q.total,
    marginPercent: q.marginPercent,
    lines: (q.lines || []).map((l: any) => ({
      id: l.id,
      productId: l.productId,
      productName: l.product ? l.product.name : '',
      category: l.product ? l.product.category : '',
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPercent: l.discountPercent,
      lineTotal: l.lineTotal,
      discountCeiling: l.product ? l.product.discountCeiling : 0,
    })),
    approvalSteps: (q.approvalSteps || []).map((s: any) => ({
      id: s.id,
      approverRole: s.approverRole,
      status: s.status,
      sequence: s.sequence,
      actedBy: s.actedBy ? s.actedBy.name : null,
      actedAt: s.actedAt,
      reason: s.reason,
    })),
    auditEntries: (q.auditEntries || []).map((a: any) => ({
      id: a.id,
      action: a.action,
      detail: a.detail,
      userName: a.user ? a.user.name : 'System',
      createdAt: a.createdAt,
    })),
    warehouseSplits: q.warehouseSplits || [],
    subscriptionBillings: q.subscriptionBillings || [],
    portalComments: (q.portalComments || []).map((c: any) => ({
      id: c.id,
      lineId: c.lineId,
      author: c.author,
      message: c.message,
      createdAt: c.createdAt,
    })),
    lastActivityAt: q.lastActivityAt,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  };
}

const detailInclude = {
  customer: true,
  rep: true,
  lines: {
    include: {
      product: true,
    },
  },
  approvalSteps: {
    include: {
      actedBy: true,
    },
    orderBy: {
      sequence: 'asc' as const,
    },
  },
  auditEntries: {
    include: {
      user: true,
    },
    orderBy: {
      createdAt: 'desc' as const,
    },
  },
  warehouseSplits: {
    include: {
      warehouse: true,
    },
  },
  subscriptionBillings: true,
  portalComments: {
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
};

export const createQuotation = async (req: Request, res: Response): Promise<void> => {
  const { customerId, lines, submitForApproval } = createQuotationSchema.parse(req.body);
  const repId = req.user?.userId;

  if (!repId) {
    throw new AppError('Authentication required', 401);
  }

  // Fetch customer
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  // Fetch all products
  const productIds = lines.map((l) => l.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  const CUSTOMER_TIER_CEILINGS: Record<string, number> = {
    BRONZE: 5,
    SILVER: 10,
    GOLD: 15,
  };
  const tierCeiling = customer ? (CUSTOMER_TIER_CEILINGS[customer.tier] ?? 15) : 15;

  // Validate each product exists & prepare calculations
  const calculatedLines = lines.map((line) => {
    const product = productMap.get(line.productId);
    if (!product) {
      throw new AppError(`Product ${line.productId} not found`, 400);
    }
    const lineTotal = calculateLineTotal(line.quantity, product.unitPrice, line.discountPercent);
    // Effective ceiling is minimum of customer tier limit and product category limit
    const effectiveCeiling = Math.min(tierCeiling, product.discountCeiling);
    return {
      productId: line.productId,
      quantity: line.quantity,
      unitPrice: product.unitPrice,
      discountPercent: line.discountPercent,
      lineTotal,
      marginPercent: product.marginPercent,
      discountCeiling: effectiveCeiling,
    };
  });

  // Calculate totals, margin, risk score
  const { subtotal, totalDiscount, total } = calculateOrderTotals(calculatedLines);
  const marginPercent = calculateOrderMargin(calculatedLines);
  const blendedRiskScore = calculateBlendedRiskScore(calculatedLines);
  const { requiresManagerApproval, requiresFinanceApproval } = determineApprovalRequirements(blendedRiskScore);

  let initialStatus: QuotationStatus = QuotationStatus.DRAFT;
  if (submitForApproval) {
    initialStatus = requiresManagerApproval ? QuotationStatus.PENDING_APPROVAL : QuotationStatus.APPROVED;
  }

  // Execute in transaction
  const createdQuotation = await prisma.$transaction(async (tx) => {
    const quotation = await tx.quotation.create({
      data: {
        customerId,
        repId,
        status: initialStatus,
        blendedRiskScore,
        requiresManagerApproval,
        requiresFinanceApproval,
        subtotal,
        totalDiscount,
        total,
        marginPercent,
        lines: {
          create: calculatedLines.map((cl) => ({
            productId: cl.productId,
            quantity: cl.quantity,
            unitPrice: cl.unitPrice,
            discountPercent: cl.discountPercent,
            lineTotal: cl.lineTotal,
          })),
        },
      },
    });

    // Create approval steps if submitForApproval is requested and approvals are required
    if (submitForApproval && requiresManagerApproval) {
      await tx.approvalStep.create({
        data: {
          quotationId: quotation.id,
          approverRole: ApprovalRole.SALES_MANAGER,
          status: ApprovalStatus.PENDING,
          sequence: 1,
        },
      });

      if (requiresFinanceApproval) {
        await tx.approvalStep.create({
          data: {
            quotationId: quotation.id,
            approverRole: ApprovalRole.FINANCE,
            status: ApprovalStatus.PENDING,
            sequence: 2,
          },
        });
      }
    }

    // Write audit log entry
    await tx.auditLogEntry.create({
      data: {
        quotationId: quotation.id,
        userId: repId,
        action: 'CREATED',
        detail: `Quotation created with ${lines.length} lines. Total: ₹${total}. Status: ${initialStatus}`,
      },
    });

    return quotation;
  });

  // Fetch full details
  const fullQuotation = await prisma.quotation.findUnique({
    where: { id: createdQuotation.id },
    include: detailInclude,
  });

  res.status(201).json(formatQuotationDetail(fullQuotation));
};

export const getQuotations = async (req: Request, res: Response): Promise<void> => {
  const status = req.query.status as string | undefined;
  const repId = req.query.repId as string | undefined;

  const whereClause: any = {};
  if (status && typeof status === 'string') {
    whereClause.status = status as QuotationStatus;
  }
  if (repId && typeof repId === 'string') {
    whereClause.repId = repId;
  }

  const quotations = await prisma.quotation.findMany({
    where: whereClause,
    include: {
      customer: {
        select: {
          name: true,
          tier: true,
        },
      },
      lines: {
        include: {
          product: {
            select: {
              name: true,
              category: true,
            },
          },
        },
      },
    },
    orderBy: {
      lastActivityAt: 'desc',
    },
  });

  const response = quotations.map((q) => ({
    id: q.id,
    customerName: q.customer.name,
    customerTier: q.customer.tier,
    total: q.total,
    status: q.status,
    blendedRiskScore: q.blendedRiskScore,
    lastActivityAt: q.lastActivityAt,
    items: (q.lines || []).map((l: any) => ({
      id: l.id,
      productId: l.productId,
      productName: l.product ? l.product.name : 'Product',
      category: l.product ? l.product.category : '',
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPercent: l.discountPercent,
      lineTotal: l.lineTotal,
    })),
  }));

  res.status(200).json(response);
};

export const getQuotationById = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: detailInclude,
  });

  if (!quotation) {
    throw new AppError('Quotation not found', 404);
  }

  res.status(200).json(formatQuotationDetail(quotation));
};

export const updateQuotation = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const { lines, status } = updateQuotationSchema.parse(req.body);
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const existing = await prisma.quotation.findUnique({
    where: { id },
    include: { lines: true, customer: true },
  });

  if (!existing) {
    throw new AppError('Quotation not found', 404);
  }

  await prisma.$transaction(async (tx) => {
    let updateData: any = {
      lastActivityAt: new Date(),
    };

    if (lines) {
      const productIds = lines.map((l) => l.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      const CUSTOMER_TIER_CEILINGS: Record<string, number> = {
        BRONZE: 5,
        SILVER: 10,
        GOLD: 15,
      };
      const tierCeiling = existing?.customer ? (CUSTOMER_TIER_CEILINGS[existing.customer.tier] ?? 15) : 15;

      const calculatedLines = lines.map((line) => {
        const product = productMap.get(line.productId);
        if (!product) {
          throw new AppError(`Product ${line.productId} not found`, 400);
        }
        const lineTotal = calculateLineTotal(line.quantity, product.unitPrice, line.discountPercent);
        const effectiveCeiling = Math.min(tierCeiling, product.discountCeiling);
        return {
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: product.unitPrice,
          discountPercent: line.discountPercent,
          lineTotal,
          marginPercent: product.marginPercent,
          discountCeiling: effectiveCeiling,
        };
      });

      const { subtotal, totalDiscount, total } = calculateOrderTotals(calculatedLines);
      const marginPercent = calculateOrderMargin(calculatedLines);
      const blendedRiskScore = calculateBlendedRiskScore(calculatedLines);
      const { requiresManagerApproval, requiresFinanceApproval } = determineApprovalRequirements(blendedRiskScore);

      updateData = {
        ...updateData,
        subtotal,
        totalDiscount,
        total,
        marginPercent,
        blendedRiskScore,
        requiresManagerApproval,
        requiresFinanceApproval,
      };

      // Replace quotation lines
      await tx.quotationLine.deleteMany({ where: { quotationId: id } });
      await tx.quotationLine.createMany({
        data: calculatedLines.map((cl) => ({
          quotationId: id,
          productId: cl.productId,
          quantity: cl.quantity,
          unitPrice: cl.unitPrice,
          discountPercent: cl.discountPercent,
          lineTotal: cl.lineTotal,
        })),
      });

      await tx.auditLogEntry.create({
        data: {
          quotationId: id,
          userId,
          action: 'EDITED_LINES',
          detail: `Updated to ${lines.length} lines. New total: ₹${total}, Risk Score: ${blendedRiskScore}%`,
        },
      });
    }

    if (status) {
      updateData.status = status;
      await tx.auditLogEntry.create({
        data: {
          quotationId: id,
          userId,
          action: 'STATUS_CHANGED',
          detail: `Status updated from ${existing.status} to ${status}`,
        },
      });
    }

    await tx.quotation.update({
      where: { id },
      data: updateData,
    });
  });

  const updatedQuotation = await prisma.quotation.findUnique({
    where: { id },
    include: detailInclude,
  });

  res.status(200).json(formatQuotationDetail(updatedQuotation));
};

export const submitForApproval = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
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

  // Calculate current risk score
  const riskLines = quotation.lines.map((l) => ({
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    discountPercent: l.discountPercent,
    discountCeiling: l.product.discountCeiling,
  }));

  const blendedRiskScore = calculateBlendedRiskScore(riskLines);
  const { requiresManagerApproval, requiresFinanceApproval } = determineApprovalRequirements(blendedRiskScore);

  await prisma.$transaction(async (tx) => {
    // Delete existing pending approval steps
    await tx.approvalStep.deleteMany({
      where: {
        quotationId: id,
        status: ApprovalStatus.PENDING,
      },
    });

    if (blendedRiskScore === 0) {
      // Direct approval
      await tx.quotation.update({
        where: { id },
        data: {
          status: QuotationStatus.APPROVED,
          blendedRiskScore: 0,
          requiresManagerApproval: false,
          requiresFinanceApproval: false,
          lastActivityAt: new Date(),
        },
      });

      await tx.auditLogEntry.create({
        data: {
          quotationId: id,
          userId,
          action: 'AUTO_APPROVED',
          detail: 'Risk score is 0; automatically approved without requiring manager approval.',
        },
      });
    } else {
      // Create approval steps
      await tx.quotation.update({
        where: { id },
        data: {
          status: QuotationStatus.PENDING_APPROVAL,
          blendedRiskScore,
          requiresManagerApproval,
          requiresFinanceApproval,
          lastActivityAt: new Date(),
        },
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

      await tx.auditLogEntry.create({
        data: {
          quotationId: id,
          userId,
          action: 'SUBMITTED_FOR_APPROVAL',
          detail: `Submitted for approval. Blended Risk Score: ${blendedRiskScore}%. Requires Manager: ${requiresManagerApproval}, Requires Finance: ${requiresFinanceApproval}`,
        },
      });
    }
  });

  const updatedQuotation = await prisma.quotation.findUnique({
    where: { id },
    include: detailInclude,
  });

  if (updatedQuotation) {
    try {
      const io = getIO();
      if (io) {
        io.to(`quotation:${id}`).emit('quotation-status-changed', {
          quotationId: id,
          newStatus: updatedQuotation.status,
        });
        io.to(`quotation:${id}`).emit('quotation-updated', {
          quotationId: id,
          status: updatedQuotation.status,
        });
      }
    } catch (err) {
      console.error('[Socket.io] Failed to emit status event:', err);
    }
  }

  res.status(200).json(formatQuotationDetail(updatedQuotation));
};

export const deleteQuotation = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);

  await prisma.$transaction(async (tx) => {
    await tx.portalComment.deleteMany({ where: { quotationId: id } });
    await tx.dealHealthAlert.deleteMany({ where: { quotationId: id } });
    await tx.subscriptionBilling.deleteMany({ where: { quotationId: id } });
    await tx.warehouseSplit.deleteMany({ where: { quotationId: id } });
    await tx.auditLogEntry.deleteMany({ where: { quotationId: id } });
    await tx.approvalStep.deleteMany({ where: { quotationId: id } });
    await tx.quotationLine.deleteMany({ where: { quotationId: id } });
    await tx.quotation.delete({ where: { id } });
  });

  res.status(200).json({ message: 'Quotation deleted successfully' });
};

export const getQuotationPdf = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const mode = req.query.mode === 'download' ? 'download' : 'view';

  const quotation: any = await prisma.quotation.findUnique({
    where: { id },
    include: detailInclude,
  });

  if (!quotation) {
    throw new AppError('Quotation not found', 404);
  }

  const formattedSplits = (quotation.warehouseSplits || []).map((s: any) => ({
    warehouseName: s.warehouse?.name || 'Warehouse Depot',
    quantityFulfilled: s.quantityFulfilled,
    estimatedShipmentCost: s.estimatedShipmentCost,
  }));

  const pdfBuffer = await generateQuotationPDF(
    quotation,
    quotation.lines,
    formattedSplits,
    quotation.subscriptionBillings
  );

  const refId = quotation.id.slice(0, 8).toUpperCase();
  res.setHeader('Content-Type', 'application/pdf');
  if (mode === 'download') {
    res.setHeader('Content-Disposition', `attachment; filename="Quotation-${refId}.pdf"`);
  } else {
    res.setHeader('Content-Disposition', `inline; filename="Quotation-${refId}.pdf"`);
  }
  res.setHeader('Content-Length', pdfBuffer.length);
  res.status(200).send(pdfBuffer);
};

export const emailQuotationToCustomer = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const userId = req.user?.userId;

  const quotation: any = await prisma.quotation.findUnique({
    where: { id },
    include: detailInclude,
  });

  if (!quotation) {
    throw new AppError('Quotation not found', 404);
  }

  if (!quotation.customer?.email) {
    throw new AppError('Customer email address is not configured', 400);
  }

  const formattedSplits = (quotation.warehouseSplits || []).map((s: any) => ({
    warehouseName: s.warehouse?.name || 'Warehouse Depot',
    quantityFulfilled: s.quantityFulfilled,
    estimatedShipmentCost: s.estimatedShipmentCost,
  }));

  const pdfBuffer = await generateQuotationPDF(
    quotation,
    quotation.lines,
    formattedSplits,
    quotation.subscriptionBillings
  );

  const emailResult = await sendQuotationEmail(
    quotation.customer.email,
    quotation.customer.name,
    quotation.id,
    pdfBuffer
  );

  if (userId) {
    await prisma.auditLogEntry.create({
      data: {
        quotationId: quotation.id,
        userId,
        action: 'EMAILED_TO_CUSTOMER',
        detail: `Sent quotation PDF via email to ${quotation.customer.email}. Message ID: ${emailResult.messageId}`,
      },
    });
  }

  res.status(200).json({
    success: true,
    message: `Quotation PDF successfully emailed to ${quotation.customer.email}`,
    previewUrl: emailResult.previewUrl,
    messageId: emailResult.messageId,
  });
};

export const addQuotationComment = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const user = req.user;
  const { lineId, message } = portalCommentSchema.parse(req.body);

  if (!user) {
    throw new AppError('Authentication required', 401);
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id },
  });

  if (!quotation) {
    throw new AppError('Quotation not found', 404);
  }

  const author = user.name ? `${user.name} (${user.role})` : user.email || 'Sales Team';

  const comment = await prisma.portalComment.create({
    data: {
      quotationId: id,
      lineId: lineId || null,
      author,
      message: message.trim(),
    },
  });

  await prisma.quotation.update({
    where: { id },
    data: { lastActivityAt: new Date() },
  });

  const payload = {
    id: comment.id,
    quotationId: id,
    lineId: comment.lineId,
    author: comment.author,
    authorType: 'INTERNAL',
    message: comment.message,
    createdAt: comment.createdAt,
  };

  try {
    const io = getIO();
    if (io) {
      io.to(`quotation:${id}`).emit('new-message', payload);
      io.to(`quotation:${id}`).emit('new-comment', payload);
    }
  } catch (err) {
    console.error('[Socket.io] Failed to emit comment event:', err);
  }

  res.status(201).json(payload);
};


