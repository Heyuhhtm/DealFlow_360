/**
 * DealFlow360 Fulfillment & Warehouse Auto-Split Engine
 */

export interface LineStockRequirement {
  productId: string;
  quantity: number;
}

export interface WarehouseWithStock {
  id: string;
  name: string;
  shippingCostBase: number;
  stock: {
    productId: string;
    quantity: number;
  }[];
}

export interface WarehouseSplitResult {
  splits: {
    warehouseId: string;
    warehouseName: string;
    lines: {
      productId: string;
      quantity: number;
    }[];
    estimatedShipmentCost: number;
  }[];
  backorders: {
    productId: string;
    quantity: number;
  }[];
  totalEstimatedShipments: number;
  totalEstimatedCost: number;
}

/**
 * Calculates optimal stock allocation across available warehouses.
 * Tries earlier warehouses first, splits remainder to subsequent warehouses,
 * and records backorders if stock is insufficient.
 */
export function calculateWarehouseSplit(
  quotationLines: LineStockRequirement[],
  warehouses: WarehouseWithStock[]
): WarehouseSplitResult {
  // Map warehouseId -> productId -> availableQuantity
  const inventoryMap = new Map<string, Map<string, number>>();
  for (const wh of warehouses) {
    const pMap = new Map<string, number>();
    for (const s of wh.stock) {
      pMap.set(s.productId, s.quantity);
    }
    inventoryMap.set(wh.id, pMap);
  }

  // Track allocation per warehouse: warehouseId -> productId -> allocatedQuantity
  const warehouseAllocations = new Map<string, Map<string, number>>();
  for (const wh of warehouses) {
    warehouseAllocations.set(wh.id, new Map<string, number>());
  }

  const backorders: { productId: string; quantity: number }[] = [];

  for (const line of quotationLines) {
    let remainingToFulfill = line.quantity;

    for (const wh of warehouses) {
      if (remainingToFulfill <= 0) break;

      const pStock = inventoryMap.get(wh.id)?.get(line.productId) || 0;
      if (pStock > 0) {
        const canTake = Math.min(pStock, remainingToFulfill);
        const currentAllocated = warehouseAllocations.get(wh.id)?.get(line.productId) || 0;
        warehouseAllocations.get(wh.id)?.set(line.productId, currentAllocated + canTake);

        inventoryMap.get(wh.id)?.set(line.productId, pStock - canTake);
        remainingToFulfill -= canTake;
      }
    }

    if (remainingToFulfill > 0) {
      backorders.push({
        productId: line.productId,
        quantity: remainingToFulfill,
      });
    }
  }

  const splits: WarehouseSplitResult['splits'] = [];
  let totalEstimatedCost = 0;

  for (const wh of warehouses) {
    const allocations = warehouseAllocations.get(wh.id);
    if (!allocations) continue;

    const lines: { productId: string; quantity: number }[] = [];
    let totalUnitsShipped = 0;

    for (const [productId, qty] of allocations.entries()) {
      if (qty > 0) {
        lines.push({ productId, quantity: qty });
        totalUnitsShipped += qty;
      }
    }

    if (lines.length > 0) {
      // Mock shipping formula: base cost + $0.50 per unit shipped
      const estimatedShipmentCost = Number((wh.shippingCostBase + 0.5 * totalUnitsShipped).toFixed(2));
      totalEstimatedCost += estimatedShipmentCost;

      splits.push({
        warehouseId: wh.id,
        warehouseName: wh.name,
        lines,
        estimatedShipmentCost,
      });
    }
  }

  return {
    splits,
    backorders,
    totalEstimatedShipments: splits.length,
    totalEstimatedCost: Number(totalEstimatedCost.toFixed(2)),
  };
}

export class FulfillmentService {
  calculateWarehouseSplit = calculateWarehouseSplit;
}

export const fulfillmentService = new FulfillmentService();
