"use client";

import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle2, Clock, AlertCircle, Phone, User, Package, Banknote, ShieldCheck, Loader2 } from 'lucide-react';

interface PickupReservation {
  id: string;
  referenceId: string;
  amount: number;
  quantity: number;
  variations: string | null;
  paymentType: string;
  branch: string;
  status: string;
  isSettled: boolean;
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
  remainingMinutes: number;
  device: {
    name: string;
    price: number;
    image: string | null;
    stock: number;
  };
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
}

interface CashierVerifyPickupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onSuccess?: () => void;
}

function getVariationPills(variationsStr: string | null | undefined): string[] {
  if (!variationsStr) return [];
  try {
    const parsed = typeof variationsStr === 'string' ? JSON.parse(variationsStr) : variationsStr;
    if (Array.isArray(parsed)) {
      return parsed
        .map((v: any) => {
          if (typeof v === 'string') return v;
          if (v && typeof v === 'object') {
            if (v.type && v.name) {
              const displayVal = (v.type.toLowerCase() === 'storage' && !String(v.name).toLowerCase().includes('gb'))
                ? `${v.name}GB`
                : v.name;
              return `${v.type}: ${displayVal}`;
            }
            return v.name || v.value || '';
          }
          return '';
        })
        .filter(Boolean);
    }
    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed)
        .map(([k, v]: [string, any]) => {
          if (typeof v === 'string') return `${k}: ${v}`;
          if (v && typeof v === 'object') return `${v.type || k}: ${v.name || v.value || ''}`;
          return String(v);
        })
        .filter(Boolean);
    }
  } catch (e) {}

  const clean = String(variationsStr).trim();
  return clean && !clean.startsWith('[') && !clean.startsWith('{') ? [clean] : [];
}

function formatVariations(variationsStr: string | null | undefined): string {
  const pills = getVariationPills(variationsStr);
  return pills.join(' • ');
}

