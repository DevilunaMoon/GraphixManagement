"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Wrench, Search, Cpu, CheckCircle2, ArrowRight, Clock, 
  AlertCircle, Smartphone, User, RefreshCw, ChevronRight
} from 'lucide-react';

export default function TechnicianDashboard() {
  const [technician, setTechnician] = useState<any>(null);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    active: 0,
    diagnostic: 0,
    repairing: 0,
    completedToday: 0
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch technician profile
      const profRes = await fetch('/api/profile');
      let profileData: any = null;
      if (profRes.ok) {
        profileData = await profRes.json();
        setTechnician(profileData);
      }

      // 2. Fetch repairs for this technician's branch
      const repairsRes = await fetch('/api/monitoring?limit=100');
      if (repairsRes.ok) {
        const data = await repairsRes.json();
        const list: any[] = Array.isArray(data) ? data : data?.requests || [];
        setRepairs(list);

        const techName = profileData?.name?.toLowerCase() || '';

        // Calculate stats
        let activeCount = 0;
        let diagCount = 0;
        let repCount = 0;
        let compCount = 0;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        list.forEach((r: any) => {
          const prog = (r.progress || '').toLowerCase();
          const stat = (r.status || '').toLowerCase();

          if (stat !== 'completed' && stat !== 'cancelled' && prog !== 'rejected') {
            activeCount++;
          }
          if (prog === 'diagnostic' || prog === 'diagnosis' || prog === 'accepted') {
            diagCount++;
          }
          if (prog === 'repairing') {
            repCount++;
          }
          if (stat === 'completed' || prog === 'completed') {
            const updated = new Date(r.updatedAt || r.createdAt);
            if (updated >= todayStart) {
              compCount++;
            }
          }
        });

        setStats({
          active: activeCount,
          diagnostic: diagCount,
          repairing: repCount,
          completedToday: compCount
        });
      }
    } catch (err) {
      console.error('Failed to load technician dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusBadge = (progress: string, status: string) => {
    const p = (progress || '').toLowerCase();
    if (status?.toLowerCase() === 'completed' || p === 'completed') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (p === 'repairing') {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    if (p === 'diagnostic' || p === 'diagnosis') {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    return 'bg-purple-100 text-purple-800 border-purple-200';
  };

  // Top urgent repairs awaiting completion
  const priorityQueue = repairs
    .filter(r => r.status !== 'Completed' && r.status !== 'Cancelled' && r.progress?.toLowerCase() !== 'rejected')
    .slice(0, 5);

  return (
    <main className="flex-1 p-3.5 sm:p-6 md:p-8 flex flex-col gap-5 sm:gap-6 max-w-7xl w-full mx-auto font-['Inter']">
      
      {/* Clean Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-purple-100 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight m-0">
              Technician Dashboard
            </h1>
            <span className="text-[11px] font-bold bg-purple-100 text-[#8b00cc] px-2.5 py-0.5 rounded-full border border-purple-200">
              📍 {technician?.branch ? (technician.branch.toLowerCase().includes('branch') ? technician.branch : `${technician.branch} Branch`) : 'Tagoloan Branch'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 font-medium m-0 mt-0.5">
            Overview of branch repair queue, active diagnostics, and bench workload.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 transition-all cursor-pointer flex items-center justify-center shadow-xs disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <Link
            href="/technician/monitoring"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] hover:brightness-110 text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2 no-underline"
          >
            <Wrench size={15} />
            <span>Open Gadget Repair</span>
          </Link>
        </div>
      </div>

      {/* 2. Top Summary KPI Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Active Repairs */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-purple-100 shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Queue</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#8b00cc] flex items-center justify-center font-bold">
              <Wrench size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-900">{stats.active}</span>
            <span className="text-xs font-semibold text-gray-400">devices</span>
          </div>
          <p className="text-[11px] font-medium text-gray-500 m-0">In progress at this branch</p>
        </div>

        {/* Diagnostic */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-blue-100 shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Diagnostics</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Search size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-900">{stats.diagnostic}</span>
            <span className="text-xs font-semibold text-gray-400">awaiting</span>
          </div>
          <p className="text-[11px] font-medium text-gray-500 m-0">Needs inspection & cause</p>
        </div>

        {/* In Repairing */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-100 shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Repairing</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Cpu size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-900">{stats.repairing}</span>
            <span className="text-xs font-semibold text-gray-400">on bench</span>
          </div>
          <p className="text-[11px] font-medium text-gray-500 m-0">Active part replacements</p>
        </div>

        {/* Completed Today */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-100 shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Done Today</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-900">{stats.completedToday}</span>
            <span className="text-xs font-semibold text-gray-400">fixed</span>
          </div>
          <p className="text-[11px] font-medium text-gray-500 m-0">Ready for customer pickup</p>
        </div>
      </div>

      {/* 3. Hero "Gadget Repair" Quick Action Workbench Card */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-100/60 rounded-3xl p-5 sm:p-6 border border-purple-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8b00cc] to-[#bd00ff] text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
            <Wrench size={24} />
          </div>
          <div className="flex flex-col">
            <h3 className="text-base sm:text-lg font-black text-gray-900 m-0">
              Gadget Repair Workbench
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 m-0 mt-0.5 max-w-xl font-medium">
              Update device diagnostics, log spare parts and labor materials, take progress photos, and notify cashiers when devices are fixed.
            </p>
          </div>
        </div>

        <Link
          href="/technician/monitoring"
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] hover:brightness-110 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 no-underline shrink-0"
        >
          <span>Open Gadget Repair Queue</span>
          <ChevronRight size={16} />
        </Link>
      </div>

      {/* 4. Priority Workbench Queue */}
      <div className="bg-white rounded-3xl border border-purple-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 text-[#8b00cc]">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-gray-900 m-0">
                Priority Repair Queue
              </h3>
              <p className="text-xs text-gray-500 m-0">Devices assigned to this branch bench</p>
            </div>
          </div>

          <Link
            href="/technician/monitoring"
            className="text-xs font-bold text-[#8b00cc] hover:underline flex items-center gap-1 no-underline"
          >
            <span>View All ({repairs.length})</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-xs text-gray-400 font-medium">
            Loading assigned devices...
          </div>
        ) : priorityQueue.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={24} />
            </div>
            <p className="text-sm font-bold text-gray-900 m-0">All caught up!</p>
            <p className="text-xs text-gray-500 m-0">No active repair tickets waiting at this bench.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 overflow-x-auto">
            {priorityQueue.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-purple-50/30 transition-colors">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden text-gray-500">
                    {item.image ? (
                      <img src={item.image} alt={item.deviceName} className="w-full h-full object-cover" />
                    ) : (
                      <Smartphone size={20} />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-gray-900 truncate">
                        {item.deviceName}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${getStatusBadge(item.progress, item.status)}`}>
                        {item.progress || 'Pending'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate m-0 mt-0.5">
                      Owner: <strong className="text-gray-700">{item.ownerName || 'Customer'}</strong> • Issue: <span className="text-gray-600">{item.cause?.split(':')[0] || 'Technical issue reported'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  <Link
                    href={`/technician/monitoring?focus=${item.id}`}
                    className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#8b00cc] font-bold text-xs transition-colors flex items-center gap-1.5 no-underline"
                  >
                    <span>Work on Device</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </main>
  );
}
