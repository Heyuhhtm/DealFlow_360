/**
 * DealFlow360 Risk Engine
 */

export interface RiskLineInput {
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountCeiling: number;
}

/**
 * Calculates the blended revenue-weighted discount overage score across all lines.
 * For each line:
 *  - overage = max(0, discountPercent - discountCeiling)
 *  - lineWeight = quantity * unitPrice
 *  - weightedOverage = overage * lineWeight
 * blendedScore = sum(weightedOverage) / sum(lineWeight)
 */
export function calculateBlendedRiskScore(lines: RiskLineInput[]): number {
  let totalLineWeight = 0;
  let totalWeightedOverage = 0;

  for (const line of lines) {
    const overage = Math.max(0, line.discountPercent - line.discountCeiling);
    const lineWeight = line.quantity * line.unitPrice;

    totalLineWeight += lineWeight;
    totalWeightedOverage += overage * lineWeight;
  }

  if (totalLineWeight <= 0) {
    return 0;
  }

  const score = totalWeightedOverage / totalLineWeight;
  return Number(score.toFixed(2));
}

/**
 * Approval requirement thresholds:
 * - blendedScore > 0: Requires Sales Manager Approval (sequence 1)
 * - blendedScore > 5: Requires Finance Approval (sequence 2)
 */
export function determineApprovalRequirements(blendedScore: number): {
  requiresManagerApproval: boolean;
  requiresFinanceApproval: boolean;
} {
  return {
    requiresManagerApproval: blendedScore > 0,
    requiresFinanceApproval: blendedScore > 5,
  };
}

export class RiskService {
  calculateBlendedRiskScore = calculateBlendedRiskScore;
  determineApprovalRequirements = determineApprovalRequirements;
}

export const riskService = new RiskService();
