import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../lib/errors';
import { calculateWarehouseSplit } from '../services/fulfillment.service';
import { z } from 'zod';

export const confirmFulfillmentSchema = z.object({
  useCalculated: z.boolean().optional(),
  manualSplit: z
    .array(
      z.object({
        warehouseId: z.string().uuid(),
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .optional(),
});

export const calculateFulfillmentPreview = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      lines: true,
    },
  });

  if (!quotation) {
    throw new AppError('Quotation not found', 404);
  }

  const warehouses = await prisma.warehouse.findMany({
    include: {
      stock: true,
    },
    orderBy: {
      shippingCostBase: 'asc', // Prioritize lowest base shipping cost warehouse first
    },
  });

  const linesInput = quotation.lines.map((l) => ({
    productId: l.productId,
    quantity: l.quantity,
  }));

  const warehouseInput = warehouses.map((w) => ({
    id: w.id,
    name: w.name,
    shippingCostBase: w.shippingCostBase,
    stock: w.stock.map((s) => ({
      productId: s.productId,
      quantity: s.quantity,
    })),
  }));

  const result = calculateWarehouseSplit(linesInput, warehouseInput);

  res.status(200).json(result);
};

export const confirmFulfillment = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const { manualSplit } = confirmFulfillmentSchema.parse(req.body);
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!quotation) {
    throw new AppError('Quotation not found', 404);
  }

  const warehouses = await prisma.warehouse.findMany({
    include: { stock: true },
    orderBy: { shippingCostBase: 'asc' },
  });

  let splitsToPersist: {
    warehouseId: string;
    warehouseName: string;
    lines: { productId: string; quantity: number }[];
    estimatedShipmentCost: number;
  }[] = [];

  let isManual = false;

  if (manualSplit && manualSplit.length > 0) {
    isManual = true;
    const warehouseMap = new Map(warehouses.map((w) => [w.id, w]));

    // Group manualSplit by warehouseId
    const grouped = new Map<string, { productId: string; quantity: number }[]>();
    for (const item of manualSplit) {
      const list = grouped.get(item.warehouseId) || [];
      list.push({ productId: item.productId, quantity: item.quantity });
      grouped.set(item.warehouseId, list);
    }

    for (const [whId, lines] of grouped.entries()) {
      const wh = warehouseMap.get(whId);
      const totalUnits = lines.reduce((acc, curr) => acc + curr.quantity, 0);
      const estimatedShipmentCost = wh ? Number((wh.shippingCostBase + 0.5 * totalUnits).toFixed(2)) : 0;

      splitsToPersist.push({
        warehouseId: whId,
        warehouseName: wh?.name || 'Warehouse',
        lines,
        estimatedShipmentCost,
      });
    }
  } else {
    // Calculate auto-split
    const linesInput = quotation.lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
    }));
    const warehouseInput = warehouses.map((w) => ({
      id: w.id,
      name: w.name,
      shippingCostBase: w.shippingCostBase,
      stock: w.stock.map((s) => ({
        productId: s.productId,
        quantity: s.quantity,
      })),
    }));

    const result = calculateWarehouseSplit(linesInput, warehouseInput);
    splitsToPersist = result.splits;
  }

  // Persist into database in transaction
  await prisma.$transaction(async (tx) => {
    // Delete existing splits
    await tx.warehouseSplit.deleteMany({
      where: { quotationId: id },
    });

    // Create new splits
    for (const split of splitsToPersist) {
      const totalUnits = split.lines.reduce((acc, l) => acc + l.quantity, 0);
      await tx.warehouseSplit.create({
        data: {
          quotationId: id,
          warehouseId: split.warehouseId,
          quantityFulfilled: totalUnits,
          estimatedShipmentCost: split.estimatedShipmentCost,
        },
      });
    }

    // Write audit entry
    await tx.auditLogEntry.create({
      data: {
        quotationId: id,
        userId,
        action: 'FULFILLMENT_CONFIRMED',
        detail: `Fulfillment split confirmed (${isManual ? 'Manual Override' : 'Auto-Calculated'}). Warehouses used: ${splitsToPersist.length}`,
      },
    });

    await tx.quotation.update({
      where: { id },
      data: { lastActivityAt: new Date() },
    });
  });

  res.status(200).json(splitsToPersist);
};

export const getFulfillment = async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id);

  const splits = await prisma.warehouseSplit.findMany({
    where: { quotationId: id },
    include: {
      warehouse: true,
    },
  });

  const response = splits.map((s) => ({
    id: s.id,
    warehouseId: s.warehouseId,
    warehouseName: s.warehouse.name,
    quantityFulfilled: s.quantityFulfilled,
    estimatedShipmentCost: s.estimatedShipmentCost,
  }));

  res.status(200).json(response);
};
