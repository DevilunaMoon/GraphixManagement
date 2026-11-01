"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt } from 'lucide-react';
import StandardDigitalReceipt, { StandardReceiptData } from '../../components/Common/StandardDigitalReceipt';

export default function CustomerReceiptView({ user: _initialUser, orderId }: { user?: any; orderId: string }) {
  const router = useRouter();
  const [purchase, setPurchase] = useState<StandardReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const targetId = (!orderId || orderId === 'undefined' || orderId === 'null') ? 'latest' : orderId;
    fetch(`/api/purchases/latest?id=${encodeURIComponent(targetId)}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then(data => {
        setPurchase(data);
      })
      .catch(err => {
        console.error('Error loading purchase receipt:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fbfaff] flex flex-col items-center justify-center gap-4 font-['Inter']">
        <div className="w-12 h-12 border-4 border-purple-100 border-t-[#8b00cc] rounded-full animate-spin"></div>
        <p className="text-gray-500 font-semibold text-sm">Loading official digital receipt...</p>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="min-h-screen bg-[#fbfaff] flex flex-col items-center justify-center gap-4 font-['Inter'] p-4 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center border border-red-100">
          <Receipt size={28} />
        </div>
        <div>
          <h3 className="text-gray-900 font-black text-base sm:text-lg m-0">Receipt Not Available</h3>
          <p className="text-gray-500 text-xs sm:text-sm max-w-sm m-0 mt-1">
            We couldn't locate a verified digital receipt for this order. You can browse your complete transaction history in your receipts.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2.5 mt-2">
          <button 
            onClick={() => router.push('/customer/digital-receipt')} 
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] hover:from-[#7700af] hover:to-[#a700e0] text-white rounded-xl font-bold cursor-pointer border-none hover:shadow-md transition-all text-xs sm:text-sm"
          >
            View All My Receipts
          </button>
          <button 
            onClick={() => router.back()} 
            className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold cursor-pointer border-none transition-colors text-xs sm:text-sm"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfaff] flex flex-col justify-center items-center p-2 sm:p-6 font-['Inter'] py-3 sm:py-12">
      <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-7 shadow-xl border border-purple-100/90 flex flex-col gap-3 sm:gap-6 animate-in fade-in zoom-in-95">
        <StandardDigitalReceipt 
          data={purchase} 
          onBack={() => router.back()} 
          showToolbar={true}
        />
      </div>
    </div>
  );
}

