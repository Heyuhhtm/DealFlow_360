import React, { useEffect, useState } from 'react';
import {
  Boxes,
  Building2,
  TrendingUp,
  AlertTriangle,
  Plus,
  RefreshCw,
  CheckCircle2,
  Package,
  X,
  Truck,
  Pencil,
  Trash2,
  Sliders,
  ShieldAlert,
  ShieldCheck,
  IndianRupee,
  Minus,
} from 'lucide-react';
import { warehousesApi, productsApi } from '../services/api';
import { Warehouse, Product, WarehouseStockItem } from '../types';
import { useAuth } from '../context/AuthContext';

export const WarehousesPage: React.FC = () => {
  const { activeRole } = useAuth();
  const isAdmin = activeRole === 'ADMIN';

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Banner notification state
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editDetailsWarehouse, setEditDetailsWarehouse] = useState<Warehouse | null>(null);
  const [editStockWarehouse, setEditStockWarehouse] = useState<Warehouse | null>(null);
  const [deleteWarehouse, setDeleteWarehouse] = useState<Warehouse | null>(null);

  // Create warehouse form state
  const [createName, setCreateName] = useState('');
  const [createShippingCost, setCreateShippingCost] = useState(15);
  const [createInitialStock, setCreateInitialStock] = useState<Record<string, number>>({});

  // Edit details form state
  const [editName, setEditName] = useState('');
  const [editShippingCost, setEditShippingCost] = useState(15);

  // Edit stock form state
  const [stockQuantities, setStockQuantities] = useState<Record<string, number>>({});

  // Submitting state
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [whData, prodData] = await Promise.all([
        warehousesApi.list(),
        productsApi.list(),
      ]);
      setWarehouses(whData);
      setProducts(prodData);
    } catch (err: any) {
      console.error('Failed to load warehouses data:', err);
      setBanner({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to load warehouses and product catalog.',
      });
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: Create Warehouse
  // -------------------------------------------------------------
  const handleOpenCreateModal = () => {
    setCreateName('');
    setCreateShippingCost(15);
    const initialMap: Record<string, number> = {};
    products.forEach((p) => {
      initialMap[p.id] = p.category === 'HARDWARE' ? 20 : 0;
    });
    setCreateInitialStock(initialMap);
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;

    try {
      setSubmitting(true);
      const stockArray = Object.entries(createInitialStock)
        .filter(([_, qty]) => qty > 0)
        .map(([productId, quantity]) => ({ productId, quantity }));

      await warehousesApi.create({
        name: createName.trim(),
        shippingCostBase: Number(createShippingCost) || 10,
        initialStock: stockArray,
      });

      setBanner({
        type: 'success',
        text: `Warehouse "${createName.trim()}" created successfully.`,
      });
      setCreateModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setBanner({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to create warehouse.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: Edit Details
  // -------------------------------------------------------------
  const handleOpenEditDetails = (wh: Warehouse) => {
    setEditDetailsWarehouse(wh);
    setEditName(wh.name);
    setEditShippingCost(wh.shippingCostBase);
  };

  const handleEditDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDetailsWarehouse || !editName.trim()) return;

    try {
      setSubmitting(true);
      await warehousesApi.update(editDetailsWarehouse.id, {
        name: editName.trim(),
        shippingCostBase: Number(editShippingCost) || 0,
      });

      setBanner({
        type: 'success',
        text: `Warehouse "${editName.trim()}" updated successfully.`,
      });
      setEditDetailsWarehouse(null);
      await fetchData();
    } catch (err: any) {
      setBanner({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to update warehouse details.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: Edit Stock
  // -------------------------------------------------------------
  const handleOpenEditStock = async (wh: Warehouse) => {
    setEditStockWarehouse(wh);
    // Initialize stockQuantities from warehouse stock
    const qtyMap: Record<string, number> = {};
    wh.stock.forEach((s) => {
      qtyMap[s.productId] = s.quantity;
    });
    // Ensure all products are mapped
    products.forEach((p) => {
      if (qtyMap[p.id] === undefined) {
        qtyMap[p.id] = 0;
      }
    });
    setStockQuantities(qtyMap);
  };

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStockWarehouse) return;

    try {
      setSubmitting(true);
      const updates = Object.entries(stockQuantities).map(([productId, quantity]) => ({
        productId,
        quantity: Math.max(0, Number(quantity) || 0),
      }));

      await warehousesApi.updateStock(editStockWarehouse.id, updates);

      setBanner({
        type: 'success',
        text: `Stock levels for "${editStockWarehouse.name}" updated successfully.`,
      });
      setEditStockWarehouse(null);
      await fetchData();
    } catch (err: any) {
      setBanner({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to update stock levels.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: Delete Warehouse
  // -------------------------------------------------------------
  const handleDeleteSubmit = async () => {
    if (!deleteWarehouse) return;

    try {
      setSubmitting(true);
      await warehousesApi.delete(deleteWarehouse.id);

      setBanner({
        type: 'success',
        text: `Warehouse "${deleteWarehouse.name}" was successfully deleted.`,
      });
      setDeleteWarehouse(null);
      await fetchData();
    } catch (err: any) {
      // Show exact backend error clearly (e.g. referenced in historical fulfillment splits)
      const message =
        err.response?.data?.error?.message ||
        'Cannot delete warehouse because it is referenced in historical fulfillment splits.';
      setBanner({
        type: 'error',
        text: message,
      });
      setDeleteWarehouse(null);
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // ROLE RESTRICTION GUARD: ADMIN ONLY
  // -------------------------------------------------------------
  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-2xl mx-auto my-12 shadow-sm">
        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Administrator Access Required</h2>
        <p className="text-sm text-slate-600 mt-2">
          Warehouse node configuration, shipping base costs, and stock allocation controls are restricted
          exclusively to the <span className="font-bold text-slate-900">ADMIN</span> role.
        </p>
        <div className="mt-6 text-xs text-slate-400 font-mono bg-slate-50 py-2 px-4 rounded-lg inline-block">
          Active Role: {activeRole || 'UNAUTHORIZED'}
        </div>
      </div>
    );
  }

  // Calculate aggregated stats
  const totalStockUnits = warehouses.reduce(
    (sum, wh) => sum + (wh.stock || []).reduce((sSum, s) => sSum + s.quantity, 0),
    0
  );
  const avgShippingCost =
    warehouses.length > 0
      ? warehouses.reduce((sum, wh) => sum + wh.shippingCostBase, 0) / warehouses.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  Warehouse &amp; Inventory Management
                </h1>
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[11px] font-bold">
                  Admin Only
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Manage fulfillment distribution depots, live warehouse stock allocations, and base shipping rules.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center space-x-2 bg-[#0b2b68] hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Warehouse</span>
          </button>
        </div>
      </div>

      {/* Banner Feedback Alert */}
      {banner && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border flex items-center justify-between animate-in fade-in ${
            banner.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {banner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
          <button
            onClick={() => setBanner(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Hubs
            </span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900">{warehouses.length}</span>
            <span className="text-xs text-blue-600 font-medium">Distribution Depots</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Stock Units
            </span>
            <Boxes className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900 font-mono">{totalStockUnits}</span>
            <span className="text-xs text-emerald-600 font-medium">All Depots</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Avg Base Shipping
            </span>
            <Truck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900 font-mono">
              ₹{avgShippingCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-purple-600 font-medium">Freight Baseline</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Catalog SKUs
            </span>
            <Package className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900">{products.length}</span>
            <span className="text-xs text-amber-600 font-medium">Available Products</span>
          </div>
        </div>
      </div>

      {/* Warehouses Cards & Stock Tables */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
          Loading warehouses and depot inventory...
        </div>
      ) : warehouses.length === 0 ? (
        /* Empty State */
        <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Warehouses Registered Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Add your first regional distribution depot to enable inventory tracking, auto-split fulfillment, and backorder management.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-[#0b2b68] hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-sm transition inline-flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Warehouse</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {warehouses.map((wh) => {
            const isMain = wh.name.toLowerCase().includes('main');
            const totalDepotUnits = (wh.stock || []).reduce((sum, s) => sum + s.quantity, 0);

            return (
              <div
                key={wh.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition"
              >
                {/* Warehouse Card Header */}
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                  <div className="flex items-center space-x-3.5">
                    <div
                      className={`p-3 rounded-xl ${
                        isMain ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-lg font-bold text-slate-900">{wh.name}</h2>
                        {isMain ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
                            Primary Hub
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold">
                            Regional Depot
                          </span>
                        )}
                        {wh.splitsCount && wh.splitsCount > 0 ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-semibold">
                            {wh.splitsCount} Fulfillment Splits
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center space-x-4 mt-1 text-xs text-slate-500">
                        <span>
                          Base Shipping:{' '}
                          <strong className="text-slate-800 font-mono">
                            ₹{wh.shippingCostBase.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Total Stock:{' '}
                          <strong className="text-blue-700 font-mono">{totalDepotUnits} units</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit Details, Edit Stock, Delete */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenEditDetails(wh)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer"
                      title="Edit Warehouse Details"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit Details</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditStock(wh)}
                      className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                      title="Edit Depot Inventory Levels"
                    >
                      <Sliders className="w-3.5 h-3.5 text-blue-600" />
                      <span>Edit Stock</span>
                    </button>

                    <button
                      onClick={() => setDeleteWarehouse(wh)}
                      className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition cursor-pointer"
                      title="Delete Warehouse"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stock Table for this Warehouse */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-6">Product / SKU</th>
                        <th className="py-3 px-6">Category</th>
                        <th className="py-3 px-6 text-right">Unit Price (₹)</th>
                        <th className="py-3 px-6 text-center">Depot Quantity</th>
                        <th className="py-3 px-6 text-right">Inventory Health</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(wh.stock || []).map((item) => {
                        const isHardware = item.category === 'HARDWARE';
                        const qty = item.quantity;
                        let statusText = 'Healthy';
                        let statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';

                        if (isHardware) {
                          if (qty === 0) {
                            statusText = 'Out of Stock (0)';
                            statusBadge = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
                          } else if (qty <= 5) {
                            statusText = 'Critical Stock (≤5)';
                            statusBadge = 'bg-red-50 text-red-700 border-red-200 font-bold';
                          } else if (qty <= 20) {
                            statusText = 'Low Stock (≤20)';
                            statusBadge = 'bg-amber-50 text-amber-800 border-amber-200';
                          }
                        } else {
                          statusText = 'Auto-Provisioned';
                          statusBadge = 'bg-slate-100 text-slate-600 border-slate-200';
                        }

                        return (
                          <tr key={item.productId} className="hover:bg-slate-50/50 transition">
                            <td className="py-3 px-6 font-semibold text-slate-900">
                              {item.productName}
                            </td>
                            <td className="py-3 px-6">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  item.category === 'HARDWARE'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : item.category === 'SERVICE'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {item.category || 'PRODUCT'}
                              </span>
                            </td>
                            <td className="py-3 px-6 text-right font-mono text-slate-700">
                              {typeof item.unitPrice === 'number'
                                ? `₹${item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                : '—'}
                            </td>
                            <td className="py-3 px-6 text-center font-mono font-bold text-sm">
                              <span
                                className={
                                  isHardware && qty === 0
                                    ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded'
                                    : isHardware && qty <= 5
                                    ? 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded'
                                    : 'text-slate-900'
                                }
                              >
                                {isHardware ? qty : '∞ (Digital)'}
                              </span>
                            </td>
                            <td className="py-3 px-6 text-right">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] border ${statusBadge}`}>
                                {statusText}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================= */}
      {/* DIALOG 1: NEW WAREHOUSE MODAL                                */}
      {/* ============================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Add New Warehouse Depot</h2>
                  <p className="text-xs text-slate-500">Configure a regional distribution center for auto-split fulfillment.</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4 flex-1 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Warehouse Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hyderabad Regional Hub"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Base Shipping Cost (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={createShippingCost}
                    onChange={(e) => setCreateShippingCost(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Default base freight fee applied to shipments dispatched from this facility.
                </p>
              </div>

              {/* Initial Stock Configuration */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                  Initial Stock Allocation (Optional)
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50">
                  {products.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <div className="truncate max-w-[240px]">
                        <span className="font-semibold text-slate-800">{p.name}</span>
                        <span className="ml-1.5 text-[10px] text-slate-400 uppercase">({p.category})</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="number"
                          min="0"
                          value={createInitialStock[p.id] ?? 0}
                          onChange={(e) =>
                            setCreateInitialStock((prev) => ({
                              ...prev,
                              [p.id]: Math.max(0, parseInt(e.target.value, 10) || 0),
                            }))
                          }
                          className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-center font-mono text-xs font-semibold"
                        />
                        <span className="text-[10px] text-slate-400">units</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-[#0b2b68] hover:bg-blue-900 text-white rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Creating...' : 'Create Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* DIALOG 2: EDIT WAREHOUSE DETAILS MODAL                       */}
      {/* ============================================================= */}
      {editDetailsWarehouse && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Edit Warehouse Details</h3>
              </div>
              <button
                onClick={() => setEditDetailsWarehouse(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditDetailsSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Warehouse Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Base Shipping Cost (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={editShippingCost}
                    onChange={(e) => setEditShippingCost(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditDetailsWarehouse(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-[#0b2b68] hover:bg-blue-900 text-white rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* DIALOG 3: EDIT STOCK QUANTITIES MODAL                        */}
      {/* ============================================================= */}
      {editStockWarehouse && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Adjust Inventory: {editStockWarehouse.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Directly modify stock units or use steppers. Changes apply immediately to fulfillment calculation.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditStockWarehouse(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="mt-4 flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto pr-1 space-y-2 divide-y divide-slate-100">
                {products.map((p) => {
                  const currentQty = stockQuantities[p.id] ?? 0;

                  return (
                    <div
                      key={p.id}
                      className="pt-2.5 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <span className="font-semibold text-xs text-slate-900">{p.name}</span>
                        <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-slate-400">
                          <span>{p.category}</span>
                          <span>•</span>
                          <span>₹{p.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-auto">
                        {/* Stepper Minus */}
                        <button
                          type="button"
                          onClick={() =>
                            setStockQuantities((prev) => ({
                              ...prev,
                              [p.id]: Math.max(0, currentQty - 5),
                            }))
                          }
                          className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                          title="Subtract 5 units"
                        >
                          -5
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setStockQuantities((prev) => ({
                              ...prev,
                              [p.id]: Math.max(0, currentQty - 1),
                            }))
                          }
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                          title="Subtract 1 unit"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        {/* Direct input */}
                        <input
                          type="number"
                          min="0"
                          value={currentQty}
                          onChange={(e) =>
                            setStockQuantities((prev) => ({
                              ...prev,
                              [p.id]: Math.max(0, parseInt(e.target.value, 10) || 0),
                            }))
                          }
                          className="w-20 px-2.5 py-1.5 border border-slate-300 rounded-lg text-center font-mono text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        />

                        {/* Stepper Plus */}
                        <button
                          type="button"
                          onClick={() =>
                            setStockQuantities((prev) => ({
                              ...prev,
                              [p.id]: currentQty + 1,
                            }))
                          }
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                          title="Add 1 unit"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setStockQuantities((prev) => ({
                              ...prev,
                              [p.id]: currentQty + 10,
                            }))
                          }
                          className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                          title="Add 10 units"
                        >
                          +10
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => setEditStockWarehouse(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-[#0b2b68] hover:bg-blue-900 text-white rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving Stock...' : 'Save Stock Levels'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* DIALOG 4: DELETE WAREHOUSE CONFIRMATION MODAL               */}
      {/* ============================================================= */}
      {deleteWarehouse && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Warehouse Depot</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-bold text-slate-800">"{deleteWarehouse.name}"</span>?
                </p>
              </div>
            </div>

            {deleteWarehouse.splitsCount && deleteWarehouse.splitsCount > 0 ? (
              /* Warning if referenced in fulfillment splits */
              <div className="mt-4 p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
                <div className="font-bold flex items-center space-x-1 text-amber-950">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>Cannot Delete: Referenced in Historical Orders</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  This warehouse is currently linked to{' '}
                  <span className="font-bold">{deleteWarehouse.splitsCount} fulfillment split(s)</span> in
                  confirmed sales orders. Deleting it would break historical delivery and audit records.
                </p>
              </div>
            ) : (
              <div className="mt-4 p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                <div className="font-bold">⚠️ Irreversible Action</div>
                <p className="text-[11px] text-rose-700">
                  Deleting this warehouse will remove all associated depot stock counts. It has not been used in any
                  order fulfillments, so it is safe to delete.
                </p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setDeleteWarehouse(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || (deleteWarehouse.splitsCount ? deleteWarehouse.splitsCount > 0 : false)}
                onClick={handleDeleteSubmit}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{submitting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
