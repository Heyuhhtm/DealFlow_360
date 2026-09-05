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
  ArrowRightLeft,
} from 'lucide-react';
import { warehousesApi, productsApi } from '../services/api';
import { Warehouse, Product } from '../types';

export const WarehousesPage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [replenishModalOpen, setReplenishModalOpen] = useState(false);

  // Replenish form state
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [replenishQuantity, setReplenishQuantity] = useState(25);
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
      if (whData.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(whData[0].id);
      }
      if (prodData.length > 0 && !selectedProductId) {
        setSelectedProductId(prodData[0].id);
      }
    } catch (err) {
      console.error('Failed to load warehouses data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReplenish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouseId || !selectedProductId || replenishQuantity <= 0) return;

    try {
      setSubmitting(true);
      await warehousesApi.replenishStock(
        selectedWarehouseId,
        selectedProductId,
        Number(replenishQuantity)
      );
      setReplenishModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to replenish stock');
    } finally {
      setSubmitting(false);
    }
  };

  // Build a product-centric inventory matrix
  const inventoryRows = products.map((product) => {
    let mainWhStock = 0;
    let eastDepotStock = 0;

    warehouses.forEach((wh) => {
      const stockItem = wh.stock.find((s) => s.productId === product.id);
      if (stockItem) {
        if (wh.name.toLowerCase().includes('main')) {
          mainWhStock += stockItem.quantity;
        } else {
          eastDepotStock += stockItem.quantity;
        }
      }
    });

    const totalStock = mainWhStock + eastDepotStock;
    let status: 'IN_STOCK' | 'LOW_STOCK' | 'CRITICAL' = 'IN_STOCK';
    if (product.category === 'HARDWARE') {
      if (totalStock <= 5) status = 'CRITICAL';
      else if (totalStock <= 20) status = 'LOW_STOCK';
    }

    return {
      product,
      mainWhStock,
      eastDepotStock,
      totalStock,
      status,
    };
  });

  const totalHardwareUnits = inventoryRows
    .filter((r) => r.product.category === 'HARDWARE')
    .reduce((sum, r) => sum + r.totalStock, 0);

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
              <h1 className="text-2xl font-bold text-slate-900">
                Warehouse & Fulfillment Stock Management
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Manage fulfillment depots, live inventories, and replenishment rules for auto-split fulfillment.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setReplenishModalOpen(true)}
            className="inline-flex items-center justify-center space-x-2 bg-[#0b2b68] hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Replenish Stock</span>
          </button>
        </div>
      </div>

      {/* Warehouse Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {warehouses.map((wh) => {
          const totalUnits = wh.stock.reduce((sum, s) => sum + s.quantity, 0);
          const isMain = wh.name.toLowerCase().includes('main');

          return (
            <div
              key={wh.id}
              className={`p-6 rounded-2xl border shadow-sm transition ${
                isMain
                  ? 'bg-gradient-to-br from-blue-50/50 via-white to-white border-blue-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`p-2 rounded-xl ${
                      isMain ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{wh.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">Primary Fulfillment Node</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
                  Active Depot
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Base Shipping</span>
                  <div className="font-bold text-slate-900 text-lg mt-0.5">
                    ${wh.shippingCostBase.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Total In Stock</span>
                  <div className="font-bold text-blue-700 text-lg mt-0.5 font-mono">
                    {totalUnits} units
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100/60 flex items-center justify-between text-xs text-slate-500">
                <span>Auto-Split Weight:</span>
                <span className="font-medium text-slate-800">
                  {isMain ? '1.0x (Preferred Node)' : '2.5x (Higher Cost)'}
                </span>
              </div>
            </div>
          );
        })}

        {/* Global Stock Stats */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Hardware Capacity
              </span>
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div className="mt-3">
              <div className="text-3xl font-bold text-slate-900 font-mono">
                {totalHardwareUnits} <span className="text-sm font-normal text-slate-500">units</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Distributed across {warehouses.length} physical distribution centers
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p>
              Auto-split algorithm checks Main Warehouse first; if quantity &gt; available stock, it splits to East Depot.
            </p>
          </div>
        </div>
      </div>

      {/* Stock Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">SKU Inventory & Stock Distribution</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live quantities per warehouse. Hardware items require physical stock; services & subscriptions are digitally provisioned.
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-medium">
            {inventoryRows.length} Catalog SKUs
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading live warehouse inventory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-6">Product / SKU</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6 text-center">Main Warehouse</th>
                  <th className="py-3.5 px-6 text-center">East Depot</th>
                  <th className="py-3.5 px-6 text-center">Total Available</th>
                  <th className="py-3.5 px-6">Inventory Health</th>
                  <th className="py-3.5 px-6 text-right">Quick Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventoryRows.map(({ product, mainWhStock, eastDepotStock, totalStock, status }) => (
                  <tr key={product.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900">{product.name}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        Base Price: ${product.unitPrice.toFixed(2)}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          product.category === 'HARDWARE'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : product.category === 'SERVICE'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {product.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center font-mono font-medium text-slate-800">
                      {product.category === 'HARDWARE' ? mainWhStock : '∞ (Digital)'}
                    </td>
                    <td className="py-4 px-6 text-center font-mono font-medium text-slate-800">
                      {product.category === 'HARDWARE' ? eastDepotStock : '∞ (Digital)'}
                    </td>
                    <td className="py-4 px-6 text-center font-mono font-bold text-slate-900">
                      {product.category === 'HARDWARE' ? totalStock : 'Unlimited'}
                    </td>
                    <td className="py-4 px-6">
                      {product.category !== 'HARDWARE' ? (
                        <span className="text-xs text-slate-400 font-medium">Auto-Provisioned</span>
                      ) : status === 'CRITICAL' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                          Critical Stock (&le;5)
                        </span>
                      ) : status === 'LOW_STOCK' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                          Low Stock (&le;20)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          Healthy Stock
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {product.category === 'HARDWARE' ? (
                        <button
                          onClick={() => {
                            setSelectedProductId(product.id);
                            setReplenishModalOpen(true);
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold transition border border-slate-200"
                        >
                          + Restock
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Replenish Stock Modal */}
      {replenishModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Replenish Depot Inventory</h2>
              <button
                onClick={() => setReplenishModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReplenish} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Target Warehouse Depot
                </label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Base Shipping: ${w.shippingCostBase})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Product SKU
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  {products
                    .filter((p) => p.category === 'HARDWARE')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (${p.unitPrice})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Quantity Units to Add
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={replenishQuantity}
                    onChange={(e) => setReplenishQuantity(Number(e.target.value))}
                    className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
                  />
                  <div className="flex space-x-1">
                    {[10, 25, 50].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setReplenishQuantity(q)}
                        className="px-2.5 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                      >
                        +{q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setReplenishModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold bg-[#0b2b68] hover:bg-blue-900 text-white rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Confirm Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
