"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, UserCircle2, Search, ReceiptText, CheckCircle2, Smartphone, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DatePicker from '../../components/ui/DatePicker';
import CashierImeiPromptModal from '../../components/CashierSide/CashierImeiPromptModal';
import StandardDigitalReceipt, { StandardReceiptData } from '../../components/Common/StandardDigitalReceipt';
import CustomerDetailsModal from '../../components/Common/CustomerDetailsModal';
import { formatDisplayInvoiceId } from '../../lib/invoice';
import { isIPhoneProduct } from '../../lib/imei';

interface Transaction {
  id: string;
  createdAt: string;
  amount: number;
  quantity: number;
  variations: string | null;
  paymentType?: string;
  source?: string;
  status?: string;
  branch?: string;
  isExpired?: boolean;
  downpaymentAmount?: number;
  remainingBalance?: number;
  isSettled?: boolean;
  imei?: string | null;
  referenceId?: string | null;
  user: {
    id?: string;
    name: string | null;
    email: string;
    phone?: string | null;
  };
  device: {
    id?: string;
    name: string;
    price: number;
    image: string | null;
  };
}

const formatVariations = (variationsStr: string | null): string => {
  if (!variationsStr) return '';
  try {
    const parsed = JSON.parse(variationsStr);
    if (Array.isArray(parsed)) {
      return parsed.map((v: any) => v.name).join(', ');
    }
    if (parsed && typeof parsed === 'object') {
      return Object.values(parsed).map((v: any) => v.name).join(', ');
    }
  } catch (e) {}
  return variationsStr;
};

