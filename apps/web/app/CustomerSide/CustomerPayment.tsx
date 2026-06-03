"use client";

import { useState, useEffect, Suspense } from 'react';
import { ChevronLeft, Wifi, Coins, Smartphone, MessageSquare, QrCode, Lock } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

function CustomerPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deviceId = searchParams.get('deviceId');
  const variationIds = searchParams.get('variationIds');
  const cartItemIdsParam = searchParams.get('cartItemIds');
  const navigate = router.push;
  const [method, setMethod] = useState('cash');
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [selectedVariationsStr, setSelectedVariationsStr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGcashQr, setShowGcashQr] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [staffMessage, setStaffMessage] = useState('');
  const [phoneError, setPhoneError] = useState(false);

  useEffect(() => {
    const fetchTotal = async () => {
      try {
        if (cartItemIdsParam) {
          const ids = cartItemIdsParam.split(',');
          const res = await fetch('/api/cart');
          if (res.ok) {
            const cartItems = await res.json();
            const selectedItems = cartItems.filter((item: any) => ids.includes(item.id));
            const total = selectedItems.reduce((acc: number, item: any) => {
              const vars = item.variations ? JSON.parse(item.variations) : [];
              const price = vars.length > 0 ? vars.reduce((sum: number, v: any) => sum + (v.price || 0), 0) : item.device.price;
              return acc + (price * item.quantity);
            }, 0);
            setTotalPrice(total);
          }
        } else if (deviceId) {
          const res = await fetch(`/api/devices/${deviceId}`);
          if (res.ok) {
            const device = await res.json();
            if (variationIds && device.variations) {
              const selectedVarIds = variationIds.split(',');
              const vars = device.variations.filter((v: any) => selectedVarIds.includes(v.id));
              const varTotal = vars.reduce((acc: number, v: any) => acc + (v.price || 0), 0);
              setTotalPrice(varTotal > 0 ? varTotal : device.price);
              setSelectedVariationsStr(vars.length > 0 ? JSON.stringify(vars) : null);
            } else {
              setTotalPrice(device.price);
              setSelectedVariationsStr(null);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTotal();
  }, [deviceId, variationIds, cartItemIdsParam]);

  const [createdPurchaseId, setCreatedPurchaseId] = useState<string | null>(null);

  const handlePlaceOrder = async () => {
    if (method === 'cash' && !phoneNumber.trim()) {
      setPhoneError(true);
      return;
    }
    setPhoneError(false);

    let createdId = '';
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          amount: totalPrice,
          variations: selectedVariationsStr,
          cartItemIds: cartItemIdsParam ? cartItemIdsParam.split(',') : undefined,
          phoneNumber,
          staffMessage
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          createdId = data.id;
          setCreatedPurchaseId(data.id);
        }
      }
      window.dispatchEvent(new Event('cartUpdated')); // update badge if cart items were purchased
    } catch (err) {
      console.error('Failed to record purchase:', err);
    }

    if (method === 'gcash') {
      setShowGcashQr(true);
    } else {
      navigate(`/customer/purchase-confirmed?method=cash${createdId ? `&id=${createdId}` : ''}`);
    }
  };

  if (showGcashQr) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-[#f9fafb] to-[#f3f4f6] flex justify-center items-center p-4 sm:p-6 font-['Inter']">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 flex flex-col items-center gap-6">
          
          {/* Header */}
          <div className="w-full flex items-center justify-between border-b border-gray-100 pb-4">
            <button 
              onClick={() => setShowGcashQr(false)} 
              className="p-2 hover:bg-purple-50 rounded-full text-gray-500 hover:text-[#bd00ff] transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-extrabold text-gray-800 text-sm uppercase tracking-wider">GCash Checkout</span>
            <div className="w-9"></div>
          </div>

          {/* GCash Blue Card Mockup */}
          <div className="w-full bg-[#005ce6] rounded-2xl p-1 relative overflow-hidden flex flex-col shadow-lg">
            <div className="w-full h-full border border-white/20 rounded-xl flex flex-col items-center pt-5 pb-4 px-4 relative z-10 bg-gradient-to-b from-[#005ce6] to-[#004dc9]">
              {/* GCash Logo area */}
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                  <span className="text-[#005ce6] font-extrabold text-lg">G</span>
                </div>
                <span className="text-white text-2xl font-bold tracking-tight">GCash</span>
              </div>

              <span className="text-blue-100 text-[10px] font-semibold tracking-widest uppercase mb-4">Payment Accepted Here</span>

              {/* White QR Area */}
              <div className="bg-white w-full rounded-xl flex flex-col items-center p-5 shadow-inner mb-3">
                {/* Mock QR Placeholder */}
                <div className="w-36 h-36 bg-gray-50 rounded-lg border border-dashed border-blue-200 flex flex-col items-center justify-center relative overflow-hidden mb-3">
                  <div className="absolute inset-0 bg-blue-50/30 flex items-center justify-center">
                    <QrCode size={48} className="text-[#005ce6] animate-pulse" />
                  </div>
                </div>

                <div className="text-[#005ce6] font-extrabold text-sm">GRAPHIX MANAGEMENT</div>
                <div className="text-gray-400 text-xs mt-0.5">Official GCash Merchant Account</div>
              </div>

              {/* Amount Box */}
              <div className="w-full bg-blue-950/30 rounded-lg p-3 text-center mb-1">
                <span className="text-blue-200 text-[10px] uppercase font-bold tracking-wider">Amount to Pay</span>
                <div className="text-white font-extrabold text-2xl mt-0.5">
                  ₱{totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Simple Clean Instructions */}
          <div className="w-full flex flex-col gap-2.5 text-left bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Instructions:</h4>
            <ol className="text-xs text-gray-600 flex flex-col gap-2 list-decimal list-inside">
              <li>Open your GCash app and select <span className="font-bold text-gray-800">Scan QR</span>.</li>
              <li>Scan the merchant QR code above.</li>
              <li>Enter the exact amount of <span className="font-bold text-[#bd00ff]">₱{totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>.</li>
              <li>After transferring, tap the confirmation button below.</li>
            </ol>
          </div>

          <button
            onClick={() => navigate(`/customer/purchase-confirmed?method=gcash${createdPurchaseId ? `&id=${createdPurchaseId}` : ''}`)}
            className="w-full py-3.5 bg-gradient-to-r from-[#bd00ff] to-[#4B0082] text-white font-bold text-base rounded-xl border-none cursor-pointer shadow-[0_4px_15px_rgba(189,0,255,0.3)] hover:shadow-[0_6px_20px_rgba(189,0,255,0.5)] hover:-translate-y-0.5 transition-all text-center"
          >
            I Have Transferred Successfully
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#f9fafb] to-[#f3f4f6] flex justify-center items-center p-4 sm:p-6 font-['Inter']">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-purple-50 rounded-full text-gray-500 hover:text-[#bd00ff] transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-[#4B0082]">Secure Payment</h2>
            <p className="text-xs text-gray-400 mt-0.5">Complete your transaction safely</p>
          </div>
        </div>

        <form className="flex flex-col gap-6">

          <div className="flex flex-col gap-3">
            <label className="font-bold text-gray-700 text-sm tracking-wide">Select Payment Method</label>
            <div className="grid grid-cols-2 gap-3">

              <label className={`relative flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border-2 cursor-pointer transition-all ${method === 'cash' ? 'border-[#bd00ff] bg-purple-50/40 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                <input type="radio" name="payment" value="cash" checked={method === 'cash'} onChange={() => setMethod('cash')} className="absolute opacity-0" />
                <div className={`p-2.5 rounded-full ${method === 'cash' ? 'bg-[#bd00ff]/10 text-[#bd00ff]' : 'bg-gray-50 text-gray-400'}`}>
                  <Coins size={22} />
                </div>
                <span className="font-extrabold text-xs text-gray-800">Cash Payment</span>
              </label>

              <label className={`relative flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border-2 cursor-pointer transition-all ${method === 'gcash' ? 'border-[#bd00ff] bg-purple-50/40 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                <input type="radio" name="payment" value="gcash" checked={method === 'gcash'} onChange={() => setMethod('gcash')} className="absolute opacity-0" />
                <div className={`p-2.5 rounded-full ${method === 'gcash' ? 'bg-[#bd00ff]/10 text-[#bd00ff]' : 'bg-gray-50 text-gray-400'}`}>
                  <Smartphone size={22} />
                </div>
                <span className="font-extrabold text-xs text-gray-800">GCash Payment</span>
              </label>

            </div>
          </div>

          {method === 'cash' && (
            <div className="flex flex-col gap-2">
              <label className="font-bold text-gray-700 text-sm">Tendered Cash (Amount you have)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <span className="font-bold text-gray-700">₱</span>
                </div>
                <input
                  type="text"
                  placeholder="Enter cash amount"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (e.target.value.trim()) setPhoneError(false);
                  }}
                  className={`w-full pl-8 pr-4 py-3 border rounded-xl outline-none font-semibold text-gray-800 transition-all ${phoneError ? 'border-red-500 bg-red-50/20' : 'border-gray-200 focus:border-[#bd00ff] focus:ring-1 focus:ring-[#bd00ff]'}`}
                />
              </div>
              {phoneError && (
                <span className="text-red-500 text-xs font-bold mt-1">
                  Cash amount is required to place your order.
                </span>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-gray-700 text-sm">Message for Staff</label>
              <span className="text-[10px] text-gray-400 font-medium">Optional</span>
            </div>
            <div className="relative">
              <div className="absolute top-3 left-4 text-gray-400">
                <MessageSquare size={18} />
              </div>
              <textarea
                placeholder="E.g., Preferred delivery slot, instructions..."
                value={staffMessage}
                onChange={(e) => setStaffMessage(e.target.value)}
                rows={2}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl outline-none text-sm text-gray-800 focus:border-[#bd00ff] focus:ring-1 focus:ring-[#bd00ff] transition-all resize-none"
              />
            </div>
          </div>

          {/* Premium Total Card */}
          <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-4 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Total To Pay</span>
              <span className="text-[10px] text-gray-400 mt-0.5">All taxes included</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-[#bd00ff] tracking-tight">
                ₱{loading ? '...' : totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePlaceOrder}
            className="w-full py-3.5 mt-2 bg-gradient-to-r from-[#bd00ff] to-[#4B0082] text-white font-bold text-base rounded-xl border-none cursor-pointer shadow-[0_4px_15px_rgba(189,0,255,0.3)] hover:shadow-[0_6px_20px_rgba(189,0,255,0.5)] hover:-translate-y-0.5 transition-all uppercase tracking-wider"
          >
            Place Order
          </button>

        </form>
      </div>
    </div>
  );
}

export default function CustomerPayment() {
  return (
    <Suspense fallback={<div className="flex-1 flex justify-center items-center h-screen"><div className="w-12 h-12 border-4 border-purple-100 border-t-[#bd00ff] rounded-full animate-spin"></div></div>}>
      <CustomerPaymentContent />
    </Suspense>
  );
}
