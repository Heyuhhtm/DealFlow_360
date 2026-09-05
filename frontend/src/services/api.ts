import axios from 'axios';
import {
  Quotation,
  QuotationListItem,
  Product,
  Warehouse,
  DashboardSummary,
  UpsellSuggestion,
  FulfillmentPreview,
  ApprovalStep,
  AuditLogEntry,
  User,
  CustomerDirectoryItem,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for attaching auth tokens (internal user token or customer portal token)
api.interceptors.request.use((config) => {
  const isPortalRequest = config.url?.includes('/portal');
  const token = isPortalRequest
    ? localStorage.getItem('dealflow360_portal_token')
    : localStorage.getItem('dealflow360_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    return res.data;
  },
  signup: async (data: { name: string; email: string; password: string; role: string }) => {
    const res = await api.post<{ token: string; user: User }>('/auth/signup', data);
    return res.data;
  },
  portalMagicLink: async (email: string) => {
    const res = await api.post<{ magicLinkToken: string }>('/auth/portal-magic-link', { email });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get<{ user: User }>('/auth/me');
    return res.data.user;
  },
};

// Quotations API
export const quotationsApi = {
  list: async (params?: { status?: string; repId?: string }) => {
    const res = await api.get<QuotationListItem[]>('/quotations', { params });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get<Quotation>(`/quotations/${id}`);
    return res.data;
  },
  create: async (data: {
    customerId: string;
    lines: { productId: string; quantity: number; discountPercent: number }[];
    submitForApproval?: boolean;
  }) => {
    const res = await api.post<Quotation>('/quotations', data);
    return res.data;
  },
  update: async (
    id: string,
    data: {
      lines?: { productId: string; quantity: number; discountPercent: number }[];
      status?: string;
    }
  ) => {
    const res = await api.patch<Quotation>(`/quotations/${id}`, data);
    return res.data;
  },
  submitForApproval: async (id: string) => {
    const res = await api.post<Quotation>(`/quotations/${id}/submit-for-approval`);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/quotations/${id}`);
    return res.data;
  },
  getPdf: async (id: string, mode: 'view' | 'download' = 'view') => {
    const res = await api.get(`/quotations/${id}/pdf`, {
      params: { mode },
      responseType: 'blob',
    });
    return res.data as Blob;
  },
  sendEmail: async (id: string) => {
    const res = await api.post<{ success: boolean; previewUrl: string; message: string }>(
      `/quotations/${id}/send-email`
    );
    return res.data;
  },
  addComment: async (id: string, data: { lineId?: string; message: string }) => {
    const res = await api.post(`/quotations/${id}/comments`, data);
    return res.data;
  },
};

// Approvals API
export const approvalsApi = {
  list: async (quotationId: string) => {
    const res = await api.get<ApprovalStep[]>(`/quotations/${quotationId}/approvals`);
    return res.data;
  },
  takeAction: async (
    quotationId: string,
    stepId: string,
    data: { action: 'APPROVE' | 'REJECT' | 'RETURN'; reason?: string }
  ) => {
    const res = await api.post<{ step: ApprovalStep; quotationStatus: string }>(
      `/quotations/${quotationId}/approvals/${stepId}/action`,
      data
    );
    return res.data;
  },
  getAuditLog: async (quotationId: string) => {
    const res = await api.get<AuditLogEntry[]>(`/quotations/${quotationId}/audit-log`);
    return res.data;
  },
};

// Products & Warehouses API
export const productsApi = {
  list: async (category?: string) => {
    const res = await api.get<Product[]>('/products', { params: { category } });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get<Product>(`/products/${id}`);
    return res.data;
  },
  create: async (data: {
    name: string;
    category: string;
    unitPrice: number;
    marginPercent: number;
    discountCeiling: number;
    billingCycle?: string | null;
    initialStock?: number;
  }) => {
    const res = await api.post<Product>('/products', data);
    return res.data;
  },
};

export const warehousesApi = {
  list: async () => {
    const res = await api.get<Warehouse[]>('/warehouses');
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get<Warehouse>(`/warehouses/${id}`);
    return res.data;
  },
  create: async (data: {
    name: string;
    shippingCostBase: number;
    initialStock?: { productId: string; quantity: number }[];
  }) => {
    const res = await api.post<Warehouse>('/warehouses', data);
    return res.data;
  },
  update: async (id: string, data: { name?: string; shippingCostBase?: number }) => {
    const res = await api.patch<Warehouse>(`/warehouses/${id}`, data);
    return res.data;
  },
  updateStock: async (id: string, updates: { productId: string; quantity: number }[]) => {
    const res = await api.patch<{ success: boolean; warehouse: Warehouse }>(`/warehouses/${id}/stock`, { updates });
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete<{ message: string; deletedWarehouseId: string }>(`/warehouses/${id}`);
    return res.data;
  },
  replenishStock: async (warehouseId: string, productId: string, quantityDelta: number) => {
    const res = await api.post(`/warehouses/${warehouseId}/stock`, { productId, quantityDelta });
    return res.data;
  },
};

// Customers API
export const customersApi = {
  list: async () => {
    const res = await api.get<CustomerDirectoryItem[]>('/customers');
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get<CustomerDirectoryItem>(`/customers/${id}`);
    return res.data;
  },
  create: async (data: { name: string; email: string; tier: string }) => {
    const res = await api.post<CustomerDirectoryItem>('/customers', data);
    return res.data;
  },
  update: async (id: string, data: { name?: string; email?: string; tier?: string }) => {
    const res = await api.patch<CustomerDirectoryItem>(`/customers/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete<{ message: string; deletedCustomerId: string; deletedQuotesCount: number }>(`/customers/${id}`);
    return res.data;
  },
};

// Upsell API
export const upsellApi = {
  getSuggestions: async (quotationId: string) => {
    const res = await api.get<UpsellSuggestion[]>(`/quotations/${quotationId}/upsell-suggestions`);
    return res.data;
  },
};

// Fulfillment API
export const fulfillmentApi = {
  calculate: async (quotationId: string) => {
    const res = await api.post<FulfillmentPreview>(`/quotations/${quotationId}/fulfillment/calculate`);
    return res.data;
  },
  confirm: async (
    quotationId: string,
    data: {
      useCalculated?: boolean;
      manualSplit?: { warehouseId: string; productId: string; quantity: number }[];
    }
  ) => {
    const res = await api.post(`/quotations/${quotationId}/fulfillment/confirm`, data);
    return res.data;
  },
  getPersisted: async (quotationId: string) => {
    const res = await api.get(`/quotations/${quotationId}/fulfillment`);
    return res.data;
  },
};

// Subscription Billing API
export const billingApi = {
  generateSchedule: async (quotationId: string) => {
    const res = await api.post(`/quotations/${quotationId}/billing/generate-schedule`);
    return res.data;
  },
  getBilling: async (quotationId: string) => {
    const res = await api.get(`/quotations/${quotationId}/billing`);
    return res.data;
  },
  updateLine: async (quotationId: string, lineId: string, quantity: number) => {
    const res = await api.patch(`/quotations/${quotationId}/billing/lines/${lineId}`, { quantity });
    return res.data;
  },
};

// Customer Portal API
export const portalApi = {
  getQuotations: async () => {
    const res = await api.get<any[]>('/portal/quotations');
    return res.data;
  },
  getQuotation: async (id: string) => {
    const res = await api.get<any>(`/portal/quotations/${id}`);
    return res.data;
  },
  addComment: async (id: string, data: { lineId?: string; message: string }) => {
    const res = await api.post(`/portal/quotations/${id}/comments`, data);
    return res.data;
  },
  counterDiscount: async (
    id: string,
    data: { proposedDiscountPercent: number; justification: string; lineId?: string }
  ) => {
    const res = await api.post<{ quotationStatus: string; reenteredApproval: boolean; blendedRiskScore: number }>(
      `/portal/quotations/${id}/counter-discount`,
      data
    );
    return res.data;
  },
  confirm: async (id: string) => {
    const res = await api.post<{ quotationStatus: string }>(`/portal/quotations/${id}/confirm`);
    return res.data;
  },
  getPdf: async (id: string, mode: 'view' | 'download' = 'view') => {
    const res = await api.get(`/portal/quotations/${id}/pdf`, {
      params: { mode },
      responseType: 'blob',
    });
    return res.data as Blob;
  },
};

/**
 * Utility helper to view a PDF Blob in a new browser tab
 */
export const viewPdfBlob = (blob: Blob) => {
  const fileUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
  window.open(fileUrl, '_blank');
};

/**
 * Utility helper to download a PDF Blob with a given filename
 */
export const downloadPdfBlob = (blob: Blob, filename: string) => {
  const fileUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
};

// Dashboard API
export const dashboardApi = {
  getSummary: async (periodDays: number = 30) => {
    const res = await api.get<DashboardSummary>('/dashboard/summary', { params: { periodDays } });
    return res.data;
  },
};

export default api;
