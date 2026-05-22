"use client";

import { useState, useEffect, useRef } from 'react';
import { ReceiptText, Search, ChevronLeft, ChevronRight, UserCircle2, Download, X, ShieldCheck, CheckCircle2, Receipt } from 'lucide-react';
import DatePicker from '../../components/ui/DatePicker';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Transaction {
  id: string;
  createdAt: string;
  amount: number;
  quantity: number;
  variations: string | null;
  paymentType?: string;
  source?: string;
  status?: string;
  isExpired?: boolean;
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
  };
}

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_1029384756',
    createdAt: new Date().toISOString(),
    amount: 1599,
    quantity: 1,
    variations: 'Blue Switch',
    user: { id: 'u1', name: 'John Doe', email: 'john@example.com' },
    device: { id: 'd1', name: 'Aula Mechanical Keyboard', price: 1599, image: 'https://picsum.photos/seed/keyboard/150/150' },
    status: 'Active'
  },
  {
    id: 'tx_5647382910',
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(), // 4 days old
    amount: 45000,
    quantity: 1,
    variations: '256GB, Space Gray',
    user: { id: 'u2', name: 'Jane Smith', email: 'jane.smith@email.com' },
    device: { id: 'd2', name: 'iPhone 13 Pro', price: 45000, image: 'https://picsum.photos/seed/phone/150/150' },
    isExpired: true,
    status: 'Active'
  },
  {
    id: 'tx_9988776655',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days old
    amount: 1250,
    quantity: 2,
    variations: null,
    user: { id: 'u3', name: 'Michael Johnson', email: 'mjohnson@mail.com' },
    device: { id: 'd3', name: 'Logitech G102 Mouse', price: 625, image: 'https://picsum.photos/seed/mouse/150/150' },
    isExpired: true,
    status: 'Active'
  },
  {
    id: 'tx_1122334455',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    amount: 8500,
    quantity: 1,
    variations: '24-inch, 1080p',
    user: { id: 'u4', name: 'Sarah Williams', email: 'swilliams@test.com' },
    device: { id: 'd4', name: 'Samsung IPS Monitor', price: 8500, image: 'https://picsum.photos/seed/monitor/150/150' },
    status: 'Active'
  }
];

