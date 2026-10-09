"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wrench,
  FileSpreadsheet,
  Calendar,
  Building2,
  Clock,
  CheckCircle2,
  Cpu,
  CheckCheck,
  AlertCircle,
  X,
  TrendingUp,
  TrendingDown,
  Banknote,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const formatCurrency = (val: number) => {
  return '₱' + (val || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

function getResponsiveNumberClass(val: string | number) {
  const str = String(val ?? '');
  const len = str.length;

  if (len <= 7) return 'text-2xl sm:text-3xl lg:text-[32px]';
  if (len <= 11) return 'text-xl sm:text-2xl lg:text-3xl';
  if (len <= 15) return 'text-lg sm:text-xl lg:text-2xl';
  if (len <= 19) return 'text-base sm:text-lg lg:text-xl';
  return 'text-sm sm:text-base lg:text-lg';
}

interface RepairAnalyticsViewProps {
  selectedBranch: string;
  isSuperAdmin: boolean;
  userBranch?: string | null;
  dateFilter: 'today' | 'week' | 'month' | 'year' | 'custom';
  setDateFilter: (filter: 'today' | 'week' | 'month' | 'year' | 'custom') => void;
  customStartDate: string;
  setCustomStartDate: (d: string) => void;
  customEndDate: string;
  setCustomEndDate: (d: string) => void;
  exportTriggerRef?: React.MutableRefObject<(() => void) | null>;
}

export default function RepairAnalyticsView({
  selectedBranch,
  isSuperAdmin,
  userBranch,
  dateFilter,
  setDateFilter,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  exportTriggerRef,
}: RepairAnalyticsViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);
  const { styles } = useTheme();

  const fetchRepairAnalytics = async () => {
    setLoading(true);
    try {
      const branchParam = isSuperAdmin ? selectedBranch : userBranch || 'Tagoloan';
      let url = `/api/analytics/repairs/analytics?branch=${encodeURIComponent(branchParam)}&dateFilter=${dateFilter}`;
      if (dateFilter === 'custom' && customStartDate && customEndDate) {
        url += `&startDate=${encodeURIComponent(customStartDate)}&endDate=${encodeURIComponent(customEndDate)}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch repair analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepairAnalytics();
  }, [selectedBranch, isSuperAdmin, userBranch, dateFilter, customStartDate, customEndDate]);

  const summary = data?.summary || {
    totalRequests: 0,
    pendingRepairs: 0,
    acceptedRepairs: 0,
    inProgressRepairs: 0,
    completedRepairs: 0,
    cancelledRepairs: 0,
    repairRevenue: 0,
  };

  const revenue = data?.revenue || {
    thisYear: 0,
    lastYear: 0,
    allTime: 0,
    periodRevenue: 0,
  };

  const paymentMethods = data?.paymentMethods || {
    cash: { totalAmount: 0, transactionCount: 0 },
    gcash: { totalAmount: 0, transactionCount: 0 },
    totalAmount: 0,
    totalTransactions: 0,
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyActivity = data?.monthlyActivity || Array(12).fill(0);
  const monthlyRevenue = data?.monthlyRevenue || Array(12).fill(0);
  const maxRepairs = Math.max(...monthlyActivity, 1);

  const filterOptions: Array<{ id: 'today' | 'week' | 'month' | 'year' | 'custom'; label: string }> = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'year', label: 'This Year' },
    { id: 'custom', label: 'Custom Date Range' },
  ];

  const effectiveBranchLabel = isSuperAdmin
    ? selectedBranch === 'all'
      ? 'All Branches'
      : `${selectedBranch} Branch`
    : `${userBranch || 'Tagoloan'} Branch`;

  const handleDownloadCsv = () => {
    const headers = ['Month', 'Repair Requests', 'Repair Revenue (PHP)'];
    const csvRows = [headers.join(',')];
    months.forEach((m, idx) => {
      csvRows.push(`${m},${monthlyActivity[idx]},${monthlyRevenue[idx]}`);
    });
    csvRows.push('');
    csvRows.push(`Total Requests,${summary.totalRequests}`);
    csvRows.push(`Completed Repairs,${summary.completedRepairs}`);
    csvRows.push(`Period Revenue,${summary.repairRevenue}`);

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Graphix_Repair_Analytics_${dateFilter.toUpperCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (exportTriggerRef) {
      exportTriggerRef.current = handleDownloadCsv;
    }
  });

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      {/* Date Filter Bar */}
      <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mr-2 uppercase tracking-wide">
            <Calendar size={15} className="text-[#bd00ff]" /> Period:
          </div>
          {filterOptions.map((opt) => {
            const isActive = dateFilter === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setDateFilter(opt.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isActive
                    ? `bg-gradient-to-r ${styles.gradient} text-white shadow-sm border-transparent`
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap bg-purple-50/70 p-2 rounded-xl border border-purple-200/80 animate-in fade-in">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
              <span>From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white px-2 py-1 rounded-lg border border-purple-200 text-xs font-bold text-gray-800 outline-none cursor-pointer focus:border-[#bd00ff]"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
              <span>To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white px-2 py-1 rounded-lg border border-purple-200 text-xs font-bold text-gray-800 outline-none cursor-pointer focus:border-[#bd00ff]"
              />
            </div>
          </div>
        )}
      </div>

      {/* 4 Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<span className="text-[22px] font-bold">₱</span>}
          label="Period Repair Revenue"
          value={formatCurrency(summary.repairRevenue || 0)}
          subText={
            <span className="text-purple-700 font-semibold text-xs truncate block">
              This Year: {formatCurrency(revenue.thisYear || 0)}
            </span>
          }
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />
        <StatCard
          icon={<CheckCheck size={24} />}
          label="Completed Repairs"
          value={`${summary.completedRepairs || 0} jobs`}
          subText={
            <span className="text-emerald-600 font-semibold text-xs truncate block">
              {summary.totalRequests > 0
                ? `${Math.round((summary.completedRepairs / summary.totalRequests) * 100)}% completion rate`
                : '100% completion rate'}
            </span>
          }
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <StatCard
          icon={<Smartphone size={24} />}
          label="Total Repair Requests"
          value={`${summary.totalRequests || 0} records`}
          subText={
            <span className="text-blue-600 font-semibold text-xs truncate block">
              {summary.inProgressRepairs} in progress • {summary.pendingRepairs} pending
            </span>
          }
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          icon={<span className="text-[22px] font-bold">₱</span>}
          label="All-Time Repair Sales"
          value={formatCurrency(revenue.allTime || 0)}
          subText={
            <span className="text-gray-500 font-semibold text-xs truncate block">
              Cumulative service earnings
            </span>
          }
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
      </div>

      {/* Charts Section: Monthly Activity & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Monthly Activity Bar Chart */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-sm p-4 sm:p-6 md:p-8 lg:col-span-2">
          <div className="mb-6 sm:mb-8">
            <h3 className="text-xl font-bold text-[#111] mb-1">Monthly Repair Activity</h3>
            <p className="text-sm text-[#666]">Repair Volume Overview ({effectiveBranchLabel})</p>
          </div>

          <div className={`w-full border-2 ${styles.borderMain} rounded-xl relative overflow-hidden transition-colors duration-300`}>
            <div className="w-full h-[250px] sm:h-[300px] px-1.5 py-3 sm:p-5 flex justify-between items-end gap-1 sm:gap-2 text-xs md:text-sm">
              {months.map((month, i) => {
                const count = monthlyActivity[i];
                const heightPercent = count > 0 ? Math.max((count / maxRepairs) * 85, 4) : 2;

                return (
                  <div
                    key={month}
                    className="flex flex-col items-center justify-end h-full w-full gap-1 sm:gap-2 group cursor-pointer"
                    onClick={() => setSelectedMonthIndex(i)}
                  >
                    <div
                      className={`w-full max-w-[14px] xs:max-w-[20px] sm:max-w-[32px] md:max-w-[40px] bg-gradient-to-t ${styles.gradient} rounded-t-xs sm:rounded-t-md hover:brightness-125 active:brightness-125 transition-all duration-300 relative flex justify-center`}
                      style={{ height: `${heightPercent}%` }}
                    >
                      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity bg-black/90 text-white text-[10px] sm:text-xs px-2.5 py-1.5 rounded-lg pointer-events-none whitespace-nowrap z-20 shadow-lg flex flex-col items-center gap-0.5">
                        <span className="font-bold">{month}: {count} repairs</span>
                        <span className="text-[10px] text-purple-300 font-semibold">{formatCurrency(monthlyRevenue[i])}</span>
                      </div>
                    </div>
                    <span className="text-[#111] font-semibold text-[9px] xs:text-[10px] sm:text-xs md:text-sm tracking-tight">{month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Repair Status Distribution Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-sm p-6 md:p-8 lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-[#111] flex items-center gap-2">
                <Wrench size={20} className="text-[#bd00ff]" /> Status Distribution
              </h3>
              <span className="text-xs font-bold text-gray-500 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                {summary.totalRequests} Total
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {(data?.statusDistribution || []).map((st: any) => (
                <div key={st.status} className="flex flex-col gap-1 p-2.5 rounded-xl bg-gray-50/70 border border-gray-100">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-800">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: st.color }} />
                      {st.label}
                    </span>
                    <span>{st.count} ({st.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${st.percentage}%`, backgroundColor: st.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 text-center">
            <Link
              href="/admin/repairs/transactions"
              className="text-xs font-bold text-[#bd00ff] hover:underline inline-flex items-center gap-1"
            >
              <span>View All Repair Records</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* Lower Section Grid: Payment Methods & Branch Repair Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Left Column: Payment Methods Breakdown */}
        <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex flex-col justify-between lg:col-span-1">
          <div>
            <h3 className="text-lg font-black text-[#111] mb-4 flex items-center gap-2">
              <span className="text-xl">🧾</span> Repair Payment Methods
            </h3>

            <div className="flex flex-col gap-4 divide-y divide-gray-100">
              {/* Cash Payment */}
              <div className="pt-1 first:pt-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">💵</span>
                  <span className="text-sm font-bold text-gray-800">Cash / Over-The-Counter</span>
                </div>
                {(() => {
                  const cashVal = formatCurrency(paymentMethods.cash.totalAmount || 0);
                  return (
                    <div
                      className={`font-black text-[#111] tracking-tight leading-tight whitespace-nowrap truncate ${getResponsiveNumberClass(
                        cashVal
                      )}`}
                      title={cashVal}
                    >
                      {cashVal}
                    </div>
                  );
                })()}
                <div className="text-xs font-semibold text-gray-500 mt-1">
                  {paymentMethods.cash.transactionCount || 0} transactions
                </div>
              </div>

              {/* GCash Payment */}
              <div className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">📱</span>
                  <span className="text-sm font-bold text-gray-800">GCash / Online</span>
                </div>
                {(() => {
                  const gcashVal = formatCurrency(paymentMethods.gcash.totalAmount || 0);
                  return (
                    <div
                      className={`font-black text-[#111] tracking-tight leading-tight whitespace-nowrap truncate ${getResponsiveNumberClass(
                        gcashVal
                      )}`}
                      title={gcashVal}
                    >
                      {gcashVal}
                    </div>
                  );
                })()}
                <div className="text-xs font-semibold text-gray-500 mt-1">
                  {paymentMethods.gcash.transactionCount || 0} transactions
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Branch Repair Performance */}
        <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex flex-col justify-between lg:col-span-2">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-black text-[#111] flex items-center gap-2">
                  <Building2 size={20} className="text-[#bd00ff]" /> Branch Repair Performance
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Repair revenue and completed volume across branches</p>
              </div>
              {!isSuperAdmin && <span className="text-[11px] font-bold text-gray-400">Assigned Branch</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              {(data?.branchPerformance && data.branchPerformance.length > 0) ? (
                data.branchPerformance.map((bp: any) => {
                  const bpVal = formatCurrency(bp.revenue ?? 0);
                  return (
                    <div key={bp.branch} className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 flex flex-col justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-1.5">
                          <span>📍</span> {bp.branch}
                        </div>
                        <div
                          className={`font-black text-[#111] tracking-tight leading-tight whitespace-nowrap truncate ${getResponsiveNumberClass(
                            bpVal
                          )}`}
                          title={bpVal}
                        >
                          {bpVal}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-200 text-xs font-semibold text-gray-500 flex justify-between">
                        <span>{bp.completed ?? 0} Completed</span>
                        <span>{bp.requests ?? 0} Requests</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs font-semibold text-gray-400 py-3 col-span-3 text-center">
                  No branch repair performance recorded for this period.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Month Details Popup */}
      {selectedMonthIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={() => setSelectedMonthIndex(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-black/5 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-[#111] text-lg">{months[selectedMonthIndex]} Repair Analytics</h3>
              <button
                className="text-gray-400 hover:text-black transition-colors"
                onClick={() => setSelectedMonthIndex(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-5">
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <span className="text-[#666] font-medium">Repair Volume</span>
                <span className="font-bold text-xl text-[#111]">{monthlyActivity[selectedMonthIndex]} jobs</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#666] font-medium">Repair Revenue</span>
                <span className="font-bold text-xl text-[#bd00ff]">
                  {formatCurrency(monthlyRevenue[selectedMonthIndex])}
                </span>
              </div>
            </div>
            <div className="p-4 bg-gray-50/80 border-t border-black/5">
              <button
                className="w-full py-2.5 rounded-xl bg-[#bd00ff] text-white font-semibold hover:bg-purple-700 transition-colors"
                onClick={() => setSelectedMonthIndex(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subText,
  iconBg,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subText?: React.ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  const valueClass = getResponsiveNumberClass(value);

  return (
    <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl flex flex-col justify-between gap-3 border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)] h-full overflow-hidden">
      <div>
        <div className={`w-11 h-11 rounded-xl flex justify-center items-center mb-3 ${iconBg} ${iconColor}`}>
          {icon}
        </div>
        <span className="text-xs font-bold text-[#666] uppercase tracking-wider block truncate">{label}</span>
        <h3
          className={`font-black text-[#111] mt-1 tracking-tight leading-tight whitespace-nowrap truncate ${valueClass}`}
          title={value}
        >
          {value}
        </h3>
      </div>
      {subText && <div className="mt-1 text-xs font-semibold overflow-hidden">{subText}</div>}
    </div>
  );
}
