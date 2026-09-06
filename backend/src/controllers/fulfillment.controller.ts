import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../lib/errors';
import { calculateWarehouseSplit } from '../services/fulfillment.service';
import { z } from 'zod';
import { getIO } from '../lib/socket';

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
    // 1. If stock was previously reserved for this quotation, replenish it before applying new split
    const priorReservation = await tx.auditLogEntry.findFirst({
      where: {
        quotationId: id,
        action: 'STOCK_RESERVED',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (priorReservation && priorReservation.detail) {
      try {
        const previousAllocations: {
          warehouseId: string;
          lines: { productId: string; quantity: number }[];
        }[] = JSON.parse(priorReservation.detail);

        for (const prevSplit of previousAllocations) {
          for (const line of prevSplit.lines) {
            const stockRecord = await tx.warehouseStock.findUnique({
              where: {
                warehouseId_productId: {
                  warehouseId: prevSplit.warehouseId,
                  productId: line.productId,
                },
              },
            });

            if (stockRecord) {
              await tx.warehouseStock.update({
                where: {
                  warehouseId_productId: {
                    warehouseId: prevSplit.warehouseId,
                    productId: line.productId,
                  },
                },
                data: {
                  quantity: stockRecord.quantity + line.quantity,
                },
              });
            }
          }
        }
      } catch (e) {
        console.warn('[Fulfillment] Could not parse prior reservation details:', e);
      }
    }

    // 2. Delete existing splits
    await tx.warehouseSplit.deleteMany({
      where: { quotationId: id },
    });

    // 3. Create new splits and decrement warehouse stock
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

      // Deduct allocated units directly from warehouse stock
      for (const line of split.lines) {
        const stockRecord = await tx.warehouseStock.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: split.warehouseId,
              productId: line.productId,
            },
          },
        });

        if (stockRecord) {
          const newQty = Math.max(0, stockRecord.quantity - line.quantity);
          await tx.warehouseStock.update({
            where: {
              warehouseId_productId: {
                warehouseId: split.warehouseId,
                productId: line.productId,
              },
            },
            data: {
              quantity: newQty,
            },
          });
        }
      }
    }

    // 4. Record stock reservation audit entry
    await tx.auditLogEntry.create({
      data: {
        quotationId: id,
        userId,
        action: 'STOCK_RESERVED',
        detail: JSON.stringify(
          splitsToPersist.map((s) => ({
            warehouseId: s.warehouseId,
            lines: s.lines,
          }))
        ),
      },
    });

    // 5. Write fulfillment confirmation audit entry
    await tx.auditLogEntry.create({
      data: {
        quotationId: id,
        userId,
        action: 'FULFILLMENT_CONFIRMED',
        detail: `Fulfillment split confirmed (${isManual ? 'Manual Override' : 'Auto-Calculated'}). Warehouses used: ${splitsToPersist.length}. Stock reserved & deducted from inventory.`,
      },
    });

    await tx.quotation.update({
      where: { id },
      data: { lastActivityAt: new Date() },
    });
  });

  const io = getIO();
  if (io) {
    io.emit('stock-updated', {
      quotationId: id,
      splits: splitsToPersist,
      timestamp: new Date(),
    });
  }

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
