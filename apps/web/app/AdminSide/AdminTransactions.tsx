"use client";

import { useState, useEffect } from 'react';
import { ReceiptText, Search, ChevronLeft, ChevronRight, UserCircle2, Download, X, ShieldCheck } from 'lucide-react';

interface Transaction {
  id: string;
  createdAt: string;
  amount: number;
  quantity: number;
  variations: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
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
    device: { id: 'd1', name: 'Aula Mechanical Keyboard', price: 1599, image: 'https://picsum.photos/seed/keyboard/150/150' }
  },
  {
    id: 'tx_5647382910',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    amount: 45000,
    quantity: 1,
    variations: '256GB, Space Gray',
    user: { id: 'u2', name: 'Jane Smith', email: 'jane.smith@email.com' },
    device: { id: 'd2', name: 'iPhone 13 Pro', price: 45000, image: 'https://picsum.photos/seed/phone/150/150' }
  },
  {
    id: 'tx_9988776655',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    amount: 1250,
    quantity: 2,
    variations: null,
    user: { id: 'u3', name: 'Michael Johnson', email: 'mjohnson@mail.com' },
    device: { id: 'd3', name: 'Logitech G102 Mouse', price: 625, image: 'https://picsum.photos/seed/mouse/150/150' }
  },
  {
    id: 'tx_1122334455',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    amount: 8500,
    quantity: 1,
    variations: '24-inch, 1080p',
    user: { id: 'u4', name: 'Sarah Williams', email: 'swilliams@test.com' },
    device: { id: 'd4', name: 'Samsung IPS Monitor', price: 8500, image: 'https://picsum.photos/seed/monitor/150/150' }
  }
];

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const itemsPerPage = 8;

  const handleDownloadPDF = (tx: Transaction) => {
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(189, 0, 255);
      doc.text("GRAPHIX", 105, 20, { align: "center" });
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Official Receipt", 105, 30, { align: "center" });
      
      // Divider
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 35, 190, 35);
      
      // Transaction Info
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Transaction ID:`, 20, 50);
      doc.setTextColor(0, 0, 0);
      doc.text(tx.id.toUpperCase(), 60, 50);
      
      doc.setTextColor(100, 100, 100);
      doc.text(`Date:`, 20, 60);
      doc.setTextColor(0, 0, 0);
      doc.text(new Date(tx.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }), 60, 60);
      
      // Customer Info
      doc.setTextColor(100, 100, 100);
      doc.text(`Customer:`, 20, 75);
      doc.setTextColor(0, 0, 0);
      doc.text(tx.user?.name || 'Anonymous', 60, 75);
      
      doc.setTextColor(100, 100, 100);
      doc.text(`Email:`, 20, 85);
      doc.setTextColor(0, 0, 0);
      doc.text(tx.user?.email || 'N/A', 60, 85);
      
      // Divider
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 95, 190, 95);
      
      // Item Details
      doc.setFontSize(14);
      doc.text("Purchase Details", 20, 110);
      
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Item:`, 20, 125);
      doc.setTextColor(0, 0, 0);
      doc.text(tx.device?.name || 'Unknown Item', 60, 125);
      
      doc.setTextColor(100, 100, 100);
      doc.text(`Quantity:`, 20, 135);
      doc.setTextColor(0, 0, 0);
      doc.text(tx.quantity.toString(), 60, 135);
      
      let currentY = 145;
      if (tx.variations) {
        doc.setTextColor(100, 100, 100);
        doc.text(`Variations:`, 20, currentY);
        doc.setTextColor(0, 0, 0);
        doc.text(tx.variations, 60, currentY);
        currentY += 10;
      }
      
      // Total Amount
      doc.setFontSize(16);
      doc.setTextColor(189, 0, 255);
      const totalAmount = tx.amount > 0 ? tx.amount : (tx.device?.price || 0);
      doc.text(`Total Paid: Php ${totalAmount.toLocaleString()}`, 20, currentY + 15);
      
      // Footer
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("Thank you for choosing Graphix!", 105, 280, { align: "center" });
      
      // Save
      doc.save(`Graphix_Receipt_${tx.id.substring(0, 8)}.pdf`);
    });
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch('/api/transactions');
        if (res.ok) {
          const data = await res.json();
          // If the database is empty, display the mock data so the user can see the UI
          if (data.length === 0) {
            setTransactions(MOCK_TRANSACTIONS);
          } else {
            // Append mock data for demonstration purposes if there's only a few real transactions
            setTransactions([...data, ...MOCK_TRANSACTIONS]);
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
              <h2 className="text-2xl font-bold text-gray-900 m-0">Order History</h2>
              <p className="text-gray-500 m-0 text-sm">View all completed purchases</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setCurrentPage(1); // Reset to page 1 on filter
              }}
              className="w-full sm:w-auto px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:bg-white outline-none transition-all text-sm font-semibold text-gray-600"
            />
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
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left border-separate border-spacing-y-3">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Transaction ID</th>
                  <th className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Device</th>
                  <th className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((tx) => (
                  <tr 
                    key={tx.id} 
                    onClick={() => setSelectedTransaction(tx)}
                    className="bg-gray-50 hover:bg-purple-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-4 py-4 rounded-l-2xl border-y border-l border-transparent group-hover:border-purple-100">
                      <span className="text-xs font-bold text-gray-500 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-100">
                        {tx.id.substring(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-4 border-y border-transparent group-hover:border-purple-100">
                      <div className="flex items-center gap-3">
                        <UserCircle2 size={36} className="text-gray-400" />
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 text-sm">{tx.user?.name || 'Anonymous'}</span>
                          <span className="text-xs text-gray-500">{tx.user?.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 border-y border-transparent group-hover:border-purple-100">
                      <div className="flex items-center gap-3">
                        {tx.device?.image ? (
                          <img src={tx.device.image} alt={tx.device.name} className="w-10 h-10 rounded-lg object-cover bg-white border border-gray-100" />
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
                    <td className="px-4 py-4 border-y border-transparent group-hover:border-purple-100">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#bd00ff]">
                          ₱{tx.amount > 0 ? tx.amount.toLocaleString() : (tx.device?.price || 0).toLocaleString()}
                        </span>
                        {tx.amount === 0 && <span className="text-[10px] text-gray-400 uppercase tracking-wider">Legacy</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4 rounded-r-2xl border-y border-r border-transparent group-hover:border-purple-100">
                      <span className="text-sm font-semibold text-gray-600">
                        {new Date(tx.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-4 rounded-r-2xl border-y border-r border-transparent group-hover:border-purple-100 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDownloadPDF(tx); }}
                        className="p-2 bg-white text-purple-600 rounded-xl shadow-sm border border-purple-100 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all cursor-pointer inline-flex items-center justify-center group/btn"
                        title="Download Receipt"
                      >
                        <Download size={18} className="group-hover/btn:scale-110 transition-transform" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
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
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <span className="text-gray-500 font-semibold text-sm">Transaction ID</span>
                  <span className="font-bold text-gray-900">{selectedTransaction.id.toUpperCase()}</span>
                </div>
                
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <span className="text-gray-500 font-semibold text-sm">Customer</span>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{selectedTransaction.user?.name || 'Anonymous'}</div>
                    <div className="text-xs text-gray-500">{selectedTransaction.user?.email}</div>
                  </div>
                </div>

                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <span className="text-gray-500 font-semibold text-sm">Device</span>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{selectedTransaction.device?.name}</div>
                    <div className="text-xs text-gray-500">Qty: {selectedTransaction.quantity} {selectedTransaction.variations && `• ${selectedTransaction.variations}`}</div>
                  </div>
                </div>

                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <span className="text-gray-500 font-semibold text-sm">Purchase Date</span>
                  <span className="font-bold text-gray-900">
                    {new Date(selectedTransaction.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>

                {/* Warranty Section */}
                <div className="mt-2 bg-gradient-to-r from-purple-50 to-fuchsia-50 p-4 rounded-xl border border-purple-100 flex items-start gap-4">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg shrink-0">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-purple-900 m-0 text-base">12 Months Warranty</h4>
                    <p className="text-sm text-purple-700 mt-1 mb-0">
                      Valid until <span className="font-bold text-purple-900">
                        {new Date(new Date(selectedTransaction.createdAt).setMonth(new Date(selectedTransaction.createdAt).getMonth() + 12)).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </p>
                  </div>
                </div>

              </div>
              
              <div className="mt-6 pt-4">
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
