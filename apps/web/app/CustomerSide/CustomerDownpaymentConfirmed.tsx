"use client";

import { useRef } from 'react';
import { Check, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CustomerDownpaymentConfirmed() {
  const router = useRouter();
  const navigate = router.push;
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    // Basic implementation using browser's print to PDF functionality
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex justify-center items-center p-6 font-['Inter']">
      
      {/* Hide surrounding UI during print */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-content, #receipt-content * {
            visibility: visible;
          }
          #receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div 
        id="receipt-content"
        ref={receiptRef}
        className="w-full max-w-[530px] bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-gray-100 flex flex-col items-center gap-8 relative overflow-hidden"
      >
        
        {/* Top Decorative Arc */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-r from-[#bd00ff] to-[#01f0ff]"></div>

        <div className="w-24 h-24 bg-green-100 rounded-full flex justify-center items-center mt-4">
          <Check size={48} className="text-green-500" strokeWidth={3} />
        </div>

        <div className="text-center flex flex-col gap-2">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#bd00ff] to-[#4B0082] m-0 border-none">Purchase Confirmed</h2>
          <p className="text-gray-500 font-semibold text-lg m-0">Thank you for your purchase!</p>
        </div>

        <div className="w-full flex justify-between items-center py-5 border-b-2 border-dashed border-gray-200">
          <span className="font-semibold text-gray-700">Device Name: <span className="text-black font-bold ml-1">Techno Pova Pro 5g</span></span>
          <div className="flex items-center text-[#bd00ff] font-bold text-xl">
            <span className="text-lg mr-1 tracking-tighter">₱</span>
            <span>3,100.00</span>
          </div>
        </div>

        <div className="w-full flex flex-col py-5 border-b-2 border-dashed border-gray-200 gap-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700">For 12 Months:</span>
            <span className="font-bold text-black text-lg">1,300.00</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700">Total to Pay:</span>
            <span className="font-bold text-black text-lg">10,000.00</span>
          </div>
        </div>

        <div className="w-full flex flex-col py-2 gap-4 mb-2">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-500">Date:</span>
            <span className="font-bold text-gray-800">01:24 PM Jul. 4 2026</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-500">Payment Method:</span>
            <span className="font-bold text-gray-800">Gcash</span>
          </div>
        </div>

        <div className="w-full flex flex-col sm:flex-row gap-4 no-print mt-2">
          <button 
            onClick={handleDownload}
            className="flex-1 flex justify-center items-center gap-2 py-4 border-none bg-[#bd00ff] text-white font-bold text-lg rounded-xl cursor-pointer hover:bg-[#9c00d6] transition-colors"
          >
            <Download size={22} />
            Download Receipt
          </button>
          <button 
            onClick={() => navigate('/customer/dashboard')}
            className="flex-1 flex justify-center items-center py-4 border-2 border-[#bd00ff] bg-white text-[#bd00ff] font-bold text-lg rounded-xl cursor-pointer hover:bg-purple-50 transition-colors"
          >
            Return Home
          </button>
        </div>

      </div>
    </div>
  );
}
