import React from 'react';
import {
  Scale,
  ArrowLeft,
  ShieldCheck,
  EyeOff,
  Printer,
} from 'lucide-react';

interface TermsOfServicePageProps {
  onBack?: () => void;
}

export const TermsOfServicePage: React.FC<TermsOfServicePageProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition cursor-pointer"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Terms of Service</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              DealFlow360 Commercial Sales Operations Platform Agreement
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            Version 2.4 &bull; Sep 2025
          </span>
          <button
            onClick={() => window.print()}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title="Print Terms"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Highlight Box */}
      <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-100 rounded-2xl text-xs text-blue-950 space-y-2">
        <div className="flex items-center space-x-2 font-bold text-blue-900 text-sm">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Commercial Governance &amp; Operating Agreement</span>
        </div>
        <p className="leading-relaxed text-slate-600">
          These Terms of Service govern the creation, algorithmic approval routing, multi-site fulfillment,
          and external customer negotiation of all sales quotations processed through the DealFlow360 platform.
          By utilizing this platform, staff members and counter-parties agree to the governance policies outlined below.
        </p>
      </div>

      {/* Structured Terms Sections */}
      <div className="space-y-6">
        {/* Section 1 */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center space-x-2.5 text-slate-900 font-bold text-base">
            <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-mono">
              1
            </span>
            <h3>Discount Governance &amp; Approval Thresholds</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            DealFlow360 enforces automated discount ceilings based on customer tiering (Bronze: 5%, Silver: 10%, Gold: 15%)
            and strict product category limits. Any quotation exceeding the authorized ceiling immediately triggers an automated
            governance lock into <strong className="text-slate-800">PENDING_APPROVAL</strong> state.
          </p>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-5">
            <li>Discounts exceeding customer ceilings require mandatory <strong className="text-slate-800">Sales Manager</strong> review.</li>
            <li>Weighted discount overages greater than 5% additionally require dual <strong className="text-slate-800">Finance</strong> authorization.</li>
            <li>No unconfirmed order with pending approval steps may be released to fulfillment or invoiced.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center space-x-2.5 text-slate-900 font-bold text-base">
            <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-mono">
              2
            </span>
            <h3>Quotation Lifecycle &amp; Customer Negotiation</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Quotations generated within DealFlow360 represent formal commercial offers valid for the duration specified on the document.
            Customers may review quotes directly via the secure <strong className="text-slate-800">Customer Deal Room</strong>.
          </p>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-5">
            <li>Counter-discount requests submitted by customers automatically re-evaluate risk scores and re-enter approval workflows if thresholds are exceeded.</li>
            <li>Customer confirmation seals the agreement, locks line prices against subsequent ad-hoc modification, and initiates fulfillment preparation.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center space-x-2.5 text-slate-900 font-bold text-base">
            <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-mono">
              3
            </span>
            <h3>Multi-Warehouse Fulfillment &amp; Stock Reservations</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            When hardware order quantities exceed a single facility’s on-hand inventory, DealFlow360 automatically executes
            an optimal multi-site fulfillment split to minimize estimated freight transit costs.
          </p>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-5">
            <li>Confirming fulfillment atomically reserves inventory across designated regional warehouses.</li>
            <li>In the event of inventory shortfalls, backorders are segregated and can be consolidated upon receiving depot replenishment.</li>
            <li>Manual split overrides require supervisory authorization and re-verify stock counts in real time.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center space-x-2.5 text-slate-900 font-bold text-base">
            <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-mono">
              4
            </span>
            <h3>Confidentiality &amp; Gross Margin Non-Disclosure</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Internal unit cost structures, margin percentages, and blended risk algorithms are classified enterprise secrets.
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2">
            <EyeOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Customer-facing PDF quotations and customer negotiation portal views strictly omit internal gross margins.
              Staff members are prohibited from exporting margin percentages to unauthorized parties.
            </span>
          </div>
        </section>

        {/* Section 5 */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center space-x-2.5 text-slate-900 font-bold text-base">
            <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-mono">
              5
            </span>
            <h3>Immutable Audit Logging &amp; Record Integrity</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            All system interactions—including quote line edits, discount overrides, manager approval determinations,
            fulfillment locks, and customer PDF dispatches—are permanently recorded in the system audit log with timestamps
            and user IDs. These logs constitute an immutable evidentiary trail.
          </p>
        </section>
      </div>

      {/* Footer Support Notice */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
        <h4 className="text-sm font-bold text-slate-900">Questions Regarding Commercial Terms?</h4>
        <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
          For legal inquiries, commercial contract templates, or custom SLA agreements, please contact the DealFlow360
          Enterprise Operations Desk.
        </p>
        <div className="flex justify-center space-x-3 pt-1">
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Return to Workspace
            </button>
          )}
          <a
            href="mailto:legal@dealflow360.com"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            Contact Legal Desk
          </a>
        </div>
      </div>
    </div>
  );
};
