"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Package, Clock, Sparkles } from 'lucide-react';

interface FlaggedItem {
  id: string;
  deviceName: string;
  ownerName: string;
  branch: string;
  progress: string;
  technician: string;
  daysSinceUpdate: number;
  priority: string;
  hasMatchingPartInStock: boolean;
  recommendation: string;
}

interface RepairPriorityBannerProps {
  branch?: string;
  onSelectRepair?: (repairId: string) => void;
}

export default function RepairPriorityBanner({
  branch,
  onSelectRepair,
}: RepairPriorityBannerProps) {
  const [flagged, setFlagged] = useState<FlaggedItem[]>([]);
  const [partReadyCount, setPartReadyCount] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    const qs = new URLSearchParams();
    if (branch) qs.set('branch', branch);

    fetch(`/api/dss/repairs/workload?${qs.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active || !json) return;
        setFlagged(Array.isArray(json.flaggedRepairs) ? json.flaggedRepairs : []);
        setPartReadyCount(json.summary?.partReadyCount || 0);
      })
      .catch((err) => console.error('Failed to load repair priority banner:', err));

    return () => {
      active = false;
    };
  }, [branch]);

  if (flagged.length === 0) return null;

  return (
    <div className="mb-4 rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-white to-red-50/50 shadow-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-amber-50/60 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-[#7e22ce]">
                <Sparkles size={10} /> DSS Priority Review
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-gray-900">
                {flagged.length} repair{flagged.length === 1 ? '' : 's'} flagged for attention
              </span>
              {partReadyCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  <Package size={10} /> {partReadyCount} with part in stock
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 truncate m-0">
              Stalled or unassigned jobs highlighted for review (statuses are never changed automatically).
            </p>
          </div>
        </div>
        <span className="text-gray-500 shrink-0">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-amber-200/70 divide-y divide-amber-100 bg-white/90 max-h-60 overflow-y-auto">
          {flagged.map((item) => (
            <div
              key={item.id}
              className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-gray-900">{item.deviceName}</span>
                  <span className="text-gray-500">({item.ownerName})</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
                    {item.progress}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                    <Clock size={10} /> Idle {item.daysSinceUpdate}d
                  </span>
                  {item.hasMatchingPartInStock && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      <Package size={10} /> Part In Stock
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-600 m-0">{item.recommendation}</p>
              </div>
              {onSelectRepair && (
                <button
                  type="button"
                  onClick={() => onSelectRepair(item.id)}
                  className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-[#7e22ce] border border-purple-200 text-[11px] font-bold shrink-0 cursor-pointer"
                >
                  Inspect
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

