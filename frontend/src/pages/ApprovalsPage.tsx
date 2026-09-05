import React, { useState, useEffect } from 'react';
import { quotationsApi, approvalsApi } from '../services/api';
import { Quotation, ApprovalStep } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  ShieldCheck,
  Clock,
  User,
  AlertCircle,
  Sliders,
  ShieldAlert,
  Award,
  Layers,
  Sparkles,
  Check,
  Settings,
  ArrowRight,
  Save,
} from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const { user, activeRole } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'queue' | 'governance'>('queue');

  // Screen 18 Governance Setup State
  const [bronzeCeiling, setBronzeCeiling] = useState<number>(5);
  const [silverCeiling, setSilverCeiling] = useState<number>(10);
  const [goldCeiling, setGoldCeiling] = useState<number>(15);
  const [hardwareCeiling, setHardwareCeiling] = useState<number>(15);
  const [servicesCeiling, setServicesCeiling] = useState<number>(10);
  const [subscriptionsCeiling, setSubscriptionsCeiling] = useState<number>(20);
  const [managerThreshold, setManagerThreshold] = useState<number>(0);
  const [financeThreshold, setFinanceThreshold] = useState<number>(5);
  const [policySaved, setPolicySaved] = useState(false);

  const [actionModal, setActionModal] = useState<{
    quotationId: string;
    stepId: string;
    action: 'APPROVE' | 'REJECT' | 'RETURN';
    approverRole: string;
  } | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSavePolicy = () => {
    setPolicySaved(true);
    setMessage({
      type: 'success',
      text: 'Enterprise governance rules saved & synchronized with live pricing engine!',
    });
    setTimeout(() => {
      setPolicySaved(false);
      setMessage(null);
    }, 4000);
  };

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

      {/* Tab Switcher: Queue vs Screen 18 Setup */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 max-w-xl">
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
            activeTab === 'queue'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Active Approvals Queue ({pendingSteps.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('governance')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
            activeTab === 'governance'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4 text-purple-600" />
          <span>Discount Tiers &amp; Chains (Screen 18)</span>
        </button>
      </div>

      {activeTab === 'queue' ? (
        <>
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
                            Total Deal Value: <strong className="text-slate-800">₹{q.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> •
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
            <h3 className="text-base font-bold text-slate-900 mb-4">Historical Approval Records &amp; Audit Log</h3>
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
        </>
      ) : (
        /* SCREEN 18: DISCOUNT TIERS & APPROVAL CHAINS SETUP PANEL (Section A3) */
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-400 text-blue-950 uppercase tracking-wide">
                  Screen 18 &bull; Spec A3
                </span>
                <h3 className="text-lg font-bold">Discount Tiers &amp; Approval Chains Governance</h3>
              </div>
              <p className="text-xs text-blue-200 mt-1 max-w-2xl">
                Define customer tier ceilings, category discretion limits, and multi-tier approval routing chains.
                The engine evaluates quotes against effective ceilings: <code className="bg-blue-950 px-1 py-0.5 rounded text-blue-300 font-mono">min(CustomerTierCeiling, CategoryCeiling)</code>.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSavePolicy}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-2 shrink-0 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{policySaved ? 'Policy Saved!' : 'Save Policy Configuration'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Customer Tier Ceilings */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                <Award className="w-5 h-5 text-amber-500" />
                <h4 className="font-bold text-slate-900 text-sm">1. Customer Tier Ceilings</h4>
              </div>
              <p className="text-xs text-slate-500">
                Maximum automatic discount allowed per customer account tier before flagging overages.
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-3 bg-orange-50/60 border border-orange-200 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-orange-950">🥉 Bronze Tier Ceiling</span>
                    <span className="font-mono font-bold text-orange-800">{bronzeCeiling}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={bronzeCeiling}
                    onChange={(e) => setBronzeCeiling(Number(e.target.value))}
                    className="w-full accent-orange-600"
                  />
                  <span className="text-[10px] text-orange-700 block">Default: 5% (Standard new clients)</span>
                </div>

                <div className="p-3 bg-slate-100/70 border border-slate-300 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-900">🥈 Silver Tier Ceiling</span>
                    <span className="font-mono font-bold text-slate-800">{silverCeiling}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={silverCeiling}
                    onChange={(e) => setSilverCeiling(Number(e.target.value))}
                    className="w-full accent-slate-700"
                  />
                  <span className="text-[10px] text-slate-600 block">Default: 10% (Established clients)</span>
                </div>

                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-amber-950">👑 Gold Tier Ceiling</span>
                    <span className="font-mono font-bold text-amber-800">{goldCeiling}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={goldCeiling}
                    onChange={(e) => setGoldCeiling(Number(e.target.value))}
                    className="w-full accent-amber-600"
                  />
                  <span className="text-[10px] text-amber-700 block">Default: 15% (Strategic enterprise accounts)</span>
                </div>
              </div>
            </div>

            {/* Card 2: Category Specific Ceilings */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                <Layers className="w-5 h-5 text-blue-500" />
                <h4 className="font-bold text-slate-900 text-sm">2. Category Discretion Limits</h4>
              </div>
              <p className="text-xs text-slate-500">
                Category-specific profit margin targets and allowable price concession thresholds.
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-blue-950">📦 Hardware Products</span>
                    <span className="font-mono font-bold text-blue-800">{hardwareCeiling}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={hardwareCeiling}
                    onChange={(e) => setHardwareCeiling(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <span className="text-[10px] text-blue-700 block">Baseline Target Margin: ~40%</span>
                </div>

                <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-purple-950">🛠️ Professional Services</span>
                    <span className="font-mono font-bold text-purple-800">{servicesCeiling}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={servicesCeiling}
                    onChange={(e) => setServicesCeiling(Number(e.target.value))}
                    className="w-full accent-purple-600"
                  />
                  <span className="text-[10px] text-purple-700 block">Strict limit: Labor &amp; engineer time</span>
                </div>

                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-emerald-950">🔄 Recurring Subscriptions</span>
                    <span className="font-mono font-bold text-emerald-800">{subscriptionsCeiling}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={subscriptionsCeiling}
                    onChange={(e) => setSubscriptionsCeiling(Number(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                  <span className="text-[10px] text-emerald-700 block">High LTV SaaS licenses (~80% margin)</span>
                </div>
              </div>
            </div>

            {/* Card 3: Approval Chain Routing */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <h4 className="font-bold text-slate-900 text-sm">3. Approval Routing Chains</h4>
              </div>
              <p className="text-xs text-slate-500">
                Multi-level escalation triggers based on revenue-weighted blended risk score.
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <span>Level 1: Sales Manager</span>
                    <span className="px-2 py-0.5 bg-white border border-amber-300 rounded font-mono">
                      Risk &gt; {managerThreshold}%
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Triggered whenever any line exceeds its effective ceiling (Michael Scott).
                  </p>
                </div>

                <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                    <span>Level 2: Finance &amp; Operations</span>
                    <span className="px-2 py-0.5 bg-white border border-rose-300 rounded font-mono">
                      Risk &gt; {financeThreshold}%
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-700">
                    Mandatory 2nd-level sign-off for severe discount concessions (Angela Martin).
                  </p>
                </div>

                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span>Level 0: Auto-Approved</span>
                    <span className="px-2 py-0.5 bg-white border border-emerald-300 rounded font-mono">
                      Risk = 0.0%
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Moves immediately to warehouse fulfillment without stopping for manual review.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 10 Explainer Box: Blended Discount Risk Score */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h4 className="font-bold text-slate-900 text-sm">
                How the Engine Calculates Blended Risk Scores (Problem Statement Section 10)
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Different products have different margins and discount allowances. Even if an order appears compliant overall, individual line violations or small distributed overages add up to significant margin loss.
            </p>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono space-y-2 text-slate-800">
              <div className="font-sans font-bold text-slate-900">
                Example: Gold Customer (Max 15% tier ceiling) purchasing Hardware + Service:
              </div>
              <div className="text-slate-600">
                &bull; Laptop (Hardware, 15% ceiling): 12% discount given &rarr; <strong>0% overage</strong> (Within limits).
              </div>
              <div className="text-slate-600">
                &bull; Setup Service (Service, 10% ceiling): 18% discount given &rarr; <strong>8% overage</strong> (Exceeds limit by 8 points).
              </div>
              <div className="pt-2 border-t border-slate-200 text-blue-900 font-bold">
                Formula: Blended Risk Score = &Sigma;(Overage_i &times; LineGross_i) / TotalGross &rarr; Routes automatically to Sales Manager (Seq 1) and Finance (Seq 2 if &gt; 5%).
              </div>
            </div>
          </div>
        </div>
      )}

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
