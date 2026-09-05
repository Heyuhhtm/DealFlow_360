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
              category: true,
              unitPrice: true,
            },
          },
        },
      },
      _count: {
        select: {
          splits: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  const allProducts = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      unitPrice: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Ensure every product is represented in each warehouse's stock array (with quantity 0 if not yet stocked)
  const response = warehouses.map((w: any) => {
    const stockMap = new Map(w.stock.map((s: any) => [s.productId, s.quantity]));

    const fullStock = allProducts.map((p) => ({
      productId: p.id,
      productName: p.name,
      category: p.category,
      unitPrice: p.unitPrice,
      quantity: stockMap.get(p.id) ?? 0,
    }));

    return {
      id: w.id,
      name: w.name,
      shippingCostBase: w.shippingCostBase,
      splitsCount: w._count?.splits || 0,
      createdAt: w.createdAt,
      stock: fullStock,
    };
  });

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
              category: true,
              unitPrice: true,
            },
          },
        },
      },
      _count: {
        select: {
          splits: true,
        },
      },
    },
  });

  if (!warehouse) {
    throw new AppError('Warehouse not found', 404);
  }

  // Fetch all products so we can include zero-stock products
  const allProducts = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      unitPrice: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  const stockMap = new Map((warehouse.stock || []).map((s: any) => [s.productId, s.quantity]));

  const fullStock = allProducts.map((p) => ({
    productId: p.id,
    productName: p.name,
    category: p.category,
    unitPrice: p.unitPrice,
    quantity: stockMap.get(p.id) ?? 0,
  }));

  res.status(200).json({
    id: warehouse.id,
    name: warehouse.name,
    shippingCostBase: warehouse.shippingCostBase,
    splitsCount: warehouse._count?.splits || 0,
    createdAt: warehouse.createdAt,
    stock: fullStock,
  });
};

export const createWarehouse = async (req: Request, res: Response): Promise<void> => {
  const { name, shippingCostBase, initialStock } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new AppError('Warehouse name is required', 400);
  }

  const shippingCost = typeof shippingCostBase === 'number' && shippingCostBase >= 0
    ? shippingCostBase
    : 10;

  const result = await prisma.$transaction(async (tx: any) => {
    const warehouse = await tx.warehouse.create({
      data: {
        name: name.trim(),
        shippingCostBase: shippingCost,
      },
    });

    if (Array.isArray(initialStock) && initialStock.length > 0) {
      const validStocks = initialStock
        .filter((s) => s && s.productId && typeof s.quantity === 'number')
        .map((s) => ({
          warehouseId: warehouse.id,
          productId: s.productId,
          quantity: Math.max(0, Math.floor(s.quantity)),
        }));

      if (validStocks.length > 0) {
        await tx.warehouseStock.createMany({
          data: validStocks,
          skipDuplicates: true,
        });
      }
    }

    return warehouse;
  });

  // Re-fetch with full breakdown
  const created: any = await prisma.warehouse.findUnique({
    where: { id: result.id },
    include: {
      stock: {
        include: {
          product: {
            select: { id: true, name: true, category: true, unitPrice: true },
          },
        },
      },
    },
  });

  res.status(201).json(created);
};

export const updateWarehouse = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const { name, shippingCostBase } = req.body;

  const existing = await prisma.warehouse.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Warehouse not found', 404);
  }

  const data: any = {};
  if (typeof name === 'string' && name.trim()) {
    data.name = name.trim();
  }
  if (typeof shippingCostBase === 'number' && shippingCostBase >= 0) {
    data.shippingCostBase = shippingCostBase;
  }

  const updated = await prisma.warehouse.update({
    where: { id },
    data,
  });

  res.status(200).json(updated);
};

export const updateWarehouseStock = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const { updates } = req.body;

  const warehouse = await prisma.warehouse.findUnique({ where: { id } });
  if (!warehouse) {
    throw new AppError('Warehouse not found', 404);
  }

  if (!Array.isArray(updates)) {
    throw new AppError('updates must be an array of { productId, quantity } objects', 400);
  }

  await prisma.$transaction(async (tx: any) => {
    for (const item of updates) {
      if (!item.productId || typeof item.quantity !== 'number') continue;

      const qty = Math.max(0, Math.floor(item.quantity));

      await tx.warehouseStock.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: id,
            productId: item.productId,
          },
        },
        update: {
          quantity: qty,
        },
        create: {
          warehouseId: id,
          productId: item.productId,
          quantity: qty,
        },
      });
    }
  });

  // Re-fetch updated warehouse
  const updatedWarehouse: any = await prisma.warehouse.findUnique({
    where: { id },
    include: {
      stock: {
        include: {
          product: {
            select: { id: true, name: true, category: true, unitPrice: true },
          },
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    warehouse: updatedWarehouse,
  });
};

export const deleteWarehouse = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);

  const warehouse = await prisma.warehouse.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          splits: true,
        },
      },
    },
  });

  if (!warehouse) {
    throw new AppError('Warehouse not found', 404);
  }

  // Spec: Only allow deletion if the warehouse has no WarehouseSplit records referencing it
  if (warehouse._count?.splits > 0) {
    throw new AppError(
      'Cannot delete warehouse because it is referenced in historical fulfillment splits.',
      400
    );
  }

  await prisma.$transaction(async (tx: any) => {
    await tx.warehouseStock.deleteMany({
      where: { warehouseId: id },
    });
    await tx.warehouse.delete({
      where: { id },
    });
  });

  res.status(200).json({
    message: 'Warehouse deleted successfully',
    deletedWarehouseId: id,
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