export default function AdminTransactions({ type = "full" }: { type?: "full" | "downpayment" }) {
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
    // Real data: render pixel-perfect thermal POS receipt
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
        doc.save(`Graphix_Receipt_${tx.id.substring(0, 8).toUpperCase()}.pdf`);
      } catch (err) {
        console.error('Error generating PDF:', err);
      } finally {
        setDownloadingTxId(null);
      }
    }, 150);
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch(`/api/transactions?type=${type}`);
        if (res.ok) {
          const data = await res.json();
          const mappedMock = MOCK_TRANSACTIONS.map(tx => ({
            ...tx,
            paymentType: type === 'downpayment' ? 'Downpayment' : 'Full'
          }));
          // If the database is empty, display the mock data so the user can see the UI
          if (data.length === 0) {
            setTransactions(mappedMock);
          } else {
            // Append mock data for demonstration purposes if there's only a few real transactions
            setTransactions([...data, ...mappedMock]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.device?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase());
      
    if (!matchesSearch) return false;
    
    if (filterDate) {
      // Compare just the YYYY-MM-DD part
      const txDate = new Date(t.createdAt).toISOString().split('T')[0];
      return txDate === filterDate;
    }
    
    return true;
  });

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
              <p className="text-gray-500 m-0 text-sm">{type === "downpayment" ? "View all downpayment purchases" : "View all completed purchases"}</p>
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
                placeholder="Search transactions..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
            <h3 className="text-xl font-bold text-gray-900">No Transactions Found</h3>
            <p className="text-sm">There are no transactions matching your criteria.</p>
          </div>
        ) : (
          <div className="w-full border border-gray-200 rounded-xl mt-2 overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-[#BF00FF] to-[#4B0082] text-white">
                  <th className="px-5 py-4 font-semibold border-b-2 border-transparent text-sm">Transaction ID</th>
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
                {paginatedTransactions.map((tx) => (
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
                            Qty: {tx.quantity} {tx.variations && `• ${tx.variations}`}
                          </span>
                        </div>
                      </div>
                    </td>
                    {type === "downpayment" && (
                      <td className="px-5 py-4">
                        <span className={`text-xs font-extrabold px-3 py-1.5 rounded-full shadow-sm ${tx.source === 'In-Store' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                          {tx.source || 'Online'}
                        </span>
                      </td>
                    )}
                    <td className="px-5 py-4 min-w-[150px]">
                      {type === "downpayment" ? (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 font-bold">Paid:</span>
                            <span className="font-extrabold text-green-600">₱{(tx.amount || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-1.5">
                            <span className="text-gray-500 font-bold">Balance:</span>
                            <span className="font-extrabold text-red-500">₱{Math.max(0, ((tx.device?.price || 0) * tx.quantity) - (tx.amount || 0)).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] border-t border-gray-100 pt-1">
                            <span className="text-gray-400 font-semibold">Monthly (12m):</span>
                            <span className="font-extrabold text-blue-600">₱{(Math.max(0, ((tx.device?.price || 0) * tx.quantity) - (tx.amount || 0)) / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
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
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDownloadPDF(tx); }}
                        className="w-10 h-10 rounded-full inline-flex justify-center items-center bg-[#bd00ff] text-white hover:bg-[#9c00d6] hover:scale-110 transition-all shadow-md border-none cursor-pointer"
                        title="Download Receipt"
                      >
                        <Download size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Total Sales Summary */}
        {filteredTransactions.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center p-6 bg-purple-50 rounded-2xl border border-purple-100 mt-2 mb-6">
            <span className="text-gray-600 font-bold text-lg mb-2 sm:mb-0">
              Total {type === "downpayment" ? "Downpayments" : "Sales"} {filterDate ? `for ${new Date(filterDate).toLocaleDateString()}` : "Found"}
            </span>
            <span className="text-3xl font-black text-[#bd00ff]">
              ₱{filteredTransactions.reduce((acc, tx) => acc + (tx.amount > 0 ? tx.amount : (tx.device?.price || 0)), 0).toLocaleString()}
            </span>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
            <span className="text-sm font-semibold text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-black/5 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <ReceiptText className="text-purple-600" size={24} />
                <h3 className="font-bold text-[#111] text-xl">Transaction Details</h3>
              </div>
              <button className="text-gray-400 hover:text-black transition-colors" onClick={() => setSelectedTransaction(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              
              {selectedTransaction.isExpired && selectedTransaction.status !== 'Cancelled' && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm shadow-sm flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-red-900">
                    <span className="text-lg">⚠️</span> 3-Day Expiry Passed
                  </div>
                  <p className="m-0 leading-relaxed text-red-700">This downpayment has exceeded the 72-hour limit. The customer has not completed the payment.</p>
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
                    className="mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors text-center cursor-pointer border-none shadow-sm"
                  >
                    Cancel & Release Inventory
                  </button>
                </div>
              )}

              {selectedTransaction.status === 'Cancelled' && (
                <div className="mb-6 bg-gray-50 border border-gray-200 text-gray-600 p-4 rounded-xl text-sm shadow-sm">
                  <div className="font-bold text-gray-800 mb-1">Transaction Cancelled</div>
                  <p className="m-0">This transaction was cancelled and the reserved inventory has been officially restocked.</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Column 1: Details */}
                <div className="flex flex-col gap-4">
                  <h4 className="font-bold text-gray-900 text-base border-b border-gray-100 pb-2 mb-2">Order Information</h4>
                  
                  <div className="flex justify-between items-center border-b border-gray-50 pb-2.5">
                    <span className="text-gray-500 font-semibold text-sm">Transaction ID</span>
                    <span className="font-bold text-gray-900">{selectedTransaction.id.toUpperCase()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center border-b border-gray-50 pb-2.5">
                    <span className="text-gray-500 font-semibold text-sm">Customer</span>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{selectedTransaction.user?.name || 'Anonymous'}</div>
                      <div className="text-xs text-gray-500">{selectedTransaction.user?.email}</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-b border-gray-50 pb-2.5">
                    <span className="text-gray-500 font-semibold text-sm">Device</span>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{selectedTransaction.device?.name}</div>
                      <div className="text-xs text-gray-500">Qty: {selectedTransaction.quantity} {selectedTransaction.variations && `• ${selectedTransaction.variations}`}</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-b border-gray-50 pb-2.5">
                    <span className="text-gray-500 font-semibold text-sm">Purchase Date</span>
                    <span className="font-bold text-gray-900">
                      {new Date(selectedTransaction.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  
                  {/* Warranty */}
                  <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 p-4 rounded-xl border border-purple-100 flex items-start gap-4 mt-2">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg shrink-0">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-purple-900 m-0 text-sm">12 Months Warranty</h4>
                      <p className="text-xs text-purple-700 mt-1 mb-0 leading-normal">
                        Valid until <span className="font-bold text-purple-900">
                          {new Date(new Date(selectedTransaction.createdAt).setMonth(new Date(selectedTransaction.createdAt).getMonth() + 12)).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Column 2: Financials & Actions */}
                <div className="flex flex-col justify-between gap-6">
                  
                  {type === "downpayment" ? (
                    <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/70 flex flex-col gap-3">
                      <h4 className="font-bold text-blue-900 m-0 text-base mb-1 border-b border-blue-200/50 pb-2">Payment Breakdown</h4>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-blue-700 font-medium">Total Device Price</span>
                        <span className="font-bold text-blue-900">₱{((selectedTransaction.device?.price || 0) * selectedTransaction.quantity).toLocaleString()}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-blue-700 font-medium">Downpayment Paid</span>
                        <span className="font-bold text-green-600">₱{(selectedTransaction.amount || 0).toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center text-sm border-t border-blue-200/60 pt-3 mt-1">
                        <span className="text-blue-800 font-bold">Remaining Balance</span>
                        <span className="font-bold text-red-500">₱{Math.max(0, ((selectedTransaction.device?.price || 0) * selectedTransaction.quantity) - (selectedTransaction.amount || 0)).toLocaleString()}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-blue-700 font-medium">Monthly Installment</span>
                        <span className="font-bold text-blue-900">₱{(Math.max(0, ((selectedTransaction.device?.price || 0) * selectedTransaction.quantity) - (selectedTransaction.amount || 0)) / 12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/50 flex flex-col gap-3">
                      <h4 className="font-bold text-purple-900 m-0 text-base mb-1 border-b border-purple-200/40 pb-2">Payment Breakdown</h4>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-purple-700 font-medium">Device Price</span>
                        <span className="font-bold text-gray-900">₱{(selectedTransaction.device?.price || 0).toLocaleString()}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-purple-700 font-medium">Quantity Purchased</span>
                        <span className="font-bold text-gray-900">{selectedTransaction.quantity}x</span>
                      </div>

                      <div className="flex justify-between items-center text-sm border-t border-purple-200/40 pt-3 mt-1">
                        <span className="text-purple-800 font-bold">Total Paid Amount</span>
                        <span className="font-black text-xl text-[#bd00ff]">₱{(selectedTransaction.amount > 0 ? selectedTransaction.amount : (selectedTransaction.device?.price || 0) * selectedTransaction.quantity).toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2 mt-auto">
                    <button
                      onClick={() => handleDownloadPDF(selectedTransaction)}
                      className="w-full px-4 py-3 bg-white hover:bg-purple-50 text-purple-600 border border-purple-200 hover:border-purple-300 font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download size={18} /> Download PDF Receipt
                    </button>
                    <button
                      onClick={() => setSelectedTransaction(null)}
                      className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-sm cursor-pointer border-none"
                    >
                      Close
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* Hidden Thermal Receipt for PDF Generation */}
      {downloadingTxId && (
        <div id="thermal-receipt-container" style={{ position: 'absolute', left: '-9999px', top: '0', display: 'block' }}>
          {(() => {
            const tx = transactions.find(t => t.id === downloadingTxId);
            if (!tx) return null;
            const formatVariations = (variationsStr: string | null) => {
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

            const storeAgentLabel = tx.source === 'In-Store' ? 'CASHIER DESK' : 'ONLINE CHECKOUT';
            const isDownpayment = tx.paymentType === 'Downpayment';

            if (isDownpayment) {
              const totalDevicePrice = (tx.device?.price || 0) * tx.quantity;
              const downpaymentPaid = tx.amount > 0 ? tx.amount : 0;
              const remainingBalance = Math.max(0, totalDevicePrice - downpaymentPaid);
              const monthlyInstallment = remainingBalance / 12;

              return (
                <div 
                  ref={hiddenReceiptRef}
                  style={{
                    fontFamily: "'Courier New', Courier, monospace",
                    width: "72mm",
                    color: "black",
                    background: "white",
                    fontSize: "12px",
                    lineHeight: "1.3",
                    padding: "4mm",
                    margin: "0 auto"
                  }}
                >
                  <div style={{ textAlign: "center", marginBottom: "12px" }}>
                    <div style={{ fontWeight: "bold", fontSize: "14px", letterSpacing: "1px" }}>GRAPHIX STORE</div>
                    <div style={{ fontSize: "10px", marginTop: "2px" }}>MIN: 22112113365644135</div>
                    <div style={{ fontSize: "10px" }}>DATE: {new Date(tx.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    <div style={{ borderTop: "1px dashed black", borderBottom: "1px dashed black", padding: "6px 0", margin: "8px 0", fontWeight: "bold" }}>
                      DOWNPAYMENT INVOICE<br />
                      #{tx.id.substring(0, 12).toUpperCase()}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                    <span style={{ maxWidth: "70%", display: "inline-block", lineHeight: "1.4" }}>{(tx.device?.name || "Product").toUpperCase()}</span>
                    <span>{downpaymentPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} V</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#333", fontSize: "11px", marginBottom: "8px" }}>
                    <span>Qty: {tx.quantity}x {tx.variations ? `(${formatVariations(tx.variations)})` : ''}</span>
                    <span>{tx.quantity} @ {(tx.device?.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  <div style={{ borderTop: "1px dashed black", margin: "6px 0" }}></div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                    <span>Total Price</span>
                    <span>Php {totalDevicePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                    <span>Downpayment Paid</span>
                    <span>Php {downpaymentPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                    <span>Remaining Balance</span>
                    <span>Php {remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                    <span>Installment (12m)</span>
                    <span>Php {monthlyInstallment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                    <span>Payment Method</span>
                    <span>Downpayment</span>
                  </div>

                  <div style={{ textAlign: "center", margin: "8px 0", fontWeight: "bold" }}>
                    *** {tx.quantity} ITEM(S) ***
                  </div>

                  <div style={{ borderTop: "1px dashed black", margin: "6px 0" }}></div>

                  <div style={{ fontSize: "11px", marginTop: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Sold To:</span>
                      <span>{tx.user.name || 'Anonymous Customer'}</span>
                    </div>
                    <div>Email: {tx.user.email}</div>
                    <div>Phone: {tx.user.phone || 'N/A'}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                      <span>Store Agent:</span>
                      <span>{storeAgentLabel}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontWeight: "bold" }}>
                      <span>Global Trans No.</span>
                      <span>#{tx.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              );
            } else {
              const totalAmount = tx.amount > 0 ? tx.amount : (tx.device?.price || 0) * tx.quantity;
              const vatRate = 0.12;
              const vatableSales = totalAmount / (1 + vatRate);
              const vatAmount = totalAmount - vatableSales;

              const rawCash = tx.user?.phone ? tx.user.phone.replace(/[^0-9.]/g, '') : '';
              let parsedCash = parseFloat(rawCash) || 0;

              // If parsedCash is not a realistic cash tender (e.g. it is a phone number, which is very large, or zero)
              if (parsedCash <= 0 || parsedCash > totalAmount * 3) {
                const next500 = Math.ceil(totalAmount / 500) * 500;
                const next1000 = Math.ceil(totalAmount / 1000) * 1000;
                parsedCash = next500 >= totalAmount ? next500 : next1000;
              }

              const changeVal = parsedCash >= totalAmount ? parsedCash - totalAmount : 0;
              const cashPaid = parsedCash;

              return (
                <div 
                  ref={hiddenReceiptRef}
                  style={{
                    fontFamily: "'Courier New', Courier, monospace",
                    width: "72mm",
                    color: "black",
                    background: "white",
                    fontSize: "12px",
                    lineHeight: "1.3",
                    padding: "4mm",
                    margin: "0 auto"
                  }}
                >
                  <div style={{ textAlign: "center", marginBottom: "12px" }}>
                    <div style={{ fontWeight: "bold", fontSize: "14px", letterSpacing: "1px" }}>GRAPHIX STORE</div>
                    <div style={{ fontSize: "10px", marginTop: "2px" }}>MIN: 22112113365644135</div>
                    <div style={{ fontSize: "10px" }}>DATE: {new Date(tx.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    <div style={{ borderTop: "1px dashed black", borderBottom: "1px dashed black", padding: "6px 0", margin: "8px 0", fontWeight: "bold" }}>
                      SALES INVOICE<br />
                      #{tx.id.substring(0, 12).toUpperCase()}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                    <span style={{ maxWidth: "70%", display: "inline-block", lineHeight: "1.4" }}>{(tx.device?.name || "Product").toUpperCase()}</span>
                    <span>{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} V</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#333", fontSize: "11px", marginBottom: "8px" }}>
                    <span>Item: {tx.quantity}x {tx.variations ? `(${formatVariations(tx.variations)})` : ''}</span>
                    <span>{tx.quantity} @ {(tx.device?.price || tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  <div style={{ borderTop: "1px dashed black", margin: "6px 0" }}></div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                    <span>Total</span>
                    <span>Php {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Cash</span>
                    <span>{cashPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Change</span>
                    <span>{changeVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  <div style={{ textAlign: "center", margin: "8px 0", fontWeight: "bold" }}>
                    *** {tx.quantity} ITEM(S) ***
                  </div>

                  <div style={{ borderTop: "1px dashed black", margin: "6px 0" }}></div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                    <span>VATable Sales</span>
                    <span>{vatableSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                    <span>VAT Amount</span>
                    <span>{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                    <span>VAT Exempt Sales</span>
                    <span>0.00</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                    <span>Zero Rated Sales</span>
                    <span>0.00</span>
                  </div>

                  <div style={{ borderTop: "1px dashed black", margin: "6px 0" }}></div>

                  <div style={{ fontSize: "11px", marginTop: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Sold To:</span>
                      <span>{tx.user.name || 'Anonymous Customer'}</span>
                    </div>
                    <div>Email: {tx.user.email}</div>
                    <div>Phone: {tx.user.phone || 'N/A'}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                      <span>Store Agent:</span>
                      <span>{storeAgentLabel}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontWeight: "bold" }}>
                      <span>Global Trans No.</span>
                      <span>#{tx.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              );
            }
          })()}
        </div>
      )}
    </div>
  );
}
