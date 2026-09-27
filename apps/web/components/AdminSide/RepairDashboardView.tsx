"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Wrench, 
  Clock, 
  CheckCircle2, 
  Cpu, 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  X, 
  ExternalLink, 
  Package, 
  Smartphone, 
  CheckCheck, 
  AlertCircle,
  HelpCircle,
  Banknote
} from 'lucide-react';

const formatCurrency = (val: number) => {
  return '₱' + (val || 0).toLocaleString('en-PH', {
    minimumFractionDigits: (val || 0) % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  });
};

function getResponsiveNumberClass(val: string | number, variant: 'compact' | 'standard' = 'compact') {
  const str = String(val ?? '');
  const len = str.length;

  if (variant === 'compact') {
    if (len <= 6) return 'text-2xl xl:text-3xl';
    if (len <= 9) return 'text-xl xl:text-2xl';
    if (len <= 13) return 'text-lg xl:text-xl';
    if (len <= 17) return 'text-base xl:text-lg';
    return 'text-sm xl:text-base';
  }

  if (len <= 7) return 'text-2xl sm:text-3xl lg:text-[32px]';
  if (len <= 11) return 'text-xl sm:text-2xl lg:text-3xl';
  if (len <= 15) return 'text-lg sm:text-xl lg:text-2xl';
  if (len <= 19) return 'text-base sm:text-lg lg:text-xl';
  return 'text-sm sm:text-base lg:text-lg';
}

interface RepairDashboardViewProps {
  selectedBranch: string;
  setSelectedBranch: (branch: string) => void;
  isSuperAdmin: boolean;
}

