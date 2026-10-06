"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StandardDigitalReceipt, { StandardReceiptData } from '../../components/Common/StandardDigitalReceipt';

export default function CustomerReceiptView({ user: _initialUser, orderId }: { user?: any; orderId: string }) {
  const router = useRouter();
  const [purchase, setPurchase] = useState<StandardReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/purchases/latest?id=${orderId}`)
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
      <div className="min-h-screen bg-[#fbfaff] flex flex-col items-center justify-center gap-4 font-['Inter']">
        <p className="text-red-500 font-bold text-base">Receipt not found.</p>
        <button 
          onClick={() => router.back()} 
          className="px-6 py-2.5 bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white rounded-xl font-bold cursor-pointer border-none hover:shadow-md transition-all text-sm"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfaff] flex flex-col justify-center items-center p-3 sm:p-6 font-['Inter'] py-6 sm:py-12">
      <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xl border border-purple-100/90 flex flex-col gap-4 sm:gap-6 animate-in fade-in zoom-in-95">
        <StandardDigitalReceipt 
          data={purchase} 
          onBack={() => router.back()} 
          showToolbar={true}
        />
      </div>
    </div>
  );
}

