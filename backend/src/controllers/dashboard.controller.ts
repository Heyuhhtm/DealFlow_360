import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { subDays, format, differenceInDays } from 'date-fns';
import { QuotationStatus } from '@prisma/client';

export const getDashboardMetrics = async (req: Request, res: Response): Promise<void> => {
  const periodDaysParam = req.query.periodDays;
  const periodDays = periodDaysParam ? parseInt(periodDaysParam as string, 10) || 30 : 30;

  const startDate = subDays(new Date(), periodDays);
  const stalledThresholdDate = subDays(new Date(), 5);

  // 1. Fetch all quotations in the period
  const periodQuotations = await prisma.quotation.findMany({
    where: {
      createdAt: { gte: startDate },
    },
    include: {
      customer: true,
      rep: true,
      lines: true,
    },
  });

  // 2. Fetch all quotations historically for anomaly calculations and stalled deals
  const allQuotations = await prisma.quotation.findMany({
    include: {
      customer: true,
      rep: true,
      lines: true,
    },
  });

  // KPIs
  const activeQuotations = allQuotations.filter(
    (q) => q.status !== QuotationStatus.REJECTED && q.status !== QuotationStatus.CONFIRMED
  ).length;

  const pendingApprovals = allQuotations.filter(
    (q) => q.status === QuotationStatus.PENDING_APPROVAL
  ).length;

  const atRiskDeals = allQuotations.filter(
    (q) =>
      q.blendedRiskScore > 5 &&
      q.status !== QuotationStatus.CONFIRMED &&
      q.status !== QuotationStatus.REJECTED
  ).length;

  // Average discount in the period
  const periodLines = periodQuotations.flatMap((q) => q.lines);
  let avgDiscountGiven = 0;
  if (periodLines.length > 0) {
    const totalDiscountSum = periodLines.reduce((acc, l) => acc + l.discountPercent, 0);
    avgDiscountGiven = Number((totalDiscountSum / periodLines.length).toFixed(2));
  }

  // Discount by Rep in the period
  const repDiscountsMap = new Map<string, { repName: string; discounts: number[] }>();
  for (const q of periodQuotations) {
    const repName = q.rep.name;
    const existing = repDiscountsMap.get(q.repId) || { repName, discounts: [] };
    for (const line of q.lines) {
      existing.discounts.push(line.discountPercent);
    }
    repDiscountsMap.set(q.repId, existing);
  }

  const discountByRep = Array.from(repDiscountsMap.values()).map((r) => {
    const avg = r.discounts.length > 0 ? r.discounts.reduce((a, b) => a + b, 0) / r.discounts.length : 0;
    return {
      repName: r.repName,
      avgDiscount: Number(avg.toFixed(2)),
    };
  });

  // Volume over time (by day) in period
  const volumeMap = new Map<string, number>();
  for (let i = periodDays; i >= 0; i--) {
    const dateKey = format(subDays(new Date(), i), 'yyyy-MM-dd');
    volumeMap.set(dateKey, 0);
  }

  for (const q of periodQuotations) {
    const dateKey = format(q.createdAt, 'yyyy-MM-dd');
    if (volumeMap.has(dateKey)) {
      volumeMap.set(dateKey, (volumeMap.get(dateKey) || 0) + 1);
    }
  }

  const volumeOverTime = Array.from(volumeMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  // Stalled Deals: lastActivityAt older than 5 days and status not in [CONFIRMED, REJECTED]
  const stalledDeals = allQuotations
    .filter(
      (q) =>
        q.lastActivityAt < stalledThresholdDate &&
        q.status !== QuotationStatus.CONFIRMED &&
        q.status !== QuotationStatus.REJECTED
    )
    .map((q) => ({
      id: q.id,
      customerName: q.customer.name,
      daysStalled: differenceInDays(new Date(), q.lastActivityAt),
      total: q.total,
    }));

  // Discount Anomalies:
  // Compute historical average discount per rep, then find any quotation line where rep gave discount > 1.5x rep's own average
  const historicalRepDiscounts = new Map<string, { repName: string; discounts: number[] }>();
  for (const q of allQuotations) {
    const existing = historicalRepDiscounts.get(q.repId) || { repName: q.rep.name, discounts: [] };
    for (const line of q.lines) {
      existing.discounts.push(line.discountPercent);
    }
    historicalRepDiscounts.set(q.repId, existing);
  }

  const repHistoricalAverages = new Map<string, number>();
  for (const [repId, data] of historicalRepDiscounts.entries()) {
    const avg = data.discounts.length > 0 ? data.discounts.reduce((a, b) => a + b, 0) / data.discounts.length : 0;
    repHistoricalAverages.set(repId, avg);
  }

  const discountAnomalies: {
    quotationId: string;
    repName: string;
    discountGiven: number;
    repAverage: number;
  }[] = [];

  for (const q of allQuotations) {
    const repAvg = repHistoricalAverages.get(q.repId) || 0;
    if (repAvg > 0) {
      for (const line of q.lines) {
        if (line.discountPercent > 1.5 * repAvg && line.discountPercent > 0) {
          discountAnomalies.push({
            quotationId: q.id,
            repName: q.rep.name,
            discountGiven: line.discountPercent,
            repAverage: Number(repAvg.toFixed(2)),
          });
        }
      }
    }
  }

  res.status(200).json({
    kpis: {
      activeQuotations,
      pendingApprovals,
      avgDiscountGiven,
      atRiskDeals,
    },
    discountByRep,
    volumeOverTime,
    stalledDeals,
    discountAnomalies,
  });
};
