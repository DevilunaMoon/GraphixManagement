"use client";

import { useState, useEffect } from 'react';
import { Pencil, Receipt, KeyRound, ChevronDown, ChevronLeft, ChevronRight, UserCircle2, User, Sparkles, FileText, Calendar, Building2, ShoppingBag, ArrowUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ReceiptItem {
  id: string;
  orderNum: string;
  referenceId?: string;
  date: string;
  deviceName: string;
  deviceImage?: string;
  branch?: string;
  amount: number;
  quantity?: number;
  paymentType: string;
  status?: string;
  downpaymentAmount?: number;
  remainingBalance?: number;
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
  const itemsPerPage = 5;
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
            orderNum: item.referenceId ? item.referenceId.replace(/^#/, '') : item.id.slice(-6).toUpperCase(),
            referenceId: item.referenceId || `#${item.id.slice(-6).toUpperCase()}`,
            date: new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            deviceName: item.device?.name || "Custom Print Product",
            deviceImage: item.device?.image || item.device?.images?.[0] || null,
            branch: item.branch || "Tagoloan",
            amount: item.amount,
            quantity: item.quantity || 1,
            paymentType: item.paymentType || "Full Payment",
            status: item.status,
            downpaymentAmount: item.downpaymentAmount || 0,
            remainingBalance: item.remainingBalance || 0,
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

  const getPaymentBadge = (type: string) => {
    const lower = (type || '').toLowerCase();
    if (lower.includes('downpayment')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shrink-0">
          Downpayment
        </span>
      );
    }
    if (lower.includes('gcash')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shrink-0">
          GCash
        </span>
      );
    }
    if (lower.includes('cash')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/80 shrink-0">
          Cash on Pickup
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
        Full Payment
      </span>
    );
  };

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-10 font-['Inter'] flex justify-center overflow-y-auto bg-[#fbfaff]">
      <div className="w-full max-w-6xl flex flex-col md:flex-row gap-6">

        {/* Left Sidebar */}
        <aside className="w-full md:w-[280px] flex flex-col gap-5 shrink-0">
          {/* User Profile Summary Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100/90 flex flex-col items-center gap-3.5 text-center transition-all hover:border-purple-200">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-purple-200 shadow-sm flex items-center justify-center bg-purple-50/50">
              {user?.image ? (
                <img src={user.image} alt="User Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 size={80} className="text-purple-300" />
              )}
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg font-black text-gray-950 truncate max-w-[220px]">{user?.name || "Customer"}</span>
              <button 
                onClick={() => navigate('/customer/profile')}
                className="flex items-center gap-1.5 text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-0.5 rounded-full font-bold text-xs border border-purple-100 transition-colors cursor-pointer"
              >
                <Pencil size={11} className="text-[#8b00cc]" />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
          
          {/* Navigation Menu */}
          <nav className="bg-white rounded-3xl p-2.5 shadow-sm border border-purple-100/90 flex flex-col gap-1.5">
            <button 
              onClick={() => navigate('/customer/profile')}
              className="flex items-center gap-3 w-full p-3.5 rounded-2xl border-none cursor-pointer text-left bg-transparent hover:bg-purple-50/80 transition-all text-gray-700 hover:text-[#8b00cc] font-bold text-sm group"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-50 group-hover:bg-purple-100/80 flex items-center justify-center transition-colors">
                <User className="text-[#6b588c] group-hover:text-[#8b00cc] transition-colors" size={18} />
              </div>
              <span>Profile</span>
            </button>

            <button 
              className="flex items-center gap-3 w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white font-bold text-sm cursor-pointer text-left transition-all border-none shadow-sm shadow-purple-500/25"
            >
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Receipt size={18} className="text-white" />
              </div>
              <span>Digital Receipt</span>
            </button>

            <button 
              onClick={() => navigate('/customer/change-password')}
              className="flex items-center gap-3 w-full p-3.5 rounded-2xl border-none cursor-pointer text-left bg-transparent hover:bg-purple-50/80 transition-all text-gray-700 hover:text-[#8b00cc] font-bold text-sm group"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-50 group-hover:bg-purple-100/80 flex items-center justify-center transition-colors">
                <KeyRound className="text-[#6b588c] group-hover:text-[#8b00cc] transition-colors" size={18} />
              </div>
              <span>Change Password</span>
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <section className="flex-1 bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-purple-100/90 flex flex-col min-h-[500px]">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-purple-100 pb-5 mb-6 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-black text-gray-950 m-0 tracking-tight">Digital Receipts</h2>
                <Sparkles size={20} className="text-[#bd00ff]" />
              </div>
              <p className="text-gray-500 m-0 mt-1 font-medium text-xs sm:text-sm">
                View and download your official transaction receipts and order history.
              </p>
            </div>

            {/* Top Toolbar / Sort Controls */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-xl">
                {totalCount} {totalCount === 1 ? 'Receipt' : 'Receipts'}
              </span>

              {/* Custom Sort Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className="flex items-center gap-2 px-3.5 py-1.5 border border-purple-200/80 rounded-xl bg-purple-50/60 text-gray-800 font-bold text-xs cursor-pointer hover:border-[#8b00cc] hover:bg-purple-50 transition-colors"
                >
                  <ArrowUpDown size={13} className="text-[#8b00cc]" />
                  <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 text-gray-500 ${isSortOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isSortOpen && (
                  <ul className="absolute top-full right-0 w-[140px] mt-1.5 bg-white border border-purple-100 rounded-2xl shadow-xl list-none p-1.5 m-0 overflow-hidden z-20 animate-in fade-in zoom-in-95">
                    <li 
                      onClick={() => { setSortOrder('newest'); setIsSortOpen(false); setCurrentPage(1); }}
                      className={`px-3 py-2 cursor-pointer font-bold text-xs rounded-xl transition-colors ${
                        sortOrder === 'newest' 
                          ? 'bg-purple-50 text-[#8b00cc]' 
                          : 'text-gray-700 hover:bg-purple-50/60 hover:text-[#8b00cc]'
                      }`}
                    >
                      Newest First
                    </li>
                    <li 
                      onClick={() => { setSortOrder('oldest'); setIsSortOpen(false); setCurrentPage(1); }}
                      className={`px-3 py-2 cursor-pointer font-bold text-xs rounded-xl transition-colors ${
                        sortOrder === 'oldest' 
                          ? 'bg-purple-50 text-[#8b00cc]' 
                          : 'text-gray-700 hover:bg-purple-50/60 hover:text-[#8b00cc]'
                      }`}
                    >
                      Oldest First
                    </li>
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Receipts List */}
          <div className="flex flex-col gap-3.5 flex-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 my-auto">
                <div className="w-9 h-9 border-3 border-purple-100 border-t-[#8b00cc] rounded-full animate-spin"></div>
                <p className="text-gray-500 font-semibold text-xs">Fetching your receipts...</p>
              </div>
            ) : receipts.map(item => (
              <div 
                key={item.id} 
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border border-purple-100/90 rounded-2xl bg-white hover:border-purple-200 hover:shadow-md hover:bg-purple-50/10 transition-all duration-200 gap-4"
              >
                {/* Left details with icon/thumbnail */}
                <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                    {item.deviceImage ? (
                      <img src={item.deviceImage} alt={item.deviceName} className="w-full h-full object-cover" />
                    ) : (
                      <Receipt className="text-[#8b00cc]" size={24} />
                    )}
                  </div>

                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-gray-950 text-base">
                        Order #{item.orderNum}
                      </span>
                      {getPaymentBadge(item.paymentType)}
                      {item.branch && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                          <Building2 size={11} className="text-purple-400" />
                          {item.branch}
                        </span>
                      )}
                    </div>

                    <h4 className="text-gray-900 font-bold text-sm sm:text-base truncate m-0 group-hover:text-[#8b00cc] transition-colors">
                      {item.deviceName} {item.quantity > 1 && `(x${item.quantity})`}
                    </h4>

                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1 text-gray-500 font-medium text-xs">
                        <Calendar size={12} className="text-gray-400" />
                        Bought on {item.date}
                      </span>
                      <span className="text-[#8b00cc] font-black text-sm sm:text-base">
                        ₱{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right CTA */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-purple-50">
                  <button 
                    onClick={() => navigate(`/customer/receipt-view/${item.id}`)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gray-950 hover:bg-gradient-to-r hover:from-[#8b00cc] hover:to-[#bd00ff] text-white font-bold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer border-none text-xs sm:text-sm flex items-center justify-center gap-2"
                  >
                    <FileText size={15} />
                    <span>View Receipt</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Empty state */}
            {!isLoading && receipts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center my-auto">
                <div className="w-16 h-16 rounded-3xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#8b00cc] mb-3">
                  <Receipt size={32} />
                </div>
                <h3 className="text-lg font-black text-gray-900 m-0 mb-1">No Receipts Found</h3>
                <p className="text-gray-500 text-xs sm:text-sm font-medium max-w-sm mb-4">
                  You haven&apos;t completed any purchases yet. Your digital receipts will be saved here once you make an order.
                </p>
                <button
                  onClick={() => navigate('/customer/products')}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white font-bold text-xs sm:text-sm rounded-xl border-none cursor-pointer hover:shadow-md transition-all flex items-center gap-2"
                >
                  <ShoppingBag size={15} />
                  <span>Browse Products</span>
                </button>
              </div>
            )}
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex justify-center items-center mt-8 gap-3 pt-4 border-t border-purple-100">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-9 h-9 flex justify-center items-center rounded-xl border border-purple-100 bg-white text-gray-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-purple-50 transition-colors shadow-2xs"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="px-3.5 py-1 rounded-xl bg-purple-50 text-purple-900 font-bold text-xs border border-purple-100">
                Page {currentPage} of {totalPages}
              </div>

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-9 h-9 flex justify-center items-center rounded-xl border border-purple-100 bg-white text-gray-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-purple-50 transition-colors shadow-2xs"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

        </section>

      </div>
    </main>
  );
}

