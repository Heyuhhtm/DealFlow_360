export type UserRole = 'SALES_REP' | 'SALES_MANAGER' | 'FINANCE' | 'ADMIN';
export type CustomerTier = 'BRONZE' | 'SILVER' | 'GOLD';
export type ProductCategory = 'HARDWARE' | 'SERVICE' | 'SUBSCRIPTION';
export type QuotationStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'UNDER_NEGOTIATION' | 'CONFIRMED';
export type ApprovalRole = 'SALES_MANAGER' | 'FINANCE';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED';
export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type AlertType = 'STALLED' | 'DISCOUNT_ANOMALY' | 'DELIVERY_SLIPPAGE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  tier: CustomerTier;
}

export interface CustomerDirectoryItem {
  id: string;
  name: string;
  email: string;
  tier: CustomerTier;
  discountCeiling: number;
  totalQuotes: number;
  confirmedOrders: number;
  lifetimeValue: number;
  createdAt: string;
  quotations?: any[];
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  unitPrice: number;
  marginPercent: number;
  discountCeiling: number;
  billingCycle?: BillingCycle | null;
}

export interface QuotationLine {
  id: string;
  productId: string;
  productName: string;
  category: ProductCategory;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  lineTotal: number;
  discountCeiling: number;
}

export interface ApprovalStep {
  id: string;
  approverRole: ApprovalRole;
  status: ApprovalStatus;
  sequence: number;
  actedBy: string | null;
  actedAt: string | null;
  reason: string | null;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  detail: string | null;
  userName: string;
  createdAt: string;
}

export interface WarehouseSplit {
  id: string;
  warehouseId: string;
  warehouseName: string;
  quantityFulfilled: number;
  estimatedShipmentCost: number;
}

export interface SubscriptionBilling {
  id: string;
  productId: string;
  productName: string;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  amount: number;
}

export interface PortalComment {
  id: string;
  lineId: string | null;
  author: string;
  message: string;
  createdAt: string;
}

export interface Quotation {
  id: string;
  customer: {
    id: string;
    name: string;
    email?: string;
    tier: CustomerTier;
  };
  rep: {
    id: string;
    name: string;
  };
  status: QuotationStatus;
  blendedRiskScore: number;
  requiresManagerApproval: boolean;
  requiresFinanceApproval: boolean;
  subtotal: number;
  totalDiscount: number;
  total: number;
  marginPercent: number;
  lines: QuotationLine[];
  approvalSteps: ApprovalStep[];
  auditEntries: AuditLogEntry[];
  warehouseSplits: WarehouseSplit[];
  subscriptionBillings: SubscriptionBilling[];
  portalComments: PortalComment[];
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationListItem {
  id: string;
  customerName: string;
  customerTier: CustomerTier;
  total: number;
  status: QuotationStatus;
  blendedRiskScore: number;
  lastActivityAt: string;
  items?: {
    id: string;
    productId: string;
    productName: string;
    category?: string;
    quantity: number;
    unitPrice?: number;
    discountPercent?: number;
    lineTotal: number;
  }[];
}

export interface WarehouseStockItem {
  productId: string;
  productName: string;
  category?: string;
  unitPrice?: number;
  quantity: number;
}

export interface Warehouse {
  id: string;
  name: string;
  shippingCostBase: number;
  splitsCount?: number;
  createdAt?: string;
  stock: WarehouseStockItem[];
}

export interface DashboardKPIs {
  activeQuotations: number;
  pendingApprovals: number;
  avgDiscountGiven: number;
  atRiskDeals: number;
}

export interface DashboardSummary {
  kpis: DashboardKPIs;
  discountByRep: { repName: string; avgDiscount: number }[];
  volumeOverTime: { date: string; count: number }[];
  stalledDeals: { id: string; customerName: string; daysStalled: number; total: number }[];
  discountAnomalies: { quotationId: string; repName: string; discountGiven: number; repAverage: number }[];
}

export interface UpsellSuggestion {
  productId: string;
  productName: string;
  marginDelta: number;
  isPromoted: boolean;
}

export interface FulfillmentPreview {
  splits: {
    warehouseId: string;
    warehouseName: string;
    lines: { productId: string; quantity: number }[];
    estimatedShipmentCost: number;
  }[];
  backorders: { productId: string; quantity: number }[];
  totalEstimatedShipments: number;
  totalEstimatedCost: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  status: 'Paid' | 'Unpaid';
  dueDate: string;
  quotationId?: string;
}
