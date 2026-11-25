"use client";

import React, { useEffect, useState } from 'react';
import { Sparkles, Package, Clock, Coins, CheckCircle2, AlertCircle, History, Plus } from 'lucide-react';

interface SimilarRepair {
  id: string;
  deviceName: string;
  cause: string;
  repairCost: number | null;
  turnaroundHours: number;
  completedAt: string;
  branch: string;
  partsUsed: string[];
}

interface RecommendedPart {
  id: string;
  name: string;
  category: string;
  compatibleDevice?: string | null;
  stock: number;
  price: number;
  inStock: boolean;
  branch: string;
  matchReason: string;
}

interface RepairDssAdvisorProps {
  deviceName: string;
  cause: string;
  branch?: string;
  onAddPart?: (part: { sparePartId: string; description: string; unitPrice: number; maxStock: number }) => void;
}

function formatDuration(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const days = Math.round((hours / 24) * 10) / 10;
  return `${days}d`;
}

export default function RepairDssAdvisor({
  deviceName,
  cause,
  branch,
  onAddPart,
}: RepairDssAdvisorProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    similarRepairs: SimilarRepair[];
    costRange: { min: number; max: number; average: number; sampleSize: number } | null;
    turnaroundRange: { minHours: number; maxHours: number; averageHours: number } | null;
    recommendedParts: RecommendedPart[];
  } | null>(null);

  useEffect(() => {
    const cleanDevice = (deviceName || '').trim();
    const cleanCause = (cause || '').trim();
    if (cleanDevice.length < 2 && cleanCause.length < 3) {
      setData(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (cleanDevice) qs.set('deviceName', cleanDevice);
        if (cleanCause) qs.set('cause', cleanCause);
        if (branch) qs.set('branch', branch);

        const res = await fetch(`/api/dss/repairs/recommend?${qs.toString()}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Failed to load repair DSS advisor:', err);
        }
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [deviceName, cause, branch]);

  const hasInsights =
    data &&
    (data.similarRepairs.length > 0 || data.recommendedParts.length > 0);

  if (!loading && !hasInsights) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-purple-200/90 bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/40 p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-[#8b00cc] text-white flex items-center justify-center shrink-0">
            <Sparkles size={14} />
          </span>
          <div>
            <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider m-0">
              DSS Diagnosis &amp; Service Reference
            </h4>
            <p className="text-[11px] text-gray-500 m-0">
              Based on completed repairs &amp; live spare parts stock. Technician still confirms diagnosis &amp; quotation.
            </p>
          </div>
        </div>
        {loading && (
          <span className="text-[11px] font-bold text-[#8b00cc] animate-pulse">
            Analyzing history...
          </span>
        )}
      </div>

      {data && (
        <>
          {/* Cost & Turnaround Reference Chips */}
          {(data.costRange || data.turnaroundRange) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {data.costRange && (
                <div className="bg-white rounded-xl border border-purple-100 px-3 py-2 flex items-center gap-2.5">
                  <Coins size={16} className="text-[#8b00cc] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase m-0">Past Cost Range</p>
                    <p className="text-xs font-black text-gray-900 m-0">
                      ₱{data.costRange.min.toLocaleString()} – ₱{data.costRange.max.toLocaleString()}{' '}
                      <span className="font-semibold text-gray-500">
                        (Avg ₱{data.costRange.average.toLocaleString()})
                      </span>
                    </p>
                  </div>
                </div>
              )}
              {data.turnaroundRange && (
                <div className="bg-white rounded-xl border border-purple-100 px-3 py-2 flex items-center gap-2.5">
                  <Clock size={16} className="text-indigo-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase m-0">Typical Turnaround</p>
                    <p className="text-xs font-black text-gray-900 m-0">
                      {formatDuration(data.turnaroundRange.minHours)} – {formatDuration(data.turnaroundRange.maxHours)}{' '}
                      <span className="font-semibold text-gray-500">
                        (Avg {formatDuration(data.turnaroundRange.averageHours)})
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live Branch Spare Parts Availability */}
          {data.recommendedParts.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5 m-0">
                <Package size={13} className="text-[#8b00cc]" />
                Likely Replacement Parts in Branch Inventory
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.recommendedParts.map((part) => (
                  <div
                    key={part.id}
                    className="bg-white rounded-xl border border-gray-200/90 px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate m-0">{part.name}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {part.inStock ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            <CheckCircle2 size={10} /> In Stock ({part.stock})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                            <AlertCircle size={10} /> Out of Stock
                          </span>
                        )}
                        <span className="text-[10px] font-semibold text-gray-500">
                          ₱{part.price.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {onAddPart && part.inStock && (
                      <button
                        type="button"
                        onClick={() =>
                          onAddPart({
                            sparePartId: part.id,
                            description: part.name,
                            unitPrice: part.price,
                            maxStock: part.stock,
                          })
                        }
                        className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-[#7e22ce] border border-purple-200 text-[10px] font-bold flex items-center gap-0.5 shrink-0 cursor-pointer"
                      >
                        <Plus size={11} /> Use
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Similar Completed Repairs */}
          {data.similarRepairs.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5 m-0">
                <History size={13} className="text-indigo-600" />
                Similar Completed Repairs ({data.similarRepairs.length})
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {data.similarRepairs.map((sr) => (
                  <div
                    key={sr.id}
                    className="bg-white/90 rounded-lg border border-gray-100 px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px]"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-gray-900">{sr.deviceName}</span>
                      <span className="text-gray-500"> — {sr.cause}</span>
                      {sr.partsUsed.length > 0 && (
                        <span className="block text-[10px] text-purple-700 truncate">
                          Parts: {sr.partsUsed.join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {sr.repairCost !== null && (
                        <span className="font-bold text-gray-900 block">₱{sr.repairCost.toLocaleString()}</span>
                      )}
                      <span className="text-[10px] text-gray-400">{formatDuration(sr.turnaroundHours)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

