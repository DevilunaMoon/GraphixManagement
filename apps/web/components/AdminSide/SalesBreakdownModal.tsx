"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Lock,
  Globe,
  Building2,
  Package,
  ReceiptText,
  BarChart3,
  Search,
  Download,
  MapPin,
  Store,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Wrench,
  Smartphone,
  Filter,
  Loader2,
  Banknote,
  QrCode,
  ArrowUpRight,
} from 'lucide-react';

const formatCurrency = (val: number) =>
  '₱' +
  (val || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export interface SalesBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  scope: 'current' | 'previous' | 'all_time';
  title: string;
  dateFilter: 'today' | 'week' | 'month' | 'year' | 'custom';
  customStartDate: string;
  customEndDate: string;
  initialBranch: string;
  isSuperAdmin: boolean;
  userBranch: string;
}

type ModalTab = 'branches' | 'products' | 'transactions' | 'monthly';

export default function SalesBreakdownModal({
  isOpen,
  onClose,
  scope,
  title,
  dateFilter,
  customStartDate,
  customEndDate,
  initialBranch,
  isSuperAdmin,
  userBranch,
}: SalesBreakdownModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('products');
  const [modalBranch, setModalBranch] = useState<string>(
    isSuperAdmin ? initialBranch || 'all' : userBranch || 'Tagoloan'
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [productSearch, setProductSearch] = useState('');
  const [txSearch, setTxSearch] = useState('');
  const [debouncedTxSearch, setDebouncedTxSearch] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cash' | 'gcash'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'in-store' | 'online'>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);

  // Reset modal branch & filters when opened for a new card/scope
  useEffect(() => {
    if (isOpen) {
      setModalBranch(isSuperAdmin ? initialBranch || 'all' : userBranch || 'Tagoloan');
      setProductSearch('');
      setTxSearch('');
      setDebouncedTxSearch('');
      setPaymentMethodFilter('all');
      setSourceFilter('all');
      setMonthFilter('all');
      setPage(1);
    }
  }, [isOpen, scope, initialBranch, isSuperAdmin, userBranch]);

  // Debounce transaction search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTxSearch(txSearch);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [txSearch]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchBreakdown = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    try {
      const effectiveBranchParam = isSuperAdmin ? modalBranch : userBranch || 'Tagoloan';
      const params = new URLSearchParams({
        scope,
        dateFilter,
        branch: effectiveBranchParam,
        page: String(page),
        limit: '25',
      });
      if (dateFilter === 'custom' && customStartDate && customEndDate) {
        params.set('startDate', customStartDate);
        params.set('endDate', customEndDate);
      }
      if (debouncedTxSearch) params.set('search', debouncedTxSearch);
      if (paymentMethodFilter !== 'all') params.set('paymentMethod', paymentMethodFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (monthFilter !== 'all') params.set('month', monthFilter);

      const res = await fetch(`/api/analytics/sales-breakdown?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to load sales breakdown');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error('SalesBreakdownModal fetch error:', err);
      setError(err?.message || 'Unable to load breakdown data');
    } finally {
      setLoading(false);
    }
  }, [
    isOpen,
    scope,
    dateFilter,
    customStartDate,
    customEndDate,
    modalBranch,
    isSuperAdmin,
    userBranch,
    page,
    debouncedTxSearch,
    paymentMethodFilter,
    sourceFilter,
    monthFilter,
  ]);

  useEffect(() => {
    fetchBreakdown();
  }, [fetchBreakdown]);

  if (!isOpen) return null;

  const meta = data?.meta || {};
  const productsSold: any[] = data?.productsSold || [];
  const branchBreakdown: any[] = data?.branchBreakdown || [];
  const monthlyAnalytics: any[] = data?.monthlyAnalytics || [];
  const weeklyBreakdown: any[] = data?.weeklyBreakdown || [];
  const txData = data?.transactions || { items: [], page: 1, totalFiltered: 0, totalPages: 1 };
  const availableBranches: string[] = meta.availableBranches || ['Tagoloan', 'Villanueva', 'Jasaan'];

  const filteredProducts = productsSold.filter((p) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.variant || '').toLowerCase().includes(q) ||
      (p.condition || '').toLowerCase().includes(q)
    );
  });

  const handleExportCsv = () => {
    const lines: string[] = [];
    lines.push(`"Report","${title}"`);
    lines.push(`"Date Range","${meta.dateRangeLabel || ''}"`);
    lines.push(`"Branch Scope","${meta.effectiveBranch || ''}"`);
    lines.push(`"Total Sales (PHP)","${meta.totalRevenue || 0}"`);
    lines.push(`"Total Units Sold","${meta.totalUnitsSold || 0}"`);
    lines.push(`"Total Transactions","${meta.totalTransactions || 0}"`);
    lines.push('');

    if (activeTab === 'products') {
      lines.push('Rank,Product,Variant,Type,Condition,Quantity Sold,Avg Unit Price,Total Revenue,Share %,Branches');
      filteredProducts.forEach((p) => {
        const bStr = (p.branches || []).map((b: any) => `${b.branch}(${b.quantity})`).join('; ');
        lines.push(
          `${p.rank},"${(p.name || '').replace(/"/g, '""')}","${(p.variant || '').replace(/"/g, '""')}",${p.recordType},${p.condition},${p.quantitySold},${p.avgUnitPrice.toFixed(2)},${p.totalRevenue.toFixed(2)},${p.percentageShare}%,"${bStr}"`
        );
      });
    } else if (activeTab === 'branches') {
      lines.push('Branch,Location,Revenue,Share %,Units Sold,Transactions,In-Store POS,Online,Cash Revenue,GCash Revenue');
      branchBreakdown.forEach((b) => {
        lines.push(
          `"${b.branch}","${(b.address || '').replace(/"/g, '""')}",${b.revenue.toFixed(2)},${b.sharePercent}%,${b.unitsSold},${b.transactions},${b.inStoreCount},${b.onlineCount},${b.cashRevenue.toFixed(2)},${b.gcashRevenue.toFixed(2)}`
        );
      });
    } else if (activeTab === 'monthly') {
      lines.push('Month,Total Revenue,Units Sold,Transactions,In-Store Sales,Online Sales,Top Branch,Top Product');
      monthlyAnalytics.forEach((m) => {
        lines.push(
          `"${m.monthLabel}",${m.revenue.toFixed(2)},${m.unitsSold},${m.transactions},${m.inStoreSales.toFixed(2)},${m.onlineSales.toFixed(2)},"${m.topBranch}","${(m.topProduct || '').replace(/"/g, '""')}"`
        );
      });
    } else {
      lines.push('Date,Reference ID,Type,Product/Service,Variant,Customer,Branch,Branch Location,Channel,Payment Method,Qty,Status,Amount');
      (txData.items || []).forEach((tx: any) => {
        lines.push(
          `"${formatDateTime(tx.createdAt)}","${tx.referenceId}",${tx.recordType},"${(tx.productName || '').replace(/"/g, '""')}","${(tx.variation || '').replace(/"/g, '""')}","${(tx.customerName || '').replace(/"/g, '""')}","${tx.branch}","${(tx.branchAddress || '').replace(/"/g, '""')}","${tx.source}","${tx.paymentMethod}",${tx.quantity},"${tx.status}",${tx.amount.toFixed(2)}`
        );
      });
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Graphix_${title.replace(/[^a-zA-Z0-9]+/g, '_')}_${activeTab}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSelectMonth = (monthKey: string) => {
    setMonthFilter(monthKey);
    setPage(1);
    setActiveTab('transactions');
  };

  const tabs: Array<{ id: ModalTab; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'products', label: 'Products Sold', icon: <Package size={15} />, count: productsSold.length },
    { id: 'transactions', label: 'Transaction Records', icon: <ReceiptText size={15} />, count: meta.totalTransactions },
    { id: 'branches', label: 'Branches & Locations', icon: <Building2 size={15} />, count: branchBreakdown.length },
    { id: 'monthly', label: 'Monthly Analytics', icon: <BarChart3 size={15} />, count: monthlyAnalytics.length },
  ];

  const maxMonthlyRev = Math.max(...monthlyAnalytics.map((m) => m.revenue || 0), 1);
  const maxWeeklyRev = Math.max(...weeklyBreakdown.map((w) => w.revenue || 0), 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/55 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-purple-500/20 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-5 py-4 sm:px-6 sm:py-5 border-b border-purple-100 bg-gradient-to-r from-purple-50/90 via-white to-fuchsia-50/70 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-[#111] tracking-tight">
                  {title} — Detailed Breakdown
                </h2>
                {meta.dateRangeLabel && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-[#7a00b8] border border-purple-200">
                    <Calendar size={12} /> {meta.dateRangeLabel}
                  </span>
                )}
                {!isSuperAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-purple-900/10 text-[#5c0099] border border-purple-300/60">
                    <Lock size={11} /> {userBranch || 'Tagoloan'} Branch Only
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Globe size={11} /> Super Admin Monitor
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
                Products sold, quantities, itemized transaction records, branch sale locations, and monthly analytics
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleExportCsv}
                disabled={loading || !data}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#bd00ff] to-[#7a00cc] text-white text-xs font-bold shadow-xs hover:opacity-95 disabled:opacity-50 cursor-pointer border-none"
                title="Export current tab to CSV"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer border-none bg-transparent"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Super Admin Branch Switcher */}
          {isSuperAdmin && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mr-1 flex items-center gap-1">
                <Building2 size={13} className="text-[#bd00ff]" /> Branch:
              </span>
              <button
                onClick={() => {
                  setModalBranch('all');
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  modalBranch === 'all' || modalBranch === 'All Branches'
                    ? 'bg-[#bd00ff] text-white border-[#bd00ff] shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                }`}
              >
                All Branches
              </button>
              {availableBranches.map((b) => {
                const isSelected = modalBranch.toLowerCase() === b.toLowerCase();
                return (
                  <button
                    key={b}
                    onClick={() => {
                      setModalBranch(b);
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#bd00ff] text-white border-[#bd00ff] shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary KPI Strip */}
        <div className="shrink-0 px-5 py-3 sm:px-6 bg-gray-50/70 border-b border-gray-100 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-3 border border-purple-100 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Sales</div>
            <div className="text-base sm:text-lg font-black text-[#111] mt-0.5 truncate" title={formatCurrency(meta.totalRevenue || 0)}>
              {formatCurrency(meta.totalRevenue || 0)}
            </div>
            <div className="text-[11px] text-gray-500 font-medium mt-0.5 truncate">
              Retail: {formatCurrency(meta.retailRevenue || 0)}
              {(meta.repairRevenue || 0) > 0 && ` • Repair: ${formatCurrency(meta.repairRevenue)}`}
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-purple-100 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Quantities Sold</div>
            <div className="text-base sm:text-lg font-black text-[#111] mt-0.5">
              {(meta.totalUnitsSold || 0).toLocaleString()} <span className="text-xs font-bold text-gray-500">units</span>
            </div>
            <div className="text-[11px] text-gray-500 font-medium mt-0.5">
              {productsSold.length} distinct {productsSold.length === 1 ? 'item' : 'items'}
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-purple-100 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Transactions</div>
            <div className="text-base sm:text-lg font-black text-[#111] mt-0.5">
              {(meta.totalTransactions || 0).toLocaleString()} <span className="text-xs font-bold text-gray-500">records</span>
            </div>
            <div className="text-[11px] text-gray-500 font-medium mt-0.5">
              Cash: {meta.cashCount || 0} • GCash: {meta.gcashCount || 0}
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-purple-100 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Where Sales Occurred</div>
            <div className="text-base sm:text-lg font-black text-[#111] mt-0.5 truncate">
              {meta.effectiveBranch || (isSuperAdmin ? 'All Branches' : userBranch)}
            </div>
            <div className="text-[11px] text-gray-500 font-medium mt-0.5">
              In-Store: {meta.inStoreCount || 0} • Online: {meta.onlineCount || 0}
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="shrink-0 px-5 sm:px-6 pt-3 border-b border-gray-200 bg-white flex items-center gap-1 overflow-x-auto overflow-y-hidden">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer bg-transparent ${
                  active
                    ? 'border-[#bd00ff] text-[#bd00ff]'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      active ? 'bg-purple-100 text-[#8b00cc]' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 bg-gray-50/40">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-500">
              <Loader2 size={32} className="animate-spin text-[#bd00ff]" />
              <p className="text-sm font-semibold">Loading detailed sales breakdown...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <p className="text-red-600 font-bold text-sm">{error}</p>
              <button
                onClick={fetchBreakdown}
                className="mt-3 px-4 py-2 rounded-xl bg-[#bd00ff] text-white text-xs font-bold cursor-pointer border-none"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* TAB 1: PRODUCTS SOLD */}
              {activeTab === 'products' && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">
                      Showing <span className="font-bold text-gray-900">{filteredProducts.length}</span> products & services sold in{' '}
                      <span className="font-bold text-gray-900">{meta.effectiveBranch}</span>
                    </p>
                    <div className="relative w-full sm:w-72">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search product, variant..."
                        className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-white border border-gray-200 rounded-xl outline-none focus:border-[#bd00ff]"
                      />
                    </div>
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-14 text-center text-gray-400">
                      <Package size={32} className="mx-auto mb-2 text-purple-300" />
                      <p className="text-sm font-bold text-gray-600">No products sold in this period</p>
                      <p className="text-xs mt-1">Try adjusting your branch or date filter.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-purple-50/70 text-[11px] uppercase tracking-wider text-gray-600 font-extrabold border-b border-purple-100">
                              <th className="py-3 px-4">#</th>
                              <th className="py-3 px-4">Product / Service</th>
                              <th className="py-3 px-4">Branches Made Sale</th>
                              <th className="py-3 px-4 text-right">Qty Sold</th>
                              <th className="py-3 px-4 text-right">Avg Price</th>
                              <th className="py-3 px-4 text-right">Total Sales</th>
                              <th className="py-3 px-4 text-right">Share</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                            {filteredProducts.map((p) => (
                              <tr key={`${p.recordType}-${p.productId}-${p.variant}`} className="hover:bg-purple-50/30 transition-colors">
                                <td className="py-3 px-4 font-black text-gray-400">{p.rank}</td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    {p.image ? (
                                      <img
                                        src={p.image}
                                        alt={p.name}
                                        className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0 bg-gray-50"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-purple-50 text-[#bd00ff] flex items-center justify-center shrink-0 border border-purple-100">
                                        {p.recordType === 'Repair' ? <Wrench size={16} /> : <Smartphone size={16} />}
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <div className="font-bold text-gray-900 truncate max-w-[240px]" title={p.name}>
                                        {p.name}
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                        <span className="text-[11px] text-gray-500 font-medium">{p.variant}</span>
                                        <span
                                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                            p.recordType === 'Repair'
                                              ? 'bg-amber-100 text-amber-700'
                                              : p.condition === 'Pre-Owned'
                                              ? 'bg-sky-100 text-sky-700'
                                              : 'bg-emerald-100 text-emerald-700'
                                          }`}
                                        >
                                          {p.recordType === 'Repair' ? 'Repair' : p.condition}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex flex-wrap gap-1">
                                    {(p.branches || []).map((b: any) => (
                                      <span
                                        key={b.branch}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200/70"
                                      >
                                        <MapPin size={10} /> {b.branch}: {b.quantity}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right font-black text-gray-900">
                                  {p.quantitySold}
                                </td>
                                <td className="py-3 px-4 text-right font-semibold text-gray-600 whitespace-nowrap">
                                  {formatCurrency(p.avgUnitPrice)}
                                </td>
                                <td className="py-3 px-4 text-right font-black text-[#111] whitespace-nowrap">
                                  {formatCurrency(p.totalRevenue)}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">
                                    {p.percentageShare}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: TRANSACTION RECORDS */}
              {activeTab === 'transactions' && (
                <div className="flex flex-col gap-4">
                  {/* Filters Row */}
                  <div className="bg-white p-3.5 rounded-2xl border border-purple-100 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={txSearch}
                        onChange={(e) => setTxSearch(e.target.value)}
                        placeholder="Search ref ID, customer, product, IMEI, branch..."
                        className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#bd00ff] focus:bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1 text-xs font-bold text-gray-500">
                        <Filter size={13} />
                      </div>
                      <select
                        value={sourceFilter}
                        onChange={(e) => {
                          setSourceFilter(e.target.value as any);
                          setPage(1);
                        }}
                        className="px-2.5 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#bd00ff] cursor-pointer"
                      >
                        <option value="all">All Channels</option>
                        <option value="in-store">In-Store POS</option>
                        <option value="online">Online</option>
                      </select>

                      <select
                        value={paymentMethodFilter}
                        onChange={(e) => {
                          setPaymentMethodFilter(e.target.value as any);
                          setPage(1);
                        }}
                        className="px-2.5 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#bd00ff] cursor-pointer"
                      >
                        <option value="all">All Payments</option>
                        <option value="cash">Cash</option>
                        <option value="gcash">GCash</option>
                      </select>

                      {monthFilter !== 'all' && (
                        <button
                          onClick={() => {
                            setMonthFilter('all');
                            setPage(1);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-100 text-[#7a00b8] text-xs font-bold cursor-pointer border border-purple-200"
                        >
                          Month: {monthFilter} <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {txData.items.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-14 text-center text-gray-400">
                      <ReceiptText size={32} className="mx-auto mb-2 text-purple-300" />
                      <p className="text-sm font-bold text-gray-600">No transaction records match your filters</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-purple-50/70 text-[11px] uppercase tracking-wider text-gray-600 font-extrabold border-b border-purple-100">
                              <th className="py-3 px-4">Date & Ref</th>
                              <th className="py-3 px-4">Product / Service</th>
                              <th className="py-3 px-4">Customer</th>
                              <th className="py-3 px-4">Branch & Where Sold</th>
                              <th className="py-3 px-4 text-center">Qty</th>
                              <th className="py-3 px-4">Payment</th>
                              <th className="py-3 px-4 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-xs">
                            {txData.items.map((tx: any) => (
                              <tr key={`${tx.recordType}-${tx.id}`} className="hover:bg-purple-50/30 transition-colors">
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <div className="font-bold text-gray-900">{formatDateTime(tx.createdAt)}</div>
                                  <div className="text-[11px] text-gray-500 font-mono mt-0.5">{tx.referenceId}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-bold text-gray-900 max-w-[220px] truncate" title={tx.productName}>
                                    {tx.productName}
                                  </div>
                                  <div className="text-[11px] text-gray-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                                    <span>{tx.variation}</span>
                                    {tx.imei && (
                                      <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.2 rounded text-gray-700">
                                        IMEI: {tx.imei}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-semibold text-gray-800">{tx.customerName}</div>
                                  {tx.customerEmail && (
                                    <div className="text-[11px] text-gray-400 truncate max-w-[160px]">{tx.customerEmail}</div>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1 font-bold text-gray-900">
                                    <MapPin size={12} className="text-[#bd00ff] shrink-0" />
                                    <span>{tx.branch}</span>
                                  </div>
                                  <div className="text-[11px] text-gray-500 truncate max-w-[180px]" title={tx.branchAddress}>
                                    {tx.branchAddress}
                                  </div>
                                  <span
                                    className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      tx.source === 'In-Store POS'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-sky-50 text-sky-700 border border-sky-200'
                                    }`}
                                  >
                                    {tx.source === 'In-Store POS' ? <Store size={10} /> : <ShoppingBag size={10} />}
                                    {tx.source}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center font-black text-gray-900">{tx.quantity}</td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                      tx.paymentMethod === 'Cash'
                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                                    }`}
                                  >
                                    {tx.paymentMethod === 'Cash' ? <Banknote size={11} /> : <QrCode size={11} />}
                                    {tx.paymentMethod}
                                  </span>
                                  <div className="text-[10px] text-gray-400 mt-0.5">{tx.status}</div>
                                </td>
                                <td className="py-3 px-4 text-right font-black text-[#111] whitespace-nowrap text-sm">
                                  {formatCurrency(tx.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      <div className="px-4 py-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between text-xs">
                        <span className="text-gray-600 font-medium">
                          Showing <span className="font-bold text-gray-900">{txData.items.length}</span> of{' '}
                          <span className="font-bold text-gray-900">{txData.totalFiltered}</span> records
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={txData.page <= 1}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 font-bold text-gray-700 disabled:opacity-40 cursor-pointer hover:bg-gray-50"
                          >
                            <ChevronLeft size={14} /> Prev
                          </button>
                          <span className="font-bold text-gray-700">
                            Page {txData.page} / {txData.totalPages}
                          </span>
                          <button
                            onClick={() => setPage((p) => Math.min(txData.totalPages, p + 1))}
                            disabled={txData.page >= txData.totalPages}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 font-bold text-gray-700 disabled:opacity-40 cursor-pointer hover:bg-gray-50"
                          >
                            Next <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: BRANCHES & LOCATIONS */}
              {activeTab === 'branches' && (
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {branchBreakdown.map((b) => (
                      <div
                        key={b.branch}
                        className="bg-white rounded-2xl p-5 border border-purple-100 shadow-2xs flex flex-col justify-between gap-4 hover:border-purple-300 transition-all"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <MapPin size={16} className="text-[#bd00ff]" />
                                <h4 className="text-base font-black text-gray-900">{b.branch} Branch</h4>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{b.address}</p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-purple-100 text-[#7a00b8]">
                              {b.sharePercent}%
                            </span>
                          </div>

                          <div className="mt-4">
                            <div className="text-2xl font-black text-[#111]">{formatCurrency(b.revenue)}</div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                              <div
                                className="h-full bg-gradient-to-r from-[#bd00ff] to-[#7a00cc] rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(b.revenue > 0 ? 4 : 0, b.sharePercent))}%` }}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100 text-xs">
                            <div className="bg-gray-50 rounded-xl p-2.5">
                              <div className="text-gray-500 font-semibold">Units Sold</div>
                              <div className="font-black text-gray-900 text-sm mt-0.5">{b.unitsSold}</div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-2.5">
                              <div className="text-gray-500 font-semibold">Transactions</div>
                              <div className="font-black text-gray-900 text-sm mt-0.5">{b.transactions}</div>
                            </div>
                            <div className="bg-emerald-50/70 rounded-xl p-2.5">
                              <div className="text-emerald-700 font-semibold">In-Store POS</div>
                              <div className="font-bold text-gray-900 mt-0.5">{formatCurrency(b.inStoreRevenue)}</div>
                              <div className="text-[10px] text-gray-500">{b.inStoreCount} orders</div>
                            </div>
                            <div className="bg-sky-50/70 rounded-xl p-2.5">
                              <div className="text-sky-700 font-semibold">Online Orders</div>
                              <div className="font-bold text-gray-900 mt-0.5">{formatCurrency(b.onlineRevenue)}</div>
                              <div className="text-[10px] text-gray-500">{b.onlineCount} orders</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold mt-3 pt-2 border-t border-gray-100">
                            <span>Cash: {formatCurrency(b.cashRevenue)}</span>
                            <span>GCash: {formatCurrency(b.gcashRevenue)}</span>
                          </div>
                        </div>

                        {isSuperAdmin && (modalBranch === 'all' || modalBranch === 'All Branches') && (
                          <button
                            onClick={() => {
                              setModalBranch(b.branch);
                              setPage(1);
                            }}
                            className="w-full py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#7a00b8] font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer border border-purple-200/60"
                          >
                            Drill into {b.branch} Branch <ArrowUpRight size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: MONTHLY ANALYTICS */}
              {activeTab === 'monthly' && (
                <div className="flex flex-col gap-5">
                  {/* Weekly Sub-Breakdown when viewing a single month */}
                  {weeklyBreakdown.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 border border-purple-100 shadow-2xs">
                      <h4 className="text-sm font-black text-gray-900 mb-1">
                        Weekly Breakdown ({meta.dateRangeLabel})
                      </h4>
                      <p className="text-xs text-gray-500 mb-4">
                        Week-by-week sales distribution for {meta.effectiveBranch}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {weeklyBreakdown.map((w) => {
                          const pct = w.revenue > 0 ? Math.max(8, Math.round((w.revenue / maxWeeklyRev) * 100)) : 0;
                          return (
                            <div key={w.label} className="bg-purple-50/40 rounded-xl p-3 border border-purple-100 flex flex-col justify-between">
                              <div className="text-[11px] font-bold text-gray-600">{w.label}</div>
                              <div className="text-sm font-black text-[#111] mt-1">{formatCurrency(w.revenue)}</div>
                              <div className="w-full h-1.5 bg-purple-100 rounded-full overflow-hidden my-2">
                                <div
                                  className="h-full bg-gradient-to-r from-[#bd00ff] to-[#7a00cc] rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="text-[10px] text-gray-500 font-semibold">
                                {w.unitsSold} units • {w.transactions} txns
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Monthly Trend Bar Chart */}
                  {monthlyAnalytics.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 border border-purple-100 shadow-2xs">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-sm font-black text-gray-900">Monthly Sales Overview</h4>
                          <p className="text-xs text-gray-500">
                            Click any month bar or table row to inspect its exact transactions
                          </p>
                        </div>
                      </div>
                      <div className="h-44 flex items-end gap-2 sm:gap-3 pt-6 pb-2 px-2 border border-purple-100 rounded-xl bg-purple-50/20 overflow-x-auto">
                        {monthlyAnalytics.map((m) => {
                          const hPct = m.revenue > 0 ? Math.max(8, Math.round((m.revenue / maxMonthlyRev) * 100)) : 4;
                          return (
                            <button
                              key={m.monthKey}
                              onClick={() => handleSelectMonth(m.monthKey)}
                              className="flex-1 min-w-[52px] h-full flex flex-col items-center justify-end gap-1.5 group cursor-pointer bg-transparent border-none p-0"
                              title={`${m.monthLabel}: ${formatCurrency(m.revenue)} (${m.unitsSold} units)`}
                            >
                              <div className="text-[10px] font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {formatCurrency(m.revenue)}
                              </div>
                              <div
                                className="w-full max-w-[38px] bg-gradient-to-t from-[#7a00cc] to-[#bd00ff] rounded-t-md group-hover:brightness-110 transition-all"
                                style={{ height: `${hPct}%` }}
                              />
                              <span className="text-[10px] font-bold text-gray-700 whitespace-nowrap">
                                {m.monthLabel}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Monthly Detailed Breakdown Table */}
                  {monthlyAnalytics.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-14 text-center text-gray-400">
                      <BarChart3 size={32} className="mx-auto mb-2 text-purple-300" />
                      <p className="text-sm font-bold text-gray-600">No monthly analytics recorded in this period</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-purple-50/70 text-[11px] uppercase tracking-wider text-gray-600 font-extrabold border-b border-purple-100">
                              <th className="py-3 px-4">Month</th>
                              <th className="py-3 px-4 text-right">Total Sales</th>
                              <th className="py-3 px-4 text-right">Qty Sold</th>
                              <th className="py-3 px-4 text-right">Txns</th>
                              <th className="py-3 px-4">Where Sales Were Made (Branches & Channels)</th>
                              <th className="py-3 px-4">Top Product</th>
                              <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-xs">
                            {[...monthlyAnalytics].reverse().map((m) => (
                              <tr
                                key={m.monthKey}
                                onClick={() => handleSelectMonth(m.monthKey)}
                                className="hover:bg-purple-50/40 transition-colors cursor-pointer"
                              >
                                <td className="py-3.5 px-4 font-black text-gray-900 whitespace-nowrap">
                                  {m.monthLabel}
                                </td>
                                <td className="py-3.5 px-4 text-right font-black text-[#111] whitespace-nowrap">
                                  {formatCurrency(m.revenue)}
                                </td>
                                <td className="py-3.5 px-4 text-right font-bold text-gray-800">{m.unitsSold}</td>
                                <td className="py-3.5 px-4 text-right font-bold text-gray-600">{m.transactions}</td>
                                <td className="py-3.5 px-4">
                                  <div className="flex flex-wrap gap-1 mb-1">
                                    {(m.branchSplits || []).map((bs: any) => (
                                      <span
                                        key={bs.branch}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200/70"
                                      >
                                        <MapPin size={9} /> {bs.branch}: {formatCurrency(bs.revenue)} ({bs.unitsSold}u)
                                      </span>
                                    ))}
                                  </div>
                                  <div className="text-[10px] text-gray-500 font-semibold">
                                    In-Store: {formatCurrency(m.inStoreSales)} ({m.inStoreCount}) • Online:{' '}
                                    {formatCurrency(m.onlineSales)} ({m.onlineCount})
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 font-semibold text-gray-700 max-w-[180px] truncate" title={m.topProduct}>
                                  {m.topProduct}
                                </td>
                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#bd00ff]">
                                    Records <ArrowUpRight size={12} />
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