export default function CashierSaleRecord({ type = "full" }: { type?: "full" | "downpayment" }) {
  const router = useRouter();
  const navigate = router.push;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [imeiStatus, setImeiStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [customerDetailsTarget, setCustomerDetailsTarget] = useState<{ id?: string; email?: string; name?: string } | null>(null);
  const [imeiModalTarget, setImeiModalTarget] = useState<Transaction | null>(null);
  const itemsPerPage = 8;

  const [settlingTxId, setSettlingTxId] = useState<string | null>(null);

  const handleSettleBalance = async (txId: string) => {
    try {
      setSettlingTxId(txId);
      const res = await fetch(`/api/purchases/${txId}/settle`, { method: 'PATCH' });
      if (res.ok) {
        setTransactions(prev => prev.map(t => t.id === txId ? { ...t, remainingBalance: 0, isSettled: true } : t));
        if (selectedTransaction && selectedTransaction.id === txId) {
          setSelectedTransaction({ ...selectedTransaction, remainingBalance: 0, isSettled: true });
        }
        alert('Remaining balance settled successfully!');
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

  const handleImeiSaved = (newImei: string) => {
    if (imeiModalTarget) {
      setTransactions(prev => prev.map(t => t.id === imeiModalTarget.id ? { ...t, imei: newImei } : t));
      if (selectedTransaction && selectedTransaction.id === imeiModalTarget.id) {
        setSelectedTransaction({ ...selectedTransaction, imei: newImei });
      }
    }
    setImeiModalTarget(null);
  };

  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSales, setTotalSales] = useState(0);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/transactions?type=${type}&page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(searchTerm)}&date=${filterDate}&imeiStatus=${encodeURIComponent(imeiStatus)}`);
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
        console.error('Failed to fetch transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchTransactions();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchTerm, filterDate, type, imeiStatus]);

  const filteredTransactions = transactions;
  const paginatedTransactions = transactions;

  if (loading) {
    return (
      <main className="flex-1 flex flex-col p-5 gap-5 border-2 border-[#bd00ff] mx-3 my-3 rounded-xl bg-white justify-center items-center h-[70vh]">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium tracking-wide">Loading Sale Records...</p>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col p-3 sm:p-5 gap-4 sm:gap-5 border-2 border-[#bd00ff] mx-1 sm:mx-3 my-2 sm:my-3 rounded-2xl bg-white overflow-hidden font-['Inter'] overflow-y-auto w-auto">
        
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button onClick={() => navigate('/cashier/dashboard')} className="text-black hover:text-[#bd00ff] transition-colors border-none bg-transparent cursor-pointer p-1 -ml-1">
            <ChevronLeft size={26} />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-black border-none m-0">{type === "downpayment" ? "Downpayments" : "Completed Purchases"}</h2>
            <p className="text-xs text-gray-500 m-0">View verified sale transactions and sales invoices</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto items-stretch sm:items-center flex-wrap">
          <DatePicker 
            value={filterDate}
            onChange={(val) => {
              setFilterDate(val);
              setCurrentPage(1);
            }}
            className="w-full sm:w-40 md:w-48 h-[42px] sm:h-[48px] px-3.5 sm:px-4 py-2 sm:py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus-within:border-purple-500 focus-within:bg-white outline-none transition-all text-xs sm:text-sm font-semibold text-gray-600"
            placeholder="Filter date..."
          />

          {/* IMEI Status Dropdown */}
          <div className="relative min-w-0 sm:min-w-[190px] w-full sm:w-auto">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-600 pointer-events-none">
              <Smartphone size={16} />
            </div>
            <select
              value={imeiStatus}
              onChange={(e) => {
                setImeiStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-[42px] sm:h-[48px] pl-9 pr-8 bg-gray-50 border-2 border-gray-100 hover:border-purple-300 focus:border-purple-500 focus:bg-white rounded-2xl text-xs font-bold text-gray-800 outline-none transition-all cursor-pointer appearance-none"
            >
              <option value="all">All Devices</option>
              <option value="pending">IMEI: Pending Pickup</option>
              <option value="assigned">IMEI: Assigned</option>
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-purple-600 pointer-events-none text-xs">
              ▼
            </div>
          </div>

          <div className="relative flex-1 sm:max-w-[280px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold text-black"
            />
          </div>
        </div>
      </div>

      {/* Table container */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
          <ReceiptText className="mx-auto text-gray-400 mb-3" size={40} />
          <p className="text-base font-bold text-gray-700 mb-1">No Sale Records Found</p>
          <p className="text-sm">There are no transactions matching your criteria.</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block w-full border border-gray-200 rounded-xl mt-2 overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-[#BF00FF] to-[#4B0082] text-white">
                <th className="px-5 py-4 font-semibold border-b-2 border-transparent text-sm">Transaction ID</th>
                <th className="px-5 py-4 font-semibold border-b-2 border-transparent text-sm">Customer</th>
                <th className="px-5 py-4 font-semibold border-b-2 border-transparent text-sm">Device</th>
                {type === "downpayment" && <th className="px-5 py-4 font-semibold border-b-2 border-transparent text-sm">Source</th>}
                <th className="px-5 py-4 font-semibold border-b-2 border-transparent text-sm">Payment Info</th>
                <th className="px-5 py-4 font-semibold border-b-2 border-transparent text-sm">Date</th>
                <th className="px-5 py-4 font-semibold border-b-2 border-transparent text-sm text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((tx) => {
                const remBal = tx.remainingBalance !== undefined ? tx.remainingBalance : Math.max(0, ((tx.device?.price || 0) * tx.quantity) - (tx.amount || 0));
                const isFullyPaid = tx.isSettled || remBal === 0;

                return (
                <tr 
                  key={tx.id} 
                  onClick={() => setSelectedTransaction(tx)}
                  className="hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0 cursor-pointer"
                >
                  <td className="px-5 py-4 font-semibold">
                    <div className="flex flex-col items-start gap-1">
                      {tx.isExpired && tx.status !== 'Cancelled' && (
                        <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-extrabold shadow-sm">Expired</span>
                      )}
                      {tx.status === 'Cancelled' && (
                        <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-extrabold shadow-sm">Cancelled</span>
                      )}
                      <span className="text-xs font-bold text-gray-700 bg-gray-50 px-2.5 py-1 rounded-md shadow-sm border border-gray-200">
                        {formatDisplayInvoiceId(tx.referenceId || tx.id, tx.branch)}
                      </span>
                    </div>
                  </td>
                  <td 
                    className="px-5 py-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomerDetailsTarget({
                        id: tx.user?.id,
                        email: tx.user?.email,
                        name: tx.user?.name || undefined
                      });
                    }}
                  >
                    <div className="flex items-center gap-3 group/cust cursor-pointer" title="Click to view complete customer details">
                      <div className="relative">
                        <UserCircle2 size={36} className="text-gray-400 group-hover/cust:text-[#bd00ff] transition-colors" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-sm group-hover/cust:text-[#bd00ff] group-hover/cust:underline transition-colors flex items-center gap-1">
                          {tx.user?.name || 'Anonymous'}
                        </span>
                        <span className="text-xs text-gray-500 font-semibold">{tx.user?.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {tx.device?.image ? (
                        <img src={tx.device.image} alt={tx.device.name} className="w-10 h-10 rounded-lg object-cover bg-white border border-gray-100 shadow-sm" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-200" />
                      )}
                      <div className="flex flex-col max-w-[200px]">
                        <span className="font-bold text-gray-900 text-sm truncate">{tx.device?.name}</span>
                        <span className="text-xs text-gray-500 font-semibold truncate">
                          Qty: {tx.quantity} {tx.variations && `• ${formatVariations(tx.variations)}`}
                        </span>
                        {tx.imei ? (
                          <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded w-fit mt-1">
                            IMEI: {tx.imei}
                          </span>
                        ) : isIPhoneProduct(tx.device?.name || '') ? (
                          <span className="font-mono text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded w-fit mt-1">
                            IMEI: Pending Pickup
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  {type === "downpayment" && (
                    <td className="px-5 py-4">
                      <span className={`text-xs font-extrabold px-3 py-1.5 rounded-full shadow-sm ${tx.source === 'POS' || tx.source === 'In-Store' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {tx.source || 'POS'}
                      </span>
                    </td>
                  )}
                  <td className="px-5 py-4 min-w-[170px]">
                    {type === "downpayment" ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500 font-bold">Downpayment:</span>
                          <span className="font-extrabold text-green-600">₱{(tx.downpaymentAmount || tx.amount || 0).toLocaleString()}</span>
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
                            {isFullyPaid ? 'Fully Settled' : 'Active Downpayment'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className="font-extrabold text-[#bd00ff] text-sm">
                          ₱{tx.amount > 0 ? tx.amount.toLocaleString() : (tx.device?.price || 0).toLocaleString()}
                        </span>
                        {tx.amount === 0 && <span className="text-[10px] text-gray-400 uppercase tracking-widest font-extrabold mt-0.5">Legacy</span>}
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
                          onClick={(e) => { e.stopPropagation(); handleSettleBalance(tx.id); }}
                          disabled={settlingTxId === tx.id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg transition-all border-none cursor-pointer shadow-sm"
                          title="Settle Remaining Balance"
                        >
                          {settlingTxId === tx.id ? 'Settling...' : 'Settle'}
                        </button>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedTransaction(tx); }}
                        className="px-3.5 py-1.5 rounded-xl inline-flex justify-center items-center gap-1.5 bg-[#bd00ff] text-white hover:bg-[#9c00d6] transition-all shadow-xs border-none cursor-pointer font-bold text-xs"
                        title="View Digital Receipt"
                      >
                        <ReceiptText size={14} /> Receipt
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Zero-Scrolling Adaptive Transaction Cards */}
        <div className="block md:hidden flex flex-col gap-3 mt-2">
          {paginatedTransactions.map((tx) => {
            const remBal = tx.remainingBalance !== undefined ? tx.remainingBalance : Math.max(0, ((tx.device?.price || 0) * tx.quantity) - (tx.amount || 0));
            const isFullyPaid = tx.isSettled || remBal === 0;

            return (
              <div 
                key={`mob-${tx.id}`} 
                onClick={() => setSelectedTransaction(tx)}
                className="bg-white rounded-2xl border border-gray-200 p-3.5 sm:p-4 shadow-xs hover:border-purple-300 transition-all cursor-pointer flex flex-col gap-3"
              >
                {/* Top Strip: Transaction ID + Badges + Date */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-[#5c0099] bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 font-mono">
                      {formatDisplayInvoiceId(tx.referenceId || tx.id, tx.branch)}
                    </span>
                    {tx.isExpired && tx.status !== 'Cancelled' && (
                      <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">Expired</span>
                    )}
                    {tx.status === 'Cancelled' && (
                      <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">Cancelled</span>
                    )}
                    {type === "downpayment" && (
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${tx.source === 'POS' || tx.source === 'In-Store' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {tx.source || 'POS'}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1 shrink-0">
                    <Calendar size={12} className="text-gray-400" />
                    {new Date(tx.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                {/* Customer Row */}
                <div 
                  className="flex items-center gap-2.5 pt-2 border-t border-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCustomerDetailsTarget({
                      id: tx.user?.id,
                      email: tx.user?.email,
                      name: tx.user?.name || undefined
                    });
                  }}
                  title="Click to view customer details"
                >
                  <UserCircle2 size={32} className="text-purple-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-gray-900 text-xs truncate">
                      {tx.user?.name || 'Anonymous Customer'}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">
                      {tx.user?.email || 'No email provided'}
                    </div>
                  </div>
                </div>

                {/* Device & Specs */}
                <div className="flex items-start gap-2.5 bg-gray-50/80 rounded-xl p-2.5 border border-gray-100">
                  {tx.device?.image ? (
                    <img src={tx.device.image} alt={tx.device.name} className="w-10 h-10 rounded-lg object-cover bg-white border border-gray-200 shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-200 shrink-0 flex items-center justify-center">
                      <Smartphone size={18} className="text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-gray-900 text-xs leading-snug line-clamp-1">
                      {tx.device?.name}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Qty: <strong className="text-gray-700">{tx.quantity}</strong> {tx.variations && `• ${formatVariations(tx.variations)}`}
                    </div>
                    {tx.imei ? (
                      <div className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded w-fit mt-1">
                        IMEI: {tx.imei}
                      </div>
                    ) : isIPhoneProduct(tx.device?.name || '') ? (
                      <div className="font-mono text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded w-fit mt-1">
                        IMEI: Pending Pickup
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div className="pt-2 border-t border-gray-100">
                  {type === "downpayment" ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-emerald-800 font-semibold block">Downpayment</span>
                        <span className="font-extrabold text-emerald-700 text-xs">
                          ₱{(tx.downpaymentAmount || tx.amount || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className={`p-2 rounded-lg border ${isFullyPaid ? 'bg-emerald-50/70 border-emerald-100' : 'bg-rose-50/70 border-rose-100'}`}>
                        <span className={`text-[10px] font-semibold block ${isFullyPaid ? 'text-emerald-800' : 'text-rose-800'}`}>
                          Remaining Balance
                        </span>
                        <span className={`font-extrabold text-xs ${isFullyPaid ? 'text-emerald-700' : 'text-rose-600'}`}>
                          ₱{remBal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-semibold">Total Paid:</span>
                      <span className="font-extrabold text-[#bd00ff] text-base">
                        ₱{tx.amount > 0 ? tx.amount.toLocaleString() : (tx.device?.price || 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  {type === 'downpayment' && !isFullyPaid && (
                    <button
                      onClick={() => handleSettleBalance(tx.id)}
                      disabled={settlingTxId === tx.id}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all border-none cursor-pointer shadow-sm text-center disabled:opacity-50"
                    >
                      {settlingTxId === tx.id ? 'Settling...' : 'Settle Balance'}
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedTransaction(tx)}
                    className="flex-1 py-2 rounded-xl inline-flex justify-center items-center gap-1.5 bg-[#bd00ff] text-white hover:bg-[#9c00d6] transition-all shadow-xs border-none cursor-pointer font-bold text-xs"
                  >
                    <ReceiptText size={14} /> View Receipt
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between mt-auto pt-4 border-t border-gray-100 gap-2">
          <span className="text-xs sm:text-sm font-semibold text-gray-500">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 sm:p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-purple-100 hover:text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 sm:p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-purple-100 hover:text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Standardized Digital Receipt Modal (Matches SECOND IMAGE Exactly) */}
      {selectedTransaction && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto" 
          onClick={() => setSelectedTransaction(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-5 sm:p-7 flex flex-col gap-4 my-8" 
            onClick={e => e.stopPropagation()}
          >
            {/* Standard Digital Receipt Component */}
            <StandardDigitalReceipt 
              data={selectedTransaction as any}
              onBack={() => setSelectedTransaction(null)}
              showToolbar={true}
            />

            {/* Settle Balance Button if Downpayment is not settled */}
            {type === 'downpayment' && !selectedTransaction.isSettled && (selectedTransaction.remainingBalance ?? 1) > 0 && (
              <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
                <button
                  onClick={() => handleSettleBalance(selectedTransaction.id)}
                  disabled={settlingTxId === selectedTransaction.id}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer border-none text-xs"
                >
                  <CheckCircle2 size={16} /> {settlingTxId === selectedTransaction.id ? 'Settling Balance...' : 'Settle Remaining Balance'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Complete Customer Details Modal */}
      {customerDetailsTarget && (
        <CustomerDetailsModal
          isOpen={Boolean(customerDetailsTarget)}
          onClose={() => setCustomerDetailsTarget(null)}
          customerId={customerDetailsTarget.id}
          customerEmail={customerDetailsTarget.email}
          customerName={customerDetailsTarget.name}
          onViewReceipt={(tx) => {
            setSelectedTransaction(tx);
          }}
        />
      )}

      {/* iPhone IMEI Prompt Modal */}
      {imeiModalTarget && (
        <CashierImeiPromptModal
          isOpen={Boolean(imeiModalTarget)}
          onClose={() => setImeiModalTarget(null)}
          purchaseId={imeiModalTarget.id}
          deviceName={imeiModalTarget.device?.name || 'iPhone'}
          referenceId={imeiModalTarget.referenceId}
          customerName={imeiModalTarget.user?.name}
          initialImei={imeiModalTarget.imei}
          onSaved={handleImeiSaved}
        />
      )}
    </main>
  );
}
