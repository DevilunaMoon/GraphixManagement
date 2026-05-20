"use client";

import { useState, useEffect, Suspense } from 'react';
import { ChevronLeft, Wifi } from 'lucide-react';
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
            } else {
              setTotalPrice(device.price);
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

  const handlePlaceOrder = async () => {
    if (!phoneNumber.trim()) {
      setPhoneError(true);
      return;
    }
    setPhoneError(false);

    try {
      await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          variationIds,
          cartItemIds: cartItemIdsParam ? cartItemIdsParam.split(',') : undefined,
          phoneNumber,
          staffMessage
        })
      });
      window.dispatchEvent(new Event('cartUpdated')); // update badge if cart items were purchased
    } catch (err) {
      console.error('Failed to record purchase:', err);
    }

    if (method === 'gcash') {
      setShowGcashQr(true);
    } else {
      navigate('/customer/purchase-confirmed');
    }
  };

  if (showGcashQr) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] flex justify-center items-center p-4 sm:p-6 font-['Inter']">
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100 flex flex-col items-center gap-6">

          {/* GCash QR Card */}
          <div className="w-full bg-[#005ce6] rounded-xl p-1 relative overflow-hidden flex flex-col shadow-md">
            {/* Outer thin border wrapper */}
            <div className="w-full h-full border border-white/40 rounded-lg flex flex-col items-center pt-6 pb-4 px-4 relative z-10">

              {/* GCash Logo area */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <div className="text-[#005ce6] font-bold text-2xl tracking-tighter -ml-1">G<Wifi size={14} className="rotate-90 inline-block -ml-1" strokeWidth={4} /></div>
                </div>
                <span className="text-white text-3xl font-bold tracking-tight">GCash</span>
              </div>

              <span className="text-white text-xs font-medium tracking-wide mb-3 uppercase">Payment Accepted Here</span>

              <div className="bg-[#0047b3] text-white text-sm font-semibold px-6 py-1.5 rounded-full mb-4 w-[85%] text-center shadow-inner">
                Graphix Store
              </div>

              {/* White QR Area */}
              <div className="bg-white w-full rounded-2xl flex flex-col items-center pt-6 pb-4 px-4 shadow-lg mb-4 relative overflow-hidden">
                {/* Mock QR Placeholder */}
                <div className="w-40 h-40 bg-[#f0f4f8] rounded-xl border-2 border-dashed border-blue-300 flex flex-col items-center justify-center relative overflow-hidden mb-4">
                  <div className="absolute bottom-0 w-full h-1/3 bg-[#85b022] opacity-80 rounded-b-xl"></div>
                  <div className="absolute bottom-0 w-full h-1/4 bg-[#6c8f1c] rounded-b-xl" style={{ borderTopLeftRadius: '50%', borderTopRightRadius: '20%' }}></div>
                  <div className="z-10 text-center flex flex-col font-black text-xl text-[#005ce6] tracking-tight leading-tight uppercase px-4 drop-shadow-md">
                    <span>Insert</span>
                    <span>QR Code</span>
                    <span className="text-[#ffd700]">Here !!</span>
                  </div>
                </div>

                <div className="text-[#005ce6] font-semibold text-sm mb-0.5">Graphix Management</div>
                <div className="text-gray-500 font-medium text-sm">09** *** ****</div>
              </div>

              {/* Bottom text */}
              <div className="text-white font-bold tracking-widest text-lg mt-auto pb-1">
                SCAN TO PAY
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full py-4 mt-2 bg-[#4B0082] hover:bg-[#380066] text-white font-bold text-lg rounded-xl border-none cursor-pointer shadow-lg hover:shadow-xl transition-all"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex justify-center items-center p-4 sm:p-6 font-['Inter']">
      <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-8 md:p-10 shadow-lg border border-gray-100 flex flex-col gap-6 sm:gap-8">

        {/* Header */}
        <div className="flex items-center gap-4 border-b-2 border-gray-100 pb-4">
          <button
            onClick={() => router.back()}
            className="text-[#bd00ff] hover:text-[#9c00d6] hover:-translate-x-1 transition-all bg-transparent border-none cursor-pointer p-0"
          >
            <ChevronLeft size={32} />
          </button>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-[#4B0082] m-0 border-none">Secure Payment</h2>
        </div>

        <form className="flex flex-col gap-8">

          <div className="flex flex-col gap-3">
            <label className="font-bold text-gray-700 text-lg">Select Payment Method</label>
            <div className="grid grid-cols-2 gap-4">

              <label className={`relative flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-colors ${method === 'cash' ? 'border-[#bd00ff] bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <input type="radio" name="payment" value="cash" checked={method === 'cash'} onChange={() => setMethod('cash')} className="absolute opacity-0" />
                <span className="text-4xl text-yellow-400 font-bold tracking-tighter">₱</span>
                <span className="font-bold text-sm text-center text-black">On Cash Payment</span>
              </label>

              <label className={`relative flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-colors ${method === 'gcash' ? 'border-[#bd00ff] bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <input type="radio" name="payment" value="gcash" checked={method === 'gcash'} onChange={() => setMethod('gcash')} className="absolute opacity-0" />
                <div className="text-blue-500 font-extrabold text-3xl flex items-center justify-center">
                  G<Wifi size={20} className="rotate-90 ml-0.5" strokeWidth={4} />
                </div>
                <span className="font-bold text-sm text-center text-black">G-Cash Payment</span>
              </label>

            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-bold text-gray-700 text-lg">Input the amount of money you have </label>
            <input
              type="text"
              placeholder={method === 'gcash' ? "Enter your GCash number (e.g., 0917xxxxxxx)" : "Enter the amount of money you have"}
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                if (e.target.value.trim()) setPhoneError(false);
              }}
              className={`w-full border-2 rounded-xl p-4 text-black outline-none font-['Inter'] transition-colors ${phoneError ? 'border-red-500 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-[#bd00ff]'}`}
            />
            {phoneError && (
              <span className="text-red-600 text-sm font-semibold mt-1">
                {method === 'gcash' ? "GCash number is required to place your order." : "Amount of money is required to place your order."}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-bold text-gray-700 text-lg">Message for Staff</label>
            <textarea
              placeholder="Enter your message here"
              value={staffMessage}
              onChange={(e) => setStaffMessage(e.target.value)}
              rows={1}
              className="w-full border-2 border-gray-200 rounded-xl p-2.5 px-3.5 text-black outline-none font-['Inter'] resize-none focus:border-[#bd00ff] transition-colors"
            />
          </div>

          <div className="flex flex-col justify-center items-center w-full border-dashed border-2 border-[#bd00ff] rounded-2xl p-4 sm:p-6 bg-purple-50 shadow-[0_4px_15px_rgba(189,0,255,0.1)] mt-2">
            <span className="font-bold text-black text-lg sm:text-xl uppercase tracking-widest mb-1 sm:mb-2 opacity-80 text-center">Total To Pay</span>
            <div className="flex items-center justify-center flex-wrap text-red-600 font-extrabold text-4xl sm:text-5xl tracking-tight text-center px-2 w-full">
              <span className="text-2xl sm:text-3xl mr-1 sm:mr-2">₱</span>
              <span className="truncate max-w-full">{loading ? '...' : totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePlaceOrder}
            className="w-full py-4 mt-2 bg-gradient-to-r from-[#bd00ff] to-[#4B0082] text-white font-bold text-xl rounded-xl border-none cursor-pointer shadow-[0_8px_20px_rgba(189,0,255,0.4)] hover:shadow-[0_8px_25px_rgba(189,0,255,0.6)] hover:-translate-y-1 transition-all uppercase tracking-wider"
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
