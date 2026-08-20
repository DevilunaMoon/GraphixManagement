"use client";

import { useState, useEffect, useRef } from 'react';
import { ReceiptText, Search, ChevronLeft, ChevronRight, UserCircle2, Download, X, ShieldCheck, CheckCircle2, Receipt, Wrench } from 'lucide-react';
import DatePicker from '../../components/ui/DatePicker';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Transaction {
  id: string;
  repairId: string;
  createdAt: string;
  amount: number;
  quantity: number;
  variations: string | null;
  paymentType?: string;
  source?: string;
  status?: string;
  isExpired?: boolean;
  downpaymentAmount?: number;
  remainingBalance?: number;
  isSettled?: boolean;
  address?: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone?: string | null;
  };
  device: {
    id: string;
    name: string;
    price: number;
    image: string | null;
    technician: string;
  };
}

export default function AdminRepairTransactions({ type = "full" }: { type?: "full" | "downpayment" }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const itemsPerPage = 8;

  const hiddenReceiptRef = useRef<HTMLDivElement>(null);
  const [downloadingTxId, setDownloadingTxId] = useState<string | null>(null);

  const handleDownloadPDF = async (tx: Transaction) => {
    setDownloadingTxId(tx.id);
    setTimeout(async () => {
      if (!hiddenReceiptRef.current) {
        setDownloadingTxId(null);
        return;
      }
      try {
        const canvas = await html2canvas(hiddenReceiptRef.current, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 72; // 72mm thermal width
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [imgWidth, imgHeight]
        });

        doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        doc.save(`Graphix_Repair_Receipt_${tx.id.substring(3).toUpperCase()}.pdf`);
      } catch (err) {
        console.error('Error generating PDF:', err);
      } finally {
        setDownloadingTxId(null);
      }
    }, 150);
  };

  const [settlingTxId, setSettlingTxId] = useState<string | null>(null);

  const handleSettleBalance = async (repairId: string) => {
    try {
      setSettlingTxId(repairId);
      const res = await fetch(`/api/monitoring/${repairId}`, { 
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: '100%' })
      });
      if (res.ok) {
        setTransactions(prev => prev.map(t => t.repairId === repairId ? { ...t, remainingBalance: 0, isSettled: true } : t));
        if (selectedTransaction && selectedTransaction.repairId === repairId) {
          setSelectedTransaction({ ...selectedTransaction, remainingBalance: 0, isSettled: true });
        }
        alert('Repair completed and balance settled successfully!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to settle balance');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to settle balance');
    } finally {
      setSettlingTxId(null);
    }
  };

  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSales, setTotalSales] = useState(0);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/repairs/transactions?type=${type}&page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(searchTerm)}&date=${filterDate}`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.transactions)) {
            setTransactions(data.transactions);
            setTotalItems(data.total || 0);
            setTotalPages(data.totalPages || 1);
            setTotalSales(data.totalSales || 0);
          }
        }
      } catch (error) {
        console.error('Failed to fetch repair transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchTransactions();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchTerm, filterDate, type]);

  const filteredTransactions = transactions;
  const paginatedTransactions = transactions;

  // Helper component to render paper duplicate receipt
  const renderPaperReceipt = (tx: Transaction, isPdf = false) => {
    const serialNo = tx.id.startsWith('rp_') ? tx.id.substring(3) : tx.id.substring(0, 8).toUpperCase();
    const dateObj = new Date(tx.createdAt);
    const dateFormatted = `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear().toString().substring(2)}`;
    const address = tx.address || "Walk-In / Store Front";
    
    // Exact physical receipt signatures overrides based on upload photos
    let signatureText = "ag";
    const lowerName = (tx.user?.name || "").toLowerCase();
    if (lowerName.includes("vincent") || lowerName.includes("mumaril")) {
      signatureText = "Vincent";
    } else if (lowerName.includes("april") || lowerName.includes("ocero")) {
      signatureText = "April";
    } else if (lowerName.includes("juana") || lowerName.includes("mahusay")) {
      signatureText = "Juana";
    } else if (lowerName.includes("joram") || lowerName.includes("pacana")) {
      signatureText = "Joram";
    } else if (lowerName.includes("pixter") || lowerName.includes("gabatan")) {
      signatureText = "ag";
    } else if (tx.user?.name) {
      signatureText = tx.user.name.split(' ')[0] || "ag";
    }

    return (
      <div 
        className="w-full border border-[#d2c1a5] rounded-2xl p-5 flex flex-col shadow-lg select-none relative"
        style={{
          backgroundColor: '#FCFAF2',
          backgroundImage: 'linear-gradient(rgba(240, 230, 210, 0.1) 1px, transparent 1px)',
          backgroundSize: '100% 24px',
          color: '#2b261f',
          fontFamily: "'Courier New', Courier, monospace",
          maxWidth: isPdf ? '100%' : '350px',
          margin: '0 auto',
        }}
      >
        {/* Date & Serial Number */}
        <div className="flex justify-between items-center mb-4 text-[13px] font-bold">
          <div>
            <span>Date: </span>
            <span className="underline text-blue-900 px-1 ml-1 text-sm tracking-wide" style={{ fontFamily: "'Brush Script MT', 'Segoe Print', cursive, sans-serif", fontSize: '16px' }}>
              {dateFormatted}
            </span>
          </div>
          <div className="text-[13px]">
            <span>NO: </span>
            <span className="text-[#d32f2f] font-mono font-black tracking-widest text-[15px]">{serialNo}</span>
          </div>
        </div>

        {/* SOLD TO */}
        <div className="flex items-end mb-3 text-[12px] font-bold">
          <span className="whitespace-nowrap mr-2">SOLD TO:</span>
          <span className="flex-1 border-b border-[#a89c89] text-blue-900 px-2 pb-0.5 uppercase tracking-wide text-xs" style={{ fontFamily: "'Brush Script MT', 'Segoe Print', cursive, sans-serif", fontSize: '15px', lineHeight: '1.1' }}>
            {tx.user?.name || 'Walk-in Customer'}
          </span>
        </div>

        {/* ADDRESS */}
        <div className="flex items-end mb-5 text-[12px] font-bold">
          <span className="whitespace-nowrap mr-2">ADDRESS:</span>
          <span className="flex-1 border-b border-[#a89c89] text-blue-900 px-2 pb-0.5 text-xs" style={{ fontFamily: "'Brush Script MT', 'Segoe Print', cursive, sans-serif", fontSize: '14px', lineHeight: '1.1' }}>
            {address}
          </span>
        </div>

        {/* Grid Table */}
        <div className="border border-[#c5b79e] rounded overflow-hidden mb-4 bg-transparent text-[11px] font-bold">
          <div className="grid grid-cols-12 bg-[#f0e7d5] border-b border-[#c5b79e] text-center py-1 text-[10px]">
            <div className="col-span-1 border-r border-[#c5b79e]">QTY</div>
            <div className="col-span-1 border-r border-[#c5b79e]">UNIT</div>
            <div className="col-span-6 border-r border-[#c5b79e]">ARTICLES</div>
            <div className="col-span-2 border-r border-[#c5b79e]">PRICE</div>
            <div className="col-span-2">AMOUNT</div>
          </div>

          {/* Row 1: Item details */}
          <div className="grid grid-cols-12 border-b border-[#c5b79e]/60 text-center min-h-[30px] items-center">
            <div className="col-span-1 border-r border-[#c5b79e]/60 text-blue-900" style={{ fontFamily: "'Brush Script MT', cursive, sans-serif", fontSize: '14px' }}>1</div>
            <div className="col-span-1 border-r border-[#c5b79e]/60 text-blue-900" style={{ fontFamily: "'Brush Script MT', cursive, sans-serif", fontSize: '14px' }}>pc</div>
            <div className="col-span-6 border-r border-[#c5b79e]/60 text-left px-2 text-blue-900 leading-tight" style={{ fontFamily: "'Brush Script MT', 'Segoe Print', cursive, sans-serif", fontSize: '14px' }}>
              {tx.variations || 'Repair Payment'}
            </div>
            <div className="col-span-2 border-r border-[#c5b79e]/60 text-right px-1 text-blue-900" style={{ fontFamily: "'Brush Script MT', cursive, sans-serif", fontSize: '14px' }}>
              {tx.device?.price.toLocaleString()}
            </div>
            <div className="col-span-2 text-right px-1 text-blue-900" style={{ fontFamily: "'Brush Script MT', cursive, sans-serif", fontSize: '14px' }}>
              {tx.amount.toLocaleString()}
            </div>
          </div>

          {/* Downpayment remaining balance row */}
          {tx.paymentType === 'Downpayment' && (
            <div className="grid grid-cols-12 border-b border-[#c5b79e]/60 text-center min-h-[30px] items-center bg-[#ebf3ff]/20">
              <div className="col-span-1 border-r border-[#c5b79e]/60 text-blue-900" style={{ fontFamily: "'Brush Script MT', cursive, sans-serif", fontSize: '14px' }}>-</div>
              <div className="col-span-1 border-r border-[#c5b79e]/60 text-blue-900" style={{ fontFamily: "'Brush Script MT', cursive, sans-serif", fontSize: '14px' }}>-</div>
              <div className="col-span-6 border-r border-[#c5b79e]/60 text-left px-2 text-red-600 leading-tight" style={{ fontFamily: "'Brush Script MT', 'Segoe Print', cursive, sans-serif", fontSize: '13px' }}>
                Remaining Balance (50%)
              </div>
              <div className="col-span-2 border-r border-[#c5b79e]/60 text-right px-1 text-red-600" style={{ fontFamily: "'Brush Script MT', cursive, sans-serif", fontSize: '13px' }}>
                {(tx.device?.price / 2).toLocaleString()}
              </div>
              <div className="col-span-2 text-right px-1 text-red-600" style={{ fontFamily: "'Brush Script MT', cursive, sans-serif", fontSize: '13px' }}>
                {(tx.device?.price / 2).toLocaleString()}
              </div>
            </div>
          )}

          {/* Empty rows padding */}
          {[...Array(tx.paymentType === 'Downpayment' ? 4 : 5)].map((_, i) => (
            <div key={i} className="grid grid-cols-12 border-b border-[#c5b79e]/30 text-center h-[24px]">
              <div className="col-span-1 border-r border-[#c5b79e]/30"></div>
              <div className="col-span-1 border-r border-[#c5b79e]/30"></div>
              <div className="col-span-6 border-r border-[#c5b79e]/30"></div>
              <div className="col-span-2 border-r border-[#c5b79e]/30"></div>
              <div className="col-span-2"></div>
            </div>
          ))}

          {/* Total Row */}
          <div className="grid grid-cols-12 bg-[#f0e7d5]/50 items-center py-1">
            <div className="col-span-8 text-right pr-4 font-bold text-xs flex justify-end items-center gap-1">
              <span>TOTAL</span>
              <span className="text-[14px]">👉</span>
            </div>
            <div className="col-span-4 text-right px-2 text-blue-900 font-extrabold text-base" style={{ fontFamily: "'Brush Script MT', 'Segoe Print', cursive, sans-serif", fontSize: '18px' }}>
              ₱{tx.amount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Signature Box */}
        <div className="flex justify-between items-end mt-4 text-[10px] font-bold">
          <div className="flex items-baseline">
            <span>NO. </span>
            <span className="border-b border-[#a89c89] w-24 text-center text-gray-500 font-mono tracking-widest text-[9px] pb-0.5">
              {tx.repairId.substring(0, 10).toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col items-center relative pr-4">
            <span className="text-blue-800/80 absolute bottom-3 text-lg leading-none select-none pointer-events-none" style={{ fontFamily: "'Brush Script MT', 'Dancing Script', cursive, sans-serif", fontSize: '26px', transform: 'rotate(-8deg)' }}>
              {signatureText}
            </span>
            <span className="border-t border-[#a89c89] pt-1 w-28 text-center text-gray-500 uppercase tracking-widest font-mono text-[9px]">
              SIGNATURE
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 shadow-sm">
              <Wrench size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 m-0">{type === "downpayment" ? "Repair Downpayments" : "Completed Repairs"}</h2>
              <p className="text-gray-500 m-0 text-sm">{type === "downpayment" ? "View all active repair downpayments" : "View all completed repair payments"}</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
            <div className="w-full sm:w-40 md:w-48 relative">
              <DatePicker 
                value={filterDate}
                onChange={(val) => {
                  setFilterDate(val);
                  setCurrentPage(1);
                }}
                className="w-full h-[48px] px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus-within:border-purple-500 focus-within:bg-white outline-none transition-all text-sm font-semibold text-gray-600"
                placeholder="Filter date..."
              />
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Search repairs..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:bg-white outline-none transition-all text-sm font-semibold"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <ReceiptText size={64} className="mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-gray-900">No Receipts Found</h3>
            <p className="text-sm">There are no repair records matching your criteria.</p>
          </div>
        ) : (
          <div className="w-full border border-gray-200 rounded-xl mt-2 overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-[#BF00FF] to-[#4B0082] text-white">
                  <th className="px-5 py-4 font-semibold border-b-2 border-transparent text-sm">Receipt ID</th>
                  <th className="px-5 py-4 font-semibold border-b-2 border-transparent text-sm">Customer</th>
                  <th className="px-5 py-4 font-semibold border-b-2 border-transparent text-sm">Device Name</th>
                  {type === "downpayment" && <th className="px-5 py-4 font-semibold border-b-2 border-transparent text-sm">Technician</th>}
                  <th className="px-5 py-4 font-semibold border-b-2 border-transparent text-sm">
                    {type === "downpayment" ? "Payment Info" : "Total Cost"}
                  </th>
                  <th className="px-5 py-4 font-semibold border-b-2 border-transparent text-sm">Date</th>
                  <th className="px-5 py-4 font-semibold border-b-2 border-transparent text-sm text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((tx) => {
                  const remBal = tx.remainingBalance !== undefined ? tx.remainingBalance : 0;
                  const isFullyPaid = tx.isSettled || remBal === 0;

                  return (
                  <tr 
                    key={tx.id} 
                    onClick={() => setSelectedTransaction(tx)}
                    className="hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0 cursor-pointer"
                  >
                    <td className="px-5 py-4 font-semibold">
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md shadow-sm border border-gray-100">
                          #{tx.id.substring(3).toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <UserCircle2 size={36} className="text-gray-400" />
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 text-sm">{tx.user?.name || 'Walk-in Customer'}</span>
                          <span className="text-xs text-gray-500 font-semibold">{tx.user?.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {tx.device?.image ? (
                          <img src={tx.device.image} alt={tx.device.name} className="w-10 h-10 rounded-lg object-cover bg-white border border-gray-100 shadow-sm" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-400 border border-purple-100 font-black text-xs">
                            RP
                          </div>
                        )}
                        <div className="flex flex-col max-w-[200px]">
                          <span className="font-bold text-gray-900 text-sm truncate">{tx.device?.name}</span>
                          <span className="text-xs text-gray-500 font-semibold truncate">
                            Issue: {tx.variations || 'General Issue'}
                          </span>
                        </div>
                      </div>
                    </td>
                    {type === "downpayment" && (
                      <td className="px-5 py-4">
                        <span className="text-xs font-extrabold px-3 py-1.5 rounded-full shadow-sm bg-orange-100 text-orange-700">
                          {tx.device?.technician || 'N/A'}
                        </span>
                      </td>
                    )}
                    <td className="px-5 py-4 min-w-[170px]">
                      {type === "downpayment" ? (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 font-bold">Downpayment:</span>
                            <span className="font-extrabold text-green-600">₱{tx.amount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-1.5">
                            <span className="text-gray-500 font-bold">Rem. Balance:</span>
                            <span className={`font-extrabold ${isFullyPaid ? 'text-green-600' : 'text-red-500'}`}>
                              ₱{remBal.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] border-t border-gray-100 pt-1">
                            <span className="text-gray-400 font-semibold">Status:</span>
                            <span className={`font-extrabold px-2 py-0.5 rounded text-[10px] ${isFullyPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {isFullyPaid ? 'Completed' : 'In Progress'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="font-extrabold text-[#bd00ff] text-sm">
                            ₱{tx.amount.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-gray-600">
                        {new Date(tx.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {type === 'downpayment' && !isFullyPaid && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSettleBalance(tx.repairId); }}
                            disabled={settlingTxId === tx.repairId}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg transition-all border-none cursor-pointer shadow-sm"
                            title="Settle Repair Balance"
                          >
                            {settlingTxId === tx.repairId ? 'Settling...' : 'Settle'}
                          </button>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDownloadPDF(tx); }}
                          className="w-10 h-10 rounded-full inline-flex justify-center items-center bg-[#bd00ff] text-white hover:bg-[#9c00d6] hover:scale-110 transition-all shadow-md border-none cursor-pointer"
                          title="Download Receipt"
                        >
                          <Download size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Total Sales Summary */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center p-6 bg-purple-50 rounded-2xl border border-purple-100 mt-2 mb-6">
            <span className="text-gray-600 font-bold text-lg mb-2 sm:mb-0">
              Total Repair {type === "downpayment" ? "Downpayments" : "Revenue"} {filterDate ? `for ${new Date(filterDate).toLocaleDateString()}` : "Found"}
            </span>
            <span className="text-3xl font-black text-[#bd00ff]">
              ₱{totalSales.toLocaleString()}
            </span>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
            <span className="text-sm font-semibold text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-purple-100 hover:text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-purple-100 hover:text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedTransaction(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-black/5 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <ReceiptText className="text-purple-600" size={24} />
                <h3 className="font-bold text-[#111] text-xl">Repair Details</h3>
              </div>
              <button className="text-gray-400 hover:text-black transition-colors" onClick={() => setSelectedTransaction(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                
                {/* Column 1: Details */}
                <div className="flex flex-col gap-4 md:col-span-7">
                  <h4 className="font-bold text-gray-900 text-base border-b border-gray-100 pb-2 mb-2">Repair Information</h4>
                  
                  <div className="flex justify-between items-center border-b border-gray-50 pb-2.5">
                    <span className="text-gray-500 font-semibold text-sm">Receipt ID</span>
                    <span className="font-bold text-gray-900">{selectedTransaction.id.toUpperCase()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center border-b border-gray-50 pb-2.5">
                    <span className="text-gray-500 font-semibold text-sm">Customer</span>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{selectedTransaction.user?.name || 'Walk-in Customer'}</div>
                      <div className="text-xs text-gray-500">{selectedTransaction.user?.email}</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-b border-gray-50 pb-2.5">
                    <span className="text-gray-500 font-semibold text-sm">Device Name</span>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{selectedTransaction.device?.name}</div>
                      <div className="text-xs text-gray-500">Issue: {selectedTransaction.variations || 'General Issue'}</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-b border-gray-50 pb-2.5">
                    <span className="text-gray-500 font-semibold text-sm">Diagnostics Date</span>
                    <span className="font-bold text-gray-900">
                      {new Date(selectedTransaction.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-b border-gray-50 pb-2.5">
                    <span className="text-gray-500 font-semibold text-sm">Technician Assigned</span>
                    <span className="font-bold text-gray-900">{selectedTransaction.device?.technician}</span>
                  </div>
                  
                  {/* Warranty */}
                  <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 p-4 rounded-xl border border-purple-100 flex items-start gap-4 mt-2">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg shrink-0">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-purple-900 m-0 text-sm">3 Months Service Warranty</h4>
                      <p className="text-xs text-purple-700 mt-1 mb-0 leading-normal">
                        Valid until <span className="font-bold text-purple-900">
                          {new Date(new Date(selectedTransaction.createdAt).setMonth(new Date(selectedTransaction.createdAt).getMonth() + 3)).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Modal Actions */}
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => handleDownloadPDF(selectedTransaction)}
                      className="flex-1 px-4 py-3 bg-white hover:bg-purple-50 text-purple-600 border border-purple-200 hover:border-purple-300 font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download size={18} /> Download Receipt
                    </button>
                    <button
                      onClick={() => setSelectedTransaction(null)}
                      className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-sm cursor-pointer border-none"
                    >
                      Close
                    </button>
                  </div>
                </div>

                {/* Column 2: Digital Duplicate Paper Receipt */}
                <div className="md:col-span-5 flex justify-center">
                  <div className="w-full flex flex-col gap-2">
                    <h4 className="font-bold text-gray-900 text-base border-b border-gray-100 pb-2 mb-2">Paper Receipt Copy</h4>
                    {renderPaperReceipt(selectedTransaction)}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden PDF Printable Component */}
      {downloadingTxId && (
        <div id="thermal-receipt-container" style={{ position: 'absolute', left: '-9999px', top: '0', display: 'block' }}>
          {(() => {
            const tx = transactions.find(t => t.id === downloadingTxId);
            if (!tx) return null;
            return (
              <div ref={hiddenReceiptRef} style={{ width: "350px", background: "white", padding: "10px" }}>
                {renderPaperReceipt(tx, true)}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
