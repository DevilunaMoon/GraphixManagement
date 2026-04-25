"use client";

import { useState } from 'react';
import { Pencil, Receipt, KeyRound, ChevronDown, ChevronLeft, ChevronRight, UserCircle2, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ReceiptItem {
  id: number;
  orderNum: number;
  date: string;
}

export default function CustomerDigitalReceipt({ user }: { user?: any }) {
  const router = useRouter();
  const navigate = router.push;
  
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 4;

  const [receipts] = useState<ReceiptItem[]>([
    { id: 1, orderNum: 4, date: 'Bought a product in 1/1/2026' },
    { id: 2, orderNum: 3, date: 'Bought a product in 1/1/2026' },
    { id: 3, orderNum: 2, date: 'Bought a product in 1/1/2026' },
    { id: 4, orderNum: 1, date: 'Bought a product in 1/1/2026' },
    { id: 5, orderNum: 5, date: 'Bought a product in 2/1/2026' },
  ]);

  const sortedReceipts = [...receipts].sort((a, b) => {
    return sortOrder === 'newest' ? b.orderNum - a.orderNum : a.orderNum - b.orderNum;
  });

  const totalPages = Math.ceil(sortedReceipts.length / itemsPerPage);
  const currentItems = sortedReceipts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <main className="flex-1 p-3 sm:p-6 md:p-10 font-['Signika'] flex justify-center overflow-y-auto">
      <div className="w-full max-w-6xl flex flex-col md:flex-row gap-6">

        {/* Sidebar */}
        <aside className="w-full md:w-[300px] flex flex-col gap-6 shrink-0">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center gap-4">
            <div className="w-[100px] h-[100px] rounded-full overflow-hidden border-4 border-[#0022ff] shadow-sm flex items-center justify-center bg-gray-50">
              {user?.image ? (
                <img src={user.image} alt="User Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 size={80} className="text-gray-400" />
              )}
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-xl font-bold text-black">{user?.name || "Customer"}</span>
              <button 
                onClick={() => navigate('/customer/profile')}
                className="flex items-center gap-2 text-gray-500 hover:text-[#bd00ff] bg-transparent border-none cursor-pointer transition-colors font-semibold p-0"
              >
                <Pencil size={16} /> Edit Profile
              </button>
            </div>
          </div>
          
          <nav className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2">
            <button 
              className="flex items-center gap-4 w-full p-4 rounded-xl border-2 border-[#bd00ff] bg-purple-50 cursor-pointer text-left transition-colors"
            >
              <Receipt className="text-[#bd00ff]" size={24} />
              <span className="text-lg font-bold text-[#bd00ff]">Digital Receipt</span>
            </button>
            <button 
              onClick={() => navigate('/customer/profile?showMonitoring=true')}
              className="flex items-center gap-4 w-full p-4 rounded-xl border-none cursor-pointer text-left bg-transparent hover:bg-purple-50 transition-colors group"
            >
              <Activity className="text-[#01f0ff] group-hover:text-[#bd00ff] transition-colors" size={24} />
              <span className="text-lg font-semibold text-gray-700 group-hover:text-[#bd00ff] transition-colors">Device Monitoring</span>
            </button>
            <button 
              onClick={() => navigate('/customer/change-password')}
              className="flex items-center gap-4 w-full p-4 rounded-xl border-none cursor-pointer text-left bg-transparent hover:bg-purple-50 transition-colors group"
            >
              <KeyRound className="text-[#01f0ff] group-hover:text-[#bd00ff] transition-colors" size={24} />
              <span className="text-lg font-semibold text-gray-700 group-hover:text-[#bd00ff] transition-colors">Change Password</span>
            </button>
          </nav>
        </aside>

        {/* Main Area */}
        <section className="flex-1 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10 shadow-sm border border-[#bd00ff] flex flex-col">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-4 sm:pb-5 mb-4 sm:mb-6 gap-3 sm:gap-4">
            <div>
              <h2 className="text-2xl font-bold text-black m-0 border-none">Digital Receipt</h2>
              <p className="text-gray-500 m-0 mt-2 font-medium">View the list of Receipts</p>
            </div>

            {/* Custom Sort Dropdown */}
            <div className="relative z-10">
              <button 
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center justify-between w-[140px] px-4 py-2 border-2 border-gray-200 rounded-xl bg-white text-black font-semibold cursor-pointer hover:border-[#bd00ff] transition-colors"
              >
                {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
                <ChevronDown size={18} className={`transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isSortOpen && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg list-none p-0 m-0 overflow-hidden">
                  <li 
                    onClick={() => { setSortOrder('newest'); setIsSortOpen(false); setCurrentPage(1); }}
                    className="px-4 py-3 hover:bg-purple-50 hover:text-[#bd00ff] cursor-pointer font-medium text-black transition-colors"
                  >
                    Newest
                  </li>
                  <li 
                    onClick={() => { setSortOrder('oldest'); setIsSortOpen(false); setCurrentPage(1); }}
                    className="px-4 py-3 hover:bg-purple-50 hover:text-[#bd00ff] cursor-pointer font-medium text-black transition-colors border-t border-gray-100"
                  >
                    Oldest
                  </li>
                </ul>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4 flex-1">
            {currentItems.map(item => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center p-4 sm:p-5 border border-gray-200 rounded-2xl bg-white hover:border-[#bd00ff] hover:shadow-md transition-all gap-3 sm:gap-0">
                <div className="flex flex-col gap-0.5 sm:gap-1">
                  <span className="font-bold text-black text-lg border-none m-0 leading-tight">Order #{item.orderNum}</span>
                  <span className="text-gray-500 font-medium text-xs sm:text-base">{item.date}</span>
                </div>
                <button 
                  onClick={() => navigate(`/customer/receipt-view/${item.orderNum}`)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 text-white font-bold rounded-lg hover:bg-[#bd00ff] transition-colors cursor-pointer border-none shadow-sm text-sm sm:text-base text-center"
                >
                  View Receipt
                </button>
              </div>
            ))}

            {currentItems.length === 0 && (
              <div className="text-center text-gray-500 py-10 font-medium">No receipts found.</div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="flex justify-center items-center mt-8 gap-4 pb-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 flex justify-center items-center rounded-lg border-none bg-gray-100 text-black cursor-pointer disabled:opacity-50 hover:bg-gray-200 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="font-bold text-black text-lg">{currentPage} / {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-10 h-10 flex justify-center items-center rounded-lg border-none bg-gray-100 text-black cursor-pointer disabled:opacity-50 hover:bg-gray-200 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}

        </section>

      </div>
    </main>
  );
}
