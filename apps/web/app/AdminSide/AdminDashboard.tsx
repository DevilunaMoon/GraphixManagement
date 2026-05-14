"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Package, TrendingUp, TrendingDown, X, ShoppingCart, Wrench } from 'lucide-react';

export default function AdminDashboard() {
  const [userCount, setUserCount] = useState<string | number>("...");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [selectedMonthData, setSelectedMonthData] = useState<{ month: string, users: string, trend: string, trendUp: boolean } | null>(null);
  const [userGrowthData, setUserGrowthData] = useState<{ month: string, users: string, trend: string, trendUp: boolean }[]>([]);

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

    fetch('/api/analytics/users/growth')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUserGrowthData(data);
        }
      })
      .catch(err => console.error("Failed to fetch user growth data:", err));

    fetch('/api/analytics/dashboard')
      .then(res => res.json())
      .then(data => {
        setDashboardData(data);
      })
      .catch(err => console.error("Failed to fetch dashboard data:", err));
  }, []);

  return (
    <>
      <div className="flex flex-col gap-8">
        {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<span className="text-[22px] font-bold">₱</span>}
          label="Daily Sales" 
          value={`₱${dashboardData?.sales?.today?.toLocaleString() || 0}`} 
          subText={
            <span className={dashboardData?.sales?.today >= dashboardData?.sales?.yesterday ? 'text-green-600' : 'text-red-500'}>
              vs Yesterday: ₱{dashboardData?.sales?.yesterday?.toLocaleString() || 0}
            </span>
          }
          iconBg="bg-green-100" 
          iconColor="text-green-600" 
        />
        <StatCard 
          icon={<span className="text-[22px] font-bold">₱</span>}
          label="Weekly Sales" 
          value={`₱${dashboardData?.sales?.weekly?.toLocaleString() || 0}`} 
          iconBg="bg-blue-100" 
          iconColor="text-blue-600" 
        />
        <StatCard 
          icon={<span className="text-[22px] font-bold">₱</span>}
          label="Monthly Sales" 
          value={`₱${dashboardData?.sales?.monthly?.toLocaleString() || 0}`} 
          iconBg="bg-purple-100" 
          iconColor="text-purple-600" 
        />
        <Link href="/admin/accounts" className="block transition-transform hover:-translate-y-1">
          <StatCard 
            icon={<Users size={24} />} 
            label="Total Users" 
            value={userCount.toString()} 
            iconBg="bg-sky-100" 
            iconColor="text-sky-600" 
          />
        </Link>
      </div>



      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Sales Growth Bar Chart */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-sm p-6 md:p-8 lg:col-span-2">
          <div className="mb-8">
            <h3 className="text-xl font-bold text-[#111] mb-1">Sales Growth</h3>
            <p className="text-sm text-[#666]">Monthly Overview</p>
          </div>
          
          <div className="w-full overflow-x-auto border-2 border-[#BF00FF] rounded-xl relative">
            <div className="w-full min-w-[500px] h-[300px] flex justify-around items-end gap-2 text-xs md:text-sm p-5">
              <ChartBar label="Jan" height="45%" />
              <ChartBar label="Feb" height="60%" />
              <ChartBar label="Mar" height="50%" />
              <ChartBar label="Apr" height="80%" />
              <ChartBar label="May" height="65%" />
              <ChartBar label="Jun" height="55%" />
              <ChartBar label="Jul" height="70%" />
              <ChartBar label="Aug" height="85%" />
              <ChartBar label="Sep" height="70%" />
              <ChartBar label="Oct" height="55%" />
              <ChartBar label="Nov" height="75%" />
              <ChartBar label="Dec" height="90%" />
            </div>
          </div>
        </div>

        {/* Best Sellers Pie Chart */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-sm p-6 md:p-8 lg:col-span-1 flex flex-col">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-[#111] mb-1">Best Sellers</h3>
            <p className="text-sm text-[#666]">By Units Sold</p>
          </div>
          <BestSellersPieChart products={dashboardData?.topProducts || []} />
        </div>
      </div>

      {/* Lower Section Grid: Cards on left, Table on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Left Column: Stacked Cards */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
            <h3 className="text-lg font-bold text-[#111] mb-4 flex items-center gap-2"><ShoppingCart size={20} className="text-[#bd00ff]" /> Transaction Count</h3>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[#666] text-sm font-semibold">Total Successful Sales</p>
                <h4 className="text-4xl font-black text-[#111] mt-1">{dashboardData?.transactions?.total || 0}</h4>
              </div>
              <div className="text-right flex flex-col gap-1">
                <p className="text-sm font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-lg">Online: {dashboardData?.transactions?.online || 0}</p>
                <p className="text-sm font-bold bg-orange-50 text-orange-600 px-3 py-1 rounded-lg">Physical: {dashboardData?.transactions?.physical || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
            <h3 className="text-lg font-bold text-[#111] mb-4 flex items-center gap-2"><span className="font-bold text-[22px] text-[#bd00ff]">₱</span> Revenue Breakdown</h3>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[#666] text-sm font-semibold">Total Revenue</p>
                <h4 className="text-4xl font-black text-[#111] mt-1">₱{dashboardData?.breakdown?.total?.toLocaleString() || 0}</h4>
              </div>
              <div className="text-right flex flex-col gap-1">
                <p className="text-sm font-bold bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg">Retail: ₱{dashboardData?.breakdown?.retail?.toLocaleString() || 0}</p>
                <p className="text-sm font-bold bg-purple-50 text-purple-600 px-3 py-1 rounded-lg">Repair: ₱{dashboardData?.breakdown?.repair?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
            <h3 className="text-lg font-bold text-[#111] mb-4 flex items-center gap-2"><Wrench size={20} className="text-[#bd00ff]" /> Technician Workload</h3>
            {(() => {
              // Use live data if available, otherwise fallback to mock data to present the UI
              const pending = dashboardData?.workload?.pendingRepairs ?? 8;
              const techs = dashboardData?.workload?.activeTechnicians ?? 2;
              
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
            <div className="mb-5 pb-4 border-b border-black/5">
              <h3 className="text-lg text-[#111] font-bold">User Growth</h3>
            </div>
            <div className="w-full">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th className="py-3 px-4 font-semibold text-[#666] text-sm uppercase tracking-wide border-b border-black/5">Month</th>
                    <th className="py-3 px-4 font-semibold text-[#666] text-sm uppercase tracking-wide border-b border-black/5">New Users</th>
                    <th className="py-3 px-4 font-semibold text-[#666] text-sm uppercase tracking-wide border-b border-black/5 hidden md:table-cell">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {userGrowthData.map((data, idx) => (
                    <tr 
                      key={idx} 
                      className="border-b border-black/5 cursor-pointer hover:bg-black/5 transition-colors"
                      onClick={() => setSelectedMonthData(data)}
                    >
                      <td className="py-3 px-4 font-medium text-[#111] text-sm">{data.month}</td>
                      <td className="py-3 px-4 font-medium text-[#111] text-sm">{data.users}</td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <div className={`font-bold text-sm flex items-center gap-1 ${data.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                          {data.trendUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />} {data.trend}
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
      
      {selectedMonthData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedMonthData(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-black/5 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-[#111] text-lg">{selectedMonthData.month} Details</h3>
              <button className="text-gray-400 hover:text-black transition-colors" onClick={() => setSelectedMonthData(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-5">
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <span className="text-[#666] font-medium">New Users</span>
                <span className="font-bold text-xl text-[#111]">{selectedMonthData.users}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#666] font-medium">Monthly Trend</span>
                <div className={`font-bold text-lg flex items-center gap-1.5 ${selectedMonthData.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedMonthData.trendUp ? <TrendingUp size={20} /> : <TrendingDown size={20} />} 
                  {selectedMonthData.trend}
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50/80 border-t border-black/5">
              <button 
                className="w-full py-2.5 rounded-xl bg-[#bd00ff] text-white font-semibold hover:bg-purple-700 transition-colors"
                onClick={() => setSelectedMonthData(null)}
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

function ChartBar({ label, height }: { label: string, height: string }) {
  return (
    <div className="flex flex-col items-center justify-end h-full w-full gap-2">
      <div 
        className="w-full max-w-[40px] bg-[#bd00ff] rounded-t-md hover:brightness-125 transition-all duration-300 cursor-pointer" 
        style={{ height }}
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
    return <div className="h-[250px] flex items-center justify-center text-gray-400 font-semibold">No sales yet</div>;
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
