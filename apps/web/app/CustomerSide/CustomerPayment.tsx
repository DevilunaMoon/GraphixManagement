"use client";

import { useState, Suspense } from 'react';
import { ChevronLeft, Wifi } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

function CustomerPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deviceId = searchParams.get('deviceId');
  const navigate = router.push;
  const [method, setMethod] = useState('cash');

  const handlePlaceOrder = async () => {
    if (deviceId) {
      try {
        await fetch('/api/purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId })
        });
      } catch (err) {
        console.error('Failed to record purchase:', err);
      }
    }
    navigate('/customer/purchase-confirmed');
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex justify-center items-center p-6 font-['Inter']">
      <div className="w-full max-w-lg bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-gray-100 flex flex-col gap-8">
        
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
            <label className="font-bold text-gray-700 text-lg">Message for Staff</label>
            <textarea 
              placeholder="Enter your message here" 
              rows={3}
              className="w-full border-2 border-gray-200 rounded-xl p-4 text-black outline-none font-['Inter'] resize-vertical focus:border-[#bd00ff] transition-colors"
            />
          </div>

          <div className="flex flex-col justify-center items-center w-full border border-[#bd00ff] rounded-2xl p-6 bg-purple-50 shadow-[0_4px_15px_rgba(189,0,255,0.1)] mt-2 border-dashed border-2">
            <span className="font-bold text-black text-xl uppercase tracking-widest mb-2 opacity-80">Total To Pay</span>
            <div className="flex items-center text-red-600 font-extrabold text-5xl tracking-tight">
              <span className="text-3xl mr-2 -mt-2">₱</span>
              <span>10,000.00</span>
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
