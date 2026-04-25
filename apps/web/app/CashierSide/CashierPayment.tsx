"use client";

import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CashierPayment() {
  const router = useRouter();
  const navigate = router.push;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/cashier/records');
  };

  return (
    <main className="flex-1 flex justify-center items-start p-8 mt-4">
      <div className="w-full max-w-[600px] border-2 border-[#bd00ff] rounded-2xl p-8 md:p-10 bg-white flex flex-col gap-8 shadow-sm">
        
        <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
          <button onClick={() => router.back()} className="text-black hover:text-[#bd00ff] transition-colors bg-transparent border-none">
            <ChevronLeft size={32} />
          </button>
          <h2 className="text-2xl font-semibold text-black">Payment Information Section</h2>
        </div>

        <form onSubmit={handleConfirm} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-lg font-semibold text-black">Name</label>
            <input 
              type="text" 
              className="w-full h-12 border-2 border-[#bd00ff] rounded-xl px-4 text-lg outline-none focus:shadow-[0_0_5px_rgba(189,0,255,0.4)] transition-shadow text-black" 
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-lg font-semibold text-black">Contact Number</label>
            <input 
              type="text" 
              className="w-full h-12 border-2 border-[#bd00ff] rounded-xl px-4 text-lg outline-none focus:shadow-[0_0_5px_rgba(189,0,255,0.4)] transition-shadow text-black"
              required 
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-lg font-semibold text-black">Amount</label>
            <input 
              type="number" 
              className="w-full h-12 border-2 border-[#bd00ff] rounded-xl px-4 text-lg outline-none focus:shadow-[0_0_5px_rgba(189,0,255,0.4)] transition-shadow text-black" 
              required
            />
          </div>

          <div className="flex justify-center mt-4">
            <button 
              type="submit"
              className="bg-[#4b0082] hover:bg-[#34005b] text-white text-xl font-semibold rounded-xl py-3 w-full transition-colors shadow-md"
            >
              Confirm
            </button>
          </div>
        </form>

      </div>
    </main>
  );
}
