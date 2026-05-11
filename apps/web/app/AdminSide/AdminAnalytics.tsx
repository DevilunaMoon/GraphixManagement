"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, ShoppingCart, Wrench, TrendingUp, TrendingDown, X, FileSpreadsheet } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function AdminAnalytics() {
  const [userCount, setUserCount] = useState<string | number>("...");
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  
  const [reportData, setReportData] = useState<{year: string; salesGrowth: number; userGrowth: number}[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<{ year: string, users: string, trend: string, trendUp: boolean }[]>([]);
  const [selectedYearData, setSelectedYearData] = useState<{ year: string, users: string, trend: string, trendUp: boolean } | null>(null);

  const { styles } = useTheme();

  useEffect(() => {
    fetch('/api/analytics/users/count')
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

    fetch('/api/analytics/all-time')
      .then(res => res.json())
      .then(data => {
        setAnalyticsData(data);
      })
      .catch(err => console.error("Failed to fetch analytics data:", err));

    // Mock Data for Year-over-Year charts (since we don't have a YoY API yet)
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

  }, []);

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
    link.setAttribute('download', `Graphix_AllTime_Analytics.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <h2 className="text-[1.6rem] font-bold text-[#111]">Comprehensive Analytics (All-Time)</h2>
          <button 
            onClick={handleDownload}
            className={`flex items-center gap-2 bg-gradient-to-r ${styles.gradient} text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm opacity-90 hover:opacity-100`}
          >
            <FileSpreadsheet size={20} />
            <span>Download Full Report</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            icon={<span className="text-[22px] font-bold">₱</span>}
            label="This Year's Sales" 
            value={`₱${analyticsData?.sales?.thisYear?.toLocaleString() || 0}`} 
            subText={
              <span className={analyticsData?.sales?.thisYear >= analyticsData?.sales?.lastYear ? 'text-green-600' : 'text-red-500'}>
                vs Last Year: ₱{analyticsData?.sales?.lastYear?.toLocaleString() || 0}
              </span>
            }
            iconBg="bg-green-100" 
            iconColor="text-green-600" 
          />
          <StatCard 
            icon={<span className="text-[22px] font-bold">₱</span>}
            label="Last Year's Sales" 
            value={`₱${analyticsData?.sales?.lastYear?.toLocaleString() || 0}`} 
            iconBg="bg-blue-100" 
            iconColor="text-blue-600" 
          />
          <StatCard 
            icon={<span className="text-[22px] font-bold">₱</span>}
            label="All-Time Sales" 
            value={`₱${analyticsData?.sales?.allTime?.toLocaleString() || 0}`} 
            iconBg="bg-purple-100" 
            iconColor="text-purple-600" 
          />
          <Link href="/admin/accounts" className="block transition-transform hover:-translate-y-1">
            <StatCard 
              icon={<Users size={24} />} 
              label="Total Users (All-Time)" 
              value={userCount.toString()} 
              iconBg="bg-sky-100" 
              iconColor="text-sky-600" 
            />
          </Link>
        </div>



        {/* Chart Section */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-sm p-6 md:p-8">
          <div className="mb-8">
            <h3 className="text-xl font-bold text-[#111] mb-1">Year-Over-Year Sales Growth</h3>
            <p className="text-sm text-[#666]">All-Time Overview</p>
          </div>
          
          <div className={`w-full overflow-x-auto border-2 ${styles.borderMain} rounded-xl relative transition-colors duration-300`}>
            <div className="w-full min-w-[500px] h-[300px] p-5 flex justify-around items-end gap-2 text-xs md:text-sm">
              {reportData.map((data) => (
                <ChartBar key={`sales-${data.year}`} label={data.year} height={() => `${data.salesGrowth}%`} color={`bg-gradient-to-t ${styles.gradient}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Lower Section Grid: Cards on left, Table on right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          {/* Left Column: Stacked Cards */}
          <div className="flex flex-col gap-6 lg:col-span-1">
            <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
              <h3 className="text-lg font-bold text-[#111] mb-4 flex items-center gap-2"><ShoppingCart size={20} className="text-[#bd00ff]" /> Lifetime Transactions</h3>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[#666] text-sm font-semibold">Total Successful Sales</p>
                  <h4 className="text-4xl font-black text-[#111] mt-1">{analyticsData?.transactions?.total || 0}</h4>
                </div>
                <div className="text-right flex flex-col gap-1">
                  <p className="text-sm font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-lg">Online: {analyticsData?.transactions?.online || 0}</p>
                  <p className="text-sm font-bold bg-orange-50 text-orange-600 px-3 py-1 rounded-lg">Physical: {analyticsData?.transactions?.physical || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
              <h3 className="text-lg font-bold text-[#111] mb-4 flex items-center gap-2"><span className="font-bold text-[22px] text-[#bd00ff]">₱</span> Lifetime Revenue</h3>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[#666] text-sm font-semibold">Total Revenue Generated</p>
                  <h4 className="text-4xl font-black text-[#111] mt-1">₱{analyticsData?.breakdown?.total?.toLocaleString() || 0}</h4>
                </div>
                <div className="text-right flex flex-col gap-1">
                  <p className="text-sm font-bold bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg">Retail: ₱{analyticsData?.breakdown?.retail?.toLocaleString() || 0}</p>
                  <p className="text-sm font-bold bg-purple-50 text-purple-600 px-3 py-1 rounded-lg">Repair: ₱{analyticsData?.breakdown?.repair?.toLocaleString() || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
              <h3 className="text-lg font-bold text-[#111] mb-4 flex items-center gap-2"><Wrench size={20} className="text-[#bd00ff]" /> Technician Workload</h3>
              {(() => {
                const pending = analyticsData?.workload?.pendingRepairs ?? 8;
                const techs = analyticsData?.workload?.activeTechnicians ?? 2;
                
                const isBottleneck = (pending > techs * 3) || (pending > 0 && techs === 0);
                const isModerate = !isBottleneck && (pending > techs * 2);
                
                const statusColor = isBottleneck ? 'bg-red-50 text-red-600 border-red-200' : isModerate ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'bg-green-50 text-green-600 border-green-200';
                const statusText = isBottleneck ? 'Bottleneck' : isModerate ? 'Moderate' : 'Manageable';

                return (
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[#666] text-sm font-semibold">Repair Queue Status</p>
                      <h4 className={`text-3xl font-black mt-2 ${isBottleneck ? 'text-red-600' : 'text-[#111]'}`}>
                        {statusText}
                      </h4>
                    </div>
                    <div className="text-right flex flex-col gap-1.5">
                      <p className="text-xs font-bold bg-gray-50 text-gray-600 px-2.5 py-1 rounded-lg border border-gray-100">Pending: {pending}</p>
                      <p className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${statusColor}`}>Active Techs: {techs}</p>
                    </div>
                  </div>
                );
              })()}
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
