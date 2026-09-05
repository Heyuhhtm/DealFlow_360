import React, { useState, useEffect } from 'react';
import { warehousesApi, quotationsApi, fulfillmentApi } from '../services/api';
import { Warehouse, QuotationListItem, FulfillmentPreview } from '../types';
import { Boxes, Truck, AlertTriangle, CheckCircle2, ArrowRight, Layers, DollarSign, RefreshCw } from 'lucide-react';

export const FulfillmentPage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>('');
  const [splitPreview, setSplitPreview] = useState<FulfillmentPreview | null>(null);
  const [persistedSplits, setPersistedSplits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [consolidating, setConsolidating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [wList, qList] = await Promise.all([warehousesApi.list(), quotationsApi.list()]);
      setWarehouses(wList);
      setQuotations(qList);
      if (qList.length > 0) {
        setSelectedQuotationId(qList[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When selected quotation changes, fetch existing splits if any
  useEffect(() => {
    if (!selectedQuotationId) return;
    const fetchPersisted = async () => {
      try {
        const splits = await fulfillmentApi.getPersisted(selectedQuotationId);
        setPersistedSplits(splits);
        setSplitPreview(null);
      } catch (e) {
        console.error(e);
      }
    };
    fetchPersisted();
  }, [selectedQuotationId]);

  const handleCalculateSplit = async () => {
    if (!selectedQuotationId) return;
    setCalculating(true);
    setStatusMessage(null);
    try {
      const preview = await fulfillmentApi.calculate(selectedQuotationId);
      setSplitPreview(preview);
    } catch (err: any) {
      setStatusMessage(err.response?.data?.error?.message || 'Failed to calculate warehouse split');
    } finally {
      setCalculating(false);
    }
  };

  const handleConfirmSplit = async () => {
    if (!selectedQuotationId) return;
    setConfirming(true);
    try {
      const persisted = await fulfillmentApi.confirm(selectedQuotationId, { useCalculated: true });
      setPersistedSplits(persisted);
      setSplitPreview(null);
      setStatusMessage('✅ Warehouse fulfillment split confirmed & saved to database!');
    } catch (err: any) {
      setStatusMessage(err.response?.data?.error?.message || 'Failed to confirm fulfillment');
    } finally {
      setConfirming(false);
    }
  };

  const handleConsolidateBackorder = async () => {
    if (!splitPreview || splitPreview.backorders.length === 0 || warehouses.length === 0) return;
    setConsolidating(true);
    setStatusMessage(null);
    try {
      const mainWh = warehouses.find((w) => w.name.toLowerCase().includes('main')) || warehouses[0];

      // Replenish the required backordered stock into the primary depot
      for (const backorder of splitPreview.backorders) {
        await warehousesApi.replenishStock(mainWh.id, backorder.productId, backorder.quantity + 10);
      }

      // Reload warehouse stocks
      const updatedWarehouses = await warehousesApi.list();
      setWarehouses(updatedWarehouses);

      // Recalculate fulfillment split with the newly consolidated inventory
      const updatedPreview = await fulfillmentApi.calculate(selectedQuotationId);
      setSplitPreview(updatedPreview);

      setStatusMessage(
        `✅ New shipment arrived mid-fulfillment! Backorders successfully consolidated into ${mainWh.name}. Zero split backorders remaining!`
      );
    } catch (err: any) {
      setStatusMessage(err.response?.data?.error?.message || 'Failed to consolidate backorder');
    } finally {
      setConsolidating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Warehouse Fulfillment & Multi-Site Auto-Split</h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time stock across depots, automatic stock depletion calculations, and cost-optimized split deliveries.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-sm font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Warehouse Inventory Stock Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
        <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center space-x-2">
          <Boxes className="w-5 h-5 text-blue-600" />
          <span>Real-Time Warehouse Stock Availability</span>
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Notice how "Laptop Pro 15" has low stock in Main Warehouse (2), requiring an auto-split to East Depot (45).
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {warehouses.map((wh) => (
            <div key={wh.id} className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{wh.name}</h4>
                  <span className="text-xs text-slate-500">Base Freight: ${wh.shippingCostBase.toFixed(2)}</span>
                </div>
                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                  {wh.stock.length} Catalog Items
                </span>
              </div>

              <div className="divide-y divide-slate-200/70 text-xs">
                {wh.stock.map((s, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between">
                    <span className="font-medium text-slate-800">{s.productName}</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded ${
                        s.quantity <= 2
                          ? 'bg-rose-100 text-rose-800'
                          : s.quantity < 50
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {s.quantity} in stock
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Auto-Split Simulator Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center space-x-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            <span>Fulfillment Split Calculation Engine</span>
          </h3>
          <p className="text-xs text-slate-500">
            Select an active quotation to simulate and lock in warehouse dispatch allocations.
          </p>
        </div>

        {/* Quotation Selection and Calculate Action */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
              Select Quotation to Fulfill
            </label>
            <select
              value={selectedQuotationId}
              onChange={(e) => setSelectedQuotationId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
            >
              {quotations.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.customerName} — ${q.total.toFixed(2)} ({q.status})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end space-x-2 w-full sm:w-auto">
            <button
              onClick={handleCalculateSplit}
              disabled={calculating || !selectedQuotationId}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
            >
              <Layers className="w-4 h-4" />
              <span>{calculating ? 'Calculating...' : 'Simulate Multi-Site Split'}</span>
            </button>
          </div>
        </div>

        {/* Simulated Split Results (Preview Mode) */}
        {splitPreview && (
          <div className="p-6 bg-gradient-to-br from-blue-50/60 to-indigo-50/60 border border-blue-200 rounded-xl space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-blue-200 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  Simulation Preview (Unsaved)
                </span>
                <p className="text-xs text-blue-700">
                  Total Estimated Shipments: <strong>{splitPreview.totalEstimatedShipments}</strong> • Total Estimated
                  Freight: <strong>${splitPreview.totalEstimatedCost.toFixed(2)}</strong>
                </p>
              </div>

              <button
                onClick={handleConfirmSplit}
                disabled={confirming}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{confirming ? 'Confirming...' : 'Lock In & Confirm Split'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {splitPreview.splits.map((s, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-blue-100 shadow-2xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-xs text-slate-900">{s.warehouseName}</span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Freight: ${s.estimatedShipmentCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-600">
                    {s.lines.map((l, lIdx) => (
                      <div key={lIdx} className="flex justify-between">
                        <span>Product ID: {l.productId.slice(0, 8)}...</span>
                        <span className="font-semibold text-slate-800">{l.quantity} units</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Backorders Notification & Section B6 Consolidate Prompt */}
            {splitPreview.backorders.length > 0 ? (
              <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-xl text-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-2 text-amber-900">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-sm block">
                        Partial Stock Allocation &bull; Backorder Required
                      </span>
                      <p className="text-amber-800 text-xs mt-0.5">
                        Current depot stock cannot fulfill full order demand (
                        {splitPreview.backorders.reduce((sum, b) => sum + b.quantity, 0)} units pending across{' '}
                        {splitPreview.backorders.length} SKU).
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleConsolidateBackorder}
                    disabled={consolidating}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center space-x-1.5 transition disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${consolidating ? 'animate-spin' : ''}`} />
                    <span>{consolidating ? 'Consolidating...' : 'Consolidate Remaining Backorder'}</span>
                  </button>
                </div>

                <div className="p-2.5 bg-white/80 rounded-lg border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
                  <span>
                    💡 <strong>Specification Rule (B6):</strong> Clicking <em>Consolidate Remaining Backorder</em> records incoming inventory to the Main Warehouse and recalculates splits into a consolidated dispatch.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">
                  Zero Backorders &bull; 100% of order lines fulfilled across warehouse network.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Persisted Fulfillment Splits */}
        {persistedSplits.length > 0 && !splitPreview && (
          <div className="p-5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-900">
                Confirmed Fulfillment Allocations for this Quotation
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {persistedSplits.map((split, i) => (
                <div key={i} className="bg-white p-3.5 rounded-lg border border-emerald-100 text-xs shadow-2xs">
                  <span className="font-bold text-slate-900 block">{split.warehouseName}</span>
                  <div className="flex justify-between mt-1 text-slate-600">
                    <span>Units Dispatched: {split.quantityFulfilled}</span>
                    <span className="font-semibold text-slate-900">${split.estimatedShipmentCost?.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
