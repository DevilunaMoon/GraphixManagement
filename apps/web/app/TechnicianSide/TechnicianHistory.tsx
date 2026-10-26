"use client";

import React, { useState, useEffect } from 'react';
import { History, Search, CheckCircle2, Clock, Smartphone, RefreshCw } from 'lucide-react';

export default function TechnicianHistory() {
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/monitoring?limit=100');
      if (res.ok) {
        const data = await res.json();
        const list: any[] = Array.isArray(data) ? data : data?.requests || [];
        // Filter completed repairs
        setRepairs(list.filter(r => r.status === 'Completed' || r.progress?.toLowerCase() === 'completed'));
      }
    } catch (err) {
      console.error('Failed to load completed repairs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filtered = repairs.filter(r => {
    const q = search.toLowerCase();
    return (
      (r.deviceName || '').toLowerCase().includes(q) ||
      (r.ownerName || '').toLowerCase().includes(q) ||
      (r.trackingNumber || '').toLowerCase().includes(q) ||
      (r.technician || '').toLowerCase().includes(q) ||
      (r.repairHistory || '').toLowerCase().includes(q) ||
      (r.cause || '').toLowerCase().includes(q)
    );
  });

  return (
    <main className="flex-1 p-3.5 sm:p-6 md:p-8 flex flex-col gap-6 max-w-7xl w-full mx-auto font-['Inter']">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-purple-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8b00cc] to-[#bd00ff] text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
            <History size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight m-0">
              Completed Repair History
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium m-0 mt-0.5">
              Archive of all serviced and completed devices released or ready for pickup.
            </p>
          </div>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#8b00cc] font-bold text-xs transition-colors flex items-center gap-2 border border-purple-200 cursor-pointer"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-2xl border border-purple-100 shadow-sm max-w-md">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-purple-500 focus-within:bg-white">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search by device, tracking ID, or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs font-medium text-gray-900 bg-transparent outline-none placeholder-gray-400"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-16 text-center text-xs text-gray-400 font-medium">
          Loading completed repairs...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center gap-2">
          <History size={24} className="text-gray-300" />
          <p className="text-xs text-gray-500 m-0">No completed repair records found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filtered.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-purple-50/20 transition-colors">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200 font-bold">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-gray-900 truncate">{item.deviceName}</span>
                      <span className="font-mono text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {item.trackingNumber}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 m-0 mt-0.5">
                      Customer: <strong className="text-gray-700">{item.ownerName || 'Customer'}</strong> • Serviced by: <span className="font-semibold text-purple-700">{item.technician || 'Technician'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center text-xs">
                  {item.repairCost && (
                    <span className="font-mono font-bold text-gray-900 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                      ₱{parseFloat(item.repairCost).toLocaleString()}
                    </span>
                  )}
                  <span className="text-gray-400 text-[11px]">
                    {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
