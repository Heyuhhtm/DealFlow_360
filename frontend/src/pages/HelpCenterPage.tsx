import React, { useState } from 'react';
import {
  HelpCircle,
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  Boxes,
  Receipt,
  Mail,
  Send,
  BookOpen,
  Headphones,
} from 'lucide-react';

interface HelpCenterPageProps {
  onBack?: () => void;
  onNavigateTab?: (tab: string) => void;
}

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags: string[];
}

const FAQ_DATA: FaqItem[] = [
  {
    id: 'discount-ceilings',
    category: 'Quotations & Approvals',
    question: 'How do Customer Tier Discount Ceilings work?',
    answer:
      'DealFlow360 enforces automated discount limits based on customer tier: Bronze (up to 5%), Silver (up to 10%), and Gold (up to 15%). In addition, individual products have their own category caps. If any discount entered exceeds these ceilings, the quotation automatically enters "PENDING_APPROVAL" status, requiring review by a Sales Manager or Finance.',
    tags: ['discount', 'ceilings', 'tier', 'approval', 'bronze', 'silver', 'gold'],
  },
  {
    id: 'approval-workflow',
    category: 'Quotations & Approvals',
    question: 'Why is my quote locked in PENDING_APPROVAL and who can approve it?',
    answer:
      'A quote enters PENDING_APPROVAL whenever the proposed line item discount exceeds the customer ceiling or category cap. Sales Managers can approve single overages up to 5% beyond ceiling. Large overages (>5% above ceiling) require dual authorization by both Sales Manager and Finance. Once approved, the quote becomes valid for confirmation and customer sharing.',
    tags: ['approval', 'finance', 'manager', 'pending', 'lock'],
  },
  {
    id: 'warehouse-splitting',
    category: 'Fulfillment & Warehousing',
    question: 'How does Multi-Warehouse Fulfillment split work?',
    answer:
      'When an order has physical hardware lines, clicking "Fulfillment" evaluates real-time stock across all regional depots (Main Warehouse, East Depot, West Hub). If one facility has insufficient stock, the engine calculates the lowest-shipping-cost multi-warehouse split and presents an explicit summary (e.g. "Main Warehouse: 12 units, East Depot: 3 units"). You can accept the split or manually override depot allocations before locking stock.',
    tags: ['warehouse', 'fulfillment', 'split', 'depot', 'stock', 'inventory'],
  },
  {
    id: 'customer-deal-room',
    category: 'Customer Deal Room',
    question: 'How do customers view, negotiate, and confirm quotes?',
    answer:
      'Sales reps can send a secure, one-click magic link via email or copy the portal URL directly. Customers access their branded Deal Room without needing passwords. In the portal, they can review line items, request counter-discounts with justification notes, or click "Confirm Order" to formally accept the quotation.',
    tags: ['customer', 'portal', 'deal room', 'magic link', 'negotiation', 'confirm'],
  },
  {
    id: 'pdf-gross-margin',
    category: 'Quotations & Approvals',
    question: 'Are internal profit margins visible to customers on PDFs?',
    answer:
      'No. DealFlow360 implements strict Gross Margin Non-Disclosure. All customer-facing PDF exports and portal views completely omit internal unit costs and margin percentages. Margin data is visible only to authenticated internal staff (Admin, Finance, Sales Manager) inside the workspace.',
    tags: ['pdf', 'margin', 'privacy', 'confidentiality', 'cost', 'customer'],
  },
  {
    id: 'pdf-generation-email',
    category: 'Quotations & Approvals',
    question: 'How do I download or email a PDF of the quotation?',
    answer:
      'Navigate to Quotations, select any quotation, and scroll to the bottom action bar. Click "Download PDF" to generate a branded, high-resolution document with full line items, fulfillment details, and billing terms. Click "Email to Customer" to instantly dispatch the PDF along with their portal access link.',
    tags: ['pdf', 'download', 'email', 'share'],
  },
  {
    id: 'invoice-stripe',
    category: 'Invoices & Payments',
    question: 'How are invoices created and marked paid?',
    answer:
      'Once a quotation is confirmed, an invoice can be generated from the Invoices page or directly from the quotation. Invoices reflect line items, tax, and totals. Admin and Finance users can click the action menu to mark an invoice Paid/Unpaid or process payment via Stripe.',
    tags: ['invoice', 'stripe', 'paid', 'payment', 'billing'],
  },
  {
    id: 'admin-delete-permissions',
    category: 'Administration & Security',
    question: 'Who is authorized to delete customers or invoices?',
    answer:
      'Only users with the ADMIN role have permission to delete customers or invoices. When clicking the action dots on an invoice or customer card, the "Delete" option will only execute if you are an authenticated Admin, and you will be asked to confirm before permanent deletion.',
    tags: ['delete', 'admin', 'permissions', 'rbac', 'customers', 'invoices'],
  },
  {
    id: 'subscriptions-management',
    category: 'Subscriptions',
    question: 'How are recurring subscriptions tracked?',
    answer:
      'Products configured with recurring billing cycles (Monthly, Quarterly, Yearly) automatically populate the Subscriptions dashboard upon quotation confirmation. The system tracks Monthly Recurring Revenue (MRR), annual contract value, and upcoming renewal schedules.',
    tags: ['subscription', 'recurring', 'mrr', 'billing', 'renewal'],
  },
  {
    id: 'alerts-and-nudges',
    category: 'Deal Health & Analytics',
    question: 'How do notification alerts and nudge badges work?',
    answer:
      'DealFlow360 runs background health monitors for Stalled Quotes (>7 days without movement), High Discount Anomalies, and Fulfillment Slippages. The notification bell in the top navigation displays active alert counts. Clicking the bell allows you to review details and automatically dismiss or navigate to the affected quote.',
    tags: ['alerts', 'notifications', 'bell', 'nudges', 'deal health', 'stalled'],
  },
];

