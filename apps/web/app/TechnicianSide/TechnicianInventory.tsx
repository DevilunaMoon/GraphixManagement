"use client";

import React, { useState, useEffect } from 'react';
import { Package, Search, RefreshCw, AlertTriangle, CheckCircle2, Smartphone, ShieldCheck } from 'lucide-react';

export default function TechnicianInventory() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [technician, setTechnician] = useState<any>(null);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const profRes = await fetch('/api/profile');
      if (profRes.ok) {
        const prof = await profRes.json();
        setTechnician(prof);
      }

      const res = await fetch('/api/devices');
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const filteredItems = items.filter(i => {
    const q = search.toLowerCase();
    return (i.name || '').toLowerCase().includes(q) || (i.type || '').toLowerCase().includes(q);
  });

  return (
    <main className="flex-1 p-3.5 sm:p-6 md:p-8 flex flex-col gap-6 max-w-7xl w-full mx-auto font-['Inter']">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-purple-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8b00cc] to-[#bd00ff] text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Package size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight m-0">
                Spare Parts & Store Inventory
              </h1>
              <span className="text-[11px] font-bold bg-purple-100 text-[#8b00cc] px-2 py-0.5 rounded-full border border-purple-200">
                📍 {technician?.branch || 'Branch'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 font-medium m-0 mt-0.5">
              Check branch parts availability, components, and replacement unit stock.
            </p>
          </div>
        </div>

        <button
          onClick={fetchInventory}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#8b00cc] font-bold text-xs transition-colors flex items-center gap-2 border border-purple-200 cursor-pointer"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Stock</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-2xl border border-purple-100 shadow-sm max-w-md">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-purple-500 focus-within:bg-white">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search spare parts or device models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs font-medium text-gray-900 bg-transparent outline-none placeholder-gray-400"
          />
        </div>
      </div>

      {/* Inventory Grid */}
      {loading ? (
        <div className="p-16 text-center text-xs text-gray-400 font-medium">
          Loading inventory...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center gap-2">
          <Package size={24} className="text-gray-300" />
          <p className="text-xs text-gray-500 m-0">No inventory items found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-4 border border-purple-100 shadow-sm flex flex-col justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Smartphone size={20} className="text-gray-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate m-0">
                    {item.name}
                  </h4>
                  <p className="text-[11px] text-gray-500 m-0 mt-0.5 capitalize">
                    {item.type || 'Device Part'}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-[#8b00cc]">
                  ₱{(item.price || 0).toLocaleString()}
                </span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                  (item.stock || 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                }`}>
                  Stock: {item.stock || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
