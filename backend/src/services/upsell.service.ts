import prisma from '../lib/prisma';

export interface UpsellSuggestion {
  productId: string;
  productName: string;
  marginDelta: number;
  isPromoted: boolean;
}

const PAIRING_MAP: Record<string, string[]> = {
  'Laptop Pro 15': ['Wireless Mouse', '4K Ultra Monitor 27"', 'Priority Support Plan'],
  'Wireless Mouse': ['Laptop Pro 15', '4K Ultra Monitor 27"'],
  '4K Ultra Monitor 27"': ['Laptop Pro 15', 'Wireless Mouse'],
  'Onboarding Setup & Training': ['Priority Support Plan', 'Custom Integration Engineering'],
  'Priority Support Plan': ['Onboarding Setup & Training', 'Custom Integration Engineering'],
  'Custom Integration Engineering': ['Onboarding Setup & Training', 'Priority Support Plan'],
  'Cloud Storage Plan (1TB)': ['Analytics Insights Add-on', 'Premium Support Subscription (Annual)'],
  'Analytics Insights Add-on': ['Cloud Storage Plan (1TB)', 'Premium Support Subscription (Annual)'],
  'Premium Support Subscription (Annual)': ['Analytics Insights Add-on', 'Cloud Storage Plan (1TB)'],
};

const PROMOTED_PRODUCTS = new Set(['Priority Support Plan', 'Analytics Insights Add-on']);

export async function getUpsellSuggestionsForQuotation(quotationId: string): Promise<UpsellSuggestion[]> {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      lines: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!quotation) {
    return [];
  }

  const existingProductIds = new Set(quotation.lines.map((l) => l.productId));
  const existingProductNames = new Set(quotation.lines.map((l) => l.product.name));

  // Find paired product names
  const candidateNames = new Set<string>();
  for (const line of quotation.lines) {
    const pairings = PAIRING_MAP[line.product.name] || [];
    for (const paired of pairings) {
      if (!existingProductNames.has(paired)) {
        candidateNames.add(paired);
      }
    }
  }

  // If no pairings found, fall back to all catalog items not in quotation
  let candidateProducts;
  if (candidateNames.size > 0) {
    candidateProducts = await prisma.product.findMany({
      where: {
        name: { in: Array.from(candidateNames) },
        id: { notIn: Array.from(existingProductIds) },
      },
    });
  } else {
    candidateProducts = await prisma.product.findMany({
      where: {
        id: { notIn: Array.from(existingProductIds) },
      },
      take: 5,
    });
  }

  const suggestions: UpsellSuggestion[] = candidateProducts.map((prod) => {
    // marginDelta = unitPrice * (marginPercent / 100)
    const marginDollars = prod.unitPrice * (prod.marginPercent / 100);
    return {
      productId: prod.id,
      productName: prod.name,
      marginDelta: Number(marginDollars.toFixed(2)),
      isPromoted: PROMOTED_PRODUCTS.has(prod.name),
    };
  });

  // Sort by marginDelta descending and take top 3
  suggestions.sort((a, b) => b.marginDelta - a.marginDelta);
  return suggestions.slice(0, 3);
}
