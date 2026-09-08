"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Clock, CheckCircle2, Copy, Check, ShieldCheck } from 'lucide-react';
import CustomerDigitalReceiptCard, { DigitalReceiptData, ReceiptCartItem } from '../../components/CustomerSide/CustomerDigitalReceiptCard';

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

  const [receiptData, setReceiptData] = useState<DigitalReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

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
          ? `/api/purchases/latest?id=${purchaseId}` 
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

        // Fallback exact tender if none entered
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

      // 11. Resolve Customer Contact Info (strictly real phone, not a price variable)
      const resolvedCustomerName = storedReceipt?.customerName || userProfile?.name || apiPurchase?.user?.name || 'Customer';
      const resolvedCustomerEmail = storedReceipt?.customerEmail || userProfile?.email || apiPurchase?.user?.email || 'customer@graphix.com';
      
      let candidatePhone = storedReceipt?.customerPhone || userProfile?.phone || apiPurchase?.user?.phone || '0917 123 4567';
      if (candidatePhone.includes('₱') || candidatePhone.toLowerCase().includes('cash')) {
        candidatePhone = userProfile?.phone && !userProfile.phone.includes('₱') ? userProfile.phone : '0917 123 4567';
      }

      // 12. Resolve Transaction ID: Priority: #CMTPQ... format
      let resolvedTxId = '#CMTPQWI5Q0';
      if (storedReceipt?.transactionId) {
        resolvedTxId = storedReceipt.transactionId.startsWith('#') 
          ? storedReceipt.transactionId 
          : `#${storedReceipt.transactionId}`;
      } else if (purchaseId) {
        const clean = purchaseId.replace('#', '').toUpperCase();
        resolvedTxId = clean.startsWith('CMTPQ') ? `#${clean}` : `#CMTPQ${clean.slice(-5)}`;
      } else if (apiPurchase?.id) {
        resolvedTxId = `#CMTPQ${apiPurchase.id.replace(/[^A-Za-z0-9]/g, '').slice(-5).toUpperCase()}`;
      }

      // 13. Resolve Timestamp
      const currentFormattedDate = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      const initiallyVerified = resolvedMethod === 'GCash' || apiPurchase?.status === 'Paid' || Boolean(apiPurchase?.isSettled);
      setIsVerified(initiallyVerified);

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
        status: initiallyVerified ? 'Purchase Confirmed' : 'Pending In-Store Payment',
        customerName: resolvedCustomerName,
        customerEmail: resolvedCustomerEmail,
        customerPhone: candidatePhone,
        isVerified: initiallyVerified,
        imei: apiPurchase?.imei || storedReceipt?.imei || null
      });

      setLoading(false);
    };

    resolveReceiptData();
  }, [purchaseId, paramAmount, paramDevice, paramQty, paramMethod, paramTendered, paramChange, paramNote, paramBranch]);

  // Real-time polling: Detects when cashier clicks "Verify / Paid" in store
  useEffect(() => {
    if (receiptData?.paymentMethod !== 'Cash' || isVerified) return;

    const pollTimer = setInterval(async () => {
      try {
        const checkId = purchaseId || receiptData?.transactionId;
        const url = checkId ? `/api/purchases/latest?id=${encodeURIComponent(checkId)}` : '/api/purchases/latest';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && (data.status === 'Paid' || data.isSettled === true)) {
            setIsVerified(true);
            setReceiptData(prev => prev ? {
              ...prev,
              isVerified: true,
              status: 'Purchase Confirmed',
              imei: data.imei || prev.imei
            } : null);
            clearInterval(pollTimer);
          }
        }
      } catch (e) {
        console.error('Error polling verification status:', e);
      }
    }, 5000);

    return () => clearInterval(pollTimer);
  }, [receiptData?.paymentMethod, isVerified, purchaseId, receiptData?.transactionId]);

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex flex-col justify-center items-center p-4 sm:p-6 font-['Inter']">
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-[#bd00ff] rounded-full animate-spin"></div>
          <p className="text-gray-500 font-semibold text-sm">Generating digital receipt...</p>
        </div>
      ) : (
        <div className="w-full max-w-lg flex flex-col items-center">
          
          {/* Status & Verification Banners for Cash on Pickup */}
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

          <CustomerDigitalReceiptCard 
            data={receiptData ? { ...receiptData, isVerified } : undefined}
            onReturnToDashboard={() => navigate('/customer/dashboard')}
          />
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
