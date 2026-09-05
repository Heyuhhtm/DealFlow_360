import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Filter,
  TrendingUp,
  IndianRupee,
  Percent,
  CheckCircle2,
  FileSpreadsheet,
  Users,
  Tag,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { quotationsApi, productsApi } from '../services/api';
import { QuotationListItem, Product } from '../types';

export const ReportsPage: React.FC = () => {
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters from Spec A7
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [selectedRep, setSelectedRep] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const [qList, pList] = await Promise.all([
        quotationsApi.list(),
        productsApi.list(),
      ]);
      setQuotations(qList);
      setProducts(pList);
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter quotations according to criteria
  const filtered = quotations.filter((q) => {
    if (selectedStatus !== 'all' && q.status !== selectedStatus) return false;
    // Date filter
    if (period !== 'all') {
      const qDate = new Date(q.lastActivityAt);
      const now = new Date();
      if (period === 'today') {
        if (qDate.toDateString() !== now.toDateString()) return false;
      } else if (period === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (qDate < oneWeekAgo) return false;
      } else if (period === 'month') {
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (qDate < oneMonthAgo) return false;
      }
    }
    return true;
  });

  // KPI Calculations
  const totalPipeline = filtered.reduce((sum, q) => sum + q.total, 0);
  const confirmedQuotes = filtered.filter((q) => q.status === 'CONFIRMED');
  const totalWonRevenue = confirmedQuotes.reduce((sum, q) => sum + q.total, 0);
  const approvedQuotes = filtered.filter((q) => q.status === 'APPROVED' || q.status === 'CONFIRMED');
  const winRate = filtered.length > 0 ? (approvedQuotes.length / filtered.length) * 100 : 0;
  const avgRiskScore =
    filtered.length > 0
      ? filtered.reduce((sum, q) => sum + q.blendedRiskScore, 0) / filtered.length
      : 0;

  // CSV Export handler
  const handleExportCSV = () => {
    const headers = ['Quote ID', 'Customer', 'Tier', 'Status', 'Risk Score %', 'Total Amount (₹)', 'Last Activity'];
    const rows = filtered.map((q) => [
      q.id,
      `"${q.customerName}"`,
      q.customerTier,
      q.status,
      q.blendedRiskScore.toFixed(1),
      q.total.toFixed(2),
      new Date(q.lastActivityAt).toLocaleDateString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dealflow360_sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-none">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl print:hidden">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Sales Governance & Performance Reports</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Detailed deal metrics, discount compliance, conversion velocity, and audit reports.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 print:hidden">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV / XLS</span>
          </button>
          <button
            onClick={handlePrintPDF}
            className="inline-flex items-center space-x-2 bg-[#0b2b68] hover:bg-blue-900 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Bar (Section A7: Period, Rep, Approval Status, Product Category) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:hidden space-y-4">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Report Filters (Section A7)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Period Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Time Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option value="today">Today</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days (Standard)</option>
              <option value="all">All Time History</option>
            </select>
          </div>

          {/* Sales Rep Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Sales Rep / Team</label>
            <select
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option value="all">All Sales Reps</option>
              <option value="sarah">Sarah Connor (Enterprise Rep)</option>
              <option value="michael">Michael Scott (SMB Rep)</option>
            </select>
          </div>

          {/* Approval Status Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Approval Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option value="all">All Quotation Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="UNDER_NEGOTIATION">Under Negotiation</option>
              <option value="CONFIRMED">Confirmed / Won</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Product Category Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Product Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option value="all">All Categories</option>
              <option value="HARDWARE">Hardware (Thin Margin)</option>
              <option value="SERVICE">Service (Custom Work)</option>
              <option value="SUBSCRIPTION">Recurring Subscriptions</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Quoted Pipeline</span>
          <div className="mt-2 text-3xl font-black text-slate-900 font-mono">
            ₹{totalPipeline.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-blue-600 font-semibold flex items-center space-x-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Across {filtered.length} quotations</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50/40 to-transparent border-emerald-200">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Confirmed Revenue</span>
          <div className="mt-2 text-3xl font-black text-emerald-900 font-mono">
            ₹{totalWonRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-emerald-700 font-medium">
            {confirmedQuotes.length} orders closed &amp; billed
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Approval Conversion</span>
          <div className="mt-2 text-3xl font-black text-slate-900 font-mono">
            {winRate.toFixed(1)}%
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            {approvedQuotes.length} of {filtered.length} approved
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Discount Risk</span>
          <div className="mt-2 text-3xl font-black text-slate-900 font-mono">
            {avgRiskScore.toFixed(1)}%
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            Blended overage above ceiling
          </div>
        </div>
      </div>

      {/* Detailed Report Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Filtered Deals Summary ({filtered.length})</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live records matching selected period, rep, and status filters.
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
            {filtered.length} Records
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading performance records...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-6">Quote ID</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Tier</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-center">Blended Risk</th>
                  <th className="py-3.5 px-6 text-right">Deal Value (₹)</th>
                  <th className="py-3.5 px-6 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-6 font-mono text-xs font-bold text-blue-700">
                      #{q.id.slice(0, 8)}
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-900">{q.customerName}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          q.customerTier === 'GOLD'
                            ? 'bg-amber-100 text-amber-800'
                            : q.customerTier === 'SILVER'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {q.customerTier}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-xs text-slate-700">{q.status}</span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                          q.blendedRiskScore > 5
                            ? 'bg-rose-50 text-rose-700'
                            : q.blendedRiskScore > 0
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {q.blendedRiskScore.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-slate-900">
                      ₹{q.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-right text-xs text-slate-500">
                      {new Date(q.lastActivityAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Catalog Best-Sellers & Promoted SKUs Reference */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4">Catalog Margins & Discount Ceilings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.slice(0, 6).map((p) => (
            <div key={p.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{p.name}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                  {p.category}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Unit Price: ₹{p.unitPrice.toFixed(2)}</span>
                <span className="font-mono font-semibold text-slate-700">Margin: {p.marginPercent}%</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Allowed Ceiling: <span className="font-bold text-slate-600">{p.discountCeiling}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
