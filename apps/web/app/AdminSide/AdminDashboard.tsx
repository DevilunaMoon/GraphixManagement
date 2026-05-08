"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Package, TrendingUp, TrendingDown, X } from 'lucide-react';

export default function AdminDashboard() {
  const [userCount, setUserCount] = useState<string | number>("...");
  const [monthlySales, setMonthlySales] = useState<string | number>("10.1k"); // Mock data default
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

    // Try to fetch real monthly sales data, fallback to mock if 0 or error
    fetch('/api/analytics/sales/monthly-total')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.total === 'number' && data.total > 0) {
          if (data.total >= 1000) {
            setMonthlySales((data.total / 1000).toFixed(1) + 'k');
          } else {
            setMonthlySales(data.total.toLocaleString());
          }
        }
      })
      .catch(err => console.error("Failed to fetch monthly sales:", err));
  }, []);

  return (
    <>
      <div className="flex flex-col gap-8">
        {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/admin/accounts" className="block transition-transform hover:-translate-y-1">
          <StatCard 
            icon={<Users size={24} />} 
            label="User Management" 
            value={userCount.toString()} 
            iconBg="bg-sky-100" 
            iconColor="text-sky-600" 
          />
        </Link>
        <Link href="/admin/transactions" className="block transition-transform hover:-translate-y-1">
          <StatCard 
            icon={<span className="text-[22px] font-bold">₱</span>}
            label="Monthly Sales" 
            value={monthlySales.toString()} 
            iconBg="bg-green-100" 
            iconColor="text-green-600" 
          />
        </Link>
        <StatCard 
          icon={<Package size={24} />} 
          label="Revenue" 
          value="15.1k" 
          iconBg="bg-purple-100" 
          iconColor="text-purple-600" 
        />
      </div>

      {/* Chart Section */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-sm p-6 md:p-8">
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

      {/* Secondary Stats Grid (User Growth) */}
      <div className="w-full">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-sm p-6 md:p-8 flex flex-col">
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

function StatCard({ icon, label, value, iconBg, iconColor }: { icon: React.ReactNode, label: string, value: string, iconBg: string, iconColor: string }) {
  return (
    <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl flex flex-col gap-4 border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
      <div className={`w-11 h-11 rounded-xl flex justify-center items-center ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div>
        <span className="text-sm font-semibold text-[#666]">{label}</span>
        <h3 className="text-3xl font-extrabold text-[#111] mt-1">{value}</h3>
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
