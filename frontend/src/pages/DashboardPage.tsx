import React, { useState, useEffect } from 'react';
import { dashboardApi } from '../services/api';
import { DashboardSummary } from '../types';
import {
  TrendingUp,
  Clock,
  AlertTriangle,
  FileCheck2,
  Users,
  ShieldAlert,
  ArrowUpRight,
  Flame,
  Activity,
  Plus,
  ShieldCheck,
  Building2,
  Boxes,
  FileSpreadsheet,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DashboardPageProps {
  onNavigate: (tab: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodDays, setPeriodDays] = useState(30);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const summary = await dashboardApi.getSummary(periodDays);
        setData(summary);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [periodDays]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    activeQuotations: 0,
    pendingApprovals: 0,
    avgDiscountGiven: 0,
    atRiskDeals: 0,
  };

  const { activeRole } = useAuth();

  return (
    <div className="space-y-8">
      {/* Top Banner & Time Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Deal Health & Operations Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time pipeline visibility, approval velocity, discount ceilings, and fulfillment status.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={periodDays}
            onChange={(e) => setPeriodDays(parseInt(e.target.value, 10))}
            className="text-xs bg-slate-50 border border-slate-300 font-semibold text-slate-700 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
          <button
            onClick={() => onNavigate('quotations')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg flex items-center space-x-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Quotation</span>
          </button>
        </div>
      </div>

      {/* Role-Tailored Action Ribbon (Matches Diagram Role Cards) */}
      <div className="p-4 bg-gradient-to-r from-blue-900 via-[#0b2b68] to-slate-900 rounded-2xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center text-sm font-bold border border-blue-400/40">
            {activeRole === 'ADMIN' ? '👑' : activeRole === 'SALES_REP' ? '💼' : activeRole === 'SALES_MANAGER' ? '👔' : activeRole === 'FINANCE' ? '💰' : '🌐'}
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
              {activeRole === 'ADMIN'
                ? 'Admin Workspace'
                : activeRole === 'SALES_REP'
                ? 'Sales Rep Desk (Sarah Connor)'
                : activeRole === 'SALES_MANAGER'
                ? 'Sales Manager Desk (Michael Scott)'
                : activeRole === 'FINANCE'
                ? 'Finance Approver Desk (Angela Martin)'
                : 'Customer Portal Desk'}
            </span>
            <p className="text-xs text-slate-200 mt-0.5">
              {activeRole === 'ADMIN'
                ? 'Manage master products, price lists, discount tiers, warehouses, and user permissions.'
                : activeRole === 'SALES_REP'
                ? 'Build customer quotations, apply line discounts, and pitch margin-boosting upsells.'
                : activeRole === 'SALES_MANAGER'
                ? 'Review quotes exceeding tier ceilings, govern blended margins, and resolve stalled deals.'
                : activeRole === 'FINANCE'
                ? 'Review Level-2 high-risk discounts, multi-depot fulfillment splits, and reconcile invoices.'
                : 'View quotation terms, submit counter offers, and confirm approved orders.'}
            </p>
          </div>
        </div>

        {/* Dynamic Role Quick Action Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {activeRole === 'SALES_REP' && (
            <>
              <button
                onClick={() => onNavigate('quotations')}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                + Create Quote
              </button>
              <button
                onClick={() => onNavigate('customers')}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium border border-white/20 transition"
              >
                View Customers
              </button>
            </>
          )}

          {activeRole === 'SALES_MANAGER' && (
            <>
              <button
                onClick={() => onNavigate('approvals')}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-sm transition"
              >
                Pending Approvals ({kpis.pendingApprovals})
              </button>
              <button
                onClick={() => onNavigate('dealhealth')}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium border border-white/20 transition"
              >
                Stalled Deals ({data?.stalledDeals?.length || 0})
              </button>
              <button
                onClick={() => onNavigate('reports')}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium border border-white/20 transition"
              >
                Sales Reports
              </button>
            </>
          )}

          {activeRole === 'FINANCE' && (
            <>
              <button
                onClick={() => onNavigate('approvals')}
                className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                High-Risk Approvals
              </button>
              <button
                onClick={() => onNavigate('fulfillment')}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium border border-white/20 transition"
              >
                Warehouse Splits
              </button>
              <button
                onClick={() => onNavigate('invoices')}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium border border-white/20 transition"
              >
                Reconcile Invoices
              </button>
            </>
          )}

          {activeRole === 'ADMIN' && (
            <>
              <button
                onClick={() => onNavigate('customers')}
                className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold border border-white/20 transition"
              >
                Customers
              </button>
              <button
                onClick={() => onNavigate('warehouses')}
                className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold border border-white/20 transition"
              >
                Warehouses
              </button>
              <button
                onClick={() => onNavigate('products')}
                className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold border border-white/20 transition"
              >
                Products
              </button>
              <button
                onClick={() => onNavigate('reports')}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                Full Reports
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Active Quotations */}
        <div
          onClick={() => onNavigate('quotations')}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Deals</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{kpis.activeQuotations}</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> Pipeline Live
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Active deals in negotiation or review</p>
        </div>

        {/* Pending Approvals */}
        <div
          onClick={() => onNavigate('approvals')}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Approvals</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-amber-600">{kpis.pendingApprovals}</span>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Action Required
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Manager or Finance sign-off needed</p>
        </div>

        {/* Avg Discount Given */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Discount Given</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{kpis.avgDiscountGiven}%</span>
            <span className="text-xs text-slate-500 font-medium">Ceiling: 10-15%</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Blended concession across all order lines</p>
        </div>

        {/* At-Risk Deals */}
        <div
          onClick={() => onNavigate('dealhealth')}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-rose-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">At-Risk Deals</span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-rose-600">{kpis.atRiskDeals}</span>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              Risk Score &gt; 5%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Breaching category discount ceilings</p>
        </div>
      </div>

      {/* Main Grid: Stalled Deals & Anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Stalled Deals Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <h3 className="text-base font-bold text-slate-900">Stalled Deals (&gt;5 Days Inactive)</h3>
            </div>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
              {data?.stalledDeals?.length || 0} Deals
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Deals with no customer activity or sales progression in the last 5 days.
          </p>

          <div className="divide-y divide-slate-100">
            {data?.stalledDeals && data.stalledDeals.length > 0 ? (
              data.stalledDeals.map((deal) => (
                <div
                  key={deal.id}
                  onClick={() => onNavigate('quotations')}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 rounded-lg px-2 transition cursor-pointer"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{deal.customerName}</h4>
                    <span className="text-xs text-slate-400 font-mono">Deal ID: {deal.id.slice(0, 8)}...</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900 block">
                      ₹{deal.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {deal.daysStalled} days stalled
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                No stalled deals right now! All quotes are active.
              </div>
            )}
          </div>
        </div>

        {/* Discount Anomalies Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <h3 className="text-base font-bold text-slate-900">Rep Discount Anomalies</h3>
            </div>
            <span className="text-xs font-semibold bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full border border-rose-200">
              {data?.discountAnomalies?.length || 0} Flagged
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Individual line concessions exceeding 1.5x of the Sales Rep's historical baseline.
          </p>

          <div className="divide-y divide-slate-100">
            {data?.discountAnomalies && data.discountAnomalies.length > 0 ? (
              data.discountAnomalies.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{item.repName}</h4>
                    <span className="text-xs text-slate-400">Historical Rep Average: {item.repAverage}%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                      Given: {item.discountGiven}% (Anomaly)
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                No concessions exceeding 1.5x rep baseline detected.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rep Performance & Deal Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Rep Average Discounts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-900 mb-2">Average Concessions by Sales Representative</h3>
          <p className="text-xs text-slate-500 mb-6">Benchmarking discount patterns across reps.</p>

          <div className="space-y-4">
            {data?.discountByRep?.map((r, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">{r.repName}</span>
                  <span className="text-blue-700 font-bold">{r.avgDiscount}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full ${
                      r.avgDiscount > 15 ? 'bg-rose-500' : r.avgDiscount > 10 ? 'bg-amber-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, r.avgDiscount * 4)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Volume Trend Bar List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-900 mb-2">Deal Velocity & Activity</h3>
          <p className="text-xs text-slate-500 mb-6">Recent quote generations across the enterprise.</p>

          <div className="space-y-2">
            {data?.volumeOverTime?.slice(-7).map((v, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
                <span className="font-mono text-slate-500">{v.date}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(100, v.count * 35)}%` }}></div>
                  </div>
                  <span className="font-bold text-slate-800 w-8 text-right">{v.count} deals</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
