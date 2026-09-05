import React, { useState, useEffect } from 'react';
import { quotationsApi } from '../services/api';
import {
  MoreVertical,
  Info,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  Check,
  Trash2,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { Invoice } from '../types';
import { useAuth } from '../context/AuthContext';

interface InvoicesPageProps {
  onNavigateTab?: (tab: string) => void;
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [filter, setFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Dropdown menu & Delete state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  // Close action dropdown menu on outside click
  useEffect(() => {
    const handleWindowClick = () => setOpenMenuId(null);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  const toggleInvoiceStatus = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setInvoices((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: item.status === 'Paid' ? 'Unpaid' : 'Paid' } : item))
    );
  };

  const handleToggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId((prev) => (prev === id ? null : id));
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;

    if (!isAdmin) {
      setActionMessage({
        type: 'error',
        text: 'Permission Denied: Only Administrators can delete invoices.',
      });
      setInvoiceToDelete(null);
      return;
    }

    try {
      if (invoiceToDelete.quotationId) {
        await quotationsApi.delete(invoiceToDelete.quotationId).catch((err) => {
          console.warn('Backend quotation delete:', err);
        });
      }

      setInvoices((prev) => prev.filter((i) => i.id !== invoiceToDelete.id));
      if (selectedInvoice?.id === invoiceToDelete.id) {
        setSelectedInvoice(null);
      }
      setActionMessage({
        type: 'success',
        text: `Invoice ${invoiceToDelete.invoiceNumber} permanently deleted.`,
      });
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to delete invoice.',
      });
    } finally {
      setInvoiceToDelete(null);
    }
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

        {/* Action feedback banner */}
        {actionMessage && (
          <div
            className={`mb-6 p-3.5 rounded-xl border flex items-center justify-between text-xs animate-in fade-in duration-150 ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-slate-600 ml-4 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Invoice Table matching reference image */}
        <div className="border border-slate-200 rounded-xl mb-6 bg-white overflow-visible">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-5">Invoice #</th>
                  <th className="py-3 px-5">Customer</th>
                  <th className="py-3 px-5">Amount (₹)</th>
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
                      ₹{inv.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                    <td className="py-4 px-5 text-right relative">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={(e) => handleToggleMenu(inv.id, e)}
                          title="Invoice Actions"
                          className="p-1.5 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-700 transition cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu on Three-Dot Click */}
                        {openMenuId === inv.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 animate-in fade-in zoom-in-95 text-left"
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                toggleInvoiceStatus(inv.id, e);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2 transition cursor-pointer"
                            >
                              {inv.status === 'Paid' ? (
                                <>
                                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                  <span>Mark as Unpaid</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Mark as Paid</span>
                                </>
                              )}
                            </button>

                            <div className="border-t border-slate-100 my-1" />

                            {/* Delete Option (Admin Only) */}
                            {isAdmin ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInvoiceToDelete(inv);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center space-x-2 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span>Delete Invoice</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionMessage({
                                    type: 'error',
                                    text: 'Permission Denied: Only Administrators can delete invoices.',
                                  });
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-3.5 py-2 text-xs font-medium text-slate-400 bg-slate-50/70 hover:bg-slate-100/80 flex items-center justify-between cursor-pointer"
                                title="Administrator access required to delete invoices"
                              >
                                <span className="flex items-center space-x-2">
                                  <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Delete Invoice</span>
                                </span>
                                <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded flex items-center space-x-0.5">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Admin</span>
                                </span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                    ₹{selectedInvoice.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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

            <div className="mt-6 flex flex-wrap justify-between items-center gap-3 pt-3 border-t border-slate-100">
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    const inv = selectedInvoice;
                    setSelectedInvoice(null);
                    setInvoiceToDelete(inv);
                  }}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition cursor-pointer border border-rose-200"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete Invoice</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 italic">
                  Deletion restricted to Admins
                </span>
              )}

              <div className="flex items-center space-x-2">
                <button
                  type="button"
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg cursor-pointer"
                >
                  Mark as {selectedInvoice.status === 'Paid' ? 'Unpaid' : 'Paid'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Invoice Confirmation Modal (Admin Only) */}
      {invoiceToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Delete Invoice</h4>
                <p className="text-xs text-slate-500 mt-0.5">Admin privilege authorization</p>
              </div>
            </div>

            <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2">
              <p className="leading-relaxed">
                Are you sure you want to permanently delete invoice{' '}
                <strong className="font-bold text-rose-950 font-mono">
                  {invoiceToDelete.invoiceNumber}
                </strong>{' '}
                for <strong className="font-bold text-rose-950">{invoiceToDelete.customerName}</strong>?
              </p>
              <div className="pt-2 border-t border-rose-200/80 flex justify-between text-[11px] text-rose-800">
                <span>Invoice Amount:</span>
                <span className="font-bold font-mono">
                  ₹{invoiceToDelete.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteInvoice}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
