"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StandardDigitalReceipt, { StandardReceiptData } from '../../components/Common/StandardDigitalReceipt';

export default function CustomerReceiptView({ user: initialUser, orderId }: { user?: any; orderId: string }) {
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
      <div className="min-h-screen bg-[#f4f5f7] flex flex-col items-center justify-center gap-4 font-['Inter']">
        <div className="w-12 h-12 border-4 border-purple-100 border-t-[#bd00ff] rounded-full animate-spin"></div>
        <p className="text-[#666] font-semibold animate-pulse text-lg">Loading digital receipt...</p>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] flex flex-col items-center justify-center gap-4 font-['Inter']">
        <p className="text-red-500 font-bold text-lg">Receipt not found.</p>
        <button 
          onClick={() => router.back()} 
          className="px-6 py-2.5 bg-[#bd00ff] text-white rounded-xl font-bold cursor-pointer border-none hover:bg-[#9c00d6] transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex flex-col justify-center items-center p-4 sm:p-6 font-['Inter'] py-8 sm:py-12">
      <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-gray-100 flex flex-col gap-6">
        <StandardDigitalReceipt 
          data={purchase} 
          onBack={() => router.back()} 
          showToolbar={true}
        />
      </div>
    </div>
  );
}
