import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../lib/errors';
import { addMonths } from 'date-fns';
import { ProductCategory, BillingCycle } from '@prisma/client';
import { calculateLineTotal } from '../services/pricing.service';
import { z } from 'zod';

export const updateBillingLineSchema = z.object({
  quantity: z.number().int().positive('Quantity must be positive'),
});

export const generateBillingSchedule = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);

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

  // Filter subscription lines
  const subscriptionLines = quotation.lines.filter(
    (l) => l.product.category === ProductCategory.SUBSCRIPTION && l.product.billingCycle
  );

  if (subscriptionLines.length === 0) {
    res.status(200).json([]);
    return;
  }

  // Calculate next 3 billing dates and persist
  const response: any[] = [];

  await prisma.$transaction(async (tx) => {
    // Clear old schedules for this quotation
    await tx.subscriptionBilling.deleteMany({
      where: { quotationId: id },
    });

    for (const line of subscriptionLines) {
      const cycle = line.product.billingCycle as BillingCycle;
      const monthInterval = cycle === BillingCycle.MONTHLY ? 1 : cycle === BillingCycle.QUARTERLY ? 3 : 12;

      const scheduleEntries: { nextBillingDate: Date; amount: number }[] = [];
      const now = new Date();

      for (let i = 1; i <= 3; i++) {
        const nextDate = addMonths(now, i * monthInterval);
        await tx.subscriptionBilling.create({
          data: {
            quotationId: id,
            productId: line.productId,
            billingCycle: cycle,
            nextBillingDate: nextDate,
            amount: line.lineTotal,
          },
        });

        scheduleEntries.push({
          nextBillingDate: nextDate,
          amount: line.lineTotal,
        });
      }

      response.push({
        productId: line.productId,
        productName: line.product.name,
        billingCycle: cycle,
        schedule: scheduleEntries,
      });
    }

    await tx.quotation.update({
      where: { id },
      data: { lastActivityAt: new Date() },
    });
  });

  res.status(200).json(response);
};

export const getBilling = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      lines: {
        include: {
          product: true,
        },
      },
      subscriptionBillings: true,
    },
  });

  if (!quotation) {
    throw new AppError('Quotation not found', 404);
  }

  const oneTimeLines = quotation.lines
    .filter((l) => l.product.category !== ProductCategory.SUBSCRIPTION)
    .map((l) => ({
      id: l.id,
      productId: l.productId,
      productName: l.product.name,
      category: l.product.category,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPercent: l.discountPercent,
      lineTotal: l.lineTotal,
    }));

  const recurringLines = quotation.lines
    .filter((l) => l.product.category === ProductCategory.SUBSCRIPTION)
    .map((l) => ({
      id: l.id,
      productId: l.productId,
      productName: l.product.name,
      category: l.product.category,
      billingCycle: l.product.billingCycle,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPercent: l.discountPercent,
      lineTotal: l.lineTotal,
    }));

  // Fetch product names for billings
  const productIds = quotation.subscriptionBillings.map((b) => b.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });
  const productMap = new Map(products.map((p) => [p.id, p.name]));

  const billingSchedule = quotation.subscriptionBillings
    .sort((a, b) => a.nextBillingDate.getTime() - b.nextBillingDate.getTime())
    .map((b) => ({
      productId: b.productId,
      productName: productMap.get(b.productId) || 'Subscription Product',
      nextBillingDate: b.nextBillingDate,
      amount: b.amount,
    }));

  res.status(200).json({
    oneTimeLines,
    recurringLines,
    billingSchedule,
  });
};

export const updateBillingLine = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const lineId = String(req.params.lineId);
  const { quantity } = updateBillingLineSchema.parse(req.body);
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const line = await prisma.quotationLine.findUnique({
    where: { id: lineId },
    include: { product: true },
  });

  if (!line || line.quotationId !== id) {
    throw new AppError('Quotation line not found', 404);
  }

  const oldTotal = line.lineTotal;
  const newTotal = calculateLineTotal(quantity, line.unitPrice, line.discountPercent);
  const delta = newTotal - oldTotal;

  // Mock proration: half of the delta represents remaining cycle adjustment
  const prorationAmount = Number((delta * 0.5).toFixed(2));
  const prorationSign = prorationAmount >= 0 ? `+$${prorationAmount}` : `-$${Math.abs(prorationAmount)}`;
  const prorationNote = `Prorated adjustment: ${prorationSign} for remaining billing period`;

  const updatedLine = await prisma.$transaction(async (tx) => {
    const updated = await tx.quotationLine.update({
      where: { id: lineId },
      data: {
        quantity,
        lineTotal: newTotal,
      },
    });

    await tx.auditLogEntry.create({
      data: {
        quotationId: id,
        userId,
        action: 'BILLING_LINE_UPDATED',
        detail: `Updated recurring line quantity to ${quantity}. ${prorationNote}`,
      },
    });

    await tx.quotation.update({
      where: { id },
      data: { lastActivityAt: new Date() },
    });

    return updated;
  });

  res.status(200).json({
    line: updatedLine,
    prorationNote,
  });
};