export default function CashierVerifyPickupModal({
  isOpen,
  onClose,
  initialQuery = '',
  onSuccess
}: CashierVerifyPickupModalProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [reservations, setReservations] = useState<PickupReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PickupReservation | null>(null);
  const [tenderedCash, setTenderedCash] = useState<number | string>('');
  const [verifying, setVerifying] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchOrders = async (query = searchQuery) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/purchases/lookup?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok && data && Array.isArray(data.purchases)) {
        setReservations(data.purchases);
        if (data.purchases.length === 1 && query.trim()) {
          setSelectedOrder(data.purchases[0]);
          setTenderedCash(data.purchases[0].amount);
        }
      } else {
        setReservations([]);
      }
    } catch (err) {
      console.error('Error fetching reservations:', err);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        fetchOrders(searchQuery);
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setSelectedOrder(null);
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen, searchQuery]);

  const handleSelectOrder = (order: PickupReservation) => {
    setSelectedOrder(order);
    setTenderedCash(order.amount);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleConfirmVerification = async () => {
    if (!selectedOrder) return;
    setVerifying(true);
    setErrorMessage(null);

    const tenderedNum = Number(tenderedCash) || selectedOrder.amount;
    if (tenderedNum < selectedOrder.amount) {
      setErrorMessage(`Tendered cash (₱${tenderedNum.toLocaleString()}) is less than total due (₱${selectedOrder.amount.toLocaleString()})`);
      setVerifying(false);
      return;
    }

    try {
      const res = await fetch('/api/purchases/verify-pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseId: selectedOrder.id,
          referenceId: selectedOrder.referenceId,
          amountTendered: tenderedNum
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(`Payment confirmed! ${selectedOrder.user.name || 'Customer'}'s official PDF receipt is now UNLOCKED.`);
        setReservations(prev =>
          prev.map(r => r.id === selectedOrder.id ? { ...r, status: 'Paid', isSettled: true } : r)
        );
        setSelectedOrder(prev => prev ? { ...prev, status: 'Paid', isSettled: true } : null);
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(data.error || 'Failed to verify payment');
      }
    } catch (err: any) {
      console.error('Failed to verify:', err);
      setErrorMessage('Network error while verifying payment.');
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  const tenderedVal = Number(tenderedCash) || 0;
  const changeVal = selectedOrder ? Math.max(0, tenderedVal - selectedOrder.amount) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <ShieldCheck size={22} className="text-[#bd00ff]" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-wide m-0">Verify In-Store Pickup</h3>
              <p className="text-xs text-purple-200 m-0">Search by Customer Name, Phone Number, or Claim Code</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all border-none cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-purple-50/50 border-b border-purple-100 flex gap-2">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchOrders(searchQuery)}
              placeholder="Search by customer name, phone (09...), or claim code (#CMTPQ...)"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-purple-200 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#bd00ff] shadow-sm"
              autoFocus
            />
          </div>
          <button
            onClick={() => fetchOrders(searchQuery)}
            disabled={loading}
            className="px-5 py-2.5 bg-[#bd00ff] hover:bg-[#9c00d6] text-white font-bold text-sm rounded-xl transition-all shadow-sm border-none cursor-pointer flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            <span>Search</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          
          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 font-bold text-sm shadow-sm animate-in fade-in">
              <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
              <div className="flex-1 leading-snug">{successMessage}</div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-900 font-bold text-xs shadow-sm">
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {selectedOrder ? (
            /* Order Verification Panel */
            <div className="bg-white border-2 border-purple-300 rounded-2xl p-5 shadow-md flex flex-col gap-4">
              <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {selectedOrder.referenceId}
                    </span>
                    {selectedOrder.status === 'Paid' ? (
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        PAID & VERIFIED
                      </span>
                    ) : selectedOrder.isExpired ? (
                      <span className="text-[10px] font-black bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                        EXPIRED
                      </span>
                    ) : (
                      <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        PENDING PICKUP
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-extrabold text-gray-900 m-0">{selectedOrder.device.name}</h4>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    <span className="text-xs font-bold text-gray-600">Qty: {selectedOrder.quantity}</span>
                    {getVariationPills(selectedOrder.variations).map((pill, idx) => (
                      <span key={idx} className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                        {pill}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-xs text-gray-400 hover:text-gray-700 bg-transparent border-none cursor-pointer font-bold"
                >
                  Change Order
                </button>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl text-xs">
                <div>
                  <span className="text-gray-400 font-medium block">Customer Name:</span>
                  <span className="font-bold text-gray-800">{selectedOrder.user.name || 'Walk-in Customer'}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Phone Number:</span>
                  <span className="font-bold text-gray-800">{selectedOrder.user.phone || 'No phone provided'}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Pickup Branch:</span>
                  <span className="font-bold text-purple-700">{selectedOrder.branch} Branch</span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Total Amount Due:</span>
                  <span className="font-black text-sm text-black">₱{selectedOrder.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Cash Collection Section */}
              {selectedOrder.status !== 'Paid' && (
                <div className="bg-purple-50/60 border border-purple-200/80 rounded-2xl p-4 flex flex-col gap-3">
                  {selectedOrder.isExpired && (
                    <div className="p-2.5 bg-amber-100/80 border border-amber-300 rounded-xl text-xs font-semibold text-amber-900 flex items-center gap-2">
                      <Clock size={16} className="text-amber-700 shrink-0" />
                      <span>Note: The 8-hour claim window passed, but you can still collect cash and confirm fulfillment.</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs font-bold text-purple-950">
                    <Banknote size={16} className="text-[#bd00ff]" />
                    <span>In-Store Cash Collection</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="text-[11px] font-bold text-gray-600 mb-1 block">Cash Tendered (₱):</label>
                      <input
                        type="number"
                        value={tenderedCash}
                        onChange={(e) => setTenderedCash(e.target.value)}
                        placeholder={String(selectedOrder.amount)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold text-base text-gray-900 focus:outline-none focus:border-[#bd00ff]"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-gray-600 mb-1 block">Change to Customer:</span>
                      <div className="px-3 py-2 bg-white border border-gray-200 rounded-xl font-black text-base text-emerald-600">
                        ₱{changeVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmVerification}
                    disabled={verifying}
                    className="w-full mt-2 py-3 bg-[#bd00ff] hover:bg-[#9c00d6] text-white font-extrabold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 border-none cursor-pointer disabled:opacity-50"
                  >
                    {verifying ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}
                    <span>Confirm Cash Payment & Unlock Receipt</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* List of Reservations */
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                {reservations.length > 0 ? `Active In-Store Reservations (${reservations.length})` : 'No Reservations Found'}
              </span>

              {reservations.length === 0 ? (
                <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                  <Package size={36} strokeWidth={1.5} />
                  <p className="text-sm font-semibold">No pending reservations match your search.</p>
                  <p className="text-xs text-gray-400">Ask the customer for their full name, phone number, or show their order screenshot.</p>
                </div>
              ) : (
                reservations.map((resItem) => {
                  const isPaid = resItem.status === 'Paid';
                  return (
                    <div
                      key={resItem.id}
                      onClick={() => handleSelectOrder(resItem)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                        isPaid
                          ? 'bg-gray-50 border-gray-200 opacity-75'
                          : resItem.isExpired
                          ? 'bg-rose-50/40 border-rose-200'
                          : 'bg-white border-purple-100 hover:border-[#bd00ff] hover:shadow-md'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono font-bold text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            {resItem.referenceId}
                          </span>
                          <span className="font-bold text-sm text-gray-900 truncate">
                            {resItem.user.name || 'Customer'}
                          </span>
                          {resItem.user.phone && (
                            <span className="text-xs text-gray-500 font-medium">
                              ({resItem.user.phone})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 m-0 truncate">
                          {resItem.device.name} (Qty: {resItem.quantity}) {formatVariations(resItem.variations) ? `• ${formatVariations(resItem.variations)}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <div className="text-right">
                          <span className="font-black text-sm text-black block">
                            ₱{resItem.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          {isPaid ? (
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              VERIFIED
                            </span>
                          ) : resItem.isExpired ? (
                            <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                              EXPIRED
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                              PENDING
                            </span>
                          )}
                        </div>

                        {!isPaid && !resItem.isExpired && (
                          <button
                            type="button"
                            className="px-3.5 py-1.5 bg-[#bd00ff] hover:bg-[#9c00d6] text-white font-bold text-xs rounded-xl border-none cursor-pointer shadow-sm transition-all"
                          >
                            Verify
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-xl border-none cursor-pointer transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
