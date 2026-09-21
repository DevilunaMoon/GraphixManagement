"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Clock, CheckCircle2, Copy, Check, ShieldCheck, AlertCircle, Eye, ZoomIn, X, MapPin, Receipt, ArrowRight, RefreshCw } from 'lucide-react';
import CustomerDigitalReceiptCard, { DigitalReceiptData, ReceiptCartItem } from '../../components/CustomerSide/CustomerDigitalReceiptCard';
import { formatDisplayInvoiceId, getBranchCode } from '../../lib/invoice';

function CustomerPurchaseConfirmedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const navigate = router.push;

  const paramMethod = searchParams.get('method') || 'Cash';
  const purchaseId = searchParams.get('id');
  const paramAmount = searchParams.get('amount');
  const paramDevice = searchParams.get('device');
  const paramQty = searchParams.get('qty');
  const paramTendered = searchParams.get('tendered');
  const paramChange = searchParams.get('change');
  const paramNote = searchParams.get('note');
  const paramBranch = searchParams.get('branch');
  const paramReceiptUrl = searchParams.get('receiptUrl');
  const paramStatus = searchParams.get('status');

  const [receiptData, setReceiptData] = useState<(DigitalReceiptData & { receiptUrl?: string | null; rejectionReason?: string | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);

  useEffect(() => {
    const resolveReceiptData = async () => {
      // 1. Try reading from sessionStorage (recorded right at checkout in Secure Payment screen)
      let storedReceipt: any = null;
      try {
        const storedStr = sessionStorage.getItem('graphix_last_checkout');
        if (storedStr) {
          storedReceipt = JSON.parse(storedStr);
        }
      } catch (err) {
        console.error('Failed reading checkout session:', err);
      }

      // 2. Fetch customer profile to get real customer contact number, email, and name
      let userProfile: any = null;
      try {
        const pRes = await fetch('/api/profile');
        if (pRes.ok) {
          userProfile = await pRes.json();
        }
      } catch (err) {
        console.warn('Profile fetch warning:', err);
      }

      // 3. Try fetching the latest purchase from API if purchaseId or session is available
      let apiPurchase: any = null;
      try {
        const url = purchaseId 
          ? `/api/purchases/latest?id=${encodeURIComponent(purchaseId)}` 
          : '/api/purchases/latest';
        const res = await fetch(url);
        if (res.ok) {
          apiPurchase = await res.json();
        }
      } catch (err) {
        console.warn('API purchase fetch warning:', err);
      }

      // 4. Resolve Amount: Priority: stored -> url param -> API -> Default 28998.00
      let resolvedAmount = 28998.00;
      if (storedReceipt?.totalAmount && storedReceipt.totalAmount > 0) {
        resolvedAmount = storedReceipt.totalAmount;
      } else if (paramAmount && !isNaN(parseFloat(paramAmount))) {
        resolvedAmount = parseFloat(paramAmount);
      } else if (apiPurchase?.amount && apiPurchase.amount > 0) {
        resolvedAmount = apiPurchase.amount;
      }

      // 5. Resolve Device & Quantity: Priority: stored -> url param -> API -> Default 'Vivo Y31d'
      let resolvedDevice = 'Vivo Y31d';
      let resolvedQty = 1;
      if (storedReceipt?.deviceName) {
        resolvedDevice = storedReceipt.deviceName;
        resolvedQty = storedReceipt.quantity || 1;
      } else if (paramDevice) {
        resolvedDevice = paramDevice;
        resolvedQty = paramQty ? parseInt(paramQty, 10) || 1 : 1;
      } else if (apiPurchase?.device?.name) {
        resolvedDevice = apiPurchase.device.name;
        resolvedQty = apiPurchase.quantity || 1;
      }

      // 6. Resolve Cart Items: Strictly dynamic from cart session or active purchase
      let resolvedItems: ReceiptCartItem[] = [];
      if (storedReceipt?.items && Array.isArray(storedReceipt.items) && storedReceipt.items.length > 0) {
        resolvedItems = storedReceipt.items;
      } else if (apiPurchase?.device) {
        let varStr = '';
        if (apiPurchase.variations) {
          try {
            const parsed = JSON.parse(apiPurchase.variations);
            varStr = Array.isArray(parsed) 
              ? parsed.map((v: any) => v.name || v.value).join(', ')
              : String(apiPurchase.variations);
          } catch (e) {
            varStr = String(apiPurchase.variations);
          }
        }
        resolvedItems = [
          {
            name: apiPurchase.device.name || resolvedDevice,
            quantity: apiPurchase.quantity || resolvedQty,
            unitPrice: resolvedAmount / (apiPurchase.quantity || 1),
            total: resolvedAmount,
            variations: varStr || 'Standard'
          }
        ];
      } else {
        resolvedItems = [
          {
            name: resolvedDevice,
            quantity: resolvedQty,
            unitPrice: resolvedAmount,
            total: resolvedAmount,
            variations: 'Black, 128GB'
          }
        ];
      }

      // 7. Resolve Branch: Priority: stored -> url param -> user profile -> Default 'Tagoloan Branch'
      let resolvedBranch = storedReceipt?.branch || paramBranch || userProfile?.branch || 'Tagoloan Branch';
      if (!resolvedBranch.toLowerCase().includes('branch')) {
        resolvedBranch = `${resolvedBranch} Branch`;
      }

      // 8. Resolve Payment Method
      let resolvedMethod: 'Cash' | 'GCash' = 'Cash';
      if (storedReceipt?.paymentMethod) {
        resolvedMethod = storedReceipt.paymentMethod.toLowerCase().includes('gcash') ? 'GCash' : 'Cash';
      } else if (paramMethod.toLowerCase().includes('gcash')) {
        resolvedMethod = 'GCash';
      } else if (apiPurchase?.paymentType?.toLowerCase().includes('gcash')) {
        resolvedMethod = 'GCash';
      }

      // 9. Resolve Tendered Cash & Change
      let resolvedTendered: number | null = null;
      let resolvedChange: number | null = null;

      if (resolvedMethod === 'Cash') {
        if (storedReceipt?.tenderedCash !== undefined && storedReceipt.tenderedCash !== null) {
          const tVal = Number(storedReceipt.tenderedCash);
          resolvedTendered = tVal;
          resolvedChange = storedReceipt.change !== undefined ? Number(storedReceipt.change) : Math.max(0, tVal - resolvedAmount);
        } else if (paramTendered && !isNaN(parseFloat(paramTendered))) {
          const tVal = parseFloat(paramTendered);
          resolvedTendered = tVal;
          resolvedChange = paramChange ? parseFloat(paramChange) : Math.max(0, tVal - resolvedAmount);
        }

        if (resolvedTendered === null) {
          resolvedTendered = resolvedAmount;
          resolvedChange = 0;
        }
      }

      // 10. Resolve Order Note / Message for Staff
      let resolvedNote: string | null = null;
      if (storedReceipt?.staffMessage) {
        resolvedNote = storedReceipt.staffMessage;
      } else if (paramNote) {
        resolvedNote = paramNote;
      }

      // 11. Resolve Customer Contact Info
      const resolvedCustomerName = storedReceipt?.customerName || userProfile?.name || apiPurchase?.user?.name || 'Customer';
      const resolvedCustomerEmail = storedReceipt?.customerEmail || userProfile?.email || apiPurchase?.user?.email || 'customer@graphix.com';
      
      let candidatePhone = storedReceipt?.customerPhone || userProfile?.phone || apiPurchase?.user?.phone || '0917 123 4567';
      if (candidatePhone.includes('₱') || candidatePhone.toLowerCase().includes('cash')) {
        candidatePhone = userProfile?.phone && !userProfile.phone.includes('₱') ? userProfile.phone : '0917 123 4567';
      }

      // 12. Resolve Transaction ID
      let resolvedTxId = formatDisplayInvoiceId(
        storedReceipt?.transactionId || apiPurchase?.referenceId || apiPurchase?.id || purchaseId,
        resolvedBranch
      );

      // 13. Resolve Receipt URL & Verification Status
      const resolvedReceiptUrl = storedReceipt?.receiptUrl || apiPurchase?.receiptUrl || paramReceiptUrl || null;
      const currentStatus = apiPurchase?.status || storedReceipt?.status || paramStatus || (resolvedMethod === 'GCash' ? 'For Verification' : 'Pending Pickup');

      const verified = currentStatus === 'Paid' || (apiPurchase && apiPurchase.isSettled === true);
      const rejected = currentStatus === 'Rejected';

      setIsVerified(verified);
      setIsRejected(rejected);
      if (rejected) {
        setRejectionReason(apiPurchase?.staffMessage?.includes('Rejection Reason:') ? apiPurchase.staffMessage.split('Rejection Reason:')[1]?.trim() : 'Payment proof could not be verified by cashier.');
      }

      // 14. Resolve Timestamp
      const currentFormattedDate = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      setReceiptData({
        totalAmount: resolvedAmount,
        deviceName: resolvedDevice,
        quantity: resolvedQty,
        items: resolvedItems,
        branch: resolvedBranch,
        paymentMethod: resolvedMethod,
        tenderedCash: resolvedTendered,
        changeAmount: resolvedChange,
        orderNote: resolvedNote,
        transactionId: resolvedTxId,
        timestamp: storedReceipt?.timestamp || currentFormattedDate,
        status: verified ? 'Purchase Confirmed' : (rejected ? 'Payment Rejected' : (resolvedMethod === 'GCash' ? 'For Verification' : 'Pending In-Store Payment')),
        customerName: resolvedCustomerName,
        customerEmail: resolvedCustomerEmail,
        customerPhone: candidatePhone,
        isVerified: verified,
        receiptUrl: resolvedReceiptUrl,
        rejectionReason: rejected ? (apiPurchase?.staffMessage || null) : null,
        imei: apiPurchase?.imei || storedReceipt?.imei || null
      });

      setLoading(false);
    };

    resolveReceiptData();
  }, [purchaseId, paramAmount, paramDevice, paramQty, paramMethod, paramTendered, paramChange, paramNote, paramBranch, paramReceiptUrl, paramStatus]);

  // Real-time polling: Detects when cashier clicks "Verify / Paid" or "Reject" in store
  useEffect(() => {
    if (isVerified || isRejected) return;

    const pollTimer = setInterval(async () => {
      try {
        const checkId = purchaseId || receiptData?.transactionId;
        const url = checkId ? `/api/purchases/latest?id=${encodeURIComponent(checkId)}` : '/api/purchases/latest';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            if (data.status === 'Paid' || data.isSettled === true) {
              setIsVerified(true);
              setIsRejected(false);
              setReceiptData(prev => prev ? {
                ...prev,
                isVerified: true,
                status: 'Purchase Confirmed',
                imei: data.imei || prev.imei
              } : null);
              clearInterval(pollTimer);
            } else if (data.status === 'Rejected') {
              setIsRejected(true);
              setIsVerified(false);
              const reason = data.staffMessage?.includes('Rejection Reason:') 
                ? data.staffMessage.split('Rejection Reason:')[1]?.trim() 
                : 'Payment receipt could not be verified by cashier.';
              setRejectionReason(reason);
              setReceiptData(prev => prev ? {
                ...prev,
                isVerified: false,
                status: 'Payment Rejected',
                rejectionReason: reason
              } : null);
              clearInterval(pollTimer);
            }
          }
        }
      } catch (e) {
        console.error('Error polling verification status:', e);
      }
    }, 4000);

    return () => clearInterval(pollTimer);
  }, [isVerified, isRejected, purchaseId, receiptData?.transactionId]);

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex flex-col justify-center items-center p-4 sm:p-6 font-['Inter']">
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-[#bd00ff] rounded-full animate-spin"></div>
          <p className="text-gray-500 font-semibold text-sm">Loading order status & receipt details...</p>
        </div>
      ) : (
        <div className="w-full max-w-lg flex flex-col items-center">
          
          {/* ========================================================================= */}
          {/* 1. GCASH PAYMENT STATUS BANNERS */}
          {/* ========================================================================= */}
          {receiptData?.paymentMethod === 'GCash' && (
            isVerified ? (
              /* Verified Banner (Ready for Pickup) */
              <div className="w-full mb-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-emerald-500 text-white rounded-xl shrink-0 shadow-sm mt-0.5">
                    <CheckCircle2 size={24} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <h4 className="text-base font-black text-emerald-950 uppercase tracking-wide m-0">
                        Payment Verified
                      </h4>
                      <span className="text-[10px] font-black bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Ready for Pickup
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-emerald-900/90 leading-relaxed m-0">
                      Your GCash payment has been verified successfully. Your official Graphix Store receipt is now available below. You may now pick up your order at <span className="font-extrabold text-emerald-950 underline">{receiptData.branch}</span>.
                    </p>
                  </div>
                </div>

                {/* Status Badges Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 text-center">
                  <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-gray-500 font-bold block">Payment</span>
                    <span className="text-xs font-black text-emerald-700">Verified</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-gray-500 font-bold block">Receipt</span>
                    <span className="text-xs font-black text-emerald-700">Available</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-gray-500 font-bold block">Order Status</span>
                    <span className="text-xs font-black text-emerald-700">Ready for Pickup</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-gray-500 font-bold block">Pickup Branch</span>
                    <span className="text-xs font-black text-purple-700 truncate block">{receiptData.branch}</span>
                  </div>
                </div>
              </div>
            ) : isRejected ? (
              /* Rejected Banner */
              <div className="w-full mb-4 bg-rose-50 border-2 border-rose-400 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-rose-500 text-white rounded-xl shrink-0 shadow-sm mt-0.5">
                    <AlertCircle size={24} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <h4 className="text-base font-black text-rose-950 uppercase tracking-wide m-0">
                        GCash Payment Could Not Be Verified
                      </h4>
                      <span className="text-[10px] font-black bg-rose-200 text-rose-900 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Payment Rejected
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-rose-900/90 leading-relaxed m-0">
                      Your submitted payment receipt could not be verified by the cashier. Please review your payment details and submit a valid receipt.
                    </p>
                    {rejectionReason && (
                      <div className="mt-2 p-2.5 bg-white/90 border border-rose-200 rounded-xl text-xs font-bold text-rose-800">
                        Reason: {rejectionReason}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-rose-200/60">
                  <button
                    type="button"
                    onClick={() => navigate('/customer/payment')}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border-none shadow-xs"
                  >
                    Resubmit Payment Proof
                  </button>
                </div>
              </div>
            ) : (
              /* For Verification (Waiting for Cashier) */
              <div className="w-full mb-4 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/10 border-2 border-blue-400 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col gap-3.5 backdrop-blur-sm animate-in fade-in duration-200">
                {/* Header */}
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-[#005ce6] text-white rounded-xl shrink-0 shadow-sm mt-0.5">
                    <Clock size={22} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <h4 className="text-sm font-black text-blue-950 uppercase tracking-wide m-0">
                        Payment Verification
                      </h4>
                      <span className="text-[10px] font-black bg-blue-200 text-blue-900 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
                        For Verification
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-blue-900 leading-relaxed m-0">
                      <strong>Payment Submitted:</strong> Your GCash payment receipt has been submitted successfully. Please wait while our <strong>{receiptData.branch}</strong> cashier verifies your payment proof.
                    </p>
                  </div>
                </div>

                {/* Claim Code & Uploaded Proof Preview */}
                <div className="bg-white/95 border border-blue-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                  <div className="text-center sm:text-left">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Order Reference / Claim Code:
                    </span>
                    <span className="font-mono font-black text-lg text-purple-700 tracking-wider">
                      {receiptData.transactionId}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {receiptData.receiptUrl && (
                      <button
                        type="button"
                        onClick={() => setShowProofModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#005ce6] rounded-xl text-xs font-bold border border-blue-200 transition-all cursor-pointer shadow-2xs"
                      >
                        <Eye size={14} />
                        <span>View GCash Receipt Proof</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (receiptData.transactionId) {
                          navigator.clipboard.writeText(receiptData.transactionId);
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2000);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#bd00ff] rounded-xl text-xs font-bold border border-purple-200 transition-all cursor-pointer shadow-2xs"
                    >
                      {copiedCode ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                      <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>
                </div>

                {/* Notice that official receipt unlocks after verification */}
                <div className="bg-blue-100/70 border border-blue-200/70 rounded-xl px-3.5 py-2.5 text-[11px] text-blue-950 font-medium leading-relaxed">
                  🛡️ <strong>Official Graphix Store Receipt:</strong> Your uploaded GCash screenshot is submitted as proof of payment. Once verified by the cashier, your official <strong>Graphix Store Sales Receipt</strong> will be automatically issued and your order will become <strong>Ready for Pickup</strong>.
                </div>
              </div>
            )
          )}

          {/* ========================================================================= */}
          {/* 2. CASH ON PICKUP BANNERS */}
          {/* ========================================================================= */}
          {receiptData?.paymentMethod === 'Cash' && (
            isVerified ? (
              /* Verified Banner */
              <div className="w-full mb-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 shadow-sm flex items-start gap-3.5 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-2.5 bg-emerald-500 text-white rounded-xl shrink-0 shadow-sm mt-0.5">
                  <CheckCircle2 size={22} strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <h4 className="text-sm font-black text-emerald-950 uppercase tracking-wide m-0">
                      Payment Verified by Cashier
                    </h4>
                    <span className="text-[10px] font-black bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      VERIFIED PAID
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-emerald-900/90 leading-relaxed m-0">
                    Your in-store cash payment at <span className="font-extrabold text-emerald-950">{receiptData.branch}</span> has been confirmed. Your official 80mm PDF sales receipt is now completely unlocked!
                  </p>
                </div>
              </div>
            ) : (
              /* Unverified Claim Voucher Card */
              <div className="w-full mb-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-400 rounded-2xl p-4 shadow-sm flex flex-col gap-3 backdrop-blur-sm">
                
                {/* Header row */}
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-amber-500 text-white rounded-xl shrink-0 shadow-sm mt-0.5">
                    <Clock size={20} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-0.5">
                      <h4 className="text-sm font-black text-amber-950 uppercase tracking-wide m-0">
                        8-Hour Store Pickup Window
                      </h4>
                      <span className="text-[10px] font-black bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Pending Cashier Verification
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-amber-900/90 leading-relaxed m-0">
                      Reserved at <span className="font-extrabold text-amber-950 underline decoration-amber-400">{receiptData.branch}</span>. Please visit the store and pay in cash within <span className="font-extrabold text-amber-950">8 hours</span>.
                    </p>
                  </div>
                </div>

                {/* Claim Code Badge & Offline Instructions */}
                <div className="bg-white/95 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                  <div className="text-center sm:text-left">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Your In-Store Claim Code:
                    </span>
                    <span className="font-mono font-black text-lg text-purple-700 tracking-wider">
                      {receiptData.transactionId}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (receiptData.transactionId) {
                        navigator.clipboard.writeText(receiptData.transactionId);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#bd00ff] rounded-xl text-xs font-bold border border-purple-200 transition-all cursor-pointer shadow-2xs"
                  >
                    {copiedCode ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>

                {/* No-Internet Reminder */}
                <div className="bg-amber-100/70 rounded-xl px-3 py-2 text-[11px] text-amber-950 font-medium leading-relaxed">
                  💡 <strong>No WiFi or mobile load at the store?</strong> Don't worry! You can simply give the cashier your <strong>Name ({receiptData.customerName})</strong> or <strong>Phone ({receiptData.customerPhone})</strong>. Once the cashier receives your cash, your official PDF receipt unlocks automatically!
                </div>
              </div>
            )
          )}

          {/* ========================================================================= */}
          {/* 3. OFFICIAL GRAPHIX STORE DIGITAL RECEIPT CARD */}
          {/* ========================================================================= */}
          <CustomerDigitalReceiptCard 
            data={receiptData ? { ...receiptData, isVerified } : undefined}
            onReturnToDashboard={() => navigate('/customer/dashboard')}
          />
        </div>
      )}

      {/* Enlarged Uploaded GCash Receipt Proof Modal */}
      {showProofModal && receiptData?.receiptUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowProofModal(false)}
        >
          <div 
            className="bg-white rounded-3xl p-5 max-w-lg w-full shadow-2xl border border-gray-100 flex flex-col items-center gap-3.5 relative animate-in zoom-in-95 duration-200 max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-100 text-[#005ce6] rounded-lg flex items-center justify-center font-black text-xs">
                  <Receipt size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 m-0">Submitted GCash Payment Proof</h3>
                  <p className="text-[10px] text-gray-400 m-0">Uploaded receipt for Cashier verification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProofModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer border-none bg-transparent"
              >
                <X size={18} />
              </button>
            </div>

            <div className="w-full flex-1 overflow-auto flex items-center justify-center bg-gray-50 rounded-2xl p-2 max-h-[65vh]">
              <img
                src={receiptData.receiptUrl}
                alt="Submitted GCash Receipt"
                className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-xs"
              />
            </div>

            <div className="flex items-center justify-between w-full pt-1 text-xs">
              <span className="font-semibold text-gray-600 truncate">
                Order {receiptData.transactionId}
              </span>
              <button
                type="button"
                onClick={() => setShowProofModal(false)}
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl font-bold cursor-pointer transition-colors border-none text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerPurchaseConfirmed() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f4f5f7] flex justify-center items-center p-6 font-['Inter']">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-[#bd00ff] rounded-full animate-spin"></div>
      </div>
    }>
      <CustomerPurchaseConfirmedContent />
    </Suspense>
  );
}
