"use client";

import { useState, useEffect } from 'react';
import { ReceiptText, Search, ChevronLeft, ChevronRight, UserCircle2, Download, X, CheckCircle2, Building2 } from 'lucide-react';
import DatePicker from '../../components/ui/DatePicker';
import { useBranch } from '../../context/BranchContext';
import StandardDigitalReceipt, { StandardReceiptData } from '../../components/Common/StandardDigitalReceipt';

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

export default function AdminTransactions({ type = "full" }: { type?: "full" | "downpayment" }) {
  const { selectedBranch, setSelectedBranch, isSuperAdmin } = useBranch();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
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

  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSales, setTotalSales] = useState(0);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/transactions?type=${type}&page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(searchTerm)}&date=${filterDate}&branch=${encodeURIComponent(selectedBranch)}`);
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
  }, [currentPage, searchTerm, filterDate, type, selectedBranch]);

  const filteredTransactions = transactions;
  const paginatedTransactions = transactions;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 shadow-sm">
              <ReceiptText size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 m-0">{type === "downpayment" ? "Downpayments" : "Order History"}</h2>
              <p className="text-gray-500 m-0 text-sm">
                {type === "downpayment" ? "View all downpayment purchases" : "View all completed purchases"}
                {isSuperAdmin && (
                  <span className="ml-2 font-bold text-purple-600">
                    • {selectedBranch === 'all' ? 'All Branches' : `${selectedBranch} Branch`}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 items-stretch sm:items-center flex-wrap">
            {/* Branch Filter for Super Admin */}
            {isSuperAdmin && (
              <div className="relative min-w-[170px]">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-600 pointer-events-none">
                  <Building2 size={16} />
                </div>
                <select
                  value={selectedBranch}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-[48px] pl-9 pr-8 bg-purple-50/50 border-2 border-purple-100 hover:border-purple-200 rounded-2xl text-xs font-bold text-purple-900 outline-none transition-all cursor-pointer appearance-none"
                >
                  <option value="all">🏢 All Branches</option>
                  <option value="Tagoloan">📍 Tagoloan</option>
                  <option value="Villanueva">📍 Villanueva</option>
                  <option value="Jasaan">📍 Jasaan</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600 pointer-events-none text-xs">
                  ▼
                </div>
              </div>
            )}

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
            <div className="relative w-full md:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search transactions..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:bg-white outline-none transition-all text-sm font-semibold text-black"
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
            <h3 className="text-xl font-bold text-gray-900">No Transactions Found</h3>
            <p className="text-sm">There are no transactions matching your criteria.</p>
          </div>
        ) : (
          <div className="w-full border border-gray-200 rounded-xl mt-2 overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-[#BF00FF] to-[#4B0082] text-white">
                  <th className="px-5 py-4 font-semibold border-b-2 border-transparent text-sm">Transaction ID</th>
                  <th className="px-5 py-4 font-semibold border-b-2 border-transparent text-sm">Branch</th>
                  <th className="px-5 py-4 font-semibold border-b-2 border-transparent text-sm">Customer</th>
                  <th className="px-5 py-4 font-semibold border-b-2 border-transparent text-sm">Device</th>
                  {type === "downpayment" && <th className="px-5 py-4 font-semibold border-b-2 border-transparent text-sm">Source</th>}
                  <th className="px-5 py-4 font-semibold border-b-2 border-transparent text-sm">
                    {type === "downpayment" ? "Payment Info" : "Amount"}
                  </th>
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
                        <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md shadow-sm border border-gray-100">
                          #{tx.id.substring(0, 8).toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 inline-block shadow-2xs">
                        {tx.branch || 'Tagoloan'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <UserCircle2 size={36} className="text-gray-400" />
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 text-sm">{tx.user?.name || 'Anonymous'}</span>
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
                          {tx.imei && (
                            <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded w-fit mt-1">
                              IMEI: {tx.imei}
                            </span>
                          )}
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
        )}

        {/* Total Sales Summary */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center p-6 bg-purple-50 rounded-2xl border border-purple-100 mt-2 mb-6">
            <span className="text-gray-600 font-bold text-lg mb-2 sm:mb-0">
              Total {type === "downpayment" ? "Downpayments" : "Sales"} {filterDate ? `for ${new Date(filterDate).toLocaleDateString()}` : "Found"}
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
            {/* Downpayment Expiry or Action Notification */}
            {selectedTransaction.isExpired && selectedTransaction.status !== 'Cancelled' && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-xs shadow-xs flex flex-col gap-2 font-sans">
                <div className="flex items-center gap-2 font-bold text-red-900 text-sm">
                  <span>⚠️</span> 3-Day Expiry Passed
                </div>
                <p className="m-0 leading-relaxed text-red-700">
                  This reservation has exceeded the claim limit without full settlement.
                </p>
                <button 
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/transactions/${selectedTransaction.id}/cancel`, { method: 'PATCH' });
                      if (res.ok) {
                        setTransactions(prev => prev.map(t => t.id === selectedTransaction.id ? { ...t, status: 'Cancelled' } : t));
                        setSelectedTransaction({ ...selectedTransaction, status: 'Cancelled' });
                      } else {
                        alert('Failed to cancel transaction');
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="mt-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-xl transition-colors text-center cursor-pointer border-none shadow-xs text-xs"
                >
                  Cancel & Release Inventory
                </button>
              </div>
            )}

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
    </div>
  );
}
