import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../lib/errors';
import { ProductCategory } from '@prisma/client';

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  const category = req.query.category as string | undefined;

  const whereClause: any = {};
  if (category && typeof category === 'string') {
    const upper = category.toUpperCase();
    if (Object.values(ProductCategory).includes(upper as ProductCategory)) {
      whereClause.category = upper as ProductCategory;
    }
  }

  const products = await prisma.product.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      category: true,
      unitPrice: true,
      marginPercent: true,
      discountCeiling: true,
      billingCycle: true,
      createdAt: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  res.status(200).json(products);
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      category: true,
      unitPrice: true,
      marginPercent: true,
      discountCeiling: true,
      billingCycle: true,
      createdAt: true,
    },
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  res.status(200).json(product);
};

import { z } from 'zod';
import { BillingCycle } from '@prisma/client';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  category: z.nativeEnum(ProductCategory),
  unitPrice: z.number().positive('Unit price must be positive'),
  marginPercent: z.number().min(0).max(100).default(50),
  discountCeiling: z.number().min(0).max(100).default(15),
  billingCycle: z.nativeEnum(BillingCycle).optional().nullable(),
  initialStock: z.number().int().min(0).optional().default(50),
});

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  const data = createProductSchema.parse(req.body);

  const product = await prisma.product.create({
    data: {
      name: data.name,
      category: data.category,
      unitPrice: data.unitPrice,
      marginPercent: data.marginPercent,
      discountCeiling: data.discountCeiling,
      billingCycle: data.category === 'SUBSCRIPTION' ? data.billingCycle || BillingCycle.MONTHLY : null,
    },
  });

  // If HARDWARE, automatically allocate warehouse stock across depots
  if (data.category === 'HARDWARE') {
    const warehouses = await prisma.warehouse.findMany();
    if (warehouses.length > 0) {
      await Promise.all(
        warehouses.map((wh) =>
          prisma.warehouseStock.create({
            data: {
              warehouseId: wh.id,
              productId: product.id,
              quantity: data.initialStock || 50,
            },
          }).catch(() => {})
        )
      );
    }
  }

  res.status(201).json(product);
};

export const updateProduct = async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ error: { message: 'Not implemented', statusCode: 501 } });
};

export const deleteProduct = async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ error: { message: 'Not implemented', statusCode: 501 } });
};
