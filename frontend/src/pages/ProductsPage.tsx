import React, { useState, useEffect } from 'react';
import { productsApi } from '../services/api';
import { Product, ProductCategory } from '../types';
import { Package, Search, Filter, Percent, IndianRupee, Layers, Plus, X, CheckCircle2, ShieldAlert, RefreshCw } from 'lucide-react';
import { getSocket } from '../lib/socket';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Add Product Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('HARDWARE');
  const [unitPrice, setUnitPrice] = useState<number>(499.0);
  const [marginPercent, setMarginPercent] = useState<number>(45);
  const [discountCeiling, setDiscountCeiling] = useState<number>(15);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');
  const [initialStock, setInitialStock] = useState<number>(50);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const list = await productsApi.list(selectedCategory || undefined);
      setProducts(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  useEffect(() => {
    const socket = getSocket();
    const handleStockUpdated = () => {
      fetchProducts();
    };

    socket.on('stock-updated', handleStockUpdated);
    return () => {
      socket.off('stock-updated', handleStockUpdated);
    };
  }, [selectedCategory]);

  const handleCategoryChange = (cat: ProductCategory) => {
    setCategory(cat);
    if (cat === 'HARDWARE') {
      setDiscountCeiling(15);
      setMarginPercent(40);
    } else if (cat === 'SERVICE') {
      setDiscountCeiling(10);
      setMarginPercent(65);
    } else if (cat === 'SUBSCRIPTION') {
      setDiscountCeiling(20);
      setMarginPercent(80);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await productsApi.create({
        name: name.trim(),
        category,
        unitPrice: Number(unitPrice),
        marginPercent: Number(marginPercent),
        discountCeiling: Number(discountCeiling),
        billingCycle: category === 'SUBSCRIPTION' ? billingCycle : null,
        initialStock: category === 'HARDWARE' ? Number(initialStock) : undefined,
      });

      setStatusMessage(`✅ Product "${name}" successfully added to catalog!`);
      setCreateModalOpen(false);
      setName('');
      await fetchProducts();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Product Catalog & Pricing Rules</h2>
          <p className="text-sm text-slate-500 mt-1">
            Global catalog with predefined margin targets, category discount ceilings, and live warehouse inventory.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={fetchProducts}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl flex items-center space-x-2 border border-slate-200 transition"
            title="Refresh product stock"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl flex items-center space-x-2 shadow-sm transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center space-x-2 flex-1 max-w-md bg-slate-50 border border-slate-300 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-900 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2">
          {['', 'HARDWARE', 'SERVICE', 'SUBSCRIPTION'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {cat === '' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    p.category === 'HARDWARE'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : p.category === 'SERVICE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-purple-50 text-purple-700 border border-purple-200'
                  }`}
                >
                  {p.category}
                </span>
                {p.billingCycle && (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {p.billingCycle}
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-slate-900 mb-1">{p.name}</h3>
              <p className="text-2xl font-black text-slate-900 mb-4">₹{p.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>

            <div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Standard Margin</span>
                  <span className="font-bold text-slate-800">{p.marginPercent}%</span>
                </div>
                <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <span className="text-amber-800 block text-[10px] uppercase font-bold">Discount Ceiling</span>
                  <span className="font-bold text-amber-900">Max {p.discountCeiling}%</span>
                </div>
              </div>

              {/* Live Inventory Status */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-slate-400" />
                    Depot Stock:
                  </span>
                  {p.category === 'HARDWARE' ? (
                    typeof p.totalStock === 'number' ? (
                      p.totalStock > 10 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          {p.totalStock} units available
                        </span>
                      ) : p.totalStock > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Low Stock: {p.totalStock} units
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Out of Stock (0 units)
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400 text-xs">Tracking live...</span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      ⚡ Instant Provisioning
                    </span>
                  )}
                </div>

                {/* Depot Breakdown for Hardware */}
                {p.category === 'HARDWARE' && p.warehouseStock && p.warehouseStock.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {p.warehouseStock.map((ws, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200"
                      >
                        <span className="font-semibold text-slate-700">{ws.warehouse.name}:</span>
                        <span className={ws.quantity > 0 ? 'text-slate-900 font-bold' : 'text-rose-600 font-bold'}>
                          {ws.quantity}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE NEW PRODUCT MODAL (Section A2 in PDF spec) */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add New Product to Catalog</h3>
                <p className="text-xs text-slate-500">
                  Configure pricing, margins, and discount ceilings according to company governance rules.
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Router X10"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="HARDWARE">Hardware</option>
                    <option value="SERVICE">Service / Onboarding</option>
                    <option value="SUBSCRIPTION">Recurring Subscription</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Unit Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Target Margin (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={marginPercent}
                    onChange={(e) => setMarginPercent(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Discount Ceiling (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={discountCeiling}
                    onChange={(e) => setDiscountCeiling(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              {category === 'SUBSCRIPTION' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Billing Cycle Cadence
                  </label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <option value="MONTHLY">Monthly Billing</option>
                    <option value="QUARTERLY">Quarterly Billing</option>
                    <option value="YEARLY">Yearly Billing (Annual ARR)</option>
                  </select>
                </div>
              )}

              {category === 'HARDWARE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Initial Depot Inventory Allocation (Units)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={initialStock}
                    onChange={(e) => setInitialStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                    placeholder="e.g. 50"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