const CATEGORIES = [
  'All',
  'Quotations & Approvals',
  'Fulfillment & Warehousing',
  'Customer Deal Room',
  'Invoices & Payments',
  'Administration & Security',
];

export const HelpCenterPage: React.FC<HelpCenterPageProps> = ({ onBack, onNavigateTab }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>('discount-ceilings');

  const filteredFaqs = FAQ_DATA.filter((faq) => {
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;

    const matchesQuery =
      faq.question.toLowerCase().includes(query) ||
      faq.answer.toLowerCase().includes(query) ||
      faq.tags.some((t) => t.includes(query));

    return matchesCategory && matchesQuery;
  });

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

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
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Help Center &amp; Documentation</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive guides, workflows, and answers for DealFlow360
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
            Knowledge Base v2.4
          </span>
        </div>
      </div>

      {/* Hero Search Section */}
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50/50 to-indigo-50 border border-purple-100 rounded-2xl space-y-4">
        <div className="max-w-xl">
          <h3 className="text-lg font-bold text-slate-900">How can we help you today?</h3>
          <p className="text-xs text-slate-600 mt-1">
            Search across approvals, discount rules, multi-warehouse fulfillment, invoices, and customer portal guides.
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords: 'discount ceiling', 'split fulfillment', 'margin', 'Stripe'..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition shadow-2xs placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-white/80 hover:bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Quick Start Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateTab?.('quotations')}
          className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-xs transition cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <FileText className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition">
            Discount Ceilings &amp; Approvals
          </h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-normal">
            Understand Bronze, Silver, Gold caps and how overages route to Sales Managers.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab?.('fulfillment')}
          className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-xs transition cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <Boxes className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition">
            Multi-Depot Fulfillment
          </h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-normal">
            Learn how stock reservations and optimal shipping splits are calculated across depots.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab?.('quotations')}
          className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-xs transition cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <Send className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition">
            Customer Deal Room
          </h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-normal">
            Generate and dispatch secure magic links for online counter-offers and quote confirmation.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab?.('invoices')}
          className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-xs transition cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <Receipt className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition">
            Invoicing &amp; Stripe
          </h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-normal">
            Generate invoices from confirmed deals, track paid status, and integrate with Stripe.
          </p>
        </div>
      </div>

      {/* FAQ Accordion Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-600" />
            Frequently Asked Questions ({filteredFaqs.length})
          </h3>
          <span className="text-[11px] text-slate-400">
            Click any question to view answers
          </span>
        </div>

        {filteredFaqs.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
            <p className="text-xs text-slate-500">
              No matching questions found for "{searchQuery}".
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="mt-2 text-xs text-purple-600 font-semibold hover:underline"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map((faq) => {
              const isExpanded = expandedId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition"
                >
                  <button
                    onClick={() => toggleExpand(faq.id)}
                    className="w-full text-left p-4.5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                          {faq.category}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        {faq.question}
                      </h4>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                      <p className="pt-2">{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Support & Contact Desk */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
        <div className="w-10 h-10 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
          <Headphones className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-bold text-slate-900">Still have questions? Our support team is here</h4>
        <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
          Need assistance with complex discount approval rules, multi-warehouse integrations, or custom enterprise setup?
          Reach out to our operations team.
        </p>
        <div className="flex justify-center items-center space-x-3 pt-1">
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Return to Workspace
            </button>
          )}
          <a
            href="mailto:support@dealflow360.com"
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>support@dealflow360.com</span>
          </a>
        </div>
      </div>
    </div>
  );
};
