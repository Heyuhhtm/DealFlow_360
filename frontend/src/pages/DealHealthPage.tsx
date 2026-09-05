import React, { useState, useEffect } from 'react';
import { dashboardApi, quotationsApi } from '../services/api';
import { DashboardSummary } from '../types';
import { Activity, AlertTriangle, Flame, Clock, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

interface DealHealthPageProps {
  onNavigateQuotation?: (id: string) => void;
}

export const DealHealthPage: React.FC<DealHealthPageProps> = ({ onNavigateQuotation }) => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      setLoading(true);
      try {
        const summary = await dashboardApi.getSummary(30);
        setData(summary);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Deal Health & Anomaly Surveillance</h2>
        <p className="text-sm text-slate-500 mt-1">
          Automated risk triggers, stalled negotiation identification, and statistical discount outlier alerts.
        </p>
      </div>

      {/* Grid: Stalled Deals vs Discount Anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Stalled Deals Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-900 text-base">Stalled Deals (&gt;5 Days Inactive)</h3>
            </div>
            <span className="text-xs font-bold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
              {data?.stalledDeals.length || 0} Deals
            </span>
          </div>

          <div className="space-y-3">
            {data?.stalledDeals && data.stalledDeals.length > 0 ? (
              data.stalledDeals.map((deal) => (
                <div key={deal.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-sm">{deal.customerName}</span>
                    <span className="font-extrabold text-slate-900 text-sm">${deal.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Quote ID: {deal.id.slice(0, 8)}...</span>
                    <span className="font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                      {deal.daysStalled} days without update
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                All quotes have had recent customer or rep activity within the last 5 days.
              </p>
            )}
          </div>
        </div>

        {/* Discount Anomalies Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center space-x-2">
              <Flame className="w-5 h-5 text-rose-500" />
              <h3 className="font-bold text-slate-900 text-base">Discount Outliers (&gt;1.5x Baseline)</h3>
            </div>
            <span className="text-xs font-bold bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full border border-rose-200">
              {data?.discountAnomalies.length || 0} Outliers
            </span>
          </div>

          <div className="space-y-3">
            {data?.discountAnomalies && data.discountAnomalies.length > 0 ? (
              data.discountAnomalies.map((a, i) => (
                <div key={i} className="p-4 bg-rose-50/40 border border-rose-200 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">{a.repName}</span>
                    <span className="font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                      Concession: {a.discountGiven}%
                    </span>
                  </div>
                  <p className="text-slate-500">
                    Rep's normal historical concession baseline is <strong>{a.repAverage}%</strong>. This line item
                    deviates significantly from typical discount patterns.
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                No discount concessions exceeding 1.5x of the representative's historical average.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
