import React, { useState, useEffect } from 'react';
import { warehousesApi, quotationsApi, fulfillmentApi, productsApi, viewPdfBlob, downloadPdfBlob } from '../services/api';
import { Warehouse, QuotationListItem, FulfillmentPreview, Product } from '../types';
import { getSocket } from '../lib/socket';
import {
  Boxes,
  Truck,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Layers,
  IndianRupee,
  RefreshCw,
  FileText,
  X,
  Sliders,
  Printer,
  ShieldCheck,
  ShieldAlert,
  Building2,
  PackageCheck,
  Download,
} from 'lucide-react';

export const FulfillmentPage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>('');
  const [splitPreview, setSplitPreview] = useState<FulfillmentPreview | null>(null);
  const [persistedSplits, setPersistedSplits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [consolidating, setConsolidating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [refreshingStock, setRefreshingStock] = useState(false);

  // Modals state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showManualOverrideModal, setShowManualOverrideModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);

  // Manual override state: map of warehouseId -> list of { productId, quantity }
  const [manualAllocations, setManualAllocations] = useState<
    { warehouseId: string; productId: string; quantity: number }[]
  >([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [wList, qList, pList] = await Promise.all([
        warehousesApi.list(),
        quotationsApi.list(),
        productsApi.list(),
      ]);
      setWarehouses(wList);
      setQuotations(qList);
      setProducts(pList);
      if (qList.length > 0) {
        setSelectedQuotationId(qList[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStock = async () => {
    setRefreshingStock(true);
    try {
      const [wList, qList] = await Promise.all([
        warehousesApi.list(),
        quotationsApi.list(),
      ]);
      setWarehouses(wList);
      setQuotations(qList);
      setStatusMessage('✅ Live inventory stock & active quotations re-synchronized!');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage('Failed to refresh live stock.');
    } finally {
      setRefreshingStock(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to real-time stock-updated events from server
    const socket = getSocket();
    const handleStockUpdated = () => {
      warehousesApi.list().then(setWarehouses).catch(console.error);
      quotationsApi.list().then(setQuotations).catch(console.error);
    };

    socket.on('stock-updated', handleStockUpdated);
    return () => {
      socket.off('stock-updated', handleStockUpdated);
    };
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

  const productMap = new Map(products.map((p) => [p.id, p]));
  const selectedQuotation = quotations.find((q) => q.id === selectedQuotationId);

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleViewPdf = async (id: string) => {
    if (!id) return;
    try {
      setDownloadingPdf(true);
      const blob = await quotationsApi.getPdf(id, 'view');
      viewPdfBlob(blob);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to generate PDF document');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadPdf = async (id: string) => {
    if (!id) return;
    try {
      setDownloadingPdf(true);
      const blob = await quotationsApi.getPdf(id, 'download');
      downloadPdfBlob(blob, `Fulfillment-Manifest-${id.slice(0, 8)}.pdf`);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to download PDF document');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: Calculate Split
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // PROMPT B1: Dynamic Plain-Language Summary Generator
  // e.g. "This order will be fulfilled from: Main Warehouse (12 units), East Depot (3 units)"
  // -------------------------------------------------------------
  const getFulfillmentSummaryText = (preview: FulfillmentPreview): string => {
    const parts = preview.splits
      .filter((s) => s.lines && s.lines.length > 0)
      .map((s) => {
        const totalUnits = s.lines.reduce((sum, l) => sum + l.quantity, 0);
        return `${s.warehouseName} (${totalUnits} unit${totalUnits === 1 ? '' : 's'})`;
      });

    if (parts.length === 0) {
      return 'No units currently allocated for fulfillment.';
    }

    let summary = `This order will be fulfilled from: ${parts.join(', ')}`;
    const backorderUnits = (preview.backorders || []).reduce((sum, b) => sum + b.quantity, 0);
    if (backorderUnits > 0) {
      summary += ` • (${backorderUnits} unit${backorderUnits === 1 ? '' : 's'} on backorder)`;
    }
    return summary;
  };

  // -------------------------------------------------------------
  // PROMPT B1: Formatted Warehouse Names for Confirmation Dialog
  // e.g. "Main Warehouse and East Depot"
  // -------------------------------------------------------------
  const getWarehouseNamesList = (splits: { warehouseName: string }[]): string => {
    const names = Array.from(new Set(splits.map((s) => s.warehouseName))).filter(Boolean);
    if (names.length === 0) return 'selected warehouses';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  };

  // -------------------------------------------------------------
  // HANDLERS: Confirm Split (via Dialog)
  // -------------------------------------------------------------
  const handleConfirmSplit = async () => {
    if (!selectedQuotationId) return;
    setConfirming(true);
    try {
      let persisted;
      if (manualAllocations.length > 0) {
        persisted = await fulfillmentApi.confirm(selectedQuotationId, {
          manualSplit: manualAllocations,
        });
      } else {
        persisted = await fulfillmentApi.confirm(selectedQuotationId, { useCalculated: true });
      }
      setPersistedSplits(persisted);
      setSplitPreview(null);
      setShowConfirmModal(false);
      setShowManualOverrideModal(false);
      setManualAllocations([]);

      // Reload live warehouse stock and quotations list so the real-time stock table reflects the newly deducted units immediately
      const [updatedWarehouses, updatedQuotations] = await Promise.all([
        warehousesApi.list(),
        quotationsApi.list(),
      ]);
      setWarehouses(updatedWarehouses);
      setQuotations(updatedQuotations);

      setStatusMessage('✅ Warehouse fulfillment split confirmed & stock reserved from inventory!');
    } catch (err: any) {
      setStatusMessage(err.response?.data?.error?.message || 'Failed to confirm fulfillment');
    } finally {
      setConfirming(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: Consolidate Backorders (Rule B6)
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // HANDLERS: Initialize Manual Override
  // -------------------------------------------------------------
  const handleOpenManualOverride = () => {
    if (!splitPreview) return;
    // Flatten lines from splitPreview
    const initialAllocations: { warehouseId: string; productId: string; quantity: number }[] = [];
    splitPreview.splits.forEach((s) => {
      s.lines.forEach((l) => {
        initialAllocations.push({
          warehouseId: s.warehouseId,
          productId: l.productId,
          quantity: l.quantity,
        });
      });
    });
    setManualAllocations(initialAllocations);
    setShowManualOverrideModal(true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Warehouse Fulfillment &amp; Multi-Site Auto-Split
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time stock across depots, automatic stock depletion calculations, and cost-optimized split deliveries.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefreshStock}
          disabled={refreshingStock}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshingStock ? 'animate-spin' : ''}`} />
          <span>{refreshingStock ? 'Syncing...' : 'Refresh Live Stock'}</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-sm font-semibold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Warehouse Inventory Stock Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center space-x-2">
              <Boxes className="w-5 h-5 text-blue-600" />
              <span>Real-Time Warehouse Stock Availability</span>
            </h3>
            <p className="text-xs text-slate-500">
              Review live inventory across distribution centers. The auto-split engine exhausts primary nodes first before routing to regional depots.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefreshStock}
            disabled={refreshingStock}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200 shrink-0 self-start sm:self-center"
          >
            <RefreshCw className={`w-3 h-3 text-slate-600 ${refreshingStock ? 'animate-spin' : ''}`} />
            <span>{refreshingStock ? 'Updating...' : 'Sync Stock'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {warehouses.map((wh) => (
            <div key={wh.id} className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{wh.name}</h4>
                  <span className="text-xs text-slate-500">Base Freight: ₹{wh.shippingCostBase.toFixed(2)}</span>
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
                        s.quantity === 0
                          ? 'bg-rose-100 text-rose-800'
                          : s.quantity <= 5
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
                  {q.customerName} — ₹{q.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({q.status})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end space-x-2 w-full sm:w-auto">
            <button
              onClick={handleCalculateSplit}
              disabled={calculating || !selectedQuotationId}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>{calculating ? 'Calculating...' : 'Simulate Multi-Site Split'}</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PROMPT B1: CALCULATED SPLIT SECTION WITH PROMINENT SUMMARY & BUTTONS       */}
        {/* ========================================================================= */}
        {splitPreview && (
          <div className="p-6 bg-gradient-to-br from-blue-50/60 to-indigo-50/60 border border-blue-200 rounded-2xl space-y-6 animate-in fade-in">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-blue-200/80 gap-3">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-full">
                  Recommended Fulfillment Allocation
                </span>
                <p className="text-xs text-blue-700 mt-1">
                  Estimated Shipments: <strong>{splitPreview.totalEstimatedShipments}</strong> • Total Estimated
                  Freight: <strong>₹{splitPreview.totalEstimatedCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </p>
              </div>
            </div>

            {/* PROMPT B1: PROMINENT SUMMARY BANNER */}
            <div className="p-4 bg-white border-2 border-blue-600 rounded-xl shadow-sm flex items-start sm:items-center space-x-3.5">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                  Fulfillment Dispatch Plan
                </span>
                <p className="text-sm font-bold text-slate-900 leading-snug">
                  {getFulfillmentSummaryText(splitPreview)}
                </p>
              </div>
            </div>

            {/* PROMPT B1: ACTION BUTTONS (Accept Suggested Split / Manual Override) */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleOpenManualOverride}
                className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Sliders className="w-4 h-4 text-slate-500" />
                <span>Manual Override</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={confirming}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Accept Suggested Split</span>
              </button>
            </div>

            {/* Split Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {splitPreview.splits.map((s, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-xs text-slate-900">{s.warehouseName}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Freight: ₹{s.estimatedShipmentCost.toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    {s.lines.map((l, lIdx) => {
                      const prod = productMap.get(l.productId);
                      return (
                        <div key={lIdx} className="flex justify-between items-center py-0.5">
                          <span className="truncate max-w-[200px] text-slate-800 font-medium">
                            {prod ? prod.name : `Product ${l.productId.slice(0, 8)}`}
                          </span>
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {l.quantity} units
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Backorders Notification & Consolidate Prompt */}
            {splitPreview.backorders.length > 0 ? (
              <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-xl text-xs space-y-3">
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
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center space-x-1.5 transition disabled:opacity-50 shrink-0 cursor-pointer"
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

        {/* ========================================================================= */}
        {/* PROMPT B1: SUCCESS STATE — CONFIRMED FULFILLMENT SPLIT & DOCUMENT ACTION  */}
        {/* ========================================================================= */}
        {persistedSplits.length > 0 && !splitPreview && (
          <div className="p-6 bg-gradient-to-br from-emerald-50/70 to-teal-50/70 border-2 border-emerald-300 rounded-2xl space-y-5 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-emerald-200 gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                  <PackageCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-bold shadow-xs flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Fulfillment Confirmed</span>
                    </span>
                    <span className="text-xs font-semibold text-emerald-900">
                      Locked to Database
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-1">
                    Stock has been officially reserved across distribution centers for order #{selectedQuotationId.slice(0, 8)}.
                  </p>
                </div>
              </div>

              {/* PROMPT B1 & C2: Generate Fulfillment Document & Download PDF BUTTONS */}
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  disabled={downloadingPdf}
                  onClick={() => handleViewPdf(selectedQuotationId)}
                  className="px-4 py-2.5 bg-[#0b2b68] hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  title="Generate and view official commercial fulfillment PDF in new tab"
                >
                  <FileText className="w-4 h-4 text-blue-300" />
                  <span>{downloadingPdf ? 'Generating PDF...' : 'Generate Fulfillment Document'}</span>
                </button>

                <button
                  type="button"
                  disabled={downloadingPdf}
                  onClick={() => handleDownloadPdf(selectedQuotationId)}
                  className="px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  title="Download PDF to computer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

            {/* Confirmed Split Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {persistedSplits.map((split, i) => (
                <div key={i} className="bg-white p-4 rounded-xl border border-emerald-200 text-xs shadow-xs space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      <span>{split.warehouseName}</span>
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-mono font-bold text-xs border border-emerald-200">
                      Freight: ₹{split.estimatedShipmentCost?.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span>Total Units Dispatched:</span>
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {split.quantityFulfilled} units
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PROMPT B1: CONFIRMATION MODAL DIALOG                                       */}
      {/* ========================================================================= */}
      {showConfirmModal && splitPreview && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Fulfillment Allocation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order #{selectedQuotationId.slice(0, 8)} &bull; {selectedQuotation?.customerName}
                </p>
              </div>
            </div>

            {/* EXACT PROMPT COPY REQUIREMENT */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <p className="text-xs text-slate-800 leading-relaxed">
                Confirm fulfillment from{' '}
                <strong className="text-blue-900 font-bold">
                  {getWarehouseNamesList(splitPreview.splits)}
                </strong>
                ? This will reserve stock and cannot be undone without a manual adjustment.
              </p>
            </div>

            {/* Quick summary metrics inside dialog */}
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Estimated Freight Charges:</span>
                <span className="font-mono font-bold text-blue-900">
                  ₹{splitPreview.totalEstimatedCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Dispatch Nodes Involved:</span>
                <span className="font-bold text-slate-900">
                  {splitPreview.splits.length} depot(s)
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={confirming}
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirming}
                onClick={handleConfirmSplit}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{confirming ? 'Reserving Stock...' : 'Confirm & Lock Split'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MANUAL OVERRIDE DIALOG MODAL                                              */}
      {/* ========================================================================= */}
      {showManualOverrideModal && splitPreview && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Manual Fulfillment Override</h3>
              </div>
              <button
                onClick={() => setShowManualOverrideModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
              <p className="text-xs text-slate-500">
                Reassign line units across warehouses manually. Stock availability is checked upon final confirmation.
              </p>

              <div className="space-y-3">
                {splitPreview.splits.map((s) => (
                  <div key={s.warehouseId} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="font-bold text-xs text-slate-900 flex items-center space-x-1.5">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span>{s.warehouseName}</span>
                    </div>

                    <div className="space-y-2">
                      {s.lines.map((l, lIdx) => {
                        const prod = productMap.get(l.productId);
                        return (
                          <div key={lIdx} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="font-medium text-slate-800">
                              {prod ? prod.name : l.productId}
                            </span>
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                min="0"
                                defaultValue={l.quantity}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setManualAllocations((prev) => {
                                    const filtered = prev.filter(
                                      (item) => !(item.warehouseId === s.warehouseId && item.productId === l.productId)
                                    );
                                    return [...filtered, { warehouseId: s.warehouseId, productId: l.productId, quantity: val }];
                                  });
                                }}
                                className="w-20 px-2 py-1 border border-slate-300 rounded text-center font-mono font-bold text-xs"
                              />
                              <span className="text-slate-400 text-[11px]">units</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3 mt-4">
              <button
                type="button"
                onClick={() => setShowManualOverrideModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowManualOverrideModal(false);
                  setShowConfirmModal(true);
                }}
                className="px-5 py-2 text-xs font-bold bg-[#0b2b68] hover:bg-blue-900 text-white rounded-xl shadow-sm transition cursor-pointer"
              >
                Proceed with Manual Split
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PROMPT B1: GENERATE FULFILLMENT DOCUMENT MODAL (PART C HOOK)              */}
      {/* ========================================================================= */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Fulfillment Dispatch Manifest
                </h3>
              </div>
              <button
                onClick={() => setShowDocModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Document Reference:</span>
                <span className="font-mono font-bold text-slate-900">
                  DOC-FUL-{selectedQuotationId.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Customer Recipient:</span>
                <span className="font-bold text-slate-900">
                  {selectedQuotation?.customerName || 'Customer Account'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Dispatch Nodes:</span>
                <span className="font-bold text-blue-900">
                  {persistedSplits.map((s) => s.warehouseName).join(', ') || 'Primary Warehouse Depot'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dispatch Status:</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                  READY FOR PICK &amp; PACK
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              This document contains picking instructions, freight routing barcodes, and customer delivery receipts for warehouse staff.
            </p>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDocModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-5 py-2 text-xs font-bold bg-[#0b2b68] hover:bg-blue-900 text-white rounded-xl shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Download Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
