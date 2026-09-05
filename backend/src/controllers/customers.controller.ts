import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../lib/errors';
import { CustomerTier } from '@prisma/client';

export const getCustomers = async (_req: Request, res: Response): Promise<void> => {
  const customers = await prisma.customer.findMany({
    include: {
      quotations: {
        select: {
          id: true,
          total: true,
          status: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const response = customers.map((c: any) => {
    const totalSpent = c.quotations.reduce((sum: number, q: any) => sum + (q.total || 0), 0);
    const confirmedCount = c.quotations.filter((q: any) => q.status === 'CONFIRMED').length;

    // Ceilings per customer tier from problem spec:
    // Bronze: 5%, Silver: 10%, Gold: 15%
    let discountCeiling = 5;
    if (c.tier === CustomerTier.SILVER) discountCeiling = 10;
    if (c.tier === CustomerTier.GOLD) discountCeiling = 15;

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      tier: c.tier,
      discountCeiling,
      totalQuotes: c.quotations.length,
      confirmedOrders: confirmedCount,
      lifetimeValue: totalSpent,
      createdAt: c.createdAt,
      quotations: c.quotations,
    };
  });

  res.status(200).json(response);
};

export const getCustomerById = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);

  const customer: any = await prisma.customer.findUnique({
    where: { id },
    include: {
      quotations: {
        include: {
          lines: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  let discountCeiling = 5;
  if (customer.tier === CustomerTier.SILVER) discountCeiling = 10;
  if (customer.tier === CustomerTier.GOLD) discountCeiling = 15;

  res.status(200).json({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    tier: customer.tier,
    discountCeiling,
    quotations: customer.quotations,
    createdAt: customer.createdAt,
  });
};

export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  const { name, email, tier } = req.body;

  if (!name || !email) {
    throw new AppError('Name and email are required', 400);
  }

  // Validate tier enum
  let customerTier: CustomerTier = CustomerTier.BRONZE;
  if (tier && ['BRONZE', 'SILVER', 'GOLD'].includes(tier.toUpperCase())) {
    customerTier = tier.toUpperCase() as CustomerTier;
  }

  const existing = await prisma.customer.findUnique({
    where: { email },
  });

  if (existing) {
    throw new AppError('Customer with this email already exists', 400);
  }

  const customer = await prisma.customer.create({
    data: {
      name,
      email,
      tier: customerTier,
    },
  });

  res.status(201).json(customer);
};

export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const { name, email, tier } = req.body;

  const data: any = {};
  if (name) data.name = name;
  if (email) data.email = email;
  if (tier && ['BRONZE', 'SILVER', 'GOLD'].includes(tier.toUpperCase())) {
    data.tier = tier.toUpperCase() as CustomerTier;
  }

  const updated = await prisma.customer.update({
    where: { id },
    data,
  });

  res.status(200).json(updated);
};

export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      quotations: {
        select: { id: true },
      },
    },
  });

  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  const quoteIds = customer.quotations.map((q: any) => q.id);

  await prisma.$transaction(async (tx: any) => {
    if (quoteIds.length > 0) {
      await tx.portalComment.deleteMany({ where: { quotationId: { in: quoteIds } } });
      await tx.dealHealthAlert.deleteMany({ where: { quotationId: { in: quoteIds } } });
      await tx.subscriptionBilling.deleteMany({ where: { quotationId: { in: quoteIds } } });
      await tx.warehouseSplit.deleteMany({ where: { quotationId: { in: quoteIds } } });
      await tx.auditLogEntry.deleteMany({ where: { quotationId: { in: quoteIds } } });
      await tx.approvalStep.deleteMany({ where: { quotationId: { in: quoteIds } } });
      await tx.quotationLine.deleteMany({ where: { quotationId: { in: quoteIds } } });
      await tx.quotation.deleteMany({ where: { id: { in: quoteIds } } });
    }
    await tx.customer.delete({ where: { id } });
  });

  res.status(200).json({
    message: 'Customer and associated data deleted successfully',
    deletedCustomerId: id,
    deletedQuotesCount: quoteIds.length,
  });
};

