import React, { useState, useEffect } from 'react';
import { quotationsApi, productsApi, upsellApi, customersApi } from '../services/api';
import { Quotation, QuotationListItem, Product, CustomerTier, CustomerDirectoryItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Plus,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Send,
  Eye,
  FileText,
  Kanban,
  Table as TableIcon,
  ChevronRight,
  Clock,
  TrendingUp,
  Tag,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const QuotationsPage: React.FC = () => {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customers, setCustomers] = useState<{ id: string; name: string; tier: CustomerTier }[]>([]);

  interface FormLine {
    productId: string;
    quantity: number;
    discountPercent: number;
  }

  const [formLines, setFormLines] = useState<FormLine[]>([]);

  const [submitForApproval, setSubmitForApproval] = useState(false);
  const [upsellSuggestions, setUpsellSuggestions] = useState<any[]>([]);

  // Load initial quotes & products & real customers
  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const [qList, pList, cList] = await Promise.all([
        quotationsApi.list(statusFilter ? { status: statusFilter } : undefined).catch(() => []),
        productsApi.list().catch(() => []),
        customersApi.list().catch(() => []),
      ]);
      setQuotations(qList);
      if (pList && pList.length > 0) {
        setProducts(pList);
      }

      if (cList && cList.length > 0) {
        setCustomers(cList.map((c) => ({ id: c.id, name: c.name, tier: c.tier })));
        setSelectedCustomerId((prev) =>
          prev && cList.some((c) => c.id === prev) ? prev : cList[0].id
        );
      }

      if (pList && pList.length > 0) {
        setFormLines((prev) =>
          prev.length > 0 && prev[0].productId
            ? prev
            : [{ productId: pList[0].id, quantity: 1, discountPercent: 5 }]
        );
      }
    } catch (err) {
      console.error('Failed to load quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [statusFilter]);

  const handleOpenDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const q = await quotationsApi.getById(id);
      setSelectedQuotation(q);
      const suggestions = await upsellApi.getSuggestions(id);
      setUpsellSuggestions(suggestions);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAddLine = () => {
    const defaultProdId = products.length > 0 ? products[0].id : '';
    setFormLines([...formLines, { productId: defaultProdId, quantity: 1, discountPercent: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (formLines.length === 1) return;
    setFormLines(formLines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: keyof FormLine, value: any) => {
    const updated = [...formLines];
    updated[index] = { ...updated[index], [field]: value };
    setFormLines(updated);
  };

  // Live Risk Calculation Engine
  const productMap = new Map(products.map((p) => [p.id, p]));

  let liveSubtotal = 0;
  let liveTotal = 0;
  let totalWeightedOverage = 0;
  let totalWeight = 0;

  formLines.forEach((l) => {
    const p = productMap.get(l.productId);
    if (!p) return;
    const lineGross = l.quantity * p.unitPrice;
    const lineNet = lineGross * (1 - l.discountPercent / 100);
    liveSubtotal += lineGross;
    liveTotal += lineNet;

    const overage = Math.max(0, l.discountPercent - p.discountCeiling);
    totalWeightedOverage += overage * lineGross;
    totalWeight += lineGross;
  });

  const liveBlendedRisk = totalWeight > 0 ? totalWeightedOverage / totalWeight : 0;
  const requiresManager = liveBlendedRisk > 0;
  const requiresFinance = liveBlendedRisk > 5;

  // Live Recommendations calculation for the Upsell drawer
  const selectedProductIds = new Set(formLines.map((l) => l.productId));
  const hasHardware = formLines.some((l) => productMap.get(l.productId)?.category === 'HARDWARE');
  const hasSubscription = formLines.some((l) => productMap.get(l.productId)?.category === 'SUBSCRIPTION');

  const liveRecommendations = products
    .filter((p) => !selectedProductIds.has(p.id))
    .map((p) => {
      let reason = 'High Margin Add-on';
      let tag = 'Margin Booster';
      let score = 0;

      if (hasHardware && (p.category === 'SERVICE' || p.name.toLowerCase().includes('warranty'))) {
        reason = 'Complementary to Hardware';
        tag = 'Best Pairing';
        score = 10;
      } else if (p.marginPercent >= 60) {
        reason = 'Healthy Margin Item';
        tag = 'High Margin';
        score = 8;
      } else if (hasSubscription && p.category === 'SERVICE') {
        reason = 'Recommended Onboarding Service';
        tag = 'Co-Purchase Match';
        score = 7;
      }

      const projectedSubtotal = liveSubtotal + p.unitPrice;
      const projectedTotal = liveTotal + p.unitPrice;
      const currentMarginEst = liveSubtotal > 0 ? (liveTotal / liveSubtotal) * 100 : 0;
      const projectedMarginEst = projectedSubtotal > 0 ? (projectedTotal / projectedSubtotal) * 100 : 0;
      const marginDelta = projectedMarginEst - currentMarginEst;

      return {
        product: p,
        reason,
        tag,
        score,
        marginDelta: Number(marginDelta.toFixed(1)),
      };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const handleAddUpsell = (productId: string) => {
    setFormLines([...formLines, { productId, quantity: 1, discountPercent: 0 }]);
  };

  const kanbanColumns: { status: QuotationListItem['status']; title: string; dotColor: string }[] = [
    { status: 'DRAFT', title: 'Draft', dotColor: 'bg-slate-400' },
    { status: 'PENDING_APPROVAL', title: 'Pending Approval', dotColor: 'bg-amber-500' },
    { status: 'APPROVED', title: 'Approved', dotColor: 'bg-emerald-500' },
    { status: 'UNDER_NEGOTIATION', title: 'Under Negotiation', dotColor: 'bg-indigo-500' },
    { status: 'CONFIRMED', title: 'Confirmed / Won', dotColor: 'bg-blue-600' },
  ];

  const handleOpenCreateModal = async () => {
    let prods = products;
    if (prods.length === 0) {
      try {
        prods = await productsApi.list();
        setProducts(prods);
      } catch (e) {
        console.error('Failed to load products', e);
      }
    }

    let custs = customers;
    if (custs.length === 0) {
      try {
        const cList = await customersApi.list();
        custs = cList.map((c) => ({ id: c.id, name: c.name, tier: c.tier }));
        setCustomers(custs);
      } catch (e) {
        console.error('Failed to load customers', e);
      }
    }

    if (custs.length > 0 && (!selectedCustomerId || !custs.some((c) => c.id === selectedCustomerId))) {
      setSelectedCustomerId(custs[0].id);
    }
    const defaultProductId = prods.length > 0 ? prods[0].id : '';
    setFormLines([{ productId: defaultProductId, quantity: 1, discountPercent: 5 }]);
    setSubmitForApproval(false);
    setCreateModalOpen(true);
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const customerIdToUse =
        selectedCustomerId || (customers.length > 0 ? customers[0].id : '');

      if (!customerIdToUse) {
        alert('Please select a customer account');
        return;
      }

      // Ensure every line has a valid productId and valid numbers
      const validLines = formLines
        .map((l) => ({
          productId: l.productId && l.productId.trim() !== '' ? l.productId : (products[0]?.id ?? ''),
          quantity: Math.max(1, Number(l.quantity) || 1),
          discountPercent: Math.max(0, Math.min(100, Number(l.discountPercent) || 0)),
        }))
        .filter((l) => Boolean(l.productId));

      if (validLines.length === 0) {
        alert('Please add at least one product item to the quotation');
        return;
      }

      await quotationsApi.create({
        customerId: customerIdToUse,
        lines: validLines,
        submitForApproval,
      });

      setCreateModalOpen(false);
      await fetchQuotations();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Error creating quotation');
    }
  };

  const handleSubmitForApproval = async (id: string) => {
    try {
      await quotationsApi.submitForApproval(id);
      handleOpenDetail(id);
      fetchQuotations();
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Failed to submit for approval');
    }
  };

  const filteredQuotes = quotations.filter((q) =>
    q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Quotations Management</h2>
          <p className="text-sm text-slate-500 mt-1">
            Build deals, evaluate discount risk scores, configure approval triggers, and monitor status.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl flex items-center space-x-2 shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Quotation</span>
        </button>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center space-x-2 flex-1 max-w-md bg-slate-50 border border-slate-300 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name or quote ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-900 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-3">
          {/* View Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${viewMode === 'kanban' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Pipeline (Kanban)</span>
            </button>
          </div>

          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 text-slate-700 font-semibold px-3 py-2 rounded-lg focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="UNDER_NEGOTIATION">Under Negotiation</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Main Content: Table View vs Kanban Pipeline */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-6">Quote ID</th>
                <th className="py-3.5 px-6">Customer</th>
                <th className="py-3.5 px-6">Tier</th>
                <th className="py-3.5 px-6">Deal Items & Products</th>
                <th className="py-3.5 px-6">Total Amount (₹)</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Risk Score</th>
                <th className="py-3.5 px-6">Last Activity</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredQuotes.map((quote) => (
                <tr
                  key={quote.id}
                  onClick={() => handleOpenDetail(quote.id)}
                  className="hover:bg-blue-50/40 transition cursor-pointer"
                >
                  <td className="py-4 px-6 font-mono text-xs font-bold text-blue-700">
                    {quote.id.slice(0, 8)}...
                  </td>
                  <td className="py-4 px-6 font-semibold text-slate-900">{quote.customerName}</td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${quote.customerTier === 'GOLD'
                          ? 'bg-amber-100 text-amber-800'
                          : quote.customerTier === 'SILVER'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                    >
                      {quote.customerTier}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {quote.items && quote.items.length > 0 ? (
                        quote.items.map((it, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-100"
                            title={`${it.productName} • Qty: ${it.quantity} • Disc: ${it.discountPercent || 0}%`}
                          >
                            <Tag className="w-2.5 h-2.5 mr-1 text-blue-500 shrink-0" />
                            <span className="font-semibold mr-1 truncate max-w-[120px]">{it.productName}</span>
                            <span className="text-blue-600 font-mono">×{it.quantity}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No items</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 font-bold text-slate-900">
                    ₹{quote.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-6">
                    <StatusBadge status={quote.status} />
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${quote.blendedRiskScore > 5
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : quote.blendedRiskScore > 0
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                    >
                      {quote.blendedRiskScore.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-500">
                    {new Date(quote.lastActivityAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetail(quote.id);
                      }}
                      className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-lg transition"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Kanban Pipeline View */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {kanbanColumns.map((col) => {
            const colQuotes = filteredQuotes.filter((q) => q.status === col.status);
            const colTotal = colQuotes.reduce((sum, q) => sum + q.total, 0);

            return (
              <div
                key={col.status}
                className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200 flex flex-col min-w-[260px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`}></span>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {col.title}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                    {colQuotes.length}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-500 mb-2 px-1">
                  Total: ₹{colTotal.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </div>

                {/* Cards List */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[650px]">
                  {colQuotes.map((quote) => (
                    <div
                      key={quote.id}
                      onClick={() => handleOpenDetail(quote.id)}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition cursor-pointer space-y-2.5 group"
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          #{quote.id.slice(0, 8)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${quote.customerTier === 'GOLD'
                              ? 'bg-amber-100 text-amber-800'
                              : quote.customerTier === 'SILVER'
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                        >
                          {quote.customerTier}
                        </span>
                      </div>

                      <div className="font-semibold text-sm text-slate-900 line-clamp-1 group-hover:text-blue-700 transition">
                        {quote.customerName}
                      </div>

                      {/* Deal Items Pills inside Kanban */}
                      {quote.items && quote.items.length > 0 ? (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {quote.items.map((item, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium border border-slate-200"
                              title={`${item.productName} (Qty: ${item.quantity})`}
                            >
                              <Tag className="w-2.5 h-2.5 mr-1 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[100px]">{item.productName}</span>
                              <span className="text-slate-500 ml-1 font-mono">×{item.quantity}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 italic pt-0.5">No deal items</div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Deal Amount</span>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            ₹{quote.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block uppercase">Risk</span>
                          <span
                            className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${quote.blendedRiskScore > 5
                                ? 'bg-rose-50 text-rose-700'
                                : quote.blendedRiskScore > 0
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                          >
                            {quote.blendedRiskScore.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(quote.lastActivityAt).toLocaleDateString()}</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                      </div>
                    </div>
                  ))}

                  {colQuotes.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      No deals in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE NEW QUOTATION MODAL WITH LIVE RISK GAUGE */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-6xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Create New Quotation</h3>
                <p className="text-xs text-slate-500">
                  Configure deal lines with live discount ceilings, margin impact, and real-time upsell recommendations.
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="mt-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Quote Builder Form & Lines (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Customer Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Customer Account
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.tier} Tier — Max {c.tier === 'GOLD' ? '15%' : c.tier === 'SILVER' ? '10%' : '5%'} ceiling)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quotation Lines Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Deal Line Items
                      </label>
                      <button
                        type="button"
                        onClick={handleAddLine}
                        className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Product Line</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {formLines.map((line, idx) => {
                        const prod = productMap.get(line.productId);
                        const ceiling = prod?.discountCeiling || 15;
                        const isExceeding = line.discountPercent > ceiling;

                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-xl border transition ${isExceeding
                                ? 'bg-amber-50/50 border-amber-200'
                                : 'bg-slate-50 border-slate-200'
                              }`}
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                              {/* Product Picker */}
                              <div className="sm:col-span-5">
                                <select
                                  value={line.productId || (products[0]?.id ?? '')}
                                  onChange={(e) => handleLineChange(idx, 'productId', e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                                >
                                  {products.length === 0 ? (
                                    <option value="">Loading products catalog...</option>
                                  ) : (
                                    products.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name} (₹{p.unitPrice}) [Ceil: {p.discountCeiling}%]
                                      </option>
                                    ))
                                  )}
                                </select>
                              </div>

                              {/* Quantity */}
                              <div className="sm:col-span-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={line.quantity}
                                  onChange={(e) =>
                                    handleLineChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)
                                  }
                                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-semibold"
                                  placeholder="Qty"
                                />
                              </div>

                              {/* Discount % */}
                              <div className="sm:col-span-3">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={line.discountPercent}
                                    onChange={(e) =>
                                      handleLineChange(
                                        idx,
                                        'discountPercent',
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-bold ${isExceeding
                                        ? 'border-amber-400 text-amber-700'
                                        : 'border-slate-300 text-slate-800'
                                      }`}
                                    placeholder="Discount %"
                                  />
                                  <span className="text-xs font-bold text-slate-500">%</span>
                                </div>
                              </div>

                              {/* Line Total & Remove */}
                              <div className="sm:col-span-2 flex items-center justify-between pl-2">
                                <span className="text-xs font-bold text-slate-900">
                                  ₹
                                  {prod
                                    ? (
                                      line.quantity *
                                      prod.unitPrice *
                                      (1 - line.discountPercent / 100)
                                    ).toFixed(2)
                                    : '0.00'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLine(idx)}
                                  className="text-slate-400 hover:text-rose-500 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {isExceeding && (
                              <div className="mt-2 text-[11px] font-semibold text-amber-700 flex items-center space-x-1">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  Exceeds category ceiling ({ceiling}%). Will trigger approval workflow!
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* LIVE RISK & PRICING SUMMARY PANEL */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 text-white shadow-lg space-y-4">
                    <div className="flex items-center justify-between border-b border-blue-800/60 pb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                        DealFlow360 Real-Time Risk Engine
                      </span>
                      <span className="text-xs font-mono bg-blue-500/20 text-blue-200 px-2.5 py-0.5 rounded-full">
                        Blended Overages
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <span className="text-xs text-blue-200 block">Total Quotation Value</span>
                        <span className="text-2xl font-black text-white">₹{liveTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Subtotal: ₹{liveSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div>
                        <span className="text-xs text-blue-200 block">Blended Risk Score</span>
                        <span
                          className={`text-2xl font-black ${liveBlendedRisk > 5
                              ? 'text-rose-400'
                              : liveBlendedRisk > 0
                                ? 'text-amber-300'
                                : 'text-emerald-400'
                            }`}
                        >
                          {liveBlendedRisk.toFixed(1)}%
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {liveBlendedRisk === 0 ? 'Within all ceilings' : 'Concession above ceiling'}
                        </span>
                      </div>

                      <div>
                        <span className="text-xs text-blue-200 block">Approval Required</span>
                        <div className="mt-1 space-y-1">
                          {requiresFinance ? (
                            <span className="inline-flex items-center text-xs font-bold text-rose-300">
                              <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Sales Manager + Finance
                            </span>
                          ) : requiresManager ? (
                            <span className="inline-flex items-center text-xs font-bold text-amber-300">
                              <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Sales Manager (Seq 1)
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs font-bold text-emerald-400">
                              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Auto-Approved (No triggers)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Section B5 Live Upsell & Cross-Sell Panel (4 cols) */}
                <div className="lg:col-span-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Live Cart Recommendations
                      </h4>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                      Section B5
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Ranked smart pairings based on co-purchase history and promotion rules. Adding recommendations dynamically updates margins.
                  </p>

                  <div className="mt-4 space-y-3 flex-1 overflow-y-auto max-h-[500px]">
                    {liveRecommendations.map(({ product, reason, tag, marginDelta }) => (
                      <div
                        key={product.id}
                        className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-bold text-slate-900 line-clamp-1">
                            {product.name}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 whitespace-nowrap ml-1">
                            {tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">{reason}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <div>
                            <span className="font-mono font-bold text-slate-900">
                              ₹{product.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-bold ml-1.5">
                              {marginDelta >= 0 ? `+${marginDelta}%` : `${marginDelta}%`} margin
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddUpsell(product.id)}
                            className="px-2.5 py-1 bg-[#0b2b68] hover:bg-blue-900 text-white rounded-lg text-xs font-semibold transition"
                          >
                            + Add to Quote
                          </button>
                        </div>
                      </div>
                    ))}

                    {liveRecommendations.length === 0 && (
                      <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                        All recommended add-ons are already included in your deal lines!
                      </div>
                    )}
                  </div>

                  <div className="mt-4 p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-[11px] text-blue-900">
                    💡 Rep Tip: Adding high-margin services offsets hardware discount overages to keep the blended risk score low.
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={submitForApproval}
                    onChange={(e) => setSubmitForApproval(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span>Submit immediately for approval workflow</span>
                </label>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center space-x-1.5"
                  >
                    <span>Save & Generate Deal</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED QUOTATION VIEW MODAL */}
      {selectedQuotation && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-8 shadow-2xl border border-slate-200 my-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-3">
                  <h3 className="text-xl font-bold text-slate-900">
                    Quote: {selectedQuotation.customer.name}
                  </h3>
                  <StatusBadge status={selectedQuotation.status} />
                </div>
                <p className="text-xs text-slate-500 mt-1 font-mono">ID: {selectedQuotation.id}</p>
              </div>
              <button onClick={() => setSelectedQuotation(null)} className="text-slate-400 hover:text-slate-600 text-lg">
                ✕
              </button>
            </div>

            {/* Pricing Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs text-slate-400 block">Subtotal</span>
                <span className="text-sm font-bold text-slate-900">₹{selectedQuotation.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Total Discount</span>
                <span className="text-sm font-bold text-rose-600">-₹{selectedQuotation.totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Final Total</span>
                <span className="text-lg font-extrabold text-blue-700">₹{selectedQuotation.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Blended Risk Score</span>
                <span className="text-sm font-bold text-amber-700">{selectedQuotation.blendedRiskScore.toFixed(1)}%</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Line Items</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2.5 px-4">Product</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Qty</th>
                      <th className="py-2.5 px-4">Unit Price (₹)</th>
                      <th className="py-2.5 px-4">Discount</th>
                      <th className="py-2.5 px-4 text-right">Line Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedQuotation.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">{l.productName}</td>
                        <td className="py-2.5 px-4 text-slate-500">{l.category}</td>
                        <td className="py-2.5 px-4 text-slate-700">{l.quantity}</td>
                        <td className="py-2.5 px-4 text-slate-700">₹{l.unitPrice.toFixed(2)}</td>
                        <td className="py-2.5 px-4 font-bold text-blue-600">{l.discountPercent}%</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                          ₹{l.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Upsell Recommendations Widget */}
            {upsellSuggestions.length > 0 && (
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl">
                <div className="flex items-center space-x-2 mb-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Recommended Upsell & Cross-Sell Pairings
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {upsellSuggestions.map((s, i) => (
                    <div key={i} className="p-3 bg-white border border-blue-100 rounded-lg shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800">{s.productName}</span>
                        {s.isPromoted && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                            Promoted
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-600 mt-1 block">
                        +₹{s.marginDelta.toFixed(2)} margin value
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approval Steps & Audit Trail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="border border-slate-200 rounded-xl p-4">
                <h5 className="text-xs font-bold text-slate-700 uppercase mb-2">Approval Steps</h5>
                {selectedQuotation.approvalSteps.length > 0 ? (
                  <div className="space-y-2">
                    {selectedQuotation.approvalSteps.map((step) => (
                      <div key={step.id} className="p-2.5 bg-slate-50 rounded-lg text-xs flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-800">
                            {step.sequence}. {step.approverRole.replace(/_/g, ' ')}
                          </span>
                          {step.actedBy && (
                            <span className="text-slate-400 block text-[11px]">By: {step.actedBy}</span>
                          )}
                        </div>
                        <StatusBadge status={step.status} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No approval steps required for this quotation.</p>
                )}
              </div>

              <div className="border border-slate-200 rounded-xl p-4">
                <h5 className="text-xs font-bold text-slate-700 uppercase mb-2">Audit Trail</h5>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {selectedQuotation.auditEntries.map((a) => (
                    <div key={a.id} className="text-xs border-b border-slate-100 pb-1">
                      <span className="font-semibold text-slate-800">{a.action}</span>
                      <span className="text-slate-500 block text-[11px]">{a.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <div>
                {selectedQuotation.status === 'DRAFT' && (
                  <button
                    onClick={() => handleSubmitForApproval(selectedQuotation.id)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit for Approval</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedQuotation(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
