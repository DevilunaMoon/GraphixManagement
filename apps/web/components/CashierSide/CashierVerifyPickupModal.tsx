"use client";

import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle2, Clock, AlertCircle, Phone, User, Package, ShieldCheck, Loader2, ChevronLeft, ChevronRight, Smartphone, Eye, ZoomIn, XCircle, FileText, Check } from 'lucide-react';
import CashierImeiPromptModal from './CashierImeiPromptModal';
import { isIPhoneProduct } from '../../lib/imei';

interface PickupReservation {
  id: string;
  referenceId: string;
  imei?: string | null;
  amount: number;
  quantity: number;
  variations: string | null;
  paymentType: string;
  branch: string;
  status: string;
  isSettled: boolean;
  receiptUrl?: string | null;
  staffMessage?: string | null;
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
  const [filterTab, setFilterTab] = useState<'all' | 'gcash' | 'cash'>('all');
  const [reservations, setReservations] = useState<PickupReservation[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PickupReservation | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [showReceiptImageModal, setShowReceiptImageModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedVariations, setSelectedVariations] = useState<string | null>(null);
  const [isEditingVariant, setIsEditingVariant] = useState(false);
  const [newColorInput, setNewColorInput] = useState('');
  const [imeiModalTarget, setImeiModalTarget] = useState<{
    purchaseId: string;
    deviceName: string;
    referenceId?: string;
    customerName?: string | null;
    branch?: string | null;
    variations?: string | null;
    quantity?: number;
    initialImei?: string | null;
  } | null>(null);

  const fetchOrders = async (query = searchQuery) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/purchases/lookup?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok && data && Array.isArray(data.purchases)) {
        setReservations(data.purchases);
        setCurrentPage(1);
        if (data.purchases.length === 1 && query.trim()) {
          const first = data.purchases[0];
          setSelectedOrder(first);
          setSelectedVariations(first.variations);
        }
      } else {
        setReservations([]);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error('Error fetching reservations:', err);
      setReservations([]);
      setCurrentPage(1);
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
      setSelectedVariations(null);
      setIsEditingVariant(false);
      setNewColorInput('');
      setSuccessMessage(null);
      setErrorMessage(null);
      setCurrentPage(1);
      setShowRejectDialog(false);
      setShowReceiptImageModal(false);
      setRejectionReasonInput('');
    }
  }, [isOpen, searchQuery]);

  const handleSelectOrder = (order: PickupReservation) => {
    setSelectedOrder(order);
    setSelectedVariations(order.variations);
    setIsEditingVariant(false);
    setNewColorInput('');
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowRejectDialog(false);
  };

  const handleConfirmVerification = async () => {
    if (!selectedOrder) return;
    setVerifying(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/purchases/verify-pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseId: selectedOrder.id,
          referenceId: selectedOrder.referenceId,
          amountTendered: selectedOrder.amount,
          action: 'VERIFY'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(`Payment verified! ${selectedOrder.user.name || 'Customer'}'s order is now READY FOR PICKUP. Official Graphix Store receipt is issued. IMEI will be recorded upon device handover.`);
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

  const handleRejectPayment = async () => {
    if (!selectedOrder) return;
    setRejecting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/purchases/verify-pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseId: selectedOrder.id,
          referenceId: selectedOrder.referenceId,
          action: 'REJECT',
          rejectionReason: rejectionReasonInput.trim() || 'Payment receipt does not match expected amount or is invalid.'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(`GCash payment rejected for Order ${selectedOrder.referenceId}. Customer has been notified.`);
        setReservations(prev =>
          prev.map(r => r.id === selectedOrder.id ? { ...r, status: 'Rejected', isSettled: false } : r)
        );
        setSelectedOrder(prev => prev ? { ...prev, status: 'Rejected', isSettled: false } : null);
        setShowRejectDialog(false);
        setRejectionReasonInput('');
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(data.error || 'Failed to reject payment');
      }
    } catch (err: any) {
      console.error('Failed to reject:', err);
      setErrorMessage('Network error while rejecting payment.');
    } finally {
      setRejecting(false);
    }
  };

  const handleImeiSaved = (newImei: string) => {
    if (imeiModalTarget) {
      setReservations(prev => prev.map(r => r.id === imeiModalTarget.purchaseId ? { 
        ...r, 
        imei: newImei, 
        status: 'Completed',
        variations: selectedVariations || r.variations 
      } : r));
      setSelectedOrder(prev => (prev && prev.id === imeiModalTarget.purchaseId) ? { 
        ...prev, 
        imei: newImei, 
        status: 'Completed',
        variations: selectedVariations || prev.variations 
      } : prev);
      setSuccessMessage(`Device successfully handed over to customer! Recorded IMEI (${newImei}) is permanently linked.`);
    }
    setImeiModalTarget(null);
    if (onSuccess) onSuccess();
  };

  // Tab filtering
  const filteredReservations = reservations.filter(r => {
    if (filterTab === 'gcash') {
      return r.paymentType?.toLowerCase().includes('gcash') || Boolean(r.receiptUrl) || r.status === 'For Verification';
    }
    if (filterTab === 'cash') {
      return r.paymentType?.toLowerCase().includes('cash') && !r.receiptUrl && r.status !== 'For Verification';
    }
    return true;
  });

  const gcashPendingCount = reservations.filter(r => 
    (r.paymentType?.toLowerCase().includes('gcash') || Boolean(r.receiptUrl) || r.status === 'For Verification') && r.status !== 'Paid' && r.status !== 'Rejected'
  ).length;

  const totalPages = Math.max(1, Math.ceil(filteredReservations.length / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentReservations = filteredReservations.slice(startIndex, endIndex);

  if (!isOpen) return null;

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
              <h3 className="text-lg font-black tracking-wide m-0">Verify In-Store Pickup & GCash Payments</h3>
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

        {/* Filter Tabs & Search Bar */}
        <div className="p-4 bg-purple-50/50 border-b border-purple-100 flex flex-col gap-3">
          
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setFilterTab('all'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-purple-900 text-white border-purple-900 shadow-xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-50'
              }`}
            >
              All Reservations ({reservations.length})
            </button>
            <button
              type="button"
              onClick={() => { setFilterTab('gcash'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'gcash'
                  ? 'bg-[#005ce6] text-white border-[#005ce6] shadow-xs'
                  : 'bg-white text-[#005ce6] border-blue-200 hover:bg-blue-50'
              }`}
            >
              <span>GCash Verification</span>
              {gcashPendingCount > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] rounded-full font-black">
                  {gcashPendingCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setFilterTab('cash'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                filterTab === 'cash'
                  ? 'bg-purple-900 text-white border-purple-900 shadow-xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-50'
              }`}
            >
              Cash on Pickup
            </button>
          </div>

          {/* Search Bar Input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchOrders(searchQuery)}
                placeholder="Search customer name, phone (09...), or claim code (#GRPX...)"
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
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {selectedOrder.referenceId}
                    </span>
                    {selectedOrder.status === 'Completed' ? (
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <Check size={12} /> PICKUP COMPLETED
                      </span>
                    ) : selectedOrder.status === 'Paid' ? (
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        READY FOR PICKUP (PAID)
                      </span>
                    ) : selectedOrder.status === 'For Verification' ? (
                      <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
                        FOR VERIFICATION (GCASH)
                      </span>
                    ) : selectedOrder.status === 'Rejected' ? (
                      <span className="text-[10px] font-black bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        PAYMENT REJECTED
                      </span>
                    ) : selectedOrder.isExpired ? (
                      <span className="text-[10px] font-black bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        EXPIRED
                      </span>
                    ) : (
                      <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        PENDING CASHIER VERIFICATION
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-extrabold text-gray-900 m-0">{selectedOrder.device.name}</h4>
                  
                  {/* Variations & Color Changer */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    <span className="text-xs font-bold text-gray-600">Qty: {selectedOrder.quantity}</span>
                    {getVariationPills(selectedVariations || selectedOrder.variations).map((pill, idx) => (
                      <span key={idx} className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                        {pill}
                      </span>
                    ))}

                    {/* Color / Variant Change Toggle (Allowed before pickup is completed) */}
                    {selectedOrder.status !== 'Completed' && (
                      <button
                        type="button"
                        onClick={() => setIsEditingVariant(!isEditingVariant)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                      >
                        {isEditingVariant ? 'Cancel Color Change' : 'Change Color / Unit'}
                      </button>
                    )}
                  </div>

                  {/* Inline Color / Unit Variant Editor */}
                  {isEditingVariant && selectedOrder.status !== 'Completed' && (
                    <div className="mt-2.5 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex flex-col gap-2 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-950">Customer requested a different color / unit at pickup:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {['Space Black', 'Sierra Blue', 'Alpine Green', 'Silver', 'Gold', 'Deep Purple', 'Midnight', 'Blue', 'Black'].map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => {
                              const currentPills = getVariationPills(selectedVariations || selectedOrder.variations);
                              const nonColor = currentPills.filter(p => !p.toLowerCase().includes('color:') && !['black','blue','green','silver','gold','purple','white','midnight'].some(c => p.toLowerCase().includes(c)));
                              const updated = `Color: ${col}${nonColor.length > 0 ? `, ${nonColor.join(', ')}` : ''}`;
                              setSelectedVariations(updated);
                              setIsEditingVariant(false);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-indigo-200 hover:border-indigo-500 text-gray-800 hover:text-indigo-900 cursor-pointer shadow-2xs transition-all"
                          >
                            {col}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 items-center mt-1">
                        <input
                          type="text"
                          placeholder="Or type custom color (e.g. Titanium Blue)..."
                          value={newColorInput}
                          onChange={(e) => setNewColorInput(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs outline-none focus:border-indigo-500 font-medium"
                        />
                        <button
                          type="button"
                          disabled={!newColorInput.trim()}
                          onClick={() => {
                            if (newColorInput.trim()) {
                              setSelectedVariations(`Color: ${newColorInput.trim()}`);
                              setNewColorInput('');
                              setIsEditingVariant(false);
                            }
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold border-none cursor-pointer disabled:opacity-50"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Recorded IMEI Badge or Pending Pickup Status */}
                  {selectedOrder.imei ? (
                    <div className="flex items-center gap-2 mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <Smartphone size={16} className="text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold text-gray-700">Recorded Physical IMEI:</span>
                      <span className="font-mono font-black text-xs text-emerald-950">{selectedOrder.imei}</span>
                      <span className="text-[10px] font-black bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full ml-auto">
                        PERMANENTLY LINKED
                      </span>
                    </div>
                  ) : isIPhoneProduct(selectedOrder.device.name) ? (
                    <div className="flex items-center justify-between gap-2 mt-2 p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl">
                      <div className="flex items-center gap-1.5">
                        <Smartphone size={16} className="text-amber-600 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-amber-950 block">IMEI: Pending Pickup</span>
                          <span className="text-[10px] text-amber-700 font-medium">IMEI will be recorded during physical device handover.</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full shrink-0">
                        NOT ASSIGNED YET
                      </span>
                    </div>
                  ) : null}
                </div>
                <button
                  onClick={() => { setSelectedOrder(null); setShowRejectDialog(false); }}
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
                  <span className="text-gray-400 font-medium block">Expected Order Total:</span>
                  <span className="font-black text-sm text-black">
                    ₱{selectedOrder.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* GCash Uploaded Receipt Inspection Block */}
              {(selectedOrder.receiptUrl || selectedOrder.paymentType?.toLowerCase().includes('gcash')) && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-[#005ce6] text-white rounded-lg flex items-center justify-center font-bold text-xs">
                        G
                      </div>
                      <div>
                        <h5 className="font-extrabold text-xs text-gray-900 m-0">Submitted GCash Payment Proof</h5>
                        <p className="text-[10px] text-gray-500 m-0">Uploaded receipt must match the expected total</p>
                      </div>
                    </div>
                    {selectedOrder.receiptUrl ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check size={11} /> Proof Attached
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        No Screenshot Uploaded
                      </span>
                    )}
                  </div>

                  {selectedOrder.receiptUrl && (
                    <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
                      <div 
                        onClick={() => setShowReceiptImageModal(true)}
                        className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative cursor-pointer group shrink-0"
                        title="Click to view full size receipt"
                      >
                        <img 
                          src={selectedOrder.receiptUrl} 
                          alt="GCash Receipt Proof" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                          <ZoomIn size={18} />
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col gap-1 min-w-0 text-xs">
                        <span className="font-bold text-gray-900">Uploaded GCash Receipt Screenshot</span>
                        <span className="text-[11px] text-gray-500">
                          Verify transaction amount of <strong>₱{selectedOrder.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowReceiptImageModal(true)}
                          className="self-start mt-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-[#005ce6] text-xs font-bold rounded-lg border border-blue-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Eye size={13} />
                          <span>View Full Size GCash Receipt</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedOrder.staffMessage && (
                    <div className="text-[11px] bg-white/80 p-2 rounded-lg border border-blue-100 text-gray-700">
                      <strong>Customer Note:</strong> {selectedOrder.staffMessage}
                    </div>
                  )}
                </div>
              )}

              {/* Rejection Form Dialog */}
              {showRejectDialog && (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex flex-col gap-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-xs text-rose-950 m-0">Reject GCash Payment</h5>
                    <button
                      type="button"
                      onClick={() => setShowRejectDialog(false)}
                      className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <p className="text-[11px] text-rose-900/80 m-0">
                    Please provide a reason for rejecting this GCash payment receipt. The customer will be notified to resubmit.
                  </p>
                  <textarea
                    rows={2}
                    value={rejectionReasonInput}
                    onChange={(e) => setRejectionReasonInput(e.target.value)}
                    placeholder="E.g., Payment amount does not match, blurred receipt, duplicate reference number..."
                    className="w-full p-2.5 bg-white border border-rose-200 rounded-xl text-xs outline-none focus:border-rose-500 resize-none font-medium"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectDialog(false)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl border-none cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={rejecting}
                      onClick={handleRejectPayment}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl border-none cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {rejecting ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                      <span>Confirm Rejection</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS: Payment Verification vs Physical Handover */}
              {selectedOrder.status !== 'Paid' && selectedOrder.status !== 'Completed' ? (
                <div className="flex flex-col gap-2 pt-1">
                  
                  {/* GCash order action buttons (Verify Payment vs Reject Payment) */}
                  {(selectedOrder.receiptUrl || selectedOrder.paymentType?.toLowerCase().includes('gcash') || selectedOrder.status === 'For Verification') ? (
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <button
                        type="button"
                        onClick={handleConfirmVerification}
                        disabled={verifying || rejecting}
                        className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 border-none cursor-pointer disabled:opacity-50"
                      >
                        {verifying ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={18} />
                        )}
                        <span>Verify Payment & Issue Receipt</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowRejectDialog(true)}
                        disabled={verifying || rejecting}
                        className="px-5 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <XCircle size={16} />
                        <span>Reject Receipt</span>
                      </button>
                    </div>
                  ) : (
                    /* Cash on Pickup Verification button */
                    <button
                      onClick={handleConfirmVerification}
                      disabled={verifying}
                      className="w-full py-3.5 bg-[#bd00ff] hover:bg-[#9c00d6] text-white font-extrabold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 border-none cursor-pointer disabled:opacity-50"
                    >
                      {verifying ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={18} />
                      )}
                      <span>Confirm Cash Payment & Unlock Receipt</span>
                    </button>
                  )}
                </div>
              ) : selectedOrder.status === 'Paid' ? (
                /* ORDER IS PAID & READY FOR PICKUP: Hand Over Device & Record IMEI */
                <div className="flex flex-col gap-2.5 pt-2 border-t border-purple-100">
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 flex items-center justify-between text-xs">
                    <span className="font-semibold text-purple-900">
                      Customer is at the store to claim this verified device?
                    </span>
                    <span className="font-black text-purple-700 uppercase text-[10px] bg-white px-2 py-0.5 rounded border border-purple-200">
                      Step: Physical Handover
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setImeiModalTarget({
                      purchaseId: selectedOrder.id,
                      deviceName: selectedOrder.device.name,
                      referenceId: selectedOrder.referenceId,
                      customerName: selectedOrder.user.name,
                      branch: selectedOrder.branch,
                      variations: selectedVariations || selectedOrder.variations,
                      quantity: selectedOrder.quantity,
                      initialImei: selectedOrder.imei
                    })}
                    className="w-full py-4 bg-gradient-to-r from-[#BF00FF] to-[#4B0082] hover:opacity-95 text-white font-black text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 border-none cursor-pointer"
                  >
                    <Smartphone size={18} />
                    <span>Hand Over Device & Record IMEI (Complete Pickup)</span>
                  </button>
                </div>
              ) : (
                /* ORDER IS COMPLETED */
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Pickup completed and physical unit handed over to customer.</span>
                </div>
              )}
            </div>
          ) : (
            /* List of Reservations */
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                {filteredReservations.length > 0 ? `In-Store Reservations (${filteredReservations.length})` : 'No Reservations Found'}
              </span>

              {filteredReservations.length === 0 ? (
                <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                  <Package size={36} strokeWidth={1.5} />
                  <p className="text-sm font-semibold">No reservations match the selected filter.</p>
                  <p className="text-xs text-gray-400">Ask the customer for their full name, phone number, or show their order screenshot.</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2.5">
                    {currentReservations.map((resItem) => {
                      const isPaid = resItem.status === 'Paid';
                      const isGcash = resItem.paymentType?.toLowerCase().includes('gcash') || Boolean(resItem.receiptUrl) || resItem.status === 'For Verification';
                      const isForVerification = resItem.status === 'For Verification';

                      return (
                        <div
                          key={resItem.id}
                          onClick={() => handleSelectOrder(resItem)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                            isPaid
                              ? 'bg-gray-50 border-gray-200 opacity-75'
                              : isForVerification
                              ? 'bg-blue-50/50 border-blue-200 hover:border-[#005ce6] hover:shadow-md'
                              : resItem.status === 'Rejected'
                              ? 'bg-rose-50/40 border-rose-200'
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
                              ) : isForVerification ? (
                                <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                  GCASH VERIFICATION
                                </span>
                              ) : resItem.status === 'Rejected' ? (
                                <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                                  REJECTED
                                </span>
                              ) : !resItem.isExpired ? (
                                <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                  CASH PENDING
                                </span>
                              ) : (
                                <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                                  EXPIRED
                                </span>
                              )}
                            </div>

                            {isPaid ? null : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectOrder(resItem);
                                }}
                                className={`px-3.5 py-1.5 font-bold text-xs rounded-xl border-none cursor-pointer shadow-sm transition-all text-white ${
                                  isForVerification
                                    ? 'bg-[#005ce6] hover:bg-[#0047b3]'
                                    : resItem.isExpired
                                    ? 'bg-rose-600 hover:bg-rose-700'
                                    : 'bg-[#bd00ff] hover:bg-[#9c00d6]'
                                }`}
                              >
                                {isForVerification ? 'Verify GCash' : 'Verify'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-purple-100 mt-2 px-1">
                      <span className="text-xs font-semibold text-gray-500">
                        Showing <strong className="text-gray-900">{startIndex + 1}</strong> to <strong className="text-gray-900">{Math.min(endIndex, filteredReservations.length)}</strong> of <strong className="text-gray-900">{filteredReservations.length}</strong> reservations
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={safeCurrentPage === 1}
                          className="px-3 py-1.5 rounded-xl border border-purple-200 bg-white text-xs font-bold text-purple-700 hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                        >
                          <ChevronLeft size={14} />
                          <span>Previous</span>
                        </button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center justify-center ${
                                safeCurrentPage === pageNum
                                  ? 'bg-[#bd00ff] text-white shadow-sm'
                                  : 'bg-gray-100 text-gray-700 hover:bg-purple-100 hover:text-purple-900'
                              }`}
                            >
                              {pageNum}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={safeCurrentPage === totalPages}
                          className="px-3 py-1.5 rounded-xl border border-purple-200 bg-white text-xs font-bold text-purple-700 hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                        >
                          <span>Next</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
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

      {/* Enlarged GCash Receipt Modal for Cashier */}
      {showReceiptImageModal && selectedOrder?.receiptUrl && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowReceiptImageModal(false)}
        >
          <div 
            className="bg-white rounded-3xl p-5 max-w-xl w-full shadow-2xl border border-gray-100 flex flex-col items-center gap-3 relative animate-in zoom-in-95 duration-150 max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 text-[#005ce6] rounded-xl flex items-center justify-center font-black text-sm">
                  G
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900 m-0">GCash Receipt Verification View</h4>
                  <p className="text-[10px] text-gray-400 m-0">Order: {selectedOrder.referenceId} • Amount: ₱{selectedOrder.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptImageModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer border-none bg-transparent"
              >
                <X size={18} />
              </button>
            </div>

            <div className="w-full flex-1 overflow-auto flex items-center justify-center bg-gray-50 rounded-2xl p-2 max-h-[65vh]">
              <img
                src={selectedOrder.receiptUrl}
                alt="Submitted GCash Receipt Proof"
                className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-xs"
              />
            </div>

            <div className="flex items-center justify-between w-full pt-1 text-xs">
              <span className="font-semibold text-gray-600">
                Customer: {selectedOrder.user.name || 'Customer'}
              </span>
              <button
                type="button"
                onClick={() => setShowReceiptImageModal(false)}
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl font-bold cursor-pointer transition-colors border-none text-xs"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iPhone IMEI Prompt Modal */}
      {imeiModalTarget && (
        <CashierImeiPromptModal
          isOpen={Boolean(imeiModalTarget)}
          onClose={() => setImeiModalTarget(null)}
          purchaseId={imeiModalTarget.purchaseId}
          deviceName={imeiModalTarget.deviceName}
          referenceId={imeiModalTarget.referenceId}
          customerName={imeiModalTarget.customerName}
          branch={imeiModalTarget.branch}
          variations={imeiModalTarget.variations}
          quantity={imeiModalTarget.quantity}
          initialImei={imeiModalTarget.initialImei}
          onSaved={handleImeiSaved}
        />
      )}
    </div>
  );
}
