"use client";

import React, { useState, useEffect } from 'react';
import { History, Search, CheckCircle2, Clock, Smartphone, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

export default function TechnicianHistory() {
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 7;

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

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

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

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);
  const paginatedRepairs = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, '...', totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

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
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {paginatedRepairs.map((item) => (
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

          {/* Pagination Controls */}
          {totalItems > 0 && (
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs">
              <span className="w-full sm:w-auto text-gray-500 font-medium text-center sm:text-left">
                Showing <span className="font-bold text-gray-900">{startItem}</span> to <span className="font-bold text-gray-900">{endItem}</span> of <span className="font-bold text-gray-900">{totalItems}</span> completed devices
              </span>

              {totalPages > 1 && (
                <div className="w-full sm:w-auto flex items-center justify-center gap-1.5">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="w-9 h-9 sm:w-auto sm:px-3 rounded-xl border border-gray-200 bg-white hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 disabled:opacity-30 disabled:pointer-events-none transition-all text-xs font-semibold text-gray-700 flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-95"
                    title="Previous Page"
                  >
                    <ChevronLeft size={15} />
                    <span className="hidden sm:inline">Prev</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {getPageNumbers().map((p, idx) => {
                      if (p === '...') {
                        return (
                          <span key={`dots-${idx}`} className="w-7 h-9 flex items-center justify-center text-xs text-gray-400 font-bold select-none">
                            ...
                          </span>
                        );
                      }
                      const isCurrent = p === currentPage;
                      return (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p as number)}
                          className={`w-9 h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer active:scale-95 ${
                            isCurrent
                              ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-sm shadow-purple-500/25 ring-2 ring-purple-400/30'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="w-9 h-9 sm:w-auto sm:px-3 rounded-xl border border-gray-200 bg-white hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 disabled:opacity-30 disabled:pointer-events-none transition-all text-xs font-semibold text-gray-700 flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-95"
                    title="Next Page"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
