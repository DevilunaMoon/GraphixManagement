"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Lock,
  Globe,
  Building2,
  Wrench,
  ReceiptText,
  BarChart3,
  Search,
  Download,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Smartphone,
  Filter,
  Loader2,
  Banknote,
  QrCode,
  ArrowUpRight,
  UserCheck,
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

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'In Progress':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Accepted':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Cancelled':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-amber-50 text-amber-700 border-amber-200';
  }
};

export type RepairBreakdownScope = 'period_revenue' | 'completed' | 'all_requests' | 'all_time';

export interface RepairBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  scope: RepairBreakdownScope;
  title: string;
  dateFilter: 'today' | 'week' | 'month' | 'year' | 'custom';
  customStartDate: string;
  customEndDate: string;
  initialBranch: string;
  isSuperAdmin: boolean;
  userBranch: string;
}

type ModalTab = 'devices' | 'records' | 'branches' | 'monthly';

export default function RepairBreakdownModal({
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
}: RepairBreakdownModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>(
    scope === 'all_requests' ? 'records' : 'devices'
  );
  const [modalBranch, setModalBranch] = useState<string>(
    isSuperAdmin ? initialBranch || 'all' : userBranch || 'Tagoloan'
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [deviceSearch, setDeviceSearch] = useState('');
  const [recordSearch, setRecordSearch] = useState('');
  const [debouncedRecordSearch, setDebouncedRecordSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cash' | 'gcash'>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    if (isOpen) {
      setModalBranch(isSuperAdmin ? initialBranch || 'all' : userBranch || 'Tagoloan');
      setActiveTab(scope === 'all_requests' ? 'records' : 'devices');
      setDeviceSearch('');
      setRecordSearch('');
      setDebouncedRecordSearch('');
      setStatusFilter('all');
      setPaymentMethodFilter('all');
      setMonthFilter('all');
      setPage(1);
    }
  }, [isOpen, scope, initialBranch, isSuperAdmin, userBranch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedRecordSearch(recordSearch);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [recordSearch]);

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
      if (debouncedRecordSearch) params.set('search', debouncedRecordSearch);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (paymentMethodFilter !== 'all') params.set('paymentMethod', paymentMethodFilter);
      if (monthFilter !== 'all') params.set('month', monthFilter);

      const res = await fetch(`/api/analytics/repairs/breakdown?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to load repair breakdown');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error('RepairBreakdownModal fetch error:', err);
      setError(err?.message || 'Unable to load repair breakdown data');
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
    debouncedRecordSearch,
    statusFilter,
    paymentMethodFilter,
    monthFilter,
  ]);

  useEffect(() => {
    fetchBreakdown();
  }, [fetchBreakdown]);

  if (!isOpen) return null;

  const meta = data?.meta || {};
  const devicesRepaired: any[] = data?.devicesRepaired || [];
  const branchBreakdown: any[] = data?.branchBreakdown || [];
  const monthlyAnalytics: any[] = data?.monthlyAnalytics || [];
  const weeklyBreakdown: any[] = data?.weeklyBreakdown || [];
  const recordData = data?.records || { items: [], page: 1, totalFiltered: 0, totalPages: 1 };
  const availableBranches: string[] = meta.availableBranches || ['Tagoloan', 'Villanueva', 'Jasaan'];

  const filteredDevices = devicesRepaired.filter((d) => {
    if (!deviceSearch.trim()) return true;
    return (d.deviceName || '').toLowerCase().includes(deviceSearch.toLowerCase());
  });

  const handleExportCsv = () => {
    const lines: string[] = [];
    lines.push(`"Report","${title}"`);
    lines.push(`"Date Range","${meta.dateRangeLabel || ''}"`);
    lines.push(`"Branch Scope","${meta.effectiveBranch || ''}"`);
    lines.push(`"Total Repair Revenue (PHP)","${meta.totalRevenue || 0}"`);
    lines.push(`"Completed Repairs","${meta.completedCount || 0}"`);
    lines.push(`"Total Repair Requests","${meta.totalRequests || 0}"`);
    lines.push('');

    if (activeTab === 'devices') {
      lines.push('Rank,Device / Service,Total Jobs,Completed Jobs,Avg Cost,Total Revenue,Share %,Branches');
      filteredDevices.forEach((d) => {
        const bStr = (d.branches || []).map((b: any) => `${b.branch}(${b.jobs})`).join('; ');
        lines.push(
          `${d.rank},"${(d.deviceName || '').replace(/"/g, '""')}",${d.jobCount},${d.completedCount},${d.avgCost.toFixed(2)},${d.totalRevenue.toFixed(2)},${d.percentageShare}%,"${bStr}"`
        );
      });
    } else if (activeTab === 'branches') {
      lines.push('Branch,Location,Revenue,Share %,Completed Jobs,Total Requests,Completion %,Cash Revenue,GCash Revenue');
      branchBreakdown.forEach((b) => {
        lines.push(
          `"${b.branch}","${(b.address || '').replace(/"/g, '""')}",${b.revenue.toFixed(2)},${b.sharePercent}%,${b.completed},${b.requests},${b.completionRate}%,${b.cashRevenue.toFixed(2)},${b.gcashRevenue.toFixed(2)}`
        );
      });
    } else if (activeTab === 'monthly') {
      lines.push('Month,Repair Revenue,Completed Jobs,Total Requests,Top Branch,Top Device');
      monthlyAnalytics.forEach((m) => {
        lines.push(
          `"${m.monthLabel}",${m.revenue.toFixed(2)},${m.completed},${m.requests},"${m.topBranch}","${(m.topDevice || '').replace(/"/g, '""')}"`
        );
      });
    } else {
      lines.push('Date,Reference ID,Device,Issue/Cause,Technician,Customer,Branch,Branch Location,Status,Payment Method,Cost');
      (recordData.items || []).forEach((rec: any) => {
        lines.push(
          `"${formatDateTime(rec.createdAt)}","${rec.referenceId}","${(rec.deviceName || '').replace(/"/g, '""')}","${(rec.cause || '').replace(/"/g, '""')}","${(rec.technician || '').replace(/"/g, '""')}","${(rec.customerName || '').replace(/"/g, '""')}","${rec.branch}","${(rec.branchAddress || '').replace(/"/g, '""')}","${rec.status}","${rec.paymentMethod}",${rec.amount.toFixed(2)}`
        );
      });
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Graphix_Repair_${title.replace(/[^a-zA-Z0-9]+/g, '_')}_${activeTab}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSelectMonth = (monthKey: string) => {
    setMonthFilter(monthKey);
    setPage(1);
    setActiveTab('records');
  };

  const tabs: Array<{ id: ModalTab; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'devices', label: 'Devices & Services', icon: <Wrench size={15} />, count: devicesRepaired.length },
    { id: 'records', label: 'Repair Records', icon: <ReceiptText size={15} />, count: meta.totalRequests },
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
                Repaired devices, job quantities, itemized repair records, branch locations, and monthly repair analytics
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
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Repair Revenue</div>
            <div className="text-base sm:text-lg font-black text-[#111] mt-0.5 truncate" title={formatCurrency(meta.totalRevenue || 0)}>
              {formatCurrency(meta.totalRevenue || 0)}
            </div>
            <div className="text-[11px] text-gray-500 font-medium mt-0.5 truncate">
              Cash: {formatCurrency(meta.cashRevenue || 0)}
              {(meta.gcashRevenue || 0) > 0 && ` • GCash: ${formatCurrency(meta.gcashRevenue)}`}
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-purple-100 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Completed Jobs</div>
            <div className="text-base sm:text-lg font-black text-[#111] mt-0.5">
              {(meta.completedCount || 0).toLocaleString()} <span className="text-xs font-bold text-gray-500">jobs</span>
            </div>
            <div className="text-[11px] text-gray-500 font-medium mt-0.5">
              {devicesRepaired.length} distinct {devicesRepaired.length === 1 ? 'device' : 'devices'}
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-purple-100 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Records</div>
            <div className="text-base sm:text-lg font-black text-[#111] mt-0.5">
              {(meta.totalRequests || 0).toLocaleString()} <span className="text-xs font-bold text-gray-500">records</span>
            </div>
            <div className="text-[11px] text-gray-500 font-medium mt-0.5">
              Active: {meta.activeCount || 0} • Cancelled: {meta.cancelledCount || 0}
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-purple-100 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Branch Scope</div>
            <div className="text-base sm:text-lg font-black text-[#111] mt-0.5 truncate">
              {meta.effectiveBranch || (isSuperAdmin ? 'All Branches' : userBranch)}
            </div>
            <div className="text-[11px] text-gray-500 font-medium mt-0.5">
              Cash txns: {meta.cashCount || 0} • GCash: {meta.gcashCount || 0}
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
              <p className="text-sm font-semibold">Loading detailed repair breakdown...</p>
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
              {/* TAB 1: DEVICES & SERVICES */}
              {activeTab === 'devices' && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">
                      Showing <span className="font-bold text-gray-900">{filteredDevices.length}</span> repaired device models in{' '}
                      <span className="font-bold text-gray-900">{meta.effectiveBranch}</span>
                    </p>
                    <div className="relative w-full sm:w-72">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={deviceSearch}
                        onChange={(e) => setDeviceSearch(e.target.value)}
                        placeholder="Search device model..."
                        className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-white border border-gray-200 rounded-xl outline-none focus:border-[#bd00ff]"
                      />
                    </div>
                  </div>

                  {filteredDevices.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-14 text-center text-gray-400">
                      <Wrench size={32} className="mx-auto mb-2 text-purple-300" />
                      <p className="text-sm font-bold text-gray-600">No repair services recorded in this period</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-purple-50/70 text-[11px] uppercase tracking-wider text-gray-600 font-extrabold border-b border-purple-100">
                              <th className="py-3 px-4">#</th>
                              <th className="py-3 px-4">Device / Service</th>
                              <th className="py-3 px-4">Branches Handled</th>
                              <th className="py-3 px-4 text-right">Jobs</th>
                              <th className="py-3 px-4 text-right">Avg Cost</th>
                              <th className="py-3 px-4 text-right">Total Revenue</th>
                              <th className="py-3 px-4 text-right">Share</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                            {filteredDevices.map((d) => (
                              <tr key={d.deviceName} className="hover:bg-purple-50/30 transition-colors">
                                <td className="py-3 px-4 font-black text-gray-400">{d.rank}</td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-purple-50 text-[#bd00ff] flex items-center justify-center shrink-0 border border-purple-100">
                                      <Smartphone size={16} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-bold text-gray-900 truncate max-w-[240px]" title={d.deviceName}>
                                        {d.deviceName}
                                      </div>
                                      <div className="text-[11px] text-gray-500 font-medium">
                                        {d.completedCount} completed of {d.jobCount} {d.jobCount === 1 ? 'job' : 'jobs'}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex flex-wrap gap-1">
                                    {(d.branches || []).map((b: any) => (
                                      <span
                                        key={b.branch}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200/70"
                                      >
                                        <MapPin size={10} /> {b.branch}: {b.jobs}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right font-black text-gray-900">{d.jobCount}</td>
                                <td className="py-3 px-4 text-right font-semibold text-gray-600 whitespace-nowrap">
                                  {formatCurrency(d.avgCost)}
                                </td>
                                <td className="py-3 px-4 text-right font-black text-[#111] whitespace-nowrap">
                                  {formatCurrency(d.totalRevenue)}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">
                                    {d.percentageShare}%
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

              {/* TAB 2: REPAIR RECORDS */}
              {activeTab === 'records' && (
                <div className="flex flex-col gap-4">
                  <div className="bg-white p-3.5 rounded-2xl border border-purple-100 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={recordSearch}
                        onChange={(e) => setRecordSearch(e.target.value)}
                        placeholder="Search ref ID, device, customer, technician, issue, branch..."
                        className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#bd00ff] focus:bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1 text-xs font-bold text-gray-500">
                        <Filter size={13} />
                      </div>
                      {scope === 'all_requests' && (
                        <select
                          value={statusFilter}
                          onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                          }}
                          className="px-2.5 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#bd00ff] cursor-pointer"
                        >
                          <option value="all">All Statuses</option>
                          <option value="completed">Completed</option>
                          <option value="in progress">In Progress</option>
                          <option value="accepted">Accepted</option>
                          <option value="pending">Pending</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      )}

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

                  {recordData.items.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-14 text-center text-gray-400">
                      <ReceiptText size={32} className="mx-auto mb-2 text-purple-300" />
                      <p className="text-sm font-bold text-gray-600">No repair records match your filters</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-purple-50/70 text-[11px] uppercase tracking-wider text-gray-600 font-extrabold border-b border-purple-100">
                              <th className="py-3 px-4">Date & Ref</th>
                              <th className="py-3 px-4">Device & Issue</th>
                              <th className="py-3 px-4">Customer & Tech</th>
                              <th className="py-3 px-4">Branch & Location</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4">Payment</th>
                              <th className="py-3 px-4 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-xs">
                            {recordData.items.map((rec: any) => (
                              <tr key={rec.id} className="hover:bg-purple-50/30 transition-colors">
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <div className="font-bold text-gray-900">{formatDateTime(rec.createdAt)}</div>
                                  <div className="text-[11px] text-gray-500 font-mono mt-0.5">{rec.referenceId}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-bold text-gray-900 max-w-[200px] truncate" title={rec.deviceName}>
                                    {rec.deviceName}
                                  </div>
                                  <div className="text-[11px] text-gray-500 max-w-[220px] truncate mt-0.5" title={rec.cause}>
                                    {rec.cause}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-semibold text-gray-800">{rec.customerName}</div>
                                  <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                    <UserCheck size={11} className="text-[#bd00ff]" /> {rec.technician}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1 font-bold text-gray-900">
                                    <MapPin size={12} className="text-[#bd00ff] shrink-0" />
                                    <span>{rec.branch}</span>
                                  </div>
                                  <div className="text-[11px] text-gray-500 truncate max-w-[170px]" title={rec.branchAddress}>
                                    {rec.branchAddress}
                                  </div>
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadgeClass(
                                      rec.status
                                    )}`}
                                  >
                                    {rec.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                      rec.paymentMethod === 'Cash'
                                        ? 'bg-green-50 text-green-700 border-green-200'
                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}
                                  >
                                    {rec.paymentMethod === 'Cash' ? <Banknote size={11} /> : <QrCode size={11} />}
                                    {rec.paymentMethod}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right font-black text-[#111] whitespace-nowrap text-sm">
                                  {formatCurrency(rec.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="px-4 py-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between text-xs">
                        <span className="text-gray-600 font-medium">
                          Showing <span className="font-bold text-gray-900">{recordData.items.length}</span> of{' '}
                          <span className="font-bold text-gray-900">{recordData.totalFiltered}</span> records
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={recordData.page <= 1}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 font-bold text-gray-700 disabled:opacity-40 cursor-pointer hover:bg-gray-50"
                          >
                            <ChevronLeft size={14} /> Prev
                          </button>
                          <span className="font-bold text-gray-700">
                            Page {recordData.page} / {recordData.totalPages}
                          </span>
                          <button
                            onClick={() => setPage((p) => Math.min(recordData.totalPages, p + 1))}
                            disabled={recordData.page >= recordData.totalPages}
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
                          <div className="bg-emerald-50/70 rounded-xl p-2.5">
                            <div className="text-emerald-700 font-semibold">Completed</div>
                            <div className="font-black text-gray-900 text-sm mt-0.5">{b.completed} jobs</div>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-2.5">
                            <div className="text-gray-500 font-semibold">Requests</div>
                            <div className="font-black text-gray-900 text-sm mt-0.5">
                              {b.requests} ({b.completionRate}%)
                            </div>
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
              )}

              {/* TAB 4: MONTHLY ANALYTICS */}
              {activeTab === 'monthly' && (
                <div className="flex flex-col gap-5">
                  {weeklyBreakdown.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 border border-purple-100 shadow-2xs">
                      <h4 className="text-sm font-black text-gray-900 mb-1">
                        Weekly Repair Breakdown ({meta.dateRangeLabel})
                      </h4>
                      <p className="text-xs text-gray-500 mb-4">
                        Week-by-week repair activity for {meta.effectiveBranch}
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
                                {w.completed} completed • {w.requests} reqs
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {monthlyAnalytics.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 border border-purple-100 shadow-2xs">
                      <div className="mb-4">
                        <h4 className="text-sm font-black text-gray-900">Monthly Repair Revenue Overview</h4>
                        <p className="text-xs text-gray-500">
                          Click any month bar or row to filter the repair records to that month
                        </p>
                      </div>
                      <div className="h-44 flex items-end gap-2 sm:gap-3 pt-6 pb-2 px-2 border border-purple-100 rounded-xl bg-purple-50/20 overflow-x-auto">
                        {monthlyAnalytics.map((m) => {
                          const hPct = m.revenue > 0 ? Math.max(8, Math.round((m.revenue / maxMonthlyRev) * 100)) : 4;
                          return (
                            <button
                              key={m.monthKey}
                              onClick={() => handleSelectMonth(m.monthKey)}
                              className="flex-1 min-w-[52px] h-full flex flex-col items-center justify-end gap-1.5 group cursor-pointer bg-transparent border-none p-0"
                              title={`${m.monthLabel}: ${formatCurrency(m.revenue)} (${m.completed} completed)`}
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

                  {monthlyAnalytics.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-14 text-center text-gray-400">
                      <BarChart3 size={32} className="mx-auto mb-2 text-purple-300" />
                      <p className="text-sm font-bold text-gray-600">No monthly repair analytics recorded in this period</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-purple-50/70 text-[11px] uppercase tracking-wider text-gray-600 font-extrabold border-b border-purple-100">
                              <th className="py-3 px-4">Month</th>
                              <th className="py-3 px-4 text-right">Repair Revenue</th>
                              <th className="py-3 px-4 text-right">Completed</th>
                              <th className="py-3 px-4 text-right">Requests</th>
                              <th className="py-3 px-4">Branch Breakdown</th>
                              <th className="py-3 px-4">Top Device</th>
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
                                <td className="py-3.5 px-4 font-black text-gray-900 whitespace-nowrap">{m.monthLabel}</td>
                                <td className="py-3.5 px-4 text-right font-black text-[#111] whitespace-nowrap">
                                  {formatCurrency(m.revenue)}
                                </td>
                                <td className="py-3.5 px-4 text-right font-bold text-emerald-700">{m.completed}</td>
                                <td className="py-3.5 px-4 text-right font-bold text-gray-600">{m.requests}</td>
                                <td className="py-3.5 px-4">
                                  <div className="flex flex-wrap gap-1">
                                    {(m.branchSplits || []).map((bs: any) => (
                                      <span
                                        key={bs.branch}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200/70"
                                      >
                                        <MapPin size={9} /> {bs.branch}: {formatCurrency(bs.revenue)} ({bs.completed}j)
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 font-semibold text-gray-700 max-w-[180px] truncate" title={m.topDevice}>
                                  {m.topDevice}
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

