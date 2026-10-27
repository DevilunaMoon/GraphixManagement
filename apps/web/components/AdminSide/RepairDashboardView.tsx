"use client";

import { useState, useEffect, useMemo } from 'react';
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
  Banknote,
  Calendar,
  Users,
  Search,
  ShieldCheck,
  Activity,
  Layers,
  ChevronRight,
  UserCheck,
  Eye,
  Sparkles,
  Filter,
  ArrowUpRight,
  AlertTriangle
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
  const [timeframe, setTimeframe] = useState<'month' | 'all'>('month');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);

  // Super Admin Device Supervision Filters & Search
  const [deviceSearchQuery, setDeviceSearchQuery] = useState('');
  const [supervisionBranchFilter, setSupervisionBranchFilter] = useState<string>('all');
  const [supervisionProgressFilter, setSupervisionProgressFilter] = useState<'all' | 'needsRepair' | 'Diagnostic' | 'Repairing' | 'Completed'>('needsRepair');
  const [inspectingDevice, setInspectingDevice] = useState<any | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/repairs/dashboard?branch=${encodeURIComponent(selectedBranch)}&timeframe=${timeframe}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
      })
      .catch((err) => console.error('Failed to fetch repair dashboard data:', err))
      .finally(() => setLoading(false));
  }, [selectedBranch, timeframe]);

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

  // Aggregate active devices across all branches for Super Admin Supervision table
  const allSupervisionDevices = useMemo(() => {
    const list: any[] = [];
    if (data?.branchComparison && Array.isArray(data.branchComparison)) {
      data.branchComparison.forEach((comp: any) => {
        if (Array.isArray(comp.activeDevices)) {
          comp.activeDevices.forEach((dev: any) => {
            list.push({ ...dev, branch: comp.branch });
          });
        }
      });
    }
    // Also include recentRepairs to cover completed records
    if (data?.recentRepairs && Array.isArray(data.recentRepairs)) {
      data.recentRepairs.forEach((r: any) => {
        if (!list.some(x => x.id === r.id)) {
          list.push(r);
        }
      });
    }
    return list;
  }, [data]);

  // Filtered devices based on user search, branch filter, and progress status filter
  const filteredSupervisionDevices = useMemo(() => {
    return allSupervisionDevices.filter((dev) => {
      // 1. Branch filter
      if (supervisionBranchFilter !== 'all') {
        const b = (dev.branch || '').toLowerCase();
        if (b !== supervisionBranchFilter.toLowerCase()) return false;
      }

      // 2. Progress / Status filter
      const prog = (dev.progress || '').toLowerCase();
      const stat = (dev.status || '').toLowerCase();
      if (supervisionProgressFilter === 'needsRepair') {
        if (stat === 'completed' || prog === 'completed' || stat === 'cancelled' || prog === 'cancelled') {
          return false;
        }
      } else if (supervisionProgressFilter === 'Diagnostic') {
        if (!prog.includes('diag') && prog !== 'accepted') return false;
      } else if (supervisionProgressFilter === 'Repairing') {
        if (!prog.includes('repair') && !prog.includes('progress')) return false;
      } else if (supervisionProgressFilter === 'Completed') {
        if (stat !== 'completed' && prog !== 'completed') return false;
      }

      // 3. Search query
      if (deviceSearchQuery.trim()) {
        const q = deviceSearchQuery.toLowerCase().trim();
        const matchName = (dev.deviceName || '').toLowerCase().includes(q);
        const matchOwner = (dev.ownerName || '').toLowerCase().includes(q);
        const matchTech = (dev.technician || '').toLowerCase().includes(q);
        const matchCause = (dev.cause || '').toLowerCase().includes(q);
        if (!matchName && !matchOwner && !matchTech && !matchCause) return false;
      }

      return true;
    });
  }, [allSupervisionDevices, supervisionBranchFilter, supervisionProgressFilter, deviceSearchQuery]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Timeframe Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-purple-500/15 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={14} className="text-[#bd00ff]" /> Timeframe:
          </span>
          <div className="inline-flex p-1 bg-purple-50/70 rounded-xl border border-purple-100 shadow-inner">
            <button
              type="button"
              onClick={() => setTimeframe('month')}
              className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer border-none flex items-center gap-1.5 ${
                timeframe === 'month'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 bg-transparent'
              }`}
            >
              <span>This Month ({data?.currentMonthShort || 'Current Month'})</span>
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('all')}
              className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer border-none flex items-center gap-1.5 ${
                timeframe === 'all'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 bg-transparent'
              }`}
            >
              <span>All-Time</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-500 font-medium flex items-center gap-2">
          {timeframe === 'month' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Resets on the 1st of every month • Uncompleted workbench devices carry over</span>
            </>
          ) : (
            <span>Showing cumulative all-time records & revenue</span>
          )}
        </div>
      </div>

      {/* 6 Repair Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* 1. Repair Requests */}
        <Link href="/admin/repairs/transactions" className="block transition-transform hover:-translate-y-1 no-underline">
          <StatCard
            icon={<Smartphone size={20} />}
            label={timeframe === 'month' ? "New Requests" : "Repair Requests"}
            value={`${summary.totalRequests ?? 0}`}
            subText={
              <span className="text-purple-700 font-semibold text-[11px] truncate block">
                {timeframe === 'month' ? `Received in ${data?.currentMonthShort || 'this month'}` : 'Total repair volume'}
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
                {timeframe === 'month' && summary.carriedOverCount > 0
                  ? `${summary.carriedOverCount} active carried over`
                  : 'Diagnostic / Repairing'}
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
                {timeframe === 'month' ? `Finished in ${data?.currentMonthShort || 'this month'}` : 'All-time finished'}
              </span>
            }
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
          />
        </Link>

        {/* 6. Repair Revenue */}
        <StatCard
          icon={<span className="text-xl font-bold">₱</span>}
          label={timeframe === 'month' ? "Monthly Revenue" : "Repair Revenue"}
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

      {/* ========================================================================= */}
      {/* SUPER ADMIN 3-BRANCH TECHNICIAN SUPERVISION COMMAND DECK */}
      {/* ========================================================================= */}
      {isSuperAdmin && data?.branchComparison && data.branchComparison.length > 0 && (
        <div className="bg-gradient-to-br from-purple-900 via-indigo-950 to-black text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-purple-500/30 flex flex-col gap-6 relative overflow-hidden">
          {/* Subtle Ambient Glow Effect */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#bd00ff]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header Row */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-5 z-10">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#bd00ff] text-white shadow-md">
                  <ShieldCheck size={14} />
                  Super Admin Command Deck
                </span>
                <span className="text-xs text-purple-200 font-medium flex items-center gap-1">
                  <Activity size={13} className="text-emerald-400 animate-pulse" /> Live Technician Branch Workload
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2 flex items-center gap-2.5">
                <span>3 Technician Branches Live Supervision</span>
              </h2>
              <p className="text-xs sm:text-sm text-purple-200/80 mt-1 max-w-2xl">
                Supervise how many devices each branch needs to repair, track revenue earned this month, and monitor live workbench progress across Tagoloan, Villanueva, and Jasaan.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedBranch('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  selectedBranch === 'all'
                    ? 'bg-white text-purple-950 border-white shadow-lg'
                    : 'bg-white/10 text-purple-200 hover:bg-white/20 border-white/15'
                }`}
              >
                <span>All 3 Branches</span>
              </button>
              <Link
                href="/admin/monitoring"
                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-[#bd00ff] to-purple-600 hover:brightness-110 text-white shadow-lg flex items-center gap-1.5 no-underline transition-transform hover:-translate-y-0.5"
              >
                <Wrench size={14} />
                <span>Open Diagnostic Workbench →</span>
              </Link>
            </div>
          </div>

          {/* The 3 Branch Supervision Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 z-10">
            {data.branchComparison.map((comp: any) => {
              const isSelected = selectedBranch.toLowerCase() === comp.branch.toLowerCase();
              const hasActiveQueue = (comp.needsRepair || 0) > 0;
              const formattedMonthly = formatCurrency(comp.monthlyRevenue || 0);
              const formattedToday = formatCurrency(comp.todayRevenue || 0);

              return (
                <div
                  key={comp.branch}
                  className={`rounded-2xl p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between gap-5 relative backdrop-blur-md ${
                    isSelected
                      ? 'bg-white/15 border-2 border-[#bd00ff] shadow-[0_0_30px_rgba(189,0,255,0.3)] ring-2 ring-[#bd00ff]/50'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-400/40'
                  }`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                          <Building2 size={16} />
                        </span>
                        <div>
                          <h3 className="text-lg font-black text-white m-0 tracking-tight">
                            {comp.branch} Branch
                          </h3>
                          <span className="text-[10px] text-purple-300 uppercase tracking-wider font-semibold">
                            Technician Workbench
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                        hasActiveQueue
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400/30 animate-pulse'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                      }`}>
                        {hasActiveQueue ? (
                          <>
                            <AlertTriangle size={11} />
                            <span>{comp.needsRepair} Needs Repair</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={11} />
                            <span>Workbench Clear</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Metric 1: Devices to Repair Counter */}
                    <div className="bg-black/40 rounded-xl p-3.5 border border-white/5 mb-3 flex flex-col gap-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-purple-200/80 font-bold uppercase tracking-wider">
                          Devices Needing Repair
                        </span>
                        <span className="text-2xl font-black text-white tracking-tight">
                          {comp.needsRepair || 0} <span className="text-xs font-semibold text-purple-300">units</span>
                        </span>
                      </div>

                      {/* Diagnostic vs Repairing Micro Breakdown Chips */}
                      <div className="grid grid-cols-3 gap-1.5 text-[11px] pt-1 border-t border-white/10">
                        <div className="bg-purple-950/60 rounded-lg p-1.5 text-center border border-purple-500/20">
                          <span className="block text-[10px] text-purple-300 font-bold">Diagnostic</span>
                          <span className="font-black text-purple-100">{comp.diagnostic || 0}</span>
                        </div>
                        <div className="bg-purple-950/60 rounded-lg p-1.5 text-center border border-purple-500/20">
                          <span className="block text-[10px] text-yellow-300 font-bold">Repairing</span>
                          <span className="font-black text-yellow-100">{comp.repairing || 0}</span>
                        </div>
                        <div className="bg-purple-950/60 rounded-lg p-1.5 text-center border border-purple-500/20">
                          <span className="block text-[10px] text-blue-300 font-bold">Queue/Wait</span>
                          <span className="font-black text-blue-100">{(comp.pending || 0) + (comp.accepted || 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Metric 2: Monthly Revenue Made */}
                    <div className="bg-black/40 rounded-xl p-3.5 border border-white/5 mb-3 flex justify-between items-center">
                      <div>
                        <span className="text-xs text-purple-200/80 font-bold uppercase tracking-wider block">
                          This Month's Revenue
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight block mt-0.5">
                          {formattedMonthly}
                        </span>
                        <span className="text-[10px] text-purple-300 block mt-0.5 font-medium">
                          Today: {formattedToday} • {comp.completedThisMonth || 0} jobs finished
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg">
                        ₱
                      </div>
                    </div>

                    {/* Metric 3: Technicians Assigned Roster */}
                    <div className="flex flex-col gap-1.5 mb-3">
                      <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                        <Users size={12} className="text-[#bd00ff]" /> Assigned Technicians & Workload:
                      </span>
                      {(!comp.technicians || comp.technicians.length === 0) ? (
                        <p className="text-xs text-purple-300/60 italic m-0">No active technician assigned</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {comp.technicians.map((t: any) => (
                            <span 
                              key={t.name}
                              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white px-2.5 py-1 rounded-lg text-xs font-semibold"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span className="truncate max-w-[120px]">{t.name}</span>
                              <span className="bg-purple-500/30 text-purple-200 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
                                {t.activeCount} active
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Completion Health Progress Bar */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] font-semibold text-purple-200">
                        <span>Monthly Completion Rate</span>
                        <span className="font-bold text-emerald-400">{comp.completionRate || 0}%</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-400 via-[#bd00ff] to-emerald-400 h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.max(comp.completionRate || 0, 4)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBranch(comp.branch);
                        setSupervisionBranchFilter(comp.branch);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-[#bd00ff] text-white border-transparent shadow-md'
                          : 'bg-white/10 text-purple-200 hover:bg-white/20 border-white/10'
                      }`}
                    >
                      {isSelected ? '✓ Filtered to This Branch' : 'Filter to This Branch'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSupervisionBranchFilter(comp.branch);
                        const el = document.getElementById('live-supervision-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="text-xs font-bold text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer bg-transparent border-none p-1"
                    >
                      <span>Inspect Devices</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CHARTS SECTION: Repair Activity Overview & Status Distribution */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Repair Activity Overview Bar Chart */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-sm p-4 sm:p-6 md:p-8 lg:col-span-2">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
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

          <div className="w-full border-2 border-[#BF00FF] rounded-xl relative overflow-hidden">
            <div className="w-full h-[250px] sm:h-[300px] flex justify-between items-end gap-1 sm:gap-2 px-1.5 py-3 sm:p-5">
              {months.map((month, i) => {
                const count = monthlyActivity[i];
                const rev = monthlyRevenue[i];
                const heightPercent = count > 0 ? Math.max((count / maxRepairs) * 85, 4) : 2;

                return (
                  <div 
                    key={month} 
                    className="flex flex-col items-center justify-end h-full w-full gap-1 sm:gap-2 group cursor-pointer"
                    onClick={() => setSelectedMonthIndex(i)}
                  >
                    <div
                      className="w-full max-w-[14px] xs:max-w-[20px] sm:max-w-[32px] md:max-w-[40px] bg-gradient-to-t from-purple-700 to-[#bd00ff] rounded-t-xs sm:rounded-t-md hover:brightness-125 active:brightness-125 transition-all duration-300 relative flex justify-center"
                      style={{ height: `${heightPercent}%` }}
                    >
                      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity bg-black/90 text-white text-[10px] sm:text-xs px-2.5 py-1.5 rounded-lg pointer-events-none whitespace-nowrap z-20 shadow-lg flex flex-col items-center gap-0.5">
                        <span className="font-bold">{month}: {count} {count === 1 ? 'repair' : 'repairs'}</span>
                        <span className="text-[10px] text-purple-300 font-semibold">{formatCurrency(rev)}</span>
                      </div>
                    </div>
                    <span className="text-[#111] font-semibold text-[9px] xs:text-[10px] sm:text-xs md:text-sm tracking-tight">{month}</span>
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
                <p className="text-xs text-[#666] mt-0.5">
                  {timeframe === 'month' ? `Active & monthly status distribution (${data?.currentMonthShort || 'This Month'})` : 'Distribution across repair lifecycles'}
                </p>
              </div>
              <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full border border-purple-200">
                {summary.totalRequests} {timeframe === 'month' ? 'This Month' : 'Total'}
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

      {/* ========================================================================= */}
      {/* LIVE MULTI-BRANCH DEVICE PROGRESS SUPERVISOR (Interactive Workbench Table) */}
      {/* ========================================================================= */}
      <div id="live-supervision-section" className="bg-white/95 backdrop-blur-md rounded-3xl border border-purple-500/15 shadow-sm p-6 sm:p-8 flex flex-col gap-6">
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                <Layers size={12} className="text-[#bd00ff]" />
                Live Supervision
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight m-0">
                {isSuperAdmin ? 'Device Repair Progress Across Branches' : `Device Repair Progress (${selectedBranch} Branch)`}
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isSuperAdmin
                ? 'Real-time tracking of diagnostic problem diagnosis, technician assignment, repair steps, and service fees across branches.'
                : `Real-time tracking of diagnostic problem diagnosis, technician assignment, and repair steps for ${selectedBranch} branch.`}
            </p>
          </div>

          {/* Search Box */}
          <div className="w-full lg:w-72 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search model, owner, tech..."
              value={deviceSearchQuery}
              onChange={(e) => setDeviceSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-gray-200 bg-gray-50/70 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#bd00ff] focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Filter Pills Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Branch Filter Pills (Only visible to Super Admin) */}
          {isSuperAdmin ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Branch:</span>
              {['all', 'Tagoloan', 'Villanueva', 'Jasaan'].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSupervisionBranchFilter(b)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                    supervisionBranchFilter.toLowerCase() === b.toLowerCase()
                      ? 'bg-[#bd00ff] text-white border-transparent shadow-sm'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  {b === 'all' ? 'All 3 Branches' : `${b} Branch`}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Branch:</span>
              <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1">
                <span>📍</span>
                <span>{selectedBranch} Branch</span>
              </span>
            </div>
          )}

          {/* Progress Status Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Progress:</span>
            {[
              { id: 'needsRepair', label: 'Needs Repair (Active)' },
              { id: 'Diagnostic', label: 'Diagnostic' },
              { id: 'Repairing', label: 'Repairing' },
              { id: 'Completed', label: 'Completed' },
              { id: 'all', label: 'All Records' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSupervisionProgressFilter(p.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                  supervisionProgressFilter === p.id
                    ? 'bg-purple-950 text-white border-transparent shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Devices Supervision Table */}
        <div className="w-full overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full border-collapse text-left min-w-[700px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <th className="py-3.5 px-4">Device Model & Issue</th>
                <th className="py-3.5 px-3">Branch</th>
                <th className="py-3.5 px-3">Technician</th>
                <th className="py-3.5 px-3">Repair Progress</th>
                <th className="py-3.5 px-3 text-right">Cost / Quote</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
              {filteredSupervisionDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 bg-white">
                    <Wrench size={32} className="mx-auto text-purple-300 mb-2" />
                    <p className="font-bold text-gray-600 m-0">No repair devices found matching filter</p>
                    <p className="text-xs text-gray-400 m-0 mt-0.5">Try adjusting the search query or branch selector.</p>
                  </td>
                </tr>
              ) : (
                filteredSupervisionDevices.map((dev: any) => {
                  const prog = dev.progress || 'Diagnostic';
                  const isDiag = prog.toLowerCase().includes('diag') || prog.toLowerCase() === 'accepted';
                  const isRepair = prog.toLowerCase().includes('repair') || prog.toLowerCase().includes('progress');
                  const isComp = dev.status === 'Completed' || prog.toLowerCase() === 'completed';

                  // Branch color badge
                  const branchBadge =
                    dev.branch === 'Villanueva'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : dev.branch === 'Jasaan'
                      ? 'bg-amber-50 text-amber-900 border-amber-200'
                      : 'bg-purple-50 text-purple-900 border-purple-200';

                  return (
                    <tr key={dev.id} className="hover:bg-purple-50/40 transition-colors bg-white">
                      {/* Device & Issue */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-gray-900 max-w-[220px] truncate">
                          {dev.deviceName}
                        </div>
                        <div className="text-xs text-gray-500 font-medium max-w-[220px] truncate mt-0.5" title={dev.cause}>
                          {dev.cause || 'No problem description logged'}
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
                          Customer: <strong className="text-gray-600">{dev.ownerName || 'Walk-in'}</strong>
                        </span>
                      </td>

                      {/* Branch Badge */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${branchBadge}`}>
                          <span>📍</span>
                          <span>{dev.branch || 'Tagoloan'}</span>
                        </span>
                      </td>

                      {/* Assigned Technician */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-purple-100 text-[#bd00ff] flex items-center justify-center font-bold text-xs shrink-0">
                            <UserCheck size={13} />
                          </span>
                          <div>
                            <span className="font-bold text-gray-800 block text-xs">
                              {dev.technician || 'Unassigned'}
                            </span>
                            <span className="text-[10px] text-gray-400">Assigned Tech</span>
                          </div>
                        </div>
                      </td>

                      {/* Repair Progress Stage */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {isComp ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>Completed</span>
                          </span>
                        ) : isRepair ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                            <Wrench size={13} className="text-amber-700 animate-spin" />
                            <span>Repairing Device</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-purple-100 text-purple-900 border border-purple-200">
                            <Activity size={13} className="text-purple-600" />
                            <span>Diagnostic Phase</span>
                          </span>
                        )}
                      </td>

                      {/* Cost / Downpayment */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <span className="font-black text-gray-900 text-sm block">
                          {formatCurrency(dev.repairCost || 0)}
                        </span>
                        {dev.downpayment && parseFloat(dev.downpayment) > 0 && (
                          <span className="text-[10px] text-emerald-600 font-bold block">
                            Downpayment: {formatCurrency(parseFloat(dev.downpayment))}
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setInspectingDevice(dev)}
                          className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#bd00ff] font-extrabold text-xs inline-flex items-center gap-1 cursor-pointer border border-purple-200 transition-colors"
                        >
                          <Eye size={13} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LOWER SECTION: Revenue Overview & Performance Rate */}
      {/* ========================================================================= */}
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

        {/* Right Column: Quick Links & Summary */}
        <div className="lg:col-span-2">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-sm p-6 md:p-8 flex flex-col justify-between h-full">
            <div>
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
      </div>

      {/* ========================================================================= */}
      {/* DEVICE SUPERVISION INSPECTION MODAL */}
      {/* ========================================================================= */}
      {inspectingDevice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setInspectingDevice(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-purple-100 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#bd00ff]/10 text-[#bd00ff] flex items-center justify-center font-bold">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-lg m-0">{inspectingDevice.deviceName}</h3>
                  <span className="text-xs text-purple-700 font-bold">
                    📍 {inspectingDevice.branch || 'Tagoloan'} Branch
                  </span>
                </div>
              </div>
              <button
                className="text-gray-400 hover:text-black transition-colors font-bold text-lg cursor-pointer bg-transparent border-none p-1"
                onClick={() => setInspectingDevice(null)}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-4 overflow-y-auto">
              {/* Status Banner */}
              <div className="p-3 rounded-2xl bg-purple-50/80 border border-purple-200 flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">Current Stage</span>
                <span className="text-xs font-extrabold bg-[#bd00ff] text-white px-3 py-1 rounded-full shadow-xs">
                  {inspectingDevice.progress || inspectingDevice.status || 'Diagnostic'}
                </span>
              </div>

              {/* Problem / Diagnosis */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/70">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Reported Problem & Diagnosis
                </span>
                <p className="text-sm font-semibold text-gray-800 m-0">
                  {inspectingDevice.cause || 'No diagnosis logged yet.'}
                </p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/70">
                  <span className="text-gray-500 block">Customer</span>
                  <strong className="text-gray-900 text-sm block mt-0.5">{inspectingDevice.ownerName || 'Walk-in'}</strong>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/70">
                  <span className="text-gray-500 block">Assigned Technician</span>
                  <strong className="text-gray-900 text-sm block mt-0.5">{inspectingDevice.technician || 'Unassigned'}</strong>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/70">
                  <span className="text-gray-500 block">Quoted Repair Cost</span>
                  <strong className="text-emerald-700 text-sm block mt-0.5">{formatCurrency(inspectingDevice.repairCost || 0)}</strong>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/70">
                  <span className="text-gray-500 block">Downpayment Recorded</span>
                  <strong className="text-gray-900 text-sm block mt-0.5">
                    {inspectingDevice.downpayment ? formatCurrency(parseFloat(inspectingDevice.downpayment)) : 'None'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                type="button"
                className="px-5 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs transition-colors cursor-pointer border-none"
                onClick={() => setInspectingDevice(null)}
              >
                Close
              </button>

              <Link
                href="/admin/monitoring"
                className="px-5 py-2.5 rounded-xl bg-[#bd00ff] hover:bg-purple-700 text-white font-extrabold text-xs transition-colors flex items-center gap-1.5 no-underline shadow-md"
              >
                <Wrench size={14} />
                <span>Open Diagnostic Workbench</span>
              </Link>
            </div>
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
