"use client";

import { ChevronLeft, Store } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CustomerDownpayment() {
  const router = useRouter();

  return (
    <div 
      className="min-h-screen relative flex justify-center items-center p-4 sm:p-6 font-['Inter'] bg-cover bg-center bg-no-repeat overflow-y-auto"
      style={{ backgroundImage: "url('/Images/storefront-bg.jpg')" }}
    >
      {/* Sleek semi-transparent dark frosted overlay */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] z-0"></div>

      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 flex flex-col items-center text-center gap-6 relative z-10 my-auto">
        <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-[#bd00ff]">
          <Store size={36} />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight m-0">In-Store Downpayment Only</h2>
          <p className="text-gray-500 text-sm font-medium leading-relaxed m-0">
            Downpayment options are processed in person at our physical store during cashier POS checkout. Online purchases process full payments for instant processing.
          </p>
        </div>

        <button
          onClick={() => router.push('/customer/products')}
          className="w-full py-3.5 bg-gradient-to-r from-[#bd00ff] to-[#4B0082] text-white font-extrabold text-sm rounded-xl border-none cursor-pointer shadow-lg shadow-purple-500/20 hover:opacity-95 transition-all flex items-center justify-center gap-2"
        >
          <ChevronLeft size={18} />
          Back to Products
        </button>
      </div>
    </div>
  );
}
