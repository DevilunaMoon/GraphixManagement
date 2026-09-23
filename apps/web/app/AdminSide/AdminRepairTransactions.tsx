"use client";

import { useState, useEffect } from 'react';
import { ReceiptText, Search, ChevronLeft, ChevronRight, UserCircle2, Receipt, Wrench } from 'lucide-react';
import DatePicker from '../../components/ui/DatePicker';
import { useBranch } from '../../context/BranchContext';
import RepairServiceReceiptModal from '../../components/Repair/RepairServiceReceiptModal';

interface Transaction {
  id: string;
  repairId: string;
  trackingNumber?: string;
  orderIndex?: number;
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
  branch?: string;
  materials?: string;
  cause?: string;
  technician?: string;
  repairCost?: string | number;
  downpayment?: string | number;
  deviceName?: string;
  ownerName?: string;
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
  const { selectedBranch, setSelectedBranch, isSuperAdmin, branches } = useBranch();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const itemsPerPage = 8;

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
        const branchParam = isSuperAdmin ? selectedBranch : 'all';
        const res = await fetch(`/api/repairs/transactions?type=${type}&page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(searchTerm)}&date=${filterDate}&branch=${encodeURIComponent(branchParam || 'all')}`);
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
  }, [currentPage, searchTerm, filterDate, type, selectedBranch, isSuperAdmin]);

  const filteredTransactions = transactions;
  const paginatedTransactions = transactions;

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
              <p className="text-gray-500 m-0 text-sm">
                {isSuperAdmin 
                  ? "System-wide multi-branch completed repair monitoring and receipts" 
                  : (type === "downpayment" ? "View all active repair downpayments" : "View all completed repair payments")}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center w-full md:w-auto gap-3">
            {isSuperAdmin && (
              <div className="relative w-full sm:w-48">
                <select
                  value={selectedBranch || 'all'}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-[48px] px-3.5 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:bg-white outline-none transition-all text-xs md:text-sm font-bold text-gray-700 cursor-pointer shadow-sm"
                >
                  <option value="all">🏢 All Branches</option>
                  {branches && branches.length > 0 ? (
                    branches.map(b => (
                      <option key={b.id || b.name} value={b.name}>
                        📍 {b.name.replace(/ branch/i, '')} Branch
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Tagoloan">📍 Tagoloan Branch</option>
                      <option value="Villanueva">📍 Villanueva Branch</option>
                      <option value="Jasaan">📍 Jasaan Branch</option>
                    </>
                  )}
                </select>
              </div>
            )}

            <div className="w-full sm:w-40 relative">
              <DatePicker 
                value={filterDate}
                onChange={(val) => {
                  setFilterDate(val);
                  setCurrentPage(1);
                }}
                className="w-full h-[48px] px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus-within:border-purple-500 focus-within:bg-white outline-none transition-all text-sm font-semibold text-gray-600 shadow-sm"
                placeholder="Filter date..."
              />
            </div>
            
            <div className="relative w-full sm:w-64 md:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search repairs..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:bg-white outline-none transition-all text-sm font-semibold shadow-sm"
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
                  <th className="px-5 py-4 font-semibold border-b-2 border-transparent text-sm">Branch</th>
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
                  const displayReceiptId = tx.trackingNumber 
                    ? (tx.trackingNumber.startsWith('#') ? tx.trackingNumber : `#${tx.trackingNumber}`) 
                    : `#${tx.id.replace(/^rp_/i, '').toUpperCase()}`;

                  return (
                  <tr 
                    key={tx.id} 
                    onClick={() => setSelectedTransaction(tx)}
                    className="hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0 cursor-pointer"
                  >
                    <td className="px-5 py-4 font-semibold">
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-xs font-bold text-gray-700 bg-gray-50 px-2.5 py-1 rounded-md shadow-sm border border-gray-200 font-mono tracking-wide">
                          {displayReceiptId}
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
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 ${
                        tx.branch?.toLowerCase().includes('villanueva')
                          ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                          : tx.branch?.toLowerCase().includes('jasaan')
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        📍 {tx.branch?.replace(/ branch/i, '') || 'Tagoloan'}
                      </span>
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
                          onClick={(e) => { e.stopPropagation(); setSelectedTransaction(tx); }}
                          className="w-10 h-10 rounded-full inline-flex justify-center items-center bg-[#bd00ff] text-white hover:bg-[#9c00d6] hover:scale-110 transition-all shadow-md border-none cursor-pointer"
                          title="View Repair Service Receipt"
                        >
                          <Receipt size={18} />
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

      {/* Repair Service Receipt Modal (Shared Standard with Customer Side) */}
      {selectedTransaction && (
        <RepairServiceReceiptModal
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          device={{
            id: selectedTransaction.repairId || selectedTransaction.id,
            trackingNumber: selectedTransaction.trackingNumber,
            orderIndex: selectedTransaction.orderIndex,
            deviceName: selectedTransaction.device?.name || selectedTransaction.deviceName || 'Device',
            cause: selectedTransaction.cause || selectedTransaction.variations || 'General Maintenance',
            technician: selectedTransaction.technician || selectedTransaction.device?.technician || 'Lead Tech',
            status: selectedTransaction.status || 'Completed',
            repairCost: selectedTransaction.repairCost || selectedTransaction.device?.price || selectedTransaction.amount,
            downpayment: selectedTransaction.downpayment || selectedTransaction.downpaymentAmount || 0,
            materials: selectedTransaction.materials,
            branch: selectedTransaction.branch,
            createdAt: selectedTransaction.createdAt,
            ownerName: selectedTransaction.ownerName || selectedTransaction.user?.name || 'Customer',
            customerName: selectedTransaction.user?.name || selectedTransaction.ownerName || 'Customer',
            customerEmail: selectedTransaction.user?.email || 'customer@graphix.com',
            customerPhone: selectedTransaction.user?.phone || '0917 123 4567',
            user: selectedTransaction.user ? {
              name: selectedTransaction.user.name || undefined,
              email: selectedTransaction.user.email,
              phone: selectedTransaction.user.phone || undefined,
              branch: selectedTransaction.branch || undefined
            } : null,
          }}
          userProfile={selectedTransaction.user ? {
            name: selectedTransaction.user.name || '',
            email: selectedTransaction.user.email || '',
            phone: selectedTransaction.user.phone || '',
            branch: selectedTransaction.branch || ''
          } : null}
        />
      )}
    </div>
  );
}