export default function RepairDashboardView({
  selectedBranch,
  setSelectedBranch,
  isSuperAdmin,
}: RepairDashboardViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/repairs/dashboard?branch=${encodeURIComponent(selectedBranch)}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
      })
      .catch((err) => console.error('Failed to fetch repair dashboard data:', err))
      .finally(() => setLoading(false));
  }, [selectedBranch]);

  const summary = data?.summary || {
    totalRequests: 0,
    pendingRepairs: 0,
    acceptedRepairs: 0,
    inProgressRepairs: 0,
    completedRepairs: 0,
    repairRevenue: 0,
  };

  const revenue = data?.revenue || {
    today: 0,
    yesterday: 0,
    weekly: 0,
    monthly: 0,
    total: 0,
  };

  const totalRevenueFormatted = formatCurrency(summary.repairRevenue || 0);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyActivity = data?.monthlyActivity || Array(12).fill(0);
  const monthlyRevenue = data?.monthlyRevenue || Array(12).fill(0);
  const maxRepairs = Math.max(...monthlyActivity, 1);

  // Status Conic Gradient computation
  const statusDist: Array<{ status: string; label: string; count: number; percentage: number; color: string; badgeBg: string }> =
    data?.statusDistribution || [];

  let conicGradient = 'conic-gradient(#e2e8f0 0% 100%)';
  if (statusDist.length > 0 && summary.totalRequests > 0) {
    let currentPct = 0;
    const slices: string[] = [];
    statusDist.forEach((item) => {
      if (item.count > 0) {
        const itemPct = (item.count / summary.totalRequests) * 100;
        const nextPct = currentPct + itemPct;
        slices.push(`${item.color} ${currentPct.toFixed(1)}% ${nextPct.toFixed(1)}%`);
        currentPct = nextPct;
      }
    });
    if (slices.length > 0) {
      if (currentPct < 99.9) {
        slices.push(`#e2e8f0 ${currentPct.toFixed(1)}% 100%`);
      }
      conicGradient = `conic-gradient(${slices.join(', ')})`;
    }
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      {/* 6 Repair Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* 1. Repair Requests */}
        <Link href="/admin/repairs/transactions" className="block transition-transform hover:-translate-y-1 no-underline">
          <StatCard
            icon={<Smartphone size={20} />}
            label="Repair Requests"
            value={`${summary.totalRequests ?? 0}`}
            subText={
              <span className="text-purple-700 font-semibold text-[11px] truncate block">
                Total repair volume
              </span>
            }
            iconBg="bg-purple-100"
            iconColor="text-[#bd00ff]"
          />
        </Link>

        {/* 2. Pending Repairs */}
        <Link href="/admin/repairs/transactions" className="block transition-transform hover:-translate-y-1 no-underline">
          <StatCard
            icon={<Clock size={20} />}
            label="Pending Repairs"
            value={`${summary.pendingRepairs ?? 0}`}
            subText={
              <span className="text-amber-600 font-semibold text-[11px] truncate block">
                Waiting for approval
              </span>
            }
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
          />
        </Link>

        {/* 3. Accepted Repairs */}
        <Link href="/admin/repairs/transactions" className="block transition-transform hover:-translate-y-1 no-underline">
          <StatCard
            icon={<CheckCircle2 size={20} />}
            label="Accepted Repairs"
            value={`${summary.acceptedRepairs ?? 0}`}
            subText={
              <span className="text-indigo-600 font-semibold text-[11px] truncate block">
                Ready for servicing
              </span>
            }
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
          />
        </Link>

        {/* 4. In Progress Repairs */}
        <Link href="/admin/repairs/transactions" className="block transition-transform hover:-translate-y-1 no-underline">
          <StatCard
            icon={<Cpu size={20} />}
            label="In Progress"
            value={`${summary.inProgressRepairs ?? 0}`}
            subText={
              <span className="text-blue-600 font-semibold text-[11px] truncate block">
                Diagnostic / Repairing
              </span>
            }
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
        </Link>

        {/* 5. Completed Repairs */}
        <Link href="/admin/repairs/transactions" className="block transition-transform hover:-translate-y-1 no-underline">
          <StatCard
            icon={<CheckCheck size={20} />}
            label="Completed Repairs"
            value={`${summary.completedRepairs ?? 0}`}
            subText={
              <span className="text-emerald-600 font-semibold text-[11px] truncate block">
                Finished & ready
              </span>
            }
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
          />
        </Link>

        {/* 6. Repair Revenue */}
        <StatCard
          icon={<span className="text-xl font-bold">₱</span>}
          label="Repair Revenue"
          value={totalRevenueFormatted}
          subText={
            <span className="text-purple-700 font-semibold text-[11px] truncate block">
              Today: {formatCurrency(revenue.today || 0)}
            </span>
          }
          iconBg="bg-emerald-100"
          iconColor="text-emerald-700"
        />
      </div>

      {/* Charts Section: Repair Activity Overview (Bar Chart) & Repair Status Overview (Donut/Pie) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Repair Activity Overview Bar Chart */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-sm p-6 md:p-8 lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-[#111]">Repair Activity Overview</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                  {selectedBranch === 'all' ? 'All Branches' : `${selectedBranch} Branch`}
                </span>
              </div>
              <p className="text-sm text-[#666] mt-0.5">Monthly repair requests and completed volume ({new Date().getFullYear()})</p>
            </div>
          </div>

          <div className="w-full overflow-x-auto border-2 border-[#BF00FF] rounded-xl relative">
            <div className="w-full min-w-[500px] h-[300px] flex justify-around items-end gap-2 text-xs md:text-sm p-5">
              {months.map((month, i) => {
                const count = monthlyActivity[i];
                const rev = monthlyRevenue[i];
                const heightPercent = count > 0 ? Math.max((count / maxRepairs) * 85, 4) : 2;

                return (
                  <div 
                    key={month} 
                    className="flex flex-col items-center justify-end h-full w-full gap-2 group cursor-pointer"
                    onClick={() => setSelectedMonthIndex(i)}
                  >
                    <div
                      className="w-full max-w-[40px] bg-gradient-to-t from-purple-700 to-[#bd00ff] rounded-t-md hover:brightness-125 transition-all duration-300 relative flex justify-center"
                      style={{ height: `${heightPercent}%` }}
                    >
                      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 text-white text-xs px-2.5 py-1.5 rounded-lg pointer-events-none whitespace-nowrap z-20 shadow-lg flex flex-col items-center gap-0.5">
                        <span className="font-bold">{month}: {count} {count === 1 ? 'repair' : 'repairs'}</span>
                        <span className="text-[10px] text-purple-300 font-semibold">{formatCurrency(rev)}</span>
                      </div>
                    </div>
                    <span className="text-[#111] font-semibold">{month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Repair Status Overview Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-sm p-6 md:p-8 lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-[#111]">Repair Status Overview</h3>
                <p className="text-xs text-[#666] mt-0.5">Distribution across repair lifecycles</p>
              </div>
              <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full border border-purple-200">
                {summary.totalRequests} Total
              </span>
            </div>

            {summary.totalRequests === 0 ? (
              <div className="h-[200px] flex flex-col items-center justify-center text-gray-400 gap-2 bg-purple-50/20 rounded-xl border border-dashed border-purple-100 p-4">
                <Wrench size={32} className="text-purple-300" />
                <p className="text-sm font-semibold text-gray-500">No repair records found</p>
                <p className="text-xs text-gray-400 text-center">New repair requests for {selectedBranch} will appear here.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-5 my-2">
                {/* Conic Donut Chart */}
                <div className="relative flex items-center justify-center">
                  <div
                    className="w-36 h-36 rounded-full shadow-md border-4 border-white transition-all"
                    style={{ background: conicGradient }}
                  />
                  <div className="absolute w-20 h-20 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                    <span className="text-lg font-black text-gray-900 leading-none">{summary.totalRequests}</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Repairs</span>
                  </div>
                </div>

                {/* Status Badges List */}
                <div className="w-full flex flex-col gap-2">
                  {statusDist.map((st) => (
                    <div
                      key={st.status}
                      className="flex items-center justify-between p-2 rounded-xl bg-gray-50/70 border border-gray-100 text-xs font-semibold hover:bg-purple-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: st.color }} />
                        <span className="text-gray-800">{st.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{st.count}</span>
                        <span className="text-[10px] font-bold bg-white text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                          {st.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-gray-100 text-center">
            <Link
              href="/admin/repairs/transactions"
              className="text-xs font-bold text-[#bd00ff] hover:underline inline-flex items-center gap-1"
            >
              <span>Manage Repair Workorders</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* Lower Section Grid: Revenue Breakdown & Recent Repair Records */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Left Column: Stacked Metric Cards */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          {/* Repair Revenue Breakdown */}
          <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
            <h3 className="text-lg font-bold text-[#111] mb-4 flex items-center gap-2">
              <Banknote size={20} className="text-[#bd00ff]" /> Repair Revenue Overview
            </h3>
            <div className="flex justify-between items-end gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[#666] text-sm font-semibold">Completed Services Revenue</p>
                <h4
                  className={`font-black text-[#111] mt-1 tracking-tight truncate ${getResponsiveNumberClass(
                    totalRevenueFormatted,
                    'standard'
                  )}`}
                  title={totalRevenueFormatted}
                >
                  {totalRevenueFormatted}
                </h4>
              </div>
              <div className="text-right flex flex-col gap-1 shrink-0">
                <p className="text-xs font-bold bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg whitespace-nowrap">
                  This Month: {formatCurrency(revenue.monthly || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Repair Insights */}
          <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
            <h3 className="text-lg font-bold text-[#111] mb-3 flex items-center gap-2">
              <Wrench size={20} className="text-[#bd00ff]" /> Repair Performance Rate
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-gray-600">Completion Rate</span>
                <span className="font-bold text-emerald-600">
                  {summary.totalRequests > 0
                    ? `${Math.round((summary.completedRepairs / summary.totalRequests) * 100)}%`
                    : '0%'}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      summary.totalRequests > 0
                        ? Math.min(Math.round((summary.completedRepairs / summary.totalRequests) * 100), 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 pt-1">
                <span>{summary.completedRepairs} of {summary.totalRequests} jobs completed</span>
                <span>{summary.inProgressRepairs} ongoing</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Repair Activity Table */}
        <div className="lg:col-span-2">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-sm p-6 md:p-8 flex flex-col h-full">
            <div className="mb-5 pb-4 border-b border-black/5 flex items-center justify-between">
              <div>
                <h3 className="text-lg text-[#111] font-bold">Recent Repair Workorders</h3>
                <p className="text-xs text-gray-500 mt-0.5">Latest service jobs recorded across branches</p>
              </div>
              <Link
                href="/admin/repairs/transactions"
                className="text-xs font-bold text-[#bd00ff] hover:underline flex items-center gap-1"
              >
                <span>View All Records</span>
                <ExternalLink size={12} />
              </Link>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left min-w-[520px]">
                <thead>
                  <tr className="border-b border-black/5 text-xs font-semibold text-[#666] uppercase tracking-wide">
                    <th className="py-3 px-3">Device / Model</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3">Branch</th>
                    <th className="py-3 px-3 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                  {(!data?.recentRepairs || data.recentRepairs.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        No repair records found for {selectedBranch}.
                      </td>
                    </tr>
                  ) : (
                    data.recentRepairs.map((r: any) => {
                      const stBadge =
                        r.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : r.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : r.status === 'Accepted'
                          ? 'bg-purple-100 text-purple-800 border-purple-200'
                          : r.status === 'Cancelled'
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200';

                      return (
                        <tr key={r.id} className="hover:bg-purple-50/30 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-gray-900 truncate max-w-[180px]">{r.deviceName}</div>
                            <span className="text-[10px] text-gray-400 block truncate">Tech: {r.technician}</span>
                          </td>
                          <td className="py-3 px-3 font-medium text-gray-700 truncate max-w-[140px]">{r.ownerName}</td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${stBadge}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-xs text-gray-600 font-semibold whitespace-nowrap">{r.branch}</td>
                          <td className="py-3 px-3 text-right font-black text-gray-900 whitespace-nowrap">
                            {formatCurrency(r.repairCost || 0)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Branch Repair Performance Comparison (Super Admin System-Wide View) */}
      {isSuperAdmin && (!selectedBranch || selectedBranch === 'all') && data?.branchComparison && data.branchComparison.length > 0 && (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-sm p-6 md:p-8">
          <div className="mb-6 pb-4 border-b border-black/5 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-[#111] flex items-center gap-2">
                <Building2 className="text-[#bd00ff]" size={22} /> Multi-Branch Repair Performance Comparison
              </h3>
              <p className="text-sm text-[#666] mt-0.5">Live repair volume, completed services, and revenue across branches</p>
            </div>
            <Link
              href="/admin/repairs/transactions"
              className="text-xs font-bold text-[#bd00ff] hover:underline hidden sm:inline"
            >
              All Repair Transactions →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.branchComparison.map((comp: any) => {
              const maxRev = Math.max(...data.branchComparison.map((c: any) => c.revenue), 1);
              const percent = Math.round((comp.revenue / maxRev) * 100);
              const compRevFormatted = formatCurrency(comp.revenue);

              return (
                <div
                  key={comp.branch}
                  className="bg-gray-50/70 border border-gray-100 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-purple-200 transition-all"
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-base text-gray-900 flex items-center gap-1.5">
                        📍 {comp.branch}
                      </span>
                      <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        {comp.completed} Completed
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 mb-3">
                      <span className="text-xs font-semibold text-gray-500">Repair Revenue</span>
                      <span
                        className={`font-black text-gray-900 tracking-tight truncate ${getResponsiveNumberClass(
                          compRevFormatted,
                          'standard'
                        )}`}
                        title={compRevFormatted}
                      >
                        {compRevFormatted}
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-3">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-[#bd00ff] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(percent, 4)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200/60 flex justify-between items-center text-xs font-semibold text-gray-600">
                    <span>Total Requests: <strong className="text-gray-900">{comp.requests}</strong></span>
                    <button
                      onClick={() => setSelectedBranch(comp.branch)}
                      className="text-[#bd00ff] hover:underline text-xs font-bold cursor-pointer"
                    >
                      Filter Branch →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly Activity Details Modal */}
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
              <h3 className="font-bold text-[#111] text-lg">{months[selectedMonthIndex]} Repair Details</h3>
              <button
                className="text-gray-400 hover:text-black transition-colors"
                onClick={() => setSelectedMonthIndex(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-5">
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <span className="text-[#666] font-medium">Repair Requests</span>
                <span className="font-bold text-xl text-[#111]">{monthlyActivity[selectedMonthIndex]} repairs</span>
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
  variant = 'compact',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subText?: React.ReactNode;
  iconBg: string;
  iconColor: string;
  variant?: 'compact' | 'standard';
}) {
  const valueClass = getResponsiveNumberClass(value, variant);

  return (
    <div className="bg-white/95 backdrop-blur-md p-5 rounded-2xl flex flex-col justify-between gap-3 border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)] h-full overflow-hidden">
      <div>
        <div className={`w-10 h-10 rounded-xl flex justify-center items-center mb-3 ${iconBg} ${iconColor}`}>
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
