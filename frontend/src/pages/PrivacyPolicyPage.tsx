import React from 'react';
import {
  Shield,
  ArrowLeft,
  Lock,
  Eye,
  Database,
  Server,
  FileCheck,
  Printer,
  Mail,
  UserCheck,
} from 'lucide-react';

interface PrivacyPolicyPageProps {
  onBack?: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => {
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
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Privacy Policy</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              DealFlow360 Enterprise Data Protection &amp; Confidentiality Standards
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Effective: September 2025
          </span>
          <button
            onClick={() => window.print()}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title="Print Privacy Policy"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Highlight Box */}
      <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50/60 border border-emerald-100 rounded-2xl text-xs text-emerald-950 space-y-2">
        <div className="flex items-center space-x-2 font-bold text-emerald-900 text-sm">
          <Lock className="w-4 h-4 text-emerald-600" />
          <span>Enterprise Commitment to Data Confidentiality</span>
        </div>
        <p className="leading-relaxed text-slate-600">
          DealFlow360 processes mission-critical commercial transactions, customer accounts, and supply chain logistics.
          We treat commercial quotation details, customer pricing tiers, internal product margins, and warehouse inventory
          as strictly confidential, protected under robust role-based access controls and encrypted data pipelines.
        </p>
      </div>

      {/* Structured Privacy Sections */}
      <div className="space-y-6">
        {/* Section 1 */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center space-x-2.5 text-slate-900 font-bold text-base">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-mono">
              1
            </span>
            <h3>Information We Collect</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            To provide quotation workflows, algorithmic approvals, and fulfillment operations, DealFlow360 collects:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Staff &amp; Account Profiles
              </span>
              <p className="text-[11px] text-slate-500 leading-normal">
                Name, corporate email, credential hashes, assigned role permissions (Admin, Sales Manager, Finance, Sales Rep).
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-600" /> Commercial CRM Records
              </span>
              <p className="text-[11px] text-slate-500 leading-normal">
                Customer names, business contacts, discount tier categories (Bronze, Silver, Gold), and transactional ledger data.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-emerald-600" /> Quotation &amp; Invoicing Data
              </span>
              <p className="text-[11px] text-slate-500 leading-normal">
                Line item SKUs, negotiated unit prices, discount percentages, billing cycles, delivery schedules, and fulfillment depot splits.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-emerald-600" /> Security &amp; Audit Telemetry
              </span>
              <p className="text-[11px] text-slate-500 leading-normal">
                IP addresses, session tokens, audit timestamps, magic link authentications, and state transition history.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center space-x-2.5 text-slate-900 font-bold text-base">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-mono">
              2
            </span>
            <h3>How Information is Used</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Data is strictly utilized for core commercial workflow automation and transaction security:
          </p>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-5">
            <li><strong className="text-slate-800">Automated Approval Routing:</strong> Calculating line and document discounts against customer tier ceilings.</li>
            <li><strong className="text-slate-800">Supply Chain Fulfillment:</strong> Determining optimal warehouse allocation to minimize shipping transit and backorders.</li>
            <li><strong className="text-slate-800">Customer Deal Room:</strong> Delivering personalized, authenticated magic links for quote viewing, negotiation, and confirmation.</li>
            <li><strong className="text-slate-800">Anomaly Detection:</strong> Flagging stalled quotes, margin erosion, and delivery slippages for sales leadership.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center space-x-2.5 text-slate-900 font-bold text-base">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-mono">
              3
            </span>
            <h3>Margin Confidentiality &amp; Sub-Processors</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            We adhere to strict data compartmentalization principles:
          </p>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-600" /> Gross Margin Concealment
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Cost benchmarks and gross margin analytics are restricted to internal staff with authorized roles (Admin, Finance, Sales Manager).
              External PDFs and customer portal endpoints mathematically strip all internal cost structures.
            </p>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed pt-1">
            We do not sell, rent, or monetize your commercial data. Trusted sub-processors (cloud hosting, transactional email delivery, Stripe payment gateways) are bound by strict Data Processing Agreements (DPAs).
          </p>
        </section>

        {/* Section 4 */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center space-x-2.5 text-slate-900 font-bold text-base">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-mono">
              4
            </span>
            <h3>Data Security &amp; Encryption Protocols</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            DealFlow360 implements enterprise defense-in-depth measures:
          </p>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-5">
            <li><strong className="text-slate-800">In-Transit Encryption:</strong> All platform communications are enforced over TLS 1.3 with HSTS headers.</li>
            <li><strong className="text-slate-800">At-Rest Protection:</strong> Relational databases and documents are stored with AES-256 bit hardware-level encryption.</li>
            <li><strong className="text-slate-800">Magic Link Tokens:</strong> Single-use customer portal tokens expire automatically after 72 hours.</li>
            <li><strong className="text-slate-800">Audit Logging:</strong> Every quote creation, discount adjustment, manager approval, and deletion generates a signed audit event.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center space-x-2.5 text-slate-900 font-bold text-base">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-mono">
              5
            </span>
            <h3>Compliance &amp; User Privacy Rights</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            In compliance with GDPR, CCPA, and commercial records regulations:
          </p>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-5">
            <li>Authorized users may request an export of their stored transaction histories and quotation records.</li>
            <li>Customer entities may request updates or rectification of business contact profiles and delivery preferences.</li>
            <li>Confirmed invoices and audit logs are retained for 7 years in accordance with statutory accounting standards.</li>
          </ul>
        </section>
      </div>

      {/* DPO Contact Box */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
        <h4 className="text-sm font-bold text-slate-900">Data Protection Officer &amp; Compliance Inquiries</h4>
        <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
          If you have questions regarding our data privacy practices or wish to submit a Subject Access Request (SAR),
          please contact our dedicated compliance office.
        </p>
        <div className="flex justify-center items-center space-x-3 pt-1">
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Return to Workspace
            </button>
          )}
          <a
            href="mailto:privacy@dealflow360.com"
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>privacy@dealflow360.com</span>
          </a>
        </div>
      </div>
    </div>
  );
};
