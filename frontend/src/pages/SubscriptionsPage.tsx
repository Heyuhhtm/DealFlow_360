import React, { useState, useEffect } from 'react';
import { quotationsApi, billingApi, viewPdfBlob } from '../services/api';
import { QuotationListItem } from '../types';
import {
  RefreshCw,
  Calendar,
  IndianRupee,
  CheckCircle2,
  ArrowRight,
  Zap,
  Calculator,
  FileText,
  Mail,
  ExternalLink,
  Send,
  Loader2,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export const SubscriptionsPage: React.FC = () => {
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>('');
  const [billingData, setBillingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [installmentsTenure, setInstallmentsTenure] = useState<number>(3);
  const [editingLineId, setEditingLineId] = useState<string>('');
  const [editQty, setEditQty] = useState<number>(1);
  const [prorationNote, setProrationNote] = useState<string | null>(null);

  // PDF & Email Reminder State
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [reminderResult, setReminderResult] = useState<{
    message: string;
    previewUrl?: string;
    installmentNumber: number;
  } | null>(null);

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
      setReminderResult(null);
    }
  }, [selectedQuoteId]);

  const handleGenerateSchedule = async () => {
    if (!selectedQuoteId) return;
    setGenerating(true);
    setReminderResult(null);
    try {
      await billingApi.generateSchedule(selectedQuoteId, installmentsTenure);
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

  const handleViewInstallmentPdf = async (billingId: string) => {
    setPdfLoadingId(billingId);
    try {
      const blob = await billingApi.getInstallmentPdf(selectedQuoteId, billingId, 'view');
      viewPdfBlob(blob);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to generate installment PDF');
    } finally {
      setPdfLoadingId(null);
    }
  };

  const handleSendReminder = async (item: any) => {
    setSendingReminderId(item.id);
    setReminderResult(null);
    try {
      const res = await billingApi.sendReminder(selectedQuoteId, item.id);
      setReminderResult({
        message: res.message,
        previewUrl: res.previewUrl,
        installmentNumber: item.installmentNumber,
      });
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to send payment reminder email');
    } finally {
      setSendingReminderId(null);
    }
  };

  const selectedQuote = quotations.find((q) => q.id === selectedQuoteId);

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
        <div className="flex flex-col lg:flex-row items-stretch lg:items-end justify-between gap-4">
          <div className="flex-1 max-w-md">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Deal Quotation
            </label>
            <select
              value={selectedQuoteId}
              onChange={(e) => setSelectedQuoteId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
            >
              {quotations.map((q) => {
                const hasSubs = q.items?.some((it) => it.category === 'SUBSCRIPTION');
                return (
                  <option key={q.id} value={q.id}>
                    {q.customerName} — ₹{q.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({hasSubs ? 'Recurring Subscription' : 'One-Time / EMI Eligible'}) • {q.status}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Installment Tenure (EMI)
              </label>
              <select
                value={installmentsTenure}
                onChange={(e) => setInstallmentsTenure(Number(e.target.value))}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value={3}>3 Installments (Standard Quarterly)</option>
                <option value={6}>6 Installments (6-Month Semi-Annual)</option>
                <option value={12}>12 Installments (Annual 12-Mo EMI)</option>
              </select>
            </div>

            <button
              onClick={handleGenerateSchedule}
              disabled={generating || !selectedQuoteId}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center space-x-2 shrink-0 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Calculating Dates...' : `Generate ${installmentsTenure}-Cycle Billing Schedule`}</span>
            </button>
          </div>
        </div>
      </div>

      {prorationNote && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{prorationNote}</span>
        </div>
      )}

      {/* Email Reminder Success Banner with Ethereal Preview URL */}
      {reminderResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <span className="font-bold block text-sm">Payment Due Reminder Dispatched!</span>
              <span className="text-emerald-800 font-normal">
                {reminderResult.message} • Installment #{reminderResult.installmentNumber} invoice attached.
              </span>
            </div>
          </div>

          {reminderResult.previewUrl && (
            <a
              href={reminderResult.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0 cursor-pointer"
            >
              <span>View Sent Email (Ethereal)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
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
                    <span className="font-extrabold text-slate-900 text-sm">
                      ₹{line.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
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
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingLineId('')}
                          className="px-2 py-1 text-slate-500 text-[11px] cursor-pointer"
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
                        className="text-purple-700 hover:text-purple-900 font-bold flex items-center space-x-1 cursor-pointer"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        <span>Adjust Qty & Prorate</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-purple-200 bg-purple-50/20 text-xs text-slate-500">
                <p className="font-semibold text-purple-950 mb-1">Standard Commercial Order (EMI Financed)</p>
                <p className="text-[11px] text-slate-600">
                  This quotation contains one-time line items (hardware/services). You can finance the entire order total across {installmentsTenure} monthly installments using the generator above.
                </p>
              </div>
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
                  <span className="font-bold text-slate-900 text-sm">
                    ₹{line.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic py-4">No one-time purchase items on this quotation.</p>
            )}
          </div>
        </div>
      </div>

      {/* Generated Schedule Projections (EMI Timeline) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Projected Billing &amp; EMI Calendar Schedule</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Itemized upcoming installment bills. View/download official EMI bills (PDF) or email payment due reminders directly.
            </p>
          </div>

          {selectedQuote && (
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
              Customer: {selectedQuote.customerName}
            </span>
          )}
        </div>

        {billingData?.billingSchedule && billingData.billingSchedule.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {billingData.billingSchedule.map((item: any, idx: number) => {
              const installmentNum = item.installmentNumber || idx + 1;
              const totalCount = item.totalInstallments || billingData.billingSchedule.length;
              const isPdfLoading = pdfLoadingId === item.id;
              const isSendingReminder = sendingReminderId === item.id;
              const dueDate = new Date(item.nextBillingDate);
              const isDueSoon = (dueDate.getTime() - Date.now()) < 35 * 24 * 60 * 60 * 1000;

              return (
                <div
                  key={item.id || idx}
                  className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                        Installment #{installmentNum} of {totalCount}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isDueSoon
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {isDueSoon ? 'Due Soon' : 'Upcoming'}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm mt-3">{item.productName}</h4>
                    <span className="text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-semibold border border-purple-100 inline-block mt-1">
                      Cadence: {item.billingCycle || 'MONTHLY'}
                    </span>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Due Date</span>
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {dueDate.toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Installment Net</span>
                        <span className="text-base font-extrabold text-slate-900">
                          ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: View PDF Bill and Send Due Date Reminder */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleViewInstallmentPdf(item.id)}
                      disabled={isPdfLoading}
                      className="flex-1 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60"
                      title="View / Print official installment invoice PDF"
                    >
                      {isPdfLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                      )}
                      <span>View EMI Bill</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendReminder(item)}
                      disabled={isSendingReminder}
                      className="flex-1 py-2 px-2.5 bg-[#0b2b68] hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer disabled:opacity-60"
                      title="Email due date reminder with invoice PDF attached to customer"
                    >
                      {isSendingReminder ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Send Reminder</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-xs text-slate-500 space-y-2">
            <p className="font-semibold text-slate-700">No Billing or EMI Schedule Generated Yet</p>
            <p className="text-slate-400">
              Select an EMI Tenure ({installmentsTenure} installments) above and click <span className="font-semibold text-blue-600">"Generate {installmentsTenure}-Cycle Billing Schedule"</span> to create the installment payment timeline and official bills.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
