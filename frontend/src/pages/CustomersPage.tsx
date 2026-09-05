import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  ShieldAlert,
  Award,
  IndianRupee,
  FileText,
  Calendar,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react';
import { customersApi } from '../services/api';
import { CustomerDirectoryItem, CustomerTier } from '../types';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDirectoryItem | null>(null);

  // Add customer modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTier, setNewTier] = useState<CustomerTier>('BRONZE');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await customersApi.list();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    try {
      setSubmitting(true);
      await customersApi.create({
        name: newName.trim(),
        email: newEmail.trim(),
        tier: newTier,
      });
      setIsAddModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewTier('BRONZE');
      await fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const goldCount = customers.filter((c) => c.tier === 'GOLD').length;
  const silverCount = customers.filter((c) => c.tier === 'SILVER').length;
  const bronzeCount = customers.filter((c) => c.tier === 'BRONZE').length;
  const totalLTV = customers.reduce((sum, c) => sum + (c.lifetimeValue || 0), 0);

  const getTierBadge = (tier: CustomerTier) => {
    switch (tier) {
      case 'GOLD':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            👑 Gold (15% Ceil)
          </span>
        );
      case 'SILVER':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800 border border-slate-300">
            🥈 Silver (10% Ceil)
          </span>
        );
      case 'BRONZE':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-900 border border-orange-200">
            🥉 Bronze (5% Ceil)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Customer Accounts & Tier Governance</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Manage accounts, discount ceilings, and multi-tier governance rules.
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center space-x-2 bg-[#0b2b68] hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Accounts</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900">{customers.length}</span>
            <span className="text-xs text-blue-600 font-medium">B2B Directory</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm bg-gradient-to-br from-amber-50/40 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Gold Tier (15%)</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-amber-900">{goldCount}</span>
            <span className="text-xs text-amber-700 font-medium">Max 15% discount</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Silver Tier (10%)</span>
            <Award className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900">{silverCount}</span>
            <span className="text-xs text-slate-600 font-medium">Max 10% discount</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-orange-200 shadow-sm bg-gradient-to-br from-orange-50/40 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-orange-800 uppercase tracking-wider">Bronze Tier (5%)</span>
            <ShieldAlert className="w-4 h-4 text-orange-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-orange-900">{bronzeCount}</span>
            <span className="text-xs text-orange-700 font-medium">Max 5% ceiling</span>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search customers by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{filtered.length}</span> registered accounts
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading customer directory...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No customers found matching your search.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-6">Customer Name</th>
                  <th className="py-3.5 px-6">Discount Tier</th>
                  <th className="py-3.5 px-6">Ceiling</th>
                  <th className="py-3.5 px-6 text-center">Quotations</th>
                  <th className="py-3.5 px-6 text-center">Confirmed Deals</th>
                  <th className="py-3.5 px-6 text-right">Lifetime Quoted (₹)</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{c.email}</div>
                    </td>
                    <td className="py-4 px-6">{getTierBadge(c.tier)}</td>
                    <td className="py-4 px-6">
                      <span className="font-mono text-xs font-bold text-slate-700">
                        Up to {c.discountCeiling}%
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center font-medium text-slate-700">
                      {c.totalQuotes}
                    </td>
                    <td className="py-4 px-6 text-center font-medium">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
                        {c.confirmedOrders}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-semibold text-slate-900">
                      ₹{c.lifetimeValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-semibold hover:underline inline-flex items-center space-x-1"
                      >
                        <span>View Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Add New Customer Account</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cyberdyne Systems"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Primary Contact Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. procurement@cyberdyne.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Assigned Discount Governance Tier
                </label>
                <select
                  value={newTier}
                  onChange={(e) => setNewTier(e.target.value as CustomerTier)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="BRONZE">Bronze — Max 5% Discretionary Ceiling</option>
                  <option value="SILVER">Silver — Max 10% Discretionary Ceiling</option>
                  <option value="GOLD">Gold — Max 15% Discretionary Ceiling</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Quotations exceeding this tier ceiling will automatically require multi-level approval.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold bg-[#0b2b68] hover:bg-blue-900 text-white rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedCustomer.name}</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedCustomer.email}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Assigned Tier</span>
                  <div className="mt-1">{getTierBadge(selectedCustomer.tier)}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Discount Ceiling</span>
                  <div className="mt-1 font-bold text-slate-800 text-sm">
                    {selectedCustomer.discountCeiling}% Max
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1">
                <div className="font-semibold flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Governance Enforcement Policy</span>
                </div>
                <p className="text-slate-600">
                  Any quotation created for {selectedCustomer.name} with discount above{' '}
                  <span className="font-bold text-slate-900">{selectedCustomer.discountCeiling}%</span>{' '}
                  will be auto-flagged and submitted to the Sales Manager for approval before customer confirmation.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Quotation History ({selectedCustomer.quotations?.length || 0})
                </h3>
                {selectedCustomer.quotations && selectedCustomer.quotations.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedCustomer.quotations.map((q: any) => (
                      <div
                        key={q.id}
                        className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold text-slate-800">
                            Quote #{q.id.slice(0, 8)}
                          </span>
                          <span className="ml-2 px-1.5 py-0.5 bg-white border rounded text-[10px] font-bold text-slate-600">
                            {q.status}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{q.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                    No quotations generated for this account yet.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-5 py-2 text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
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
