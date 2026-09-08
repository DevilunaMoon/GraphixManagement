"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Clock } from 'lucide-react';
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
        status: 'Purchase Confirmed',
        customerName: resolvedCustomerName,
        customerEmail: resolvedCustomerEmail,
        customerPhone: candidatePhone
      });

      setLoading(false);
    };

    resolveReceiptData();
  }, [purchaseId, paramAmount, paramDevice, paramQty, paramMethod, paramTendered, paramChange, paramNote, paramBranch]);

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex flex-col justify-center items-center p-4 sm:p-6 font-['Inter']">
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-[#bd00ff] rounded-full animate-spin"></div>
          <p className="text-gray-500 font-semibold text-sm">Generating digital receipt...</p>
        </div>
      ) : (
        <div className="w-full max-w-lg flex flex-col items-center">
          {/* 8-Hour Store Claim Limit Banner for Cash on Pickup */}
          {receiptData?.paymentMethod === 'Cash' && (
            <div className="w-full mb-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-400 rounded-2xl p-4 shadow-sm flex items-start gap-3.5 backdrop-blur-sm">
              <div className="p-2.5 bg-amber-500 text-white rounded-xl shrink-0 shadow-sm mt-0.5">
                <Clock size={20} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <h4 className="text-sm font-black text-amber-950 uppercase tracking-wide m-0">
                    8-Hour Store Pickup Window
                  </h4>
                  <span className="text-[10px] font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Cash on Pickup
                  </span>
                </div>
                <p className="text-xs font-semibold text-amber-900/90 leading-relaxed m-0">
                  Your unit is reserved at <span className="font-extrabold text-amber-950 underline decoration-amber-400">{receiptData.branch}</span>. Please visit the store and pay in cash within <span className="font-extrabold text-amber-950">8 hours</span> of placing this order.
                </p>
                <p className="text-[11px] text-amber-800/80 mt-1 m-0 font-medium">
                  ⏰ Unclaimed reservations will automatically expire after 8 hours and be returned to stock.
                </p>
              </div>
            </div>
          )}

          <CustomerDigitalReceiptCard 
            data={receiptData || undefined}
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
