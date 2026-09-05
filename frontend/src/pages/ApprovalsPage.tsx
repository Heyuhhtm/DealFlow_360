import React, { useState, useEffect } from 'react';
import { quotationsApi, approvalsApi } from '../services/api';
import { Quotation, ApprovalStep } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, XCircle, RotateCcw, ShieldCheck, Clock, User, AlertCircle } from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const { user, activeRole } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<{
    quotationId: string;
    stepId: string;
    action: 'APPROVE' | 'REJECT' | 'RETURN';
    approverRole: string;
  } | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const list = await quotationsApi.list();
      // Fetch full details of quotes to get approval steps
      const fullQuotes = await Promise.all(list.map((q) => quotationsApi.getById(q.id)));
      setQuotations(fullQuotes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleAction = async () => {
    if (!actionModal) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await approvalsApi.takeAction(actionModal.quotationId, actionModal.stepId, {
        action: actionModal.action,
        reason: reason || undefined,
      });

      setMessage({
        type: 'success',
        text: `Approval step successfully ${actionModal.action.toLowerCase()}ed!`,
      });
      setActionModal(null);
      setReason('');
      fetchApprovals();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to execute approval action',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter pending approval steps
  const pendingSteps = quotations.flatMap((q) =>
    (q.approvalSteps || [])
      .filter((s) => s.status === 'PENDING')
      .map((s) => ({ ...s, quotation: q }))
  );

  const completedSteps = quotations.flatMap((q) =>
    (q.approvalSteps || [])
      .filter((s) => s.status !== 'PENDING')
      .map((s) => ({ ...s, quotation: q }))
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Approvals & Deal Governance</h2>
          <p className="text-sm text-slate-500 mt-1">
            Review deals with concessions exceeding discount ceilings. Sales Manager & Finance authorization queues.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-semibold bg-blue-50 text-blue-700 px-3.5 py-1.5 rounded-lg border border-blue-200">
          <ShieldCheck className="w-4 h-4" />
          <span>Active Approver Role: {activeRole}</span>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Pending Approvals Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></div>
            <h3 className="text-base font-bold text-slate-900">
              Action Required: Pending Approval Steps ({pendingSteps.length})
            </h3>
          </div>
        </div>

        {pendingSteps.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {pendingSteps.map((step) => {
              const q = step.quotation;
              const isAllowedToAct =
                activeRole === 'ADMIN' || activeRole === step.approverRole;

              return (
                <div key={step.id} className="p-6 hover:bg-slate-50/50 transition">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-bold text-slate-900">{q.customer.name}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Step {step.sequence}: {step.approverRole.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Risk Score: {q.blendedRiskScore.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Total Deal Value: <strong className="text-slate-800">${q.total.toLocaleString()}</strong> •
                        Sales Rep: {q.rep.name}
                      </p>
                      <div className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 max-w-xl">
                        <strong>Lines included:</strong>{' '}
                        {q.lines.map((l) => `${l.productName} (${l.quantity}x, ${l.discountPercent}% off)`).join(' • ')}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2.5 shrink-0">
                      {isAllowedToAct ? (
                        <>
                          <button
                            onClick={() =>
                              setActionModal({
                                quotationId: q.id,
                                stepId: step.id,
                                action: 'APPROVE',
                                approverRole: step.approverRole,
                              })
                            }
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center space-x-1.5 shadow-sm transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>

                          <button
                            onClick={() =>
                              setActionModal({
                                quotationId: q.id,
                                stepId: step.id,
                                action: 'RETURN',
                                approverRole: step.approverRole,
                              })
                            }
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-lg flex items-center space-x-1.5 shadow-sm transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Return to Rep</span>
                          </button>

                          <button
                            onClick={() =>
                              setActionModal({
                                quotationId: q.id,
                                stepId: step.id,
                                action: 'REJECT',
                                approverRole: step.approverRole,
                              })
                            }
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg flex items-center space-x-1.5 shadow-sm transition"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      ) : (
                        <div className="text-xs text-slate-400 italic bg-slate-100 px-3 py-1.5 rounded-lg">
                          Requires {step.approverRole.replace(/_/g, ' ')} sign-in
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 text-xs italic">
            🎉 All quotation approval queues are clear! No pending steps.
          </div>
        )}
      </div>

      {/* Completed Approvals History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4">Historical Approval Records & Audit Log</h3>
        <div className="divide-y divide-slate-100 text-xs">
          {completedSteps.map((step) => (
            <div key={step.id} className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800">{step.quotation.customer.name}</span>
                <span className="text-slate-400 block">
                  Step {step.sequence} ({step.approverRole}) — Acted by: {step.actedBy || 'User'}
                  {step.reason ? ` • Note: "${step.reason}"` : ''}
                </span>
              </div>
              <StatusBadge status={step.status} />
            </div>
          ))}
        </div>
      </div>

      {/* Action Reason Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h4 className="text-base font-bold text-slate-900 mb-2">
              Confirm {actionModal.action} as {actionModal.approverRole.replace(/_/g, ' ')}
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Enter an optional governance reason or feedback for the sales representative.
            </p>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Approved under executive discretion for strategic account growth."
              rows={3}
              className="w-full p-3 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none mb-4"
            ></textarea>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setActionModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={submitting}
                className={`px-5 py-2 text-xs font-bold text-white rounded-lg transition ${
                  actionModal.action === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : actionModal.action === 'REJECT'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {submitting ? 'Submitting...' : `Confirm ${actionModal.action}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
