"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowRightLeft,
  PackagePlus,
  AlertTriangle,
  Wrench,
  Clock,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  ArrowRight,
  Building2,
  Users,
  TrendingDown,
  Package,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useBranch } from '../../context/BranchContext';

interface TransferRec {
  id: string;
  deviceId: string;
  variationId: string | null;
  productId: string | null;
  productName: string;
  variationName: string | null;
  category: string;
  fromBranch: string;
  toBranch: string;
  fromStock: number;
  toStock: number;
  fromSales30d: number;
  toSales30d: number;
  recommendedQty: number;
  priority: 'CRITICAL' | 'HIGH' | string;
  canExecute: boolean;
  reason: string;
}

interface RestockRec {
  id: string;
  deviceId: string;
  variationId: string | null;
  productId: string | null;
  productName: string;
  variationName: string | null;
  category: string;
  branch: string;
  currentStock: number;
  sales30d: number;
  activeReservations: number;
  recommendedQty: number;
  priority: 'CRITICAL' | 'HIGH' | string;
  reason: string;
}

interface OverstockRec {
  id: string;
  deviceId: string;
  variationId: string | null;
  productName: string;
  variationName: string | null;
  category: string;
  branch: string;
  currentStock: number;
  sales30d: number;
  reason: string;
}

interface FlaggedRepair {
  id: string;
  deviceName: string;
  ownerName: string;
  branch: string;
  progress: string;
  technician: string;
  cause: string;
  createdAt: string;
  lastUpdatedAt: string;
  daysOpen: number;
  daysSinceUpdate: number;
  priority: 'HIGH' | 'MEDIUM' | string;
  flags: Array<{ code: string; label: string; severity: string }>;
  hasMatchingPartInStock: boolean;
  matchingParts: Array<{ id: string; name: string; stock: number; price: number }>;
  recommendation: string;
}

interface TechWorkload {
  technician: string;
  branch: string;
  activeCount: number;
  diagnosticCount: number;
  repairingCount: number;
  flaggedCount: number;
}

