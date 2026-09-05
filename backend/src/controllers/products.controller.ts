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

export const createProduct = async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ error: { message: 'Not implemented (seeded directly)', statusCode: 501 } });
};

export const updateProduct = async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ error: { message: 'Not implemented (seeded directly)', statusCode: 501 } });
};

export const deleteProduct = async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ error: { message: 'Not implemented (seeded directly)', statusCode: 501 } });
};
