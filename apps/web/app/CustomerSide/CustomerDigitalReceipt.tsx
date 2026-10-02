"use client";

import { useState, useEffect } from 'react';
import { Pencil, Receipt, KeyRound, ChevronDown, ChevronLeft, ChevronRight, UserCircle2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ReceiptItem {
  id: string;
  orderNum: string;
  date: string;
  deviceName: string;
  amount: number;
  paymentType: string;
  createdAt: string;
}

export default function CustomerDigitalReceipt({ user }: { user?: any }) {
  const router = useRouter();
  const navigate = router.push;
  
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 4;
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    const dbSortOrder = sortOrder === 'newest' ? 'desc' : 'asc';
    fetch(`/api/purchases?page=${currentPage}&limit=${itemsPerPage}&sort=${dbSortOrder}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then(data => {
        if (data && Array.isArray(data.purchases)) {
          const mapped = data.purchases.map((item: any) => ({
            id: item.id,
            orderNum: item.id.slice(-6).toUpperCase(),
            date: `Bought on ${new Date(item.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`,
            deviceName: item.device?.name || "Custom Print Product",
            amount: item.amount,
            paymentType: item.paymentType,
            createdAt: item.createdAt
          }));
          setReceipts(mapped);
          setTotalCount(data.total || 0);
          setTotalPages(data.totalPages || 1);
        } else {
          setReceipts([]);
          setTotalCount(0);
          setTotalPages(1);
        }
      })
      .catch(err => {
        console.error(err);
        setReceipts([]);
        setTotalCount(0);
        setTotalPages(1);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [currentPage, sortOrder]);

  const currentItems = receipts;

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-10 font-['Inter'] flex justify-center overflow-y-auto bg-[#fbfaff]">
      <div className="w-full max-w-6xl flex flex-col md:flex-row gap-6">

        {/* Sidebar */}
        <aside className="w-full md:w-[280px] flex flex-col gap-5 shrink-0">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100/90 flex flex-col items-center gap-3 text-center">
            <div className="w-[88px] h-[88px] rounded-full overflow-hidden border-2 border-purple-200 shadow-xs flex items-center justify-center bg-purple-50/50">
              {user?.image ? (
                <img src={user.image} alt="User Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 size={72} className="text-gray-400" />
              )}
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg font-black text-gray-950">{user?.name || "Customer"}</span>
              <button 
                onClick={() => navigate('/customer/profile')}
                className="flex items-center gap-1.5 text-gray-500 hover:text-[#8b00cc] bg-transparent border-none cursor-pointer transition-colors font-bold text-xs p-0"
              >
                <Pencil size={13} className="text-[#8b00cc]" /> Edit Profile
              </button>
            </div>
          </div>
          
          <nav className="bg-white rounded-3xl p-2.5 shadow-sm border border-purple-100/90 flex flex-col gap-1">
            <button 
              onClick={() => navigate('/customer/profile')}
              className="flex items-center gap-3 w-full p-3.5 rounded-2xl border-none cursor-pointer text-left bg-transparent hover:bg-purple-50 transition-colors text-gray-700 hover:text-[#8b00cc] font-bold text-sm"
            >
              <User className="text-[#6b588c]" size={20} />
              <span>Profile</span>
            </button>
            <button 
              className="flex items-center gap-3 w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#8b00cc] to-[#9d00e6] text-white font-black text-sm cursor-pointer text-left transition-all border-none shadow-xs shadow-purple-500/20"
            >
              <Receipt size={20} className="text-white" />
              <span>Digital Receipt</span>
            </button>
            <button 
              onClick={() => navigate('/customer/change-password')}
              className="flex items-center gap-3 w-full p-3.5 rounded-2xl border-none cursor-pointer text-left bg-transparent hover:bg-purple-50 transition-colors text-gray-700 hover:text-[#8b00cc] font-bold text-sm"
            >
              <KeyRound className="text-[#6b588c]" size={20} />
              <span>Change Password</span>
            </button>
          </nav>
        </aside>

        {/* Main Area */}
        <section className="flex-1 bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-purple-100/90 flex flex-col">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-purple-100 pb-4 mb-6 gap-3 sm:gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-950 m-0 tracking-tight">Digital Receipts</h2>
              <p className="text-gray-500 m-0 mt-1 font-medium text-xs sm:text-sm">View and download your official transaction receipts.</p>
            </div>

            {/* Custom Sort Dropdown */}
            <div className="relative z-10">
              <button 
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center justify-between w-[130px] px-3.5 py-1.5 border border-purple-200 rounded-xl bg-purple-50/50 text-gray-800 font-bold text-xs cursor-pointer hover:border-[#8b00cc] transition-colors"
              >
                {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
                <ChevronDown size={15} className={`transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isSortOpen && (
                <ul className="absolute top-full right-0 w-[140px] mt-1 bg-white border border-purple-100 rounded-xl shadow-lg list-none p-1 m-0 overflow-hidden z-20">
                  <li 
                    onClick={() => { setSortOrder('newest'); setIsSortOpen(false); setCurrentPage(1); }}
                    className="px-3 py-2 hover:bg-purple-50 hover:text-[#8b00cc] cursor-pointer font-bold text-xs text-gray-800 rounded-lg transition-colors"
                  >
                    Newest First
                  </li>
                  <li 
                    onClick={() => { setSortOrder('oldest'); setIsSortOpen(false); setCurrentPage(1); }}
                    className="px-3 py-2 hover:bg-purple-50 hover:text-[#8b00cc] cursor-pointer font-bold text-xs text-gray-800 rounded-lg transition-colors"
                  >
                    Oldest First
                  </li>
                </ul>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3.5 flex-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 border-3 border-purple-100 border-t-[#8b00cc] rounded-full animate-spin"></div>
                <p className="text-gray-500 font-semibold text-xs">Fetching your receipts...</p>
              </div>
            ) : currentItems.map(item => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center p-4 sm:p-5 border border-purple-100/80 rounded-2xl bg-[#faf8fd] hover:border-purple-300 hover:shadow-2xs transition-all gap-3 sm:gap-0">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-black text-lg border-none m-0 leading-tight">Order #{item.orderNum}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      item.paymentType === 'Downpayment' 
                        ? 'bg-orange-50 text-orange-600 border border-orange-100' 
                        : 'bg-green-50 text-green-600 border border-green-100'
                    }`}>
                      {item.paymentType === 'Downpayment' ? 'Downpayment' : 'Full Payment'}
                    </span>
                  </div>
                  <span className="text-gray-900 font-bold text-base mt-1">{item.deviceName}</span>
                  <span className="text-gray-500 font-medium text-sm">{item.date}</span>
                  <span className="text-[#bd00ff] font-extrabold text-base mt-0.5">
                    ₱{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <button 
                  onClick={() => navigate(`/customer/receipt-view/${item.id}`)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 text-white font-bold rounded-lg hover:bg-[#bd00ff] transition-colors cursor-pointer border-none shadow-sm text-sm sm:text-base text-center"
                >
                  View Receipt
                </button>
              </div>
            ))}

            {!isLoading && currentItems.length === 0 && (
              <div className="text-center text-gray-400 py-20 font-semibold text-lg">No digital receipts found.</div>
            )}
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
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
