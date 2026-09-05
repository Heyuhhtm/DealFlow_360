/**
 * DealFlow360 Pricing Engine
 */

export interface PricingLineInput {
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

export interface MarginLineInput extends PricingLineInput {
  marginPercent: number;
}

/**
 * Returns line total after discount: quantity * unitPrice * (1 - discountPercent/100)
 */
export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  discountPercent: number
): number {
  const effectiveDiscount = Math.max(0, Math.min(100, discountPercent));
  const total = quantity * unitPrice * (1 - effectiveDiscount / 100);
  return Number(total.toFixed(2));
}

/**
 * Computes subtotal, totalDiscount, and total for an array of lines.
 */
export function calculateOrderTotals(lines: PricingLineInput[]): {
  subtotal: number;
  totalDiscount: number;
  total: number;
} {
  let subtotal = 0;
  let total = 0;

  for (const line of lines) {
    const rawLineSubtotal = line.quantity * line.unitPrice;
    const lineNet = calculateLineTotal(line.quantity, line.unitPrice, line.discountPercent);
    subtotal += rawLineSubtotal;
    total += lineNet;
  }

  const totalDiscount = subtotal - total;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
}

/**
 * Computes weighted average effective margin across all lines.
 * effectiveMargin = marginPercent - discountPercent
 * Weighted by each line's net revenue contribution.
 */
export function calculateOrderMargin(lines: MarginLineInput[]): number {
  let totalRevenue = 0;
  let weightedMarginSum = 0;

  for (const line of lines) {
    const lineNet = calculateLineTotal(line.quantity, line.unitPrice, line.discountPercent);
    const effectiveMargin = line.marginPercent - line.discountPercent;

    totalRevenue += lineNet;
    weightedMarginSum += effectiveMargin * lineNet;
  }

  if (totalRevenue <= 0) {
    return 0;
  }

  const blendedMargin = weightedMarginSum / totalRevenue;
  return Number(blendedMargin.toFixed(2));
}

export class PricingService {
  calculateLineTotal = calculateLineTotal;
  calculateOrderTotals = calculateOrderTotals;
  calculateOrderMargin = calculateOrderMargin;
}

export const pricingService = new PricingService();
