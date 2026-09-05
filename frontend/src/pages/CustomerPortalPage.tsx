import React, { useState, useEffect } from 'react';
import { portalApi, quotationsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Calendar, CheckCircle2, MessageSquare, Info, Send, ShieldAlert, Sparkles } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export const CustomerPortalPage: React.FC = () => {
  const { portalToken, portalCustomerEmail, requestPortalAccess } = useAuth();
  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Portal tabs
  const [activeSubTab, setActiveSubTab] = useState<'quotation' | 'messages' | 'profile'>('quotation');

  // Negotiation Form state
  const [counterDiscount, setCounterDiscount] = useState<string>('15');
  const [justification, setJustification] = useState<string>('Price match with competitor offer');
  const [deliveryDate, setDeliveryDate] = useState<string>('2025-10-15');
  const [selectedLineId, setSelectedLineId] = useState<string>('');
  const [newComment, setNewComment] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch or initialize customer quotation
  useEffect(() => {
    const fetchPortalData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Ensure portal token
        let token = portalToken;
        if (!token) {
          token = await requestPortalAccess(portalCustomerEmail || 'deals@apexenterprises.com');
        }

        // Get quotations available
        const list = await portalApi.getQuotations();
        if (list && list.length > 0) {
          const detail = await portalApi.getQuotation(list[0].id);
          setQuotation(detail);
          if (detail.lines && detail.lines.length > 0) {
            setSelectedLineId(detail.lines[0].id);
          }
        } else {
          // If customer has no quotations yet, fallback to finding sample quotation id from public list
          const internalList = await quotationsApi.list();
          if (internalList.length > 0) {
            const sample = await portalApi.getQuotation(internalList[0].id);
            setQuotation(sample);
            if (sample.lines && sample.lines.length > 0) {
              setSelectedLineId(sample.lines[0].id);
            }
          }
        }
      } catch (err: any) {
        console.error('Portal error:', err);
        setError(err.response?.data?.error?.message || 'Failed to load quotation for portal');
      } finally {
        setLoading(false);
      }
    };

    fetchPortalData();
  }, [portalToken]);

  const handleCounterDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotation) return;

    setSubmitting(true);
    setSuccessMsg(null);
    try {
      const discountNum = parseFloat(counterDiscount);
      const res = await portalApi.counterDiscount(quotation.id, {
        proposedDiscountPercent: discountNum,
        justification,
        lineId: selectedLineId || undefined,
      });

      // Refresh quotation
      const updated = await portalApi.getQuotation(quotation.id);
      setQuotation(updated);
      setSuccessMsg(
        `Counter-discount submitted successfully! Status is now: ${res.quotationStatus} ${
          res.reenteredApproval ? '(Re-entered internal approval)' : ''
        }`
      );
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to submit counter request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmQuotation = async () => {
    if (!quotation) return;
    setSubmitting(true);
    setSuccessMsg(null);
    try {
      await portalApi.confirm(quotation.id);
      const updated = await portalApi.getQuotation(quotation.id);
      setQuotation(updated);
      setSuccessMsg('🎉 Quotation officially accepted and confirmed!');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Could not confirm quotation (may require approval)');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !quotation) return;
    try {
      await portalApi.addComment(quotation.id, {
        lineId: selectedLineId || undefined,
        message: newComment,
      });
      setNewComment('');
      const updated = await portalApi.getQuotation(quotation.id);
      setQuotation(updated);
    } catch (err: any) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Screen Identifier Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            11
          </div>
          <h2 className="text-xl font-bold text-slate-900">Customer Portal</h2>
        </div>

        {/* Sub Navigation matching reference design */}
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveSubTab('quotation')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeSubTab === 'quotation' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📄 My Quotations</span>
          </button>
          <button
            onClick={() => setActiveSubTab('messages')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeSubTab === 'messages' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>💬 Messages</span>
          </button>
          <button
            onClick={() => setActiveSubTab('profile')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeSubTab === 'profile' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>👤 Profile</span>
          </button>
        </div>
      </div>

      <div className="p-8 max-w-4xl mx-auto">
        {/* Title and Description matching reference image */}
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-slate-900">Customer Portal Negotiation Screen</h3>
          <p className="text-sm text-slate-500 mt-1">
            Customer reviews and negotiates the quote directly, no email needed.
          </p>
        </div>

        {/* Status Pill matching reference design */}
        <div className="mb-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
            Status: {quotation?.status ? quotation.status.replace(/_/g, ' ') : 'Under Negotiation'}
          </span>
        </div>

        {successMsg && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-sm flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Line / Customer Comment Table matching reference image */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-8">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Line Item</th>
                <th className="py-3 px-4">Qty</th>
                <th className="py-3 px-4">Unit Price</th>
                <th className="py-3 px-4">Current Disc.</th>
                <th className="py-3 px-4">Customer Comment / Negotiation Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {quotation?.lines?.map((line: any) => {
                const lineComment = quotation.portalComments?.find((c: any) => c.lineId === line.id);
                const isSelected = selectedLineId === line.id;
                return (
                  <tr
                    key={line.id}
                    onClick={() => setSelectedLineId(line.id)}
                    className={`cursor-pointer transition ${
                      isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => setSelectedLineId(line.id)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>{line.productName || 'Hardware Line Item'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{line.quantity}</td>
                    <td className="py-3.5 px-4 text-slate-700">${line.unitPrice.toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-semibold text-blue-700">{line.discountPercent}%</td>
                    <td className="py-3.5 px-4 text-slate-600 italic">
                      {lineComment ? (
                        <span>"{lineComment.message}"</span>
                      ) : (
                        <span className="text-slate-400 font-normal">Can this be 15% off instead of 10%?</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Order Confirmed Banner (Section B8 / Diagram Success Node) */}
        {quotation?.status === 'CONFIRMED' && (
          <div className="mb-6 p-6 bg-gradient-to-br from-emerald-600 to-teal-800 text-white rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
            <div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-200" />
                <h3 className="text-lg font-bold">Order Confirmed &amp; Terms Sealed!</h3>
              </div>
              <p className="text-xs text-emerald-100 mt-1">
                Quotation #{quotation.id.slice(0, 8)} has been officially accepted. Multi-warehouse fulfillment dispatch and billing invoices are now active.
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs font-semibold">
              <span className="bg-white/20 px-3.5 py-1.5 rounded-lg border border-white/20 font-mono">
                Order Total: ${quotation.total?.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Inputs: Counter Discount % & Requested Delivery Date matching reference layout */}
        <form onSubmit={handleCounterDiscount} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Counter Discount %
                </label>
                <span className="text-[11px] font-mono text-slate-500">
                  Pre-approved ceiling: {quotation?.customer?.tier === 'GOLD' ? 15 : quotation?.customer?.tier === 'SILVER' ? 10 : 5}%
                </span>
              </div>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={counterDiscount}
                onChange={(e) => setCounterDiscount(e.target.value)}
                placeholder="Enter discount %"
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />

              {/* Within Limits Real-time Indicator from Diagram */}
              <div className="mt-2">
                {parseFloat(counterDiscount || '0') <=
                (quotation?.customer?.tier === 'GOLD' ? 15 : quotation?.customer?.tier === 'SILVER' ? 10 : 5) ? (
                  <div className="text-[11px] font-semibold text-emerald-700 flex items-center space-x-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    <span>
                      Within pre-approved ceiling ({quotation?.customer?.tier === 'GOLD' ? 15 : quotation?.customer?.tier === 'SILVER' ? 10 : 5}%). Instant one-click confirmation available!
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] font-semibold text-amber-800 flex items-center space-x-1.5 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span>
                      Exceeds auto-approved limit. Submitting request will automatically route back to Sales Manager for approval.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Requested Delivery Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Commercial Justification
            </label>
            <input
              type="text"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="e.g. Seeking bulk concession to close this quarter"
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons matching reference image */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-lg font-semibold text-sm shadow-sm transition disabled:opacity-50"
            >
              Submit Request
            </button>

            <button
              type="button"
              disabled={submitting || quotation?.status === 'CONFIRMED'}
              onClick={handleConfirmQuotation}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm flex items-center space-x-2 shadow-sm transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Quotation</span>
            </button>
          </div>
        </form>

        {/* Informational Yellow Banner matching reference design exactly */}
        <div className="mt-8 bg-amber-50/90 border border-amber-200/90 rounded-xl p-4 flex items-center space-x-3 text-amber-900 text-sm">
          <Info className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="font-medium text-xs leading-relaxed">
            If final terms exceed thresholds, the quote automatically re-enters approval (Screen 5).
          </p>
        </div>

        {/* Real-time Discussion Section */}
        <div className="mt-10 pt-8 border-t border-slate-200">
          <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span>Negotiation Thread & Comments</span>
          </h4>

          <div className="space-y-3 mb-4 max-h-56 overflow-y-auto pr-2">
            {quotation?.portalComments && quotation.portalComments.length > 0 ? (
              quotation.portalComments.map((comment: any) => (
                <div key={comment.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="font-bold text-slate-800">{comment.author}</span>
                    <span>{new Date(comment.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-700">{comment.message}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">No negotiation messages posted yet.</p>
            )}
          </div>

          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ask a question or leave a note about delivery / discount..."
              className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
