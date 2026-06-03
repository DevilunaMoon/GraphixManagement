"use client";

import { useState, useEffect, Suspense } from 'react';
import { ChevronLeft, Wifi, Coins, Smartphone, MessageSquare, QrCode, Lock } from 'lucide-react';
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
            <span className="font-extrabold text-gray-800 text-sm uppercase tracking-wider">GCash Downpayment</span>
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
              <div className="w-full bg-blue-955/30 rounded-lg p-3 text-center mb-1">
                <span className="text-blue-200 text-[10px] uppercase font-bold tracking-wider">Downpayment Required</span>
                <div className="text-white font-extrabold text-2xl mt-0.5">
                  ₱{downpayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              <li>Enter the exact amount of <span className="font-bold text-[#bd00ff]">₱{downpayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>.</li>
              <li>After transferring, tap the confirmation button below.</li>
            </ol>
          </div>

          <button
            onClick={() => navigate(`/customer/downpayment-confirmed?method=gcash${createdPurchaseId ? `&id=${createdPurchaseId}` : ''}`)}
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
            <h2 className="text-xl font-extrabold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-[#4B0082]">Secure Downpayment</h2>
            <p className="text-xs text-gray-400 mt-0.5">Initialize your installment plan safely</p>
          </div>
        </div>

        <form className="flex flex-col gap-5">
          
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
                value={staffMessage}
                onChange={(e) => setStaffMessage(e.target.value)}
                placeholder="E.g., Preferred downpayment timing, other notes..." 
                rows={2}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl outline-none text-sm text-gray-800 focus:border-[#bd00ff] focus:ring-1 focus:ring-[#bd00ff] transition-all resize-none"
              />
            </div>
          </div>

          {/* Premium Info Lists */}
          <div className="flex flex-col gap-3 bg-gray-50/80 border border-gray-100 rounded-xl p-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-gray-500 uppercase tracking-wider">As Low As:</span>
              <span className="font-extrabold text-gray-800">₱{asLowAs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo</span>
            </div>
            
            <div className="border-t border-dashed border-gray-200 my-0.5"></div>

            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-gray-500 uppercase tracking-wider">Total Device Price:</span>
              <span className="font-extrabold text-gray-800">₱{totalDevicePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div className="border-t border-dashed border-gray-200 my-0.5"></div>

            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Downpayment Needed:</span>
              <span className="font-black text-xl text-[#bd00ff]">₱{downpayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={handlePlaceOrder}
            className="w-full py-3.5 mt-2 bg-gradient-to-r from-[#bd00ff] to-[#4B0082] text-white font-bold text-base rounded-xl border-none cursor-pointer shadow-[0_4px_15px_rgba(189,0,255,0.3)] hover:shadow-[0_6px_20px_rgba(189,0,255,0.5)] hover:-translate-y-0.5 transition-all text-center uppercase tracking-wider"
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
