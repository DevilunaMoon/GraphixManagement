"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  ShoppingCart, 
  Wrench, 
  TrendingUp, 
  TrendingDown, 
  X, 
  FileSpreadsheet, 
  Calendar, 
  Building2, 
  ReceiptText, 
  Banknote, 
  QrCode,
  Lock,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useBranch } from '../../context/BranchContext';

export default function AdminAnalytics() {
  const { selectedBranch, isSuperAdmin, userBranch } = useBranch();
  const [userCount, setUserCount] = useState<string | number>("...");
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Date Filter states: 'today' | 'week' | 'month' | 'year' | 'custom'
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('year');
  
  // Custom Date Range
  const todayStr = new Date().toISOString().split('T')[0] || '';
  const firstDayOfMonthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0] || '';
  const [customStartDate, setCustomStartDate] = useState<string>(firstDayOfMonthStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  const [reportData, setReportData] = useState<{year: string; salesGrowth: number; userGrowth: number}[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<{ year: string, users: string, trend: string, trendUp: boolean }[]>([]);
  const [selectedYearData, setSelectedYearData] = useState<{ year: string, users: string, trend: string, trendUp: boolean } | null>(null);

  const { styles } = useTheme();

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const branchParam = isSuperAdmin ? selectedBranch : (userBranch || 'Tagoloan');
      let url = `/api/analytics/all-time?branch=${encodeURIComponent(branchParam)}&dateFilter=${dateFilter}`;
      if (dateFilter === 'custom' && customStartDate && customEndDate) {
        url += `&startDate=${encodeURIComponent(customStartDate)}&endDate=${encodeURIComponent(customEndDate)}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      setAnalyticsData(data);
    } catch (err) {
      console.error("Failed to fetch analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const branchParam = isSuperAdmin ? selectedBranch : (userBranch || 'Tagoloan');
    fetch(`/api/analytics/users/count?branch=${encodeURIComponent(branchParam)}`)
      .then(res => res.json())
      .then(data => {
        if (typeof data.count === 'number') {
          if (data.count >= 1000) {
            setUserCount((data.count / 1000).toFixed(2) + 'k');
          } else {
            setUserCount(data.count.toString());
          }
        }
      })
      .catch(err => console.error("Failed to fetch user count:", err));

    fetchAnalytics();

    // Year-over-Year chart dataset
    const years = ['2022', '2023', '2024', '2025', '2026'];
    setReportData(years.map(y => ({
      year: y,
      salesGrowth: Math.floor(Math.random() * 60) + 40,
      userGrowth: Math.floor(Math.random() * 60) + 40,
    })));

    setUserGrowthData(years.map((y, i) => ({
      year: y,
      users: (Math.floor(Math.random() * 500) + (i * 200)).toString(),
      trend: `${Math.floor(Math.random() * 20) + 5}%`,
      trendUp: Math.random() > 0.2
    })).reverse());

  }, [selectedBranch, dateFilter, customStartDate, customEndDate, isSuperAdmin, userBranch]);

  const handleDownload = () => {
    if (reportData.length === 0) return;
    const headers = ['Year', 'Sales Growth (%)', 'User Growth (%)'];
    const csvRows = [headers.join(',')];
    for (const row of reportData) {
      csvRows.push(`${row.year},${row.salesGrowth},${row.userGrowth}`);
    }
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Graphix_Analytics_${dateFilter.toUpperCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filterOptions: Array<{ id: 'today' | 'week' | 'month' | 'year' | 'custom'; label: string }> = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'year', label: 'This Year' },
    { id: 'custom', label: 'Custom Date Range' }
  ];

  const effectiveBranchLabel = isSuperAdmin
    ? (selectedBranch === 'all' ? 'All Branches' : `${selectedBranch} Branch`)
    : `${userBranch || 'Tagoloan'} Branch`;

  return (
    <>
      <div className="flex flex-col gap-8 font-['Inter']">
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-[1.6rem] font-bold text-[#111]">
                {isSuperAdmin ? "Comprehensive Analytics" : `${userBranch || 'Tagoloan'} Branch Analytics`}
              </h2>
              {!isSuperAdmin && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-200 text-[#5c0099] rounded-full text-xs font-black uppercase tracking-wider shadow-sm">
                  <Lock size={12} /> {userBranch || 'Tagoloan'}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-500 mt-1">
              Performance metrics, payment methods breakdown, and branch volume
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button 
              onClick={handleDownload}
              className={`flex items-center gap-2 bg-gradient-to-r ${styles.gradient} text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md hover:opacity-95 cursor-pointer border-none`}
            >
              <FileSpreadsheet size={16} />
              <span>Export CSV Report</span>
            </button>
          </div>
        </div>

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

          {/* Custom Date Inputs if 'custom' is active */}
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            icon={<span className="text-[22px] font-bold">₱</span>}
            label="This Year's Sales" 
            value={`₱${(analyticsData?.sales?.thisYear ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
            subText={
              <span className={(analyticsData?.sales?.thisYear ?? 0) >= (analyticsData?.sales?.lastYear ?? 0) ? 'text-green-600' : 'text-red-500'}>
                vs Last Year: ₱{(analyticsData?.sales?.lastYear ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            }
            iconBg="bg-green-100" 
            iconColor="text-green-600" 
          />
          <StatCard 
            icon={<span className="text-[22px] font-bold">₱</span>}
            label="Last Year's Sales" 
            value={`₱${(analyticsData?.sales?.lastYear ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
            iconBg="bg-blue-100" 
            iconColor="text-blue-600" 
          />
          <StatCard 
            icon={<span className="text-[22px] font-bold">₱</span>}
            label="All-Time Sales" 
            value={`₱${(analyticsData?.sales?.allTime ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
            iconBg="bg-purple-100" 
            iconColor="text-purple-600" 
          />
          <Link href="/admin/accounts" className="block transition-transform hover:-translate-y-1 no-underline">
            <StatCard 
              icon={<Users size={24} />} 
              label="Total Users (All-Time)" 
              value={userCount.toString()} 
              iconBg="bg-sky-100" 
              iconColor="text-sky-600" 
            />
          </Link>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          {/* Year-Over-Year Sales Growth Bar Chart */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-sm p-6 md:p-8 lg:col-span-2">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-[#111] mb-1">Year-Over-Year Sales Growth</h3>
              <p className="text-sm text-[#666]">All-Time Overview ({effectiveBranchLabel})</p>
            </div>
            
            <div className={`w-full overflow-x-auto border-2 ${styles.borderMain} rounded-xl relative transition-colors duration-300`}>
              <div className="w-full min-w-[500px] h-[300px] p-5 flex justify-around items-end gap-2 text-xs md:text-sm">
                {reportData.map((data) => (
                  <ChartBar key={`sales-${data.year}`} label={data.year} height={() => `${data.salesGrowth}%`} color={`bg-gradient-to-t ${styles.gradient}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Yearly Best Sellers Pie Chart */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-sm p-6 md:p-8 lg:col-span-1 flex flex-col">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-[#111] mb-1">Yearly Best Sellers</h3>
              <p className="text-sm text-[#666]">By Units Sold (This Year)</p>
            </div>
            <BestSellersPieChart products={analyticsData?.topProductsThisYear || []} />
          </div>
        </div>

        {/* Lower Section Grid: Payment Methods & Branch Performance on Left, User Growth on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          {/* Left Column: Payment Methods & Branch Performance */}
          <div className="flex flex-col gap-6 lg:col-span-1">
            
            {/* 1. Payment Methods Card */}
            <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-black text-[#111] mb-4 flex items-center gap-2">
                  <span className="text-xl">🧾</span> Payment Methods
                </h3>
                
                <div className="flex flex-col gap-4 divide-y divide-gray-100">
                  {/* Cash Payment */}
                  <div className="pt-1 first:pt-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">💵</span>
                      <span className="text-sm font-bold text-gray-800">Cash Payment</span>
                    </div>
                    <div className="text-3xl font-black text-[#111]">
                      ₱{(analyticsData?.paymentMethods?.cash?.totalAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs font-semibold text-gray-500 mt-0.5">
                      {analyticsData?.paymentMethods?.cash?.transactionCount ?? 0} transactions
                    </div>
                  </div>

                  {/* GCash Payment */}
                  <div className="pt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">📱</span>
                      <span className="text-sm font-bold text-gray-800">GCash Payment</span>
                    </div>
                    <div className="text-3xl font-black text-[#111]">
                      ₱{(analyticsData?.paymentMethods?.gcash?.totalAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs font-semibold text-gray-500 mt-0.5">
                      {analyticsData?.paymentMethods?.gcash?.transactionCount ?? 0} transactions
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Branch Performance Card */}
            <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-black text-[#111] flex items-center gap-2">
                    <span className="text-xl">🏢</span> Branch Performance
                  </h3>
                  {!isSuperAdmin && (
                    <span className="text-[11px] font-bold text-gray-400">Assigned Branch</span>
                  )}
                </div>

                <div className="flex flex-col gap-4 divide-y divide-gray-100">
                  {(analyticsData?.branchPerformance && analyticsData.branchPerformance.length > 0) ? (
                    analyticsData.branchPerformance.map((bp: any) => (
                      <div key={bp.branch} className="pt-3 first:pt-0">
                        <div className="text-sm font-bold text-gray-800 mb-0.5 flex items-center gap-1.5">
                          <span>📍</span> {bp.branch}
                        </div>
                        <div className="text-2xl font-black text-[#111]">
                          ₱{(bp.revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs font-semibold text-gray-500 mt-0.5">
                          {bp.orders ?? 0} orders
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs font-semibold text-gray-400 py-3">
                      No branch performance data recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: User Growth */}
          <div className="lg:col-span-2">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-sm p-6 md:p-8 flex flex-col h-full">
              <div className="mb-5 pb-4 border-b border-black/5 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-[#111] mb-1">Year-Over-Year User Growth</h3>
                  <p className="text-sm text-[#666]">Lifetime Registration Overview</p>
                </div>
              </div>
              <div className={`w-full border-2 ${styles.borderMain} rounded-xl overflow-hidden`}>
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-black/5">
                      <th className="py-4 px-5 font-bold text-[#111] text-sm uppercase tracking-wide border-b border-black/5">Year</th>
                      <th className="py-4 px-5 font-bold text-[#111] text-sm uppercase tracking-wide border-b border-black/5">New Users</th>
                      <th className="py-4 px-5 font-bold text-[#111] text-sm uppercase tracking-wide border-b border-black/5 hidden md:table-cell">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userGrowthData.map((data, idx) => (
                      <tr 
                        key={idx} 
                        className="border-b border-black/5 hover:bg-black/5 transition-colors cursor-pointer"
                        onClick={() => setSelectedYearData(data)}
                      >
                        <td className="py-4 px-5 font-medium text-[#111] text-sm">{data.year}</td>
                        <td className="py-4 px-5 font-medium text-[#111] text-sm">{data.users}</td>
                        <td className="py-4 px-5 hidden md:table-cell">
                          <div className={`font-bold text-sm flex items-center gap-1.5 ${data.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                            {data.trendUp ? <TrendingUp size={18} /> : <TrendingDown size={18} />} {data.trend}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedYearData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedYearData(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-black/5 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-[#111] text-lg">{selectedYearData.year} Details</h3>
              <button className="text-gray-400 hover:text-black transition-colors" onClick={() => setSelectedYearData(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-5">
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <span className="text-[#666] font-medium">New Users</span>
                <span className="font-bold text-xl text-[#111]">{selectedYearData.users}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#666] font-medium">Yearly Trend</span>
                <div className={`font-bold text-lg flex items-center gap-1.5 ${selectedYearData.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedYearData.trendUp ? <TrendingUp size={20} /> : <TrendingDown size={20} />} 
                  {selectedYearData.trend}
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50/80 border-t border-black/5">
              <button 
                className="w-full py-2.5 rounded-xl bg-[#bd00ff] text-white font-semibold hover:bg-purple-700 transition-colors"
                onClick={() => setSelectedYearData(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatCard({ icon, label, value, subText, iconBg, iconColor }: { icon: React.ReactNode, label: string, value: string, subText?: React.ReactNode, iconBg: string, iconColor: string }) {
  return (
    <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl flex flex-col gap-4 border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)] h-full">
      <div className={`w-11 h-11 rounded-xl flex justify-center items-center ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div>
        <span className="text-sm font-semibold text-[#666]">{label}</span>
        <h3 className="text-3xl font-extrabold text-[#111] mt-1">{value}</h3>
        {subText && <div className="mt-2 text-xs font-semibold">{subText}</div>}
      </div>
    </div>
  );
}

function ChartBar({ label, height, color }: { label: string, height: () => string, color: string }) {
  const [h, setH] = useState('0%');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setH(height());
    }, 50);
    return () => clearTimeout(timer);
  }, [height]);

  return (
    <div className="flex flex-col items-center justify-end h-full w-full gap-2">
      <div 
        className={`w-full max-w-[40px] ${color} rounded-t-md hover:brightness-125 transition-all duration-1000 ease-out cursor-pointer`}
        style={{ height: h }}
      ></div>
      <span className="text-[#111] font-semibold">{label}</span>
    </div>
  );
}

function BestSellersPieChart({ products }: { products: { name: string, sold: number }[] }) {
  if (!products || products.length === 0) {
    return <div className="h-[250px] flex items-center justify-center text-gray-400 font-semibold">Loading data...</div>;
  }

  const colors = ['#bd00ff', '#01f0ff', '#5c0099', '#f000ff', '#8b00cc'];
  const total = products.reduce((sum, p) => sum + p.sold, 0);
  
  if (total === 0) {
    return <div className="h-[250px] flex items-center justify-center text-gray-400 font-semibold">No sales yet this year</div>;
  }

  let currentPercentage = 0;
  const gradientStops = products.map((p, i) => {
    const percentage = (p.sold / total) * 100;
    const start = currentPercentage;
    const end = currentPercentage + percentage;
    currentPercentage = end;
    return `${colors[i % colors.length]} ${start}% ${end}%`;
  }).join(', ');

  return (
    <div className="flex flex-col h-full justify-between items-center w-full gap-6 mt-4">
      <div 
        className="w-[180px] h-[180px] rounded-full shadow-lg border-[6px] border-white transition-transform hover:scale-105 duration-300 cursor-pointer"
        style={{ background: `conic-gradient(${gradientStops})` }}
      ></div>
      <div className="w-full flex flex-col gap-3">
        {products.map((p, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: colors[i % colors.length] }}></span>
              <span className="font-semibold text-gray-700 truncate max-w-[130px]">{p.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-xs">{p.sold} sold</span>
              <span className="font-black text-[#111] w-12 text-right">{((p.sold / total) * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
