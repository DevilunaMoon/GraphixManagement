"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, ShoppingCart, Wrench } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function AdminAnalytics() {
  const [userCount, setUserCount] = useState<string | number>("...");
  const [dashboardData, setDashboardData] = useState<any>(null);

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

    fetch('/api/analytics/dashboard')
      .then(res => res.json())
      .then(data => {
        setDashboardData(data);
      })
      .catch(err => console.error("Failed to fetch dashboard data:", err));
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <h2 className="text-[1.6rem] font-bold text-[#111]">Comprehensive Analytics</h2>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </div>
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
