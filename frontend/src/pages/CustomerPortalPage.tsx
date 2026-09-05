import React, { useState, useEffect } from 'react';
import { portalApi, quotationsApi, viewPdfBlob, downloadPdfBlob } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2,
  MessageSquare,
  Info,
  Send,
  ShieldAlert,
  Sparkles,
  Building2,
  Mail,
  ShieldCheck,
  User as UserIcon,
  Tag,
  Clock,
  IndianRupee,
  FileText,
  Download,
  Loader2,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { NegotiationThread } from '../components/NegotiationThread';
import { subscribeToQuotation } from '../services/socket';

interface CustomerPortalPageProps {
  currentRoute?: 'quotation' | 'messages' | 'profile';
  onRouteChange?: (route: 'quotation' | 'messages' | 'profile') => void;
}

export const CustomerPortalPage: React.FC<CustomerPortalPageProps> = ({
  currentRoute,
  onRouteChange,
}) => {
  const { portalToken, portalCustomerEmail, requestPortalAccess, switchAccount } = useAuth();
  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Portal tabs
  const [activeSubTab, setActiveSubTab] = useState<'quotation' | 'messages' | 'profile'>(
    currentRoute || 'quotation'
  );

  useEffect(() => {
    if (currentRoute) {
      setActiveSubTab(currentRoute);
    }
  }, [currentRoute]);

  const handleTabChange = (tab: 'quotation' | 'messages' | 'profile') => {
    setActiveSubTab(tab);
    if (onRouteChange) {
      onRouteChange(tab);
    }
  };

  // Negotiation Form state
  const [counterDiscount, setCounterDiscount] = useState<string>('15');
  const [justification, setJustification] = useState<string>('Price match with competitor offer');
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
          // Fallback to finding sample quotation id from public list
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

  // Real-time Push Listener (Socket.io)
  useEffect(() => {
    if (!quotation?.id || !portalToken) return;

    const unsubscribe = subscribeToQuotation({
      quotationId: quotation.id,
      token: portalToken,
      onCommentReceived: (newComment: any) => {
        setQuotation((prev: any) => {
          if (!prev) return prev;
          if (prev.portalComments?.some((c: any) => c.id === newComment.id)) return prev;
          return {
            ...prev,
            portalComments: [...(prev.portalComments || []), newComment],
          };
        });
      },
      onQuotationUpdated: (data: any) => {
        if (data.status) {
          setQuotation((prev: any) => (prev ? { ...prev, status: data.status } : prev));
        }
      },
    });

    return () => unsubscribe();
  }, [quotation?.id, portalToken]);

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

  const [pdfLoading, setPdfLoading] = useState<'view' | 'download' | null>(null);

  const handlePortalViewPdf = async () => {
    if (!quotation?.id) return;
    try {
      setPdfLoading('view');
      const blob = await portalApi.getPdf(quotation.id, 'view');
      viewPdfBlob(blob);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to generate quotation PDF');
    } finally {
      setPdfLoading(null);
    }
  };

  const handlePortalDownloadPdf = async () => {
    if (!quotation?.id) return;
    try {
      setPdfLoading('download');
      const blob = await portalApi.getPdf(quotation.id, 'download');
      downloadPdfBlob(blob, `Quotation-${quotation.id.slice(0, 8)}.pdf`);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to download quotation PDF');
    } finally {
      setPdfLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
      {/* Screen Identifier Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            11
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Customer Deal Room</h2>
            <p className="text-xs text-slate-500">Apex Enterprises Negotiation &amp; Terms Review</p>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => handleTabChange('quotation')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'quotation'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📄 Quotation &amp; Terms</span>
          </button>
          <button
            onClick={() => handleTabChange('messages')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'messages'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>💬 Discussion Thread</span>
          </button>
          <button
            onClick={() => handleTabChange('profile')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'profile'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>👤 Organization Profile</span>
          </button>
        </div>
      </div>

      <div className="p-8 max-w-4xl mx-auto">
        {/* ================= VIEW 1: QUOTATION & TERMS ================= */}
        {activeSubTab === 'quotation' && (
          <div>
            {/* Title, Description & PDF Action Buttons */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Customer Portal Negotiation Screen</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Customer reviews and negotiates the quote directly, no email needed.
                </p>
                <div className="mt-2.5 flex items-center space-x-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                    Status: {quotation?.status ? quotation.status.replace(/_/g, ' ') : 'Under Negotiation'}
                  </span>
                  {quotation?.id && (
                    <span className="text-xs font-mono text-slate-400">
                      ID: #{quotation.id.slice(0, 8)}
                    </span>
                  )}
                </div>
              </div>

              {/* PROMPT C2: PDF View/Download Buttons */}
              {quotation?.id && (
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={handlePortalViewPdf}
                    disabled={pdfLoading === 'view'}
                    className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition cursor-pointer disabled:opacity-50"
                    title="View official commercial quotation PDF in new browser tab"
                  >
                    {pdfLoading === 'view' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    <span>View Official PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePortalDownloadPdf}
                    disabled={pdfLoading === 'download'}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition cursor-pointer disabled:opacity-50"
                    title="Download official PDF copy"
                  >
                    {pdfLoading === 'download' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                    )}
                    <span>Download PDF</span>
                  </button>
                </div>
              )}
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

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-8">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Line Item</th>
                    <th className="py-3 px-4">Qty</th>
                    <th className="py-3 px-4">Unit Price (₹)</th>
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
                        <td className="py-3.5 px-4 text-slate-700">₹{line.unitPrice.toFixed(2)}</td>
                        <td className="py-3.5 px-4 font-semibold text-blue-700">{line.discountPercent}%</td>
                        <td className="py-3.5 px-4 text-slate-600 italic text-xs">
                          {lineComment ? (
                            <span>"{lineComment.message}"</span>
                          ) : (
                            <span className="text-slate-400 font-normal">No specific note for this line</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Order Confirmed Banner (When Won) */}
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
                    Order Total: ₹{quotation.total?.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Counter-Proposal Negotiation Form */}
            <form onSubmit={handleCounterDiscount} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Counter Discount (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={counterDiscount}
                      onChange={(e) => setCounterDiscount(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3.5 top-2.5 text-slate-400 font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Target Line Item
                  </label>
                  <select
                    value={selectedLineId}
                    onChange={(e) => setSelectedLineId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {quotation?.lines?.map((line: any) => (
                      <option key={line.id} value={line.id}>
                        {line.productName} ({line.quantity} units @ ₹{line.unitPrice})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Customer Justification / Business Reason
                </label>
                <textarea
                  rows={3}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Provide context for requested terms (e.g. competitor matching, annual volume commitment)..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={submitting || quotation?.status === 'CONFIRMED'}
                  className="px-6 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-lg font-semibold text-sm shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>

                <button
                  type="button"
                  disabled={submitting || quotation?.status === 'CONFIRMED'}
                  onClick={handleConfirmQuotation}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm flex items-center space-x-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Quotation</span>
                </button>
              </div>
            </form>

            {/* Informational Yellow Banner matching reference design */}
            <div className="mt-8 bg-amber-50/90 border border-amber-200/90 rounded-xl p-4 flex items-center space-x-3 text-amber-900 text-sm">
              <Info className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="font-medium text-xs leading-relaxed">
                If final terms exceed customer tier thresholds, the quote automatically re-enters internal approval.
              </p>
            </div>

            {/* Thread Preview */}
            <div className="mt-10 pt-8 border-t border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span>Recent Discussion Notes</span>
                </h4>
                <button
                  onClick={() => handleTabChange('messages')}
                  className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  View Full Thread &rarr;
                </button>
              </div>

              <div className="space-y-3 mb-4 max-h-56 overflow-y-auto pr-2">
                {quotation?.portalComments && quotation.portalComments.length > 0 ? (
                  quotation.portalComments.slice(-3).map((comment: any) => (
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
                  placeholder="Leave a quick note on this deal..."
                  className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= VIEW 2: FULL DISCUSSION THREAD ================= */}
        {activeSubTab === 'messages' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Negotiation Thread &amp; Messages</h3>
              <p className="text-sm text-slate-500 mt-1">
                Direct real-time messaging between your team and the DealFlow360 account executives.
              </p>
            </div>

            {quotation && (
              <NegotiationThread
                quotationId={quotation.id}
                initialComments={quotation.portalComments || []}
                token={portalToken || ''}
                isPortal={true}
                currentUserEmail={portalCustomerEmail || ''}
                onStatusChanged={(data: { quotationId: string; newStatus: string }) => {
                  setQuotation((prev: any) => (prev ? { ...prev, status: data.newStatus } : prev));
                }}
              />
            )}
          </div>
        )}

        {/* ================= VIEW 3: ORGANIZATION PROFILE ================= */}
        {activeSubTab === 'profile' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Organization Profile &amp; Terms</h3>
              <p className="text-sm text-slate-500 mt-1">
                Account tier, discount limits, and assigned DealFlow360 account executives.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Apex Enterprises Inc.</h4>
                    <p className="text-xs text-slate-500 font-mono">Account ID: CUST-APEX-001</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-200 text-xs space-y-2 pt-2">
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Authorized Contact:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {portalCustomerEmail || 'deals@apexenterprises.com'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Tier Level:</span>
                    <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      GOLD (Tier 1 Strategic)
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Auto-Approved Discount Ceiling:</span>
                    <span className="font-bold text-emerald-700">15% Max Ceiling</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Payment Terms:</span>
                    <span className="font-semibold text-slate-800">Net 30 Days</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Assigned DealFlow360 Team</h4>
                    <p className="text-xs text-slate-500">Dedicated Enterprise Support</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-200 text-xs space-y-2 pt-2">
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Account Executive:</span>
                    <span className="font-semibold text-slate-800">Sarah Connor (Sales Rep)</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Sales Manager:</span>
                    <span className="font-semibold text-slate-800">Michael Scott</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Finance Lead:</span>
                    <span className="font-semibold text-slate-800">Angela Martin</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Session Security:</span>
                    <span className="font-mono text-emerald-700 font-semibold">TLS 1.3 &bull; Magic Link Validated</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Management Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Switching accounts will terminate this encrypted portal session.
              </span>
              <button
                onClick={switchAccount}
                className="px-4 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Switch Account / Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
