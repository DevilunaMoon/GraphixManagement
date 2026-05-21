"use client";

import { useState, useEffect, Suspense } from 'react';
import { ChevronLeft, Wifi } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Device {
  id: string;
  name: string;
  price: number;
  downpayment: string | null;
  asLowAs: string | null;
}

function CustomerDownpaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deviceId = searchParams.get('deviceId');
  const navigate = router.push;

  const [method, setMethod] = useState('cash');
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGcashQr, setShowGcashQr] = useState(false);
  const [staffMessage, setStaffMessage] = useState('');
  const [createdPurchaseId, setCreatedPurchaseId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDevice = async () => {
      if (!deviceId) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/devices/${deviceId}`);
        if (res.ok) {
          const data = await res.json();
          setDevice(data);
        }
      } catch (err) {
        console.error('Failed to fetch device details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDevice();
  }, [deviceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] flex justify-center items-center h-screen">
        <div className="w-12 h-12 border-4 border-purple-100 border-t-[#bd00ff] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] flex flex-col justify-center items-center p-6 gap-4">
        <p className="text-red-500 font-bold text-lg">Product not found.</p>
        <button onClick={() => router.back()} className="px-6 py-2.5 bg-[#bd00ff] text-white rounded-xl font-bold border-none cursor-pointer">
          Go Back
        </button>
      </div>
    );
  }

  // Math calculations
  const totalDevicePrice = device.price;
  const downpayment = device.downpayment ? parseFloat(device.downpayment) : (totalDevicePrice * 0.3); // 30% standard downpayment
  const asLowAs = device.asLowAs ? parseFloat(device.asLowAs) : ((totalDevicePrice - downpayment) / 12);

  const handlePlaceOrder = async () => {
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          deviceId, 
          paymentType: 'Downpayment',
          amount: downpayment,
          staffMessage
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          setCreatedPurchaseId(data.id);
          if (method === 'cash') {
            navigate(`/customer/downpayment-confirmed?method=cash&id=${data.id}`);
            return;
          }
        }
      }
    } catch (err) {
      console.error('Failed to record downpayment purchase:', err);
    }

    if (method === 'gcash') {
      setShowGcashQr(true);
    }
  };

  if (showGcashQr) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] flex justify-center items-center p-4 sm:p-6 font-['Inter']">
        <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-8 md:p-10 shadow-lg border border-gray-100 flex flex-col items-center gap-6 sm:gap-8">
          
          {/* Header */}
          <div className="w-full flex items-center justify-between border-b-2 border-gray-100 pb-4">
            <button 
              onClick={() => setShowGcashQr(false)} 
              className="text-gray-500 hover:text-[#bd00ff] transition-colors bg-transparent border-none cursor-pointer p-0"
            >
              <ChevronLeft size={24} />
            </button>
            <span className="font-extrabold text-gray-800 text-lg uppercase tracking-wider">GCash Checkout</span>
            <div className="w-6"></div>
          </div>

          {/* GCash Blue Card */}
          <div className="w-full max-w-[280px] aspect-[3/4] bg-[#0052e6] rounded-[2rem] p-6 shadow-xl flex flex-col items-center gap-6 text-center select-none relative overflow-hidden">
            {/* Top Logo */}
            <div className="flex items-center justify-center gap-1.5 text-white font-extrabold text-2xl mt-2">
              G<Wifi size={18} className="rotate-90 text-white" strokeWidth={3.5} />
            </div>
            
            {/* Instruction */}
            <div className="text-white/80 font-bold text-xs tracking-wider uppercase">Scan this QR to pay</div>
            
            {/* QR Wrapper */}
            <div className="w-36 h-36 bg-white rounded-2xl p-2.5 shadow-inner flex items-center justify-center">
              <img src="/gcash-qr.png" alt="GCash QR Code" className="w-full h-full object-contain" />
            </div>

            {/* Account Info */}
            <div className="flex flex-col gap-0.5">
              <div className="text-white font-extrabold text-sm tracking-wide">GRAPHIX MANAGEMENT</div>
              <div className="text-white/60 font-medium text-xs">09** *** ****</div>
            </div>

            {/* Bottom Text */}
            <div className="text-white font-bold tracking-widest text-lg mt-auto pb-1">
              SCAN TO PAY
            </div>
          </div>

          <button
            onClick={() => navigate(`/customer/downpayment-confirmed?method=gcash${createdPurchaseId ? `&id=${createdPurchaseId}` : ''}`)}
            className="w-full py-4 mt-2 bg-gradient-to-r from-[#bd00ff] to-[#4B0082] text-white font-bold text-lg rounded-xl border-none cursor-pointer shadow-lg hover:shadow-xl transition-all"
          >
            View Confirmed Receipt
          </button>
        </div>
      </div>
    );
  }

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
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-[#4B0082] m-0 border-none">Secure Downpayment</h2>
        </div>

        <form className="flex flex-col gap-6">
          
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
              value={staffMessage}
              onChange={(e) => setStaffMessage(e.target.value)}
              placeholder="Enter your message here" 
              rows={2}
              className="w-full border-2 border-gray-200 rounded-xl p-4 text-black outline-none font-['Inter'] resize-vertical focus:border-[#bd00ff] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-bold text-gray-700 text-lg">As Low as for 12 Months</label>
            <div className="flex items-center w-full px-5 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-black font-bold text-xl">
              <span className="text-gray-500 mr-2">₱</span>
              <span>{asLowAs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="flex justify-between items-center w-full border-2 border-gray-200 rounded-xl p-5 bg-white shadow-sm mt-2 flex-wrap gap-4">
            <span className="font-bold text-gray-600 text-lg uppercase tracking-wide">Downpayment Needed:</span>
            <div className="flex items-center text-[#bd00ff] font-extrabold text-3xl">
              <span className="text-2xl mr-1">₱</span>
              <span>{downpayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="flex justify-between items-center w-full border border-[#bd00ff] rounded-xl p-5 bg-purple-50 shadow-[0_4px_15px_rgba(189,0,255,0.1)] flex-wrap gap-4">
            <span className="font-bold text-black text-lg uppercase tracking-wide">Total Device Price:</span>
            <div className="flex items-center text-red-600 font-extrabold text-3xl">
              <span className="text-2xl mr-1">₱</span>
              <span>{totalDevicePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={handlePlaceOrder}
            className="w-full py-4 mt-4 bg-gradient-to-r from-[#bd00ff] to-[#4B0082] text-white font-bold text-xl rounded-xl border-none cursor-pointer shadow-[0_8px_20px_rgba(189,0,255,0.4)] hover:shadow-[0_8px_25px_rgba(189,0,255,0.6)] hover:-translate-y-1 transition-all"
          >
            Place Order
          </button>

        </form>
      </div>
    </div>
  );
}

export default function CustomerDownpayment() {
  return (
    <Suspense fallback={<div className="flex-1 flex justify-center items-center h-screen"><div className="w-12 h-12 border-4 border-purple-100 border-t-[#bd00ff] rounded-full animate-spin"></div></div>}>
      <CustomerDownpaymentContent />
    </Suspense>
  );
}
