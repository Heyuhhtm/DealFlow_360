import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../lib/errors';
import { ProductCategory, BillingCycle } from '@prisma/client';
import { z } from 'zod';

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
    include: {
      warehouseStock: {
        select: {
          quantity: true,
          warehouse: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  const enriched = products.map((p) => {
    const totalStock = p.warehouseStock ? p.warehouseStock.reduce((acc, s) => acc + s.quantity, 0) : 0;
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      unitPrice: p.unitPrice,
      marginPercent: p.marginPercent,
      discountCeiling: p.discountCeiling,
      billingCycle: p.billingCycle,
      createdAt: p.createdAt,
      totalStock,
      warehouseStock: p.warehouseStock,
    };
  });

  res.status(200).json(enriched);
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      warehouseStock: {
        select: {
          quantity: true,
          warehouse: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const totalStock = product.warehouseStock ? product.warehouseStock.reduce((acc, s) => acc + s.quantity, 0) : 0;

  res.status(200).json({
    id: product.id,
    name: product.name,
    category: product.category,
    unitPrice: product.unitPrice,
    marginPercent: product.marginPercent,
    discountCeiling: product.discountCeiling,
    billingCycle: product.billingCycle,
    createdAt: product.createdAt,
    totalStock,
    warehouseStock: product.warehouseStock,
  });
};

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
  let totalStock = 0;
  let warehouseStock: any[] = [];
  if (data.category === 'HARDWARE') {
    const warehouses = await prisma.warehouse.findMany();
    if (warehouses.length > 0) {
      const createdStocks = await Promise.all(
        warehouses.map((wh) =>
          prisma.warehouseStock.create({
            data: {
              warehouseId: wh.id,
              productId: product.id,
              quantity: data.initialStock || 50,
            },
            include: {
              warehouse: { select: { id: true, name: true } },
            },
          }).catch(() => null)
        )
      );
      warehouseStock = createdStocks.filter(Boolean);
      totalStock = warehouseStock.reduce((acc, s) => acc + (s?.quantity || 0), 0);
    }
  }

  res.status(201).json({ ...product, totalStock, warehouseStock });
};

export const updateProduct = async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ error: { message: 'Not implemented', statusCode: 501 } });
};

export const deleteProduct = async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ error: { message: 'Not implemented', statusCode: 501 } });
};
