import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../lib/errors';

export const getWarehouses = async (_req: Request, res: Response): Promise<void> => {
  const warehouses = await prisma.warehouse.findMany({
    include: {
      stock: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  const response = warehouses.map((w: any) => ({
    id: w.id,
    name: w.name,
    shippingCostBase: w.shippingCostBase,
    stock: (w.stock || []).map((s: any) => ({
      productId: s.productId,
      productName: s.product ? s.product.name : '',
      quantity: s.quantity,
    })),
  }));

  res.status(200).json(response);
};

export const getWarehouseById = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);

  const warehouse: any = await prisma.warehouse.findUnique({
    where: { id },
    include: {
      stock: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!warehouse) {
    throw new AppError('Warehouse not found', 404);
  }

  res.status(200).json({
    id: warehouse.id,
    name: warehouse.name,
    shippingCostBase: warehouse.shippingCostBase,
    stock: (warehouse.stock || []).map((s: any) => ({
      productId: s.productId,
      productName: s.product ? s.product.name : '',
      quantity: s.quantity,
    })),
  });
};

export const replenishStock = async (req: Request, res: Response): Promise<void> => {
  const warehouseId = String(req.params.id);
  const { productId, quantityDelta } = req.body;

  if (!productId || typeof quantityDelta !== 'number') {
    throw new AppError('productId and quantityDelta (number) are required', 400);
  }

  const existingStock = await prisma.warehouseStock.findUnique({
    where: {
      warehouseId_productId: {
        warehouseId,
        productId,
      },
    },
  });

  let updated;
  if (existingStock) {
    updated = await prisma.warehouseStock.update({
      where: { id: existingStock.id },
      data: { quantity: Math.max(0, existingStock.quantity + quantityDelta) },
    });
  } else {
    updated = await prisma.warehouseStock.create({
      data: {
        warehouseId,
        productId,
        quantity: Math.max(0, quantityDelta),
      },
    });
  }

  res.status(200).json({ success: true, stock: updated });
};

export const createWarehouse = async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ error: { message: 'Not implemented', statusCode: 501 } });
};

export const updateWarehouse = async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ error: { message: 'Not implemented', statusCode: 501 } });
};

export const deleteWarehouse = async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ error: { message: 'Not implemented', statusCode: 501 } });
};
