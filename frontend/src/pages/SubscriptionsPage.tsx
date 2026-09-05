import React, { useState, useEffect } from 'react';
import { quotationsApi, billingApi } from '../services/api';
import { QuotationListItem } from '../types';
import { RefreshCw, Calendar, IndianRupee, CheckCircle2, ArrowRight, Zap, Calculator } from 'lucide-react';

export const SubscriptionsPage: React.FC = () => {
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>('');
  const [billingData, setBillingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string>('');
  const [editQty, setEditQty] = useState<number>(1);
  const [prorationNote, setProrationNote] = useState<string | null>(null);

  useEffect(() => {
    const loadQuotes = async () => {
      setLoading(true);
      try {
        const list = await quotationsApi.list();
        setQuotations(list);
        if (list.length > 0) {
          setSelectedQuoteId(list[0].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadQuotes();
  }, []);

  const fetchBilling = async (quoteId: string) => {
    try {
      const data = await billingApi.getBilling(quoteId);
      setBillingData(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedQuoteId) {
      fetchBilling(selectedQuoteId);
      setProrationNote(null);
    }
  }, [selectedQuoteId]);

  const handleGenerateSchedule = async () => {
    if (!selectedQuoteId) return;
    setGenerating(true);
    try {
      await billingApi.generateSchedule(selectedQuoteId);
      await fetchBilling(selectedQuoteId);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleProrationUpdate = async (lineId: string) => {
    try {
      const res: any = await billingApi.updateLine(selectedQuoteId, lineId, editQty);
      setProrationNote(res.prorationNote);
      await fetchBilling(selectedQuoteId);
      setEditingLineId('');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Subscription & Recurring Billing Schedules</h2>
          <p className="text-sm text-slate-500 mt-1">
            Automated recurring invoices, billing cadence projections (Monthly/Quarterly/Yearly), and mid-cycle proration adjustments.
          </p>
        </div>
      </div>

      {/* Select Quotation & Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 w-full max-w-md">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Deal Quotation
            </label>
            <select
              value={selectedQuoteId}
              onChange={(e) => setSelectedQuoteId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
            >
              {quotations.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.customerName} — ₹{q.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({q.status})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerateSchedule}
            disabled={generating || !selectedQuoteId}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Generating Dates...' : 'Generate 3-Cycle Billing Schedule'}</span>
          </button>
        </div>
      </div>

      {prorationNote && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{prorationNote}</span>
        </div>
      )}

      {/* Grid: One-Time vs Recurring Lines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recurring Lines Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 text-purple-600" />
            <span>Recurring Subscription Lines</span>
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Items requiring scheduled recurring charges. Click "Adjust Qty" to calculate mid-cycle proration.
          </p>

          <div className="space-y-3">
            {billingData?.recurringLines && billingData.recurringLines.length > 0 ? (
              billingData.recurringLines.map((line: any) => (
                <div key={line.id} className="p-4 rounded-xl border border-purple-100 bg-purple-50/30 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">{line.productName}</span>
                      <span className="text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded text-[10px] uppercase">
                        {line.billingCycle}
                      </span>
                    </div>
                    <span className="font-extrabold text-slate-900 text-sm">₹{line.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-purple-100">
                    <span className="text-slate-500">Current Qty: {line.quantity}</span>
                    {editingLineId === line.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="1"
                          value={editQty}
                          onChange={(e) => setEditQty(parseInt(e.target.value, 10) || 1)}
                          className="w-16 px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                        <button
                          onClick={() => handleProrationUpdate(line.id)}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingLineId('')}
                          className="px-2 py-1 text-slate-500 text-[11px]"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingLineId(line.id);
                          setEditQty(line.quantity);
                        }}
                        className="text-purple-700 hover:text-purple-900 font-bold flex items-center space-x-1"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        <span>Adjust Qty & Prorate</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic py-4">No recurring subscription items on this quotation.</p>
            )}
          </div>
        </div>

        {/* One-Time Lines Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center space-x-2">
            <IndianRupee className="w-4 h-4 text-emerald-600" />
            <span>One-Time Charges (Hardware / Services)</span>
          </h3>
          <p className="text-xs text-slate-500 mb-4">Capital expenditures and initial setup billed immediately.</p>

          <div className="space-y-3">
            {billingData?.oneTimeLines && billingData.oneTimeLines.length > 0 ? (
              billingData.oneTimeLines.map((line: any) => (
                <div key={line.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 block">{line.productName}</span>
                    <span className="text-slate-500">
                      Qty: {line.quantity} • Disc: {line.discountPercent}%
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 text-sm">₹{line.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic py-4">No one-time purchase items on this quotation.</p>
            )}
          </div>
        </div>
      </div>

      {/* Generated Schedule Projections */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>Projected Billing Calendar Schedule</span>
        </h3>
        <p className="text-xs text-slate-500 mb-6">Next automated milestone billing events stored in the database.</p>

        {billingData?.billingSchedule && billingData.billingSchedule.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {billingData.billingSchedule.map((item: any, idx: number) => (
              <div key={idx} className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 text-xs space-y-2">
                <span className="font-mono text-xs font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 inline-block">
                  Cycle #{idx + 1}
                </span>
                <span className="font-bold text-slate-900 text-sm block">{item.productName}</span>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-slate-500">
                    {new Date(item.nextBillingDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="font-extrabold text-blue-900 text-sm">₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-xs text-slate-400 italic">
            Click "Generate 3-Cycle Billing Schedule" above to calculate future subscription milestones.
          </div>
        )}
      </div>
    </div>
  );
};