export default function AdminDSS() {
  const router = useRouter();
  const { selectedBranch, isSuperAdmin } = useBranch();

  const [activeTab, setActiveTab] = useState<'inventory' | 'repairs'>('inventory');
  const [minStock, setMinStock] = useState<number>(3);
  const [salesWindowDays, setSalesWindowDays] = useState<number>(30);
  const [diagnosticDays, setDiagnosticDays] = useState<number>(2);
  const [repairingDays, setRepairingDays] = useState<number>(3);
  const [showSettings, setShowSettings] = useState(false);

  const [invLoading, setInvLoading] = useState(true);
  const [repLoading, setRepLoading] = useState(true);

  const [invData, setInvData] = useState<{
    summary: {
      transferCount: number;
      restockCount: number;
      overstockCount: number;
      totalAnalyzed: number;
      minStock: number;
      salesWindowDays: number;
      scopeBranch: string;
    };
    transfers: TransferRec[];
    restocks: RestockRec[];
    overstocks: OverstockRec[];
  } | null>(null);

  const [repData, setRepData] = useState<{
    summary: {
      totalActive: number;
      flaggedCount: number;
      stalledDiagnosticCount: number;
      stalledRepairingCount: number;
      unassignedCount: number;
      partReadyCount: number;
      diagnosticDays: number;
      repairingDays: number;
    };
    flaggedRepairs: FlaggedRepair[];
    technicianWorkload: TechWorkload[];
  } | null>(null);

  // Transfer confirmation modal state
  const [transferModal, setTransferModal] = useState<TransferRec | null>(null);
  const [transferQty, setTransferQty] = useState<number>(1);
  const [transferNotes, setTransferNotes] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchInventoryDss = useCallback(async () => {
    setInvLoading(true);
    try {
      const branchParam = isSuperAdmin ? selectedBranch : '';
      const qs = new URLSearchParams({
        minStock: String(minStock),
        days: String(salesWindowDays),
      });
      if (branchParam) qs.set('branch', branchParam);
      const res = await fetch(`/api/dss/inventory?${qs.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setInvData(json);
      }
    } catch (err) {
      console.error('Failed to fetch inventory DSS:', err);
    } finally {
      setInvLoading(false);
    }
  }, [isSuperAdmin, selectedBranch, minStock, salesWindowDays]);

  const fetchRepairDss = useCallback(async () => {
    setRepLoading(true);
    try {
      const branchParam = isSuperAdmin ? selectedBranch : '';
      const qs = new URLSearchParams({
        diagnosticDays: String(diagnosticDays),
        repairingDays: String(repairingDays),
      });
      if (branchParam) qs.set('branch', branchParam);
      const res = await fetch(`/api/dss/repairs/workload?${qs.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setRepData(json);
      }
    } catch (err) {
      console.error('Failed to fetch repair workload DSS:', err);
    } finally {
      setRepLoading(false);
    }
  }, [isSuperAdmin, selectedBranch, diagnosticDays, repairingDays]);

  useEffect(() => {
    fetchInventoryDss();
    fetchRepairDss();
  }, [fetchInventoryDss, fetchRepairDss]);

  const openTransferModal = (rec: TransferRec) => {
    setTransferModal(rec);
    setTransferQty(rec.recommendedQty);
    setTransferNotes(`DSS Recommended Transfer (${rec.fromBranch} -> ${rec.toBranch})`);
  };

  const handleExecuteTransfer = async () => {
    if (!transferModal) return;
    setIsTransferring(true);
    try {
      const res = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: transferModal.deviceId,
          variationId: transferModal.variationId,
          productId: transferModal.productId,
          fromBranch: transferModal.fromBranch,
          toBranch: transferModal.toBranch,
          quantity: transferQty,
          notes: transferNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast('error', json.error || 'Transfer failed');
      } else {
        showToast(
          'success',
          `Transferred ${transferQty}x ${transferModal.productName}${transferModal.variationName ? ` (${transferModal.variationName})` : ''} from ${transferModal.fromBranch} to ${transferModal.toBranch}.`
        );
        setTransferModal(null);
        fetchInventoryDss();
      }
    } catch (err) {
      console.error('Transfer execution error:', err);
      showToast('error', 'Network error while executing transfer.');
    } finally {
      setIsTransferring(false);
    }
  };

  const isLoading = invLoading || repLoading;

  return (
    <>
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto font-['Inter'] space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl border text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-purple-100/90 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-[#7e22ce] border border-purple-200/80 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles size={13} />
              Decision Support System
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-[11px] font-semibold">
              <Building2 size={12} />
              {invData?.summary.scopeBranch === 'all'
                ? 'All Branches'
                : `${invData?.summary.scopeBranch || selectedBranch} Branch`}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Actionable Inventory &amp; Repair Recommendations
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">
            Rule-based recommendations using live branch stock, recent sales velocity, repair timelines, and spare parts availability. All actions require staff confirmation.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showSettings
                ? 'bg-purple-50 border-purple-300 text-[#7e22ce]'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal size={14} />
            Rules &amp; Thresholds
          </button>
          <button
            type="button"
            onClick={() => {
              fetchInventoryDss();
              fetchRepairDss();
            }}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#8b00cc] hover:bg-[#7700af] text-white transition-all cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Configurable Rule Thresholds Drawer */}
      {showSettings && (
        <div className="bg-purple-50/60 border border-purple-200/80 rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-900 mb-1">
              Min Stock Threshold
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={minStock}
              onChange={(e) => setMinStock(Math.max(1, parseInt(e.target.value || '1', 10)))}
              className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white text-sm font-bold text-gray-900"
            />
            <p className="text-[11px] text-gray-500 mt-1">Flag products at or below this count.</p>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-900 mb-1">
              Sales Velocity Window (Days)
            </label>
            <input
              type="number"
              min={7}
              max={90}
              value={salesWindowDays}
              onChange={(e) => setSalesWindowDays(Math.max(7, parseInt(e.target.value || '30', 10)))}
              className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white text-sm font-bold text-gray-900"
            />
            <p className="text-[11px] text-gray-500 mt-1">Days of purchase history analyzed.</p>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-900 mb-1">
              Diagnostic Stalled (Days)
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={diagnosticDays}
              onChange={(e) => setDiagnosticDays(Math.max(1, parseInt(e.target.value || '2', 10)))}
              className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white text-sm font-bold text-gray-900"
            />
            <p className="text-[11px] text-gray-500 mt-1">Flag Diagnostic jobs idle this long.</p>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-900 mb-1">
              Repairing Stalled (Days)
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={repairingDays}
              onChange={(e) => setRepairingDays(Math.max(1, parseInt(e.target.value || '3', 10)))}
              className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white text-sm font-bold text-gray-900"
            />
            <p className="text-[11px] text-gray-500 mt-1">Flag Repairing jobs idle this long.</p>
          </div>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className="text-left bg-white rounded-2xl border border-purple-100 p-4 shadow-sm hover:border-purple-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Branch Transfers</span>
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-[#7e22ce] flex items-center justify-center">
              <ArrowRightLeft size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">{invData?.summary.transferCount ?? '—'}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Recommended inter-branch moves</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className="text-left bg-white rounded-2xl border border-amber-100 p-4 shadow-sm hover:border-amber-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Restocks Needed</span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <PackagePlus size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">{invData?.summary.restockCount ?? '—'}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Low stock with no branch surplus</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('repairs')}
          className="text-left bg-white rounded-2xl border border-red-100 p-4 shadow-sm hover:border-red-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Flagged Repairs</span>
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">{repData?.summary.flaggedCount ?? '—'}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {repData?.summary.partReadyCount ?? 0} with matching spare part in stock
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className="text-left bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Slow-Moving Stock</span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <TrendingDown size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">{invData?.summary.overstockCount ?? '—'}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">High stock with 0 sales in {salesWindowDays}d</p>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'border-[#8b00cc] text-[#7e22ce]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <ArrowRightLeft size={15} />
          1. Inventory Replenishment &amp; Branch Transfer
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('repairs')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'repairs'
              ? 'border-[#8b00cc] text-[#7e22ce]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Wrench size={15} />
          2. Repair Workload &amp; Priority
          {(repData?.summary.flaggedCount || 0) > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black">
              {repData?.summary.flaggedCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: INVENTORY REPLENISHMENT & BRANCH TRANSFER */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Section A: Recommended Branch Transfers */}
          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-2 bg-gradient-to-r from-purple-50/70 to-white">
              <div>
                <h3 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                  <ArrowRightLeft size={17} className="text-[#8b00cc]" />
                  Recommended Branch Transfers
                </h3>
                <p className="text-xs text-gray-500">
                  Rebalance surplus units from slower-moving branches to low-stock branches before purchasing new stock.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-[#7e22ce]">
                {invData?.transfers.length || 0} Suggestion{(invData?.transfers.length || 0) === 1 ? '' : 's'}
              </span>
            </div>

            {invLoading ? (
              <div className="p-8 text-center text-xs text-gray-400">Analyzing multi-branch inventory...</div>
            ) : !invData || invData.transfers.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 size={28} className="mx-auto text-emerald-500" />
                <p className="text-sm font-bold text-gray-800">Branch stock is well balanced</p>
                <p className="text-xs text-gray-500">No inter-branch transfers are currently needed for your threshold ({minStock} units).</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {invData.transfers.map((tr) => (
                  <div
                    key={tr.id}
                    className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-purple-50/20 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            tr.priority === 'CRITICAL'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {tr.priority}
                        </span>
                        <span className="text-sm font-extrabold text-gray-900">
                          {tr.productName}
                          {tr.variationName ? ` (${tr.variationName})` : ''}
                        </span>
                        <span className="text-[11px] font-semibold text-gray-400">{tr.category}</span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                          From {tr.fromBranch}: {tr.fromStock} in stock ({tr.fromSales30d} sold/{salesWindowDays}d)
                        </span>
                        <ArrowRight size={14} className="text-gray-400 shrink-0" />
                        <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-800 border border-red-200/70">
                          To {tr.toBranch}: {tr.toStock} in stock ({tr.toSales30d} sold/{salesWindowDays}d)
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 leading-relaxed">{tr.reason}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {tr.canExecute ? (
                        <button
                          type="button"
                          onClick={() => openTransferModal(tr)}
                          className="px-4 py-2 rounded-xl bg-[#8b00cc] hover:bg-[#7700af] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                        >
                          <ArrowRightLeft size={14} />
                          Transfer {tr.recommendedQty} Unit{tr.recommendedQty === 1 ? '' : 's'}
                        </button>
                      ) : (
                        <span className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-[11px] font-semibold">
                          Coordinate with {tr.fromBranch} / Super Admin
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section B: Restock Recommendations */}
          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-2 bg-gradient-to-r from-amber-50/70 to-white">
              <div>
                <h3 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                  <PackagePlus size={17} className="text-amber-600" />
                  Supplier Restock Recommendations
                </h3>
                <p className="text-xs text-gray-500">
                  Products at or below {minStock} units where no other branch has surplus stock to transfer.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                {invData?.restocks.length || 0} Item{(invData?.restocks.length || 0) === 1 ? '' : 's'}
              </span>
            </div>

            {invLoading ? (
              <div className="p-8 text-center text-xs text-gray-400">Checking reorder levels...</div>
            ) : !invData || invData.restocks.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">
                No supplier restocks urgently required right now.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {invData.restocks.slice(0, 20).map((rs) => (
                  <div
                    key={rs.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-amber-50/20 transition-colors"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            rs.priority === 'CRITICAL'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {rs.currentStock === 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
                        </span>
                        <span className="text-sm font-extrabold text-gray-900">
                          {rs.productName}
                          {rs.variationName ? ` (${rs.variationName})` : ''}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-[#7e22ce] text-[11px] font-bold">
                          {rs.branch}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{rs.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-black">
                        Suggested Order: +{rs.recommendedQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => router.push('/admin/inventory')}
                        className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold cursor-pointer"
                      >
                        Open Inventory
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section C: Slow-Moving / Overstock Advisory */}
          {invData && invData.overstocks.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                    <TrendingDown size={17} className="text-slate-600" />
                    Slow-Moving Stock Advisory
                  </h3>
                  <p className="text-xs text-gray-500">
                    High stock with zero sales in the last {salesWindowDays} days — consider promotions or branch redistribution.
                  </p>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {invData.overstocks.slice(0, 10).map((ov) => (
                  <div key={ov.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">
                          {ov.productName}
                          {ov.variationName ? ` (${ov.variationName})` : ''}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-bold">
                          {ov.branch}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{ov.reason}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-700 shrink-0">
                      {ov.currentStock} units idle
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REPAIR WORKLOAD & PRIORITY */}
      {activeTab === 'repairs' && (
        <div className="space-y-6">
          {/* Flagged Repairs Table */}
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-2 bg-gradient-to-r from-red-50/70 to-white">
              <div>
                <h3 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                  <AlertTriangle size={17} className="text-red-600" />
                  Repairs Flagged for Review
                </h3>
                <p className="text-xs text-gray-500">
                  Jobs idle in Diagnostic (&ge;{diagnosticDays}d) or Repairing (&ge;{repairingDays}d), or unassigned. Status is never changed automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/admin/monitoring')}
                className="px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold cursor-pointer shrink-0"
              >
                Open Devices Monitoring
              </button>
            </div>

            {repLoading ? (
              <div className="p-8 text-center text-xs text-gray-400">Analyzing active repair queue...</div>
            ) : !repData || repData.flaggedRepairs.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 size={28} className="mx-auto text-emerald-500" />
                <p className="text-sm font-bold text-gray-800">All active repairs are on schedule</p>
                <p className="text-xs text-gray-500">No stalled or unassigned repairs found in this branch scope.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {repData.flaggedRepairs.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-red-50/20 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            rep.priority === 'HIGH'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {rep.priority} PRIORITY
                        </span>
                        <span className="text-sm font-extrabold text-gray-900">{rep.deviceName}</span>
                        <span className="text-xs text-gray-500">• {rep.ownerName}</span>
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-[#7e22ce] text-[11px] font-bold">
                          {rep.branch}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-bold">
                          {rep.progress}
                        </span>
                        {rep.hasMatchingPartInStock && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                            <Package size={11} />
                            Part In Stock
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={12} className="text-gray-400" />
                          Idle {rep.daysSinceUpdate}d (Open {rep.daysOpen}d)
                        </span>
                        <span>• Technician: <strong>{rep.technician}</strong></span>
                        <span>• Issue: {rep.cause}</span>
                      </div>

                      <p className="text-xs text-gray-600">{rep.recommendation}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => router.push('/admin/monitoring')}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-purple-50 border border-purple-200 text-[#7e22ce] text-xs font-bold cursor-pointer shrink-0"
                    >
                      Review in Monitoring
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Technician Workload Breakdown */}
          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                <Users size={17} className="text-[#8b00cc]" />
                Technician Workload Distribution
              </h3>
              <p className="text-xs text-gray-500">
                Active repair counts per technician to help balance assignments across your team.
              </p>
            </div>
            {!repData || repData.technicianWorkload.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">No active repair assignments found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                {repData.technicianWorkload.map((tw) => (
                  <div
                    key={`${tw.technician}-${tw.branch}`}
                    className="rounded-xl border border-gray-200 p-4 bg-gray-50/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-extrabold text-gray-900 truncate">{tw.technician}</p>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-100 text-[#7e22ce]">
                        {tw.branch}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="bg-white rounded-lg p-2 border border-gray-100">
                        <p className="text-base font-black text-gray-900">{tw.activeCount}</p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase">Active</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-gray-100">
                        <p className="text-base font-black text-blue-700">{tw.diagnosticCount}</p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase">Diag.</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-gray-100">
                        <p className={`text-base font-black ${tw.flaggedCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {tw.flaggedCount}
                        </p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase">Flagged</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>

      {/* Confirmation Modal for Recommended Branch Transfer */}
      {transferModal && (
        <div className="fixed inset-0 m-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-purple-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-gradient-to-r from-[#7e22ce] to-[#9b1fe8] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft size={18} />
                <h3 className="text-sm font-black">Confirm Recommended Transfer</h3>
              </div>
              <button
                type="button"
                onClick={() => setTransferModal(null)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Product</p>
                <p className="text-sm font-black text-gray-900">
                  {transferModal.productName}
                  {transferModal.variationName ? ` (${transferModal.variationName})` : ''}
                </p>
              </div>

              <div className="flex items-center justify-between bg-purple-50/70 border border-purple-200/70 rounded-xl p-3 text-xs font-bold">
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase">From Branch</span>
                  <span className="text-emerald-800">{transferModal.fromBranch} ({transferModal.fromStock} avail.)</span>
                </div>
                <ArrowRight size={16} className="text-[#8b00cc]" />
                <div className="text-right">
                  <span className="text-gray-500 block text-[10px] uppercase">To Branch</span>
                  <span className="text-red-700">{transferModal.toBranch} ({transferModal.toStock} avail.)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Transfer Quantity (Max: {transferModal.fromStock})
                </label>
                <input
                  type="number"
                  min={1}
                  max={transferModal.fromStock}
                  value={transferQty}
                  onChange={(e) =>
                    setTransferQty(
                      Math.min(transferModal.fromStock, Math.max(1, parseInt(e.target.value || '1', 10)))
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Transfer Notes</label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-800"
                />
              </div>

              <div className="flex items-center gap-2 text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-xl">
                <ShieldCheck size={15} className="text-[#8b00cc] shrink-0" />
                <span>Stock levels, available DeviceUnits, and StockMovement logs will update atomically.</span>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTransferModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteTransfer}
                disabled={isTransferring}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#8b00cc] hover:bg-[#7700af] text-white cursor-pointer disabled:opacity-60"
              >
                {isTransferring ? 'Transferring...' : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

