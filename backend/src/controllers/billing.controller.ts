import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../lib/errors';
import { addMonths } from 'date-fns';
import { ProductCategory, BillingCycle } from '@prisma/client';
import { calculateLineTotal } from '../services/pricing.service';
import { generateInstallmentInvoicePDF } from '../services/pdf.service';
import { sendBillingReminderEmail } from '../services/email.service';
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

  // Configurable installments count (e.g. 3, 6, 12 months EMI schedule, default 3)
  const installmentsCount = Math.min(
    12,
    Math.max(1, Number(req.body?.installmentsCount || req.query?.installmentsCount) || 3)
  );

  // Calculate upcoming billing dates and persist
  const response: any[] = [];

  await prisma.$transaction(async (tx) => {
    // Clear old schedules for this quotation
    await tx.subscriptionBilling.deleteMany({
      where: { quotationId: id },
    });

    const now = new Date();

    if (subscriptionLines.length > 0) {
      // 1. Quotation contains recurring subscription products
      for (const line of subscriptionLines) {
        const cycle = line.product.billingCycle as BillingCycle;
        const monthInterval = cycle === BillingCycle.MONTHLY ? 1 : cycle === BillingCycle.QUARTERLY ? 3 : 12;
        const scheduleEntries: { nextBillingDate: Date; amount: number; installmentNumber: number }[] = [];

        for (let i = 1; i <= installmentsCount; i++) {
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
            installmentNumber: i,
          });
        }

        response.push({
          productId: line.productId,
          productName: line.product.name,
          billingCycle: cycle,
          schedule: scheduleEntries,
        });
      }
    } else {
      // 2. Quotation contains One-Time / Hardware / Service products -> EMI Financing Schedule!
      // Equated Monthly Installments dividing the total quotation amount over installmentsCount months
      const totalAmount = quotation.total;
      const baseEmi = Number((totalAmount / installmentsCount).toFixed(2));
      const primaryLine = quotation.lines[0];
      const primaryProductId = primaryLine?.productId || quotation.id;
      const primaryProductName = primaryLine?.product?.name
        ? `${primaryLine.product.name} (EMI Installment)`
        : `Order #${quotation.id.slice(0, 8)} EMI`;

      const scheduleEntries: { nextBillingDate: Date; amount: number; installmentNumber: number }[] = [];
      let accumulated = 0;

      for (let i = 1; i <= installmentsCount; i++) {
        const nextDate = addMonths(now, i);
        // Adjust any rounding cent difference on the last installment
        const installmentAmount =
          i === installmentsCount
            ? Number((totalAmount - accumulated).toFixed(2))
            : baseEmi;
        accumulated += installmentAmount;

        await tx.subscriptionBilling.create({
          data: {
            quotationId: id,
            productId: primaryProductId,
            billingCycle: BillingCycle.MONTHLY,
            nextBillingDate: nextDate,
            amount: installmentAmount,
          },
        });

        scheduleEntries.push({
          nextBillingDate: nextDate,
          amount: installmentAmount,
          installmentNumber: i,
        });
      }

      response.push({
        productId: primaryProductId,
        productName: primaryProductName,
        billingCycle: BillingCycle.MONTHLY,
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

  const hasSubscriptionLines = recurringLines.length > 0;

  const billingSchedule = quotation.subscriptionBillings
    .sort((a, b) => a.nextBillingDate.getTime() - b.nextBillingDate.getTime())
    .map((b, idx, arr) => {
      const prodName = productMap.get(b.productId);
      const displayName = hasSubscriptionLines
        ? (prodName || 'Subscription Product')
        : (prodName ? `${prodName} (EMI Installment)` : 'Order EMI Installment');

      return {
        id: b.id,
        productId: b.productId,
        productName: displayName,
        billingCycle: b.billingCycle,
        nextBillingDate: b.nextBillingDate,
        amount: b.amount,
        installmentNumber: idx + 1,
        totalInstallments: arr.length,
      };
    });

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
  const prorationSign = prorationAmount >= 0 ? `+₹${prorationAmount}` : `-₹${Math.abs(prorationAmount)}`;
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

export const getInstallmentPdf = async (req: Request, res: Response): Promise<void> => {
  const quotationId = String(req.params.id);
  const billingId = String(req.params.billingId);
  const disposition = req.query.disposition === 'download' ? 'attachment' : 'inline';

  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      customer: true,
      lines: {
        include: { product: true },
      },
      subscriptionBillings: {
        orderBy: { nextBillingDate: 'asc' },
      },
    },
  });

  if (!quotation) {
    throw new AppError('Quotation not found', 404);
  }

  const billingIndex = quotation.subscriptionBillings.findIndex((b) => b.id === billingId);
  const billing = quotation.subscriptionBillings[billingIndex];
  if (!billing) {
    throw new AppError('Subscription installment record not found', 404);
  }

  const product = await prisma.product.findUnique({
    where: { id: billing.productId },
  });

  const hasSubscriptionLines = quotation.lines.some(
    (l) => l.product.category === ProductCategory.SUBSCRIPTION
  );
  const displayProductName = hasSubscriptionLines
    ? (product?.name || 'Subscription Product')
    : (product?.name ? `${product.name} (EMI Installment)` : 'Commercial Order EMI');

  const pdfBuffer = await generateInstallmentInvoicePDF({
    quotationId,
    billingId: billing.id,
    customer: {
      name: quotation.customer.name,
      email: quotation.customer.email,
      tier: quotation.customer.tier,
    },
    productName: displayProductName,
    billingCycle: billing.billingCycle,
    installmentNumber: billingIndex + 1,
    totalInstallments: quotation.subscriptionBillings.length,
    dueDate: billing.nextBillingDate,
    amount: billing.amount,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `${disposition}; filename="Installment-Invoice-${billingId.slice(0, 8)}.pdf"`
  );
  res.send(pdfBuffer);
};

export const sendInstallmentReminder = async (req: Request, res: Response): Promise<void> => {
  const quotationId = String(req.params.id);
  const billingId = String(req.params.billingId);
  const userId = req.user?.userId;

  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      customer: true,
      lines: {
        include: { product: true },
      },
      subscriptionBillings: {
        orderBy: { nextBillingDate: 'asc' },
      },
    },
  });

  if (!quotation) {
    throw new AppError('Quotation not found', 404);
  }

  const billingIndex = quotation.subscriptionBillings.findIndex((b) => b.id === billingId);
  const billing = quotation.subscriptionBillings[billingIndex];
  if (!billing) {
    throw new AppError('Subscription installment record not found', 404);
  }

  const product = await prisma.product.findUnique({
    where: { id: billing.productId },
  });

  const hasSubscriptionLines = quotation.lines.some(
    (l) => l.product.category === ProductCategory.SUBSCRIPTION
  );
  const displayProductName = hasSubscriptionLines
    ? (product?.name || 'Subscription Product')
    : (product?.name ? `${product.name} (EMI Installment)` : 'Commercial Order EMI');

  const pdfBuffer = await generateInstallmentInvoicePDF({
    quotationId,
    billingId: billing.id,
    customer: {
      name: quotation.customer.name,
      email: quotation.customer.email,
      tier: quotation.customer.tier,
    },
    productName: displayProductName,
    billingCycle: billing.billingCycle,
    installmentNumber: billingIndex + 1,
    totalInstallments: quotation.subscriptionBillings.length,
    dueDate: billing.nextBillingDate,
    amount: billing.amount,
  });

  const emailResult = await sendBillingReminderEmail({
    toEmail: quotation.customer.email,
    customerName: quotation.customer.name,
    quotationId,
    billingId: billing.id,
    productName: displayProductName,
    installmentNumber: billingIndex + 1,
    totalInstallments: quotation.subscriptionBillings.length,
    dueDate: billing.nextBillingDate,
    amount: billing.amount,
    billingCycle: billing.billingCycle,
    pdfBuffer,
  });

  if (userId) {
    await prisma.auditLogEntry.create({
      data: {
        quotationId,
        userId,
        action: 'BILLING_REMINDER_SENT',
        detail: `Sent payment reminder for Installment #${billingIndex + 1} (₹${billing.amount.toFixed(2)}) to ${quotation.customer.email}.`,
      },
    }).catch(() => {});
  }

  res.status(200).json({
    success: true,
    message: `Payment reminder email sent to ${quotation.customer.email}`,
    previewUrl: emailResult.previewUrl,
    messageId: emailResult.messageId,
  });
};
