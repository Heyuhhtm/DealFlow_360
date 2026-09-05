import React, { useState, useEffect } from 'react';
import { quotationsApi } from '../services/api';
import { MoreVertical, Info, CheckCircle2, XCircle, FileText, Download, Check } from 'lucide-react';
import { Invoice } from '../types';

interface InvoicesPageProps {
  onNavigateTab?: (tab: string) => void;
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({ onNavigateTab }) => {
  const [filter, setFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial seed + live invoices generated from quotations
  useEffect(() => {
    const loadInvoices = async () => {
      setLoading(true);
      try {
        const quotes = await quotationsApi.list();

        // Standard seed invoices matching reference screen
        const baseInvoices: Invoice[] = [
          {
            id: 'inv-1042',
            invoiceNumber: 'INV-1042',
            customerName: 'Acme Corp',
            amount: 2730.0,
            status: 'Unpaid',
            dueDate: 'Sep 10, 2025',
          },
          {
            id: 'inv-1043',
            invoiceNumber: 'INV-1043',
            customerName: 'Acme Corp',
            amount: 48.0,
            status: 'Paid',
            dueDate: 'Sep 15, 2025',
          },
          {
            id: 'inv-1048',
            invoiceNumber: 'INV-1048',
            customerName: 'Nova Retail',
            amount: 97.5,
            status: 'Paid',
            dueDate: 'Aug 30, 2025',
          },
        ];

        // Add real invoices from backend quotations
        quotes.forEach((q, idx) => {
          baseInvoices.push({
            id: q.id,
            invoiceNumber: `INV-${2000 + idx}`,
            customerName: q.customerName,
            amount: q.total,
            status: q.status === 'CONFIRMED' || q.status === 'APPROVED' ? 'Paid' : 'Unpaid',
            dueDate: new Date(q.lastActivityAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            quotationId: q.id,
          });
        });

        setInvoices(baseInvoices);
      } catch (e) {
        console.error('Error fetching quotes for invoices:', e);
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, []);

  const unpaidCount = invoices.filter((i) => i.status === 'Unpaid').length;
  const paidCount = invoices.filter((i) => i.status === 'Paid').length;

  const filteredInvoices = invoices.filter((inv) => {
    if (filter === 'UNPAID') return inv.status === 'Unpaid';
    if (filter === 'PAID') return inv.status === 'Paid';
    return true;
  });

  const toggleInvoiceStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setInvoices((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: item.status === 'Paid' ? 'Unpaid' : 'Paid' } : item))
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Screen Identifier Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            12
          </div>
          <h2 className="text-xl font-bold text-slate-900">Invoices List</h2>
        </div>

        {/* Mini Navigation Sub-header matching reference design */}
        <div className="hidden lg:flex items-center space-x-5 text-xs text-slate-500 font-medium border-b border-transparent">
          {['Quotations', 'Approvals', 'Fulfillment', 'Subscriptions', 'Invoices', 'Deal Health', 'Reports', 'Product'].map(
            (tab) => {
              const isCurrent = tab === 'Invoices';
              return (
                <button
                  key={tab}
                  onClick={() => onNavigateTab && onNavigateTab(tab.toLowerCase().replace(/\s+/g, ''))}
                  className={`pb-1 transition ${
                    isCurrent
                      ? 'text-blue-700 font-bold border-b-2 border-blue-600'
                      : 'hover:text-slate-800'
                  }`}
                >
                  {tab}
                </button>
              );
            }
          )}
        </div>
      </div>

      <div className="p-8 max-w-5xl mx-auto">
        {/* Title and Subtitle matching reference design */}
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-slate-900">Invoices (List)</h3>
          <p className="text-sm text-slate-500 mt-1">
            Every invoice generated from one-time and recurring orders.
          </p>
        </div>

        {/* Counter Pills: [4 Unpaid] (Red), [21 Paid] (Green) matching reference design */}
        <div className="flex items-center space-x-3 mb-6">
          <button
            onClick={() => setFilter(filter === 'UNPAID' ? 'ALL' : 'UNPAID')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center space-x-1.5 shadow-sm ${
              filter === 'UNPAID'
                ? 'bg-red-600 text-white ring-2 ring-red-300'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            <span>{unpaidCount} Unpaid</span>
          </button>

          <button
            onClick={() => setFilter(filter === 'PAID' ? 'ALL' : 'PAID')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center space-x-1.5 shadow-sm ${
              filter === 'PAID'
                ? 'bg-emerald-700 text-white ring-2 ring-emerald-300'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <span>{paidCount} Paid</span>
          </button>

          {filter !== 'ALL' && (
            <button
              onClick={() => setFilter('ALL')}
              className="text-xs text-slate-500 hover:text-slate-800 underline ml-2"
            >
              Show all ({invoices.length})
            </button>
          )}
        </div>

        {/* Invoice Table matching reference image */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-5">Invoice #</th>
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">Amount ($)</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Due Date</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className="hover:bg-slate-50 transition cursor-pointer"
                >
                  <td className="py-4 px-5 font-mono text-xs font-bold text-blue-700">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-4 px-5 font-medium text-slate-900">{inv.customerName}</td>
                  <td className="py-4 px-5 font-semibold text-slate-900">
                    ${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-5">
                    {inv.status === 'Paid' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Unpaid
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-5 text-slate-500 text-xs">{inv.dueDate}</td>
                  <td className="py-4 px-5 text-right">
                    <button
                      onClick={(e) => toggleInvoiceStatus(inv.id, e)}
                      title="Toggle Paid/Unpaid"
                      className="p-1.5 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-700 transition"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Informational Yellow Banner matching reference design exactly */}
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-4 flex items-center space-x-3 text-amber-900 text-sm">
          <Info className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="font-medium text-xs leading-relaxed">
            Click an invoice row to open the full payment and delivery reconciliation detail.
          </p>
        </div>
      </div>

      {/* Reconciliation Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h4 className="text-lg font-bold text-slate-900">
                  Reconciliation: {selectedInvoice.invoiceNumber}
                </h4>
                <p className="text-xs text-slate-500">Customer: {selectedInvoice.customerName}</p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-slate-500 block">Total Due Amount</span>
                  <span className="text-lg font-bold text-slate-900">
                    ${selectedInvoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Current Status</span>
                  <span
                    className={`inline-block font-bold mt-1 px-2.5 py-0.5 rounded ${
                      selectedInvoice.status === 'Paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {selectedInvoice.status}
                  </span>
                </div>
              </div>

              <div className="border border-slate-100 rounded-xl p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Reconciliation:</span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Direct Bank Wire Matched
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fulfillment Reconciliation:</span>
                  <span className="font-semibold text-blue-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Dispatched from Main Warehouse & East Depot
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ERP Sync Status:</span>
                  <span className="font-semibold text-slate-700">Matched to Journal Entry #JE-9921</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setInvoices((prev) =>
                    prev.map((i) =>
                      i.id === selectedInvoice.id
                        ? { ...i, status: i.status === 'Paid' ? 'Unpaid' : 'Paid' }
                        : i
                    )
                  );
                  setSelectedInvoice(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg"
              >
                Mark as {selectedInvoice.status === 'Paid' ? 'Unpaid' : 'Paid'}
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
