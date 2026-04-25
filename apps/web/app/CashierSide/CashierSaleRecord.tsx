"use client";

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Filter, Search, ChevronRight, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Record {
  id: number;
  orderId: string;
  deviceName: string;
  price: string;
  amount: string;
  change: string;
  qty: string;
  customerName: string;
}

const INITIAL_RECORDS: Record[] = [
  { id: 7, orderId: '#7', deviceName: 'Techno Pova Pro 5g', price: '10,000', amount: '11,000', change: '1,000', qty: '1', customerName: 'Charlie Kirk' },
  { id: 6, orderId: '#6', deviceName: 'Iphone Pro Max', price: '10,000', amount: '11,000', change: '1,000', qty: '1', customerName: 'P. Diddy' },
  { id: 5, orderId: '#5', deviceName: 'Realme C85', price: '10,000', amount: '11,000', change: '1,000', qty: '1', customerName: 'Jeffrey Epstein' },
  { id: 4, orderId: '#4', deviceName: 'Realme Note 50', price: '10,000', amount: '11,000', change: '1,000', qty: '1', customerName: 'Alice Gou' },
  { id: 3, orderId: '#3', deviceName: 'Oppo A12', price: '10,000', amount: '11,000', change: '1,000', qty: '1', customerName: 'John Doe' },
  { id: 2, orderId: '#2', deviceName: 'Oppo A12', price: '10,000', amount: '11,000', change: '1,000', qty: '1', customerName: 'Leon Kennedy' },
  { id: 1, orderId: '#1', deviceName: 'Realme C85', price: '10,000', amount: '11,000', change: '1,000', qty: '1', customerName: 'Ethan Winters' },
];

export default function CashierSaleRecord() {
  const router = useRouter();
  const navigate = router.push;
  const [searchQuery, setSearchQuery] = useState('');
  const [sortFilter, setSortFilter] = useState('Newest');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortedAndFilteredRecords = INITIAL_RECORDS.filter(record => 
    record.orderId.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    if (sortFilter === 'Newest') return b.id - a.id;
    return a.id - b.id;
  });

  return (
    <main className="flex-1 flex flex-col p-3 md:p-5 gap-5 border-2 border-[#bd00ff] mx-3 my-3 rounded-xl bg-white overflow-hidden font-['Signika'] overflow-y-auto w-auto">
        
        {/* Header Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/cashier/dashboard')} className="text-black hover:text-[#bd00ff] transition-colors border-none bg-transparent cursor-pointer">
              <ChevronLeft size={28} />
            </button>
            <h2 className="text-2xl font-bold text-black border-none">Sale Record</h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Filter */}
            <div className="relative" ref={filterRef}>
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center justify-center w-full sm:w-auto bg-white border border-[#bd00ff] rounded-lg px-6 py-2.5 text-[1.1rem] text-black cursor-pointer hover:bg-gray-50 transition-colors gap-2"
              >
                <Filter size={18} />
                <span className="font-medium">{sortFilter}</span>
              </button>

              {isFilterOpen && (
                <div className="absolute top-[110%] left-0 bg-white border border-[#bd00ff] rounded-lg shadow-lg min-w-[150px] flex flex-col py-2 z-10 transition-all">
                  {['Newest', 'Oldest'].map(opt => (
                    <div 
                      key={opt}
                      className="px-5 py-2 cursor-pointer hover:bg-purple-50 hover:text-[#bd00ff] font-medium transition-colors text-black"
                      onClick={() => { setSortFilter(opt); setIsFilterOpen(false); }}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Search */}
            <div className="flex items-center border border-[#bd00ff] rounded-lg px-4 py-2 bg-white flex-1 sm:max-w-[300px]">
              <Search size={18} className="text-gray-400" />
              <input 
                type="text" 
                placeholder="Search By ID or Order ID" 
                className="border-none outline-none pl-3 text-sm w-full text-black placeholder-gray-400 bg-transparent font-medium"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table container */}
        <div className="w-full border border-gray-200 rounded-xl mt-2 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-[#BF00FF] to-[#4B0082] text-white">
                <th className="px-5 py-4 font-semibold border-b-2 border-transparent">Order ID</th>
                <th className="px-5 py-4 font-semibold border-b-2 border-transparent">Device Name</th>
                <th className="px-5 py-4 font-semibold border-b-2 border-transparent hidden md:table-cell">Price</th>
                <th className="px-5 py-4 font-semibold border-b-2 border-transparent hidden md:table-cell">Amount</th>
                <th className="px-5 py-4 font-semibold border-b-2 border-transparent hidden md:table-cell">Change</th>
                <th className="px-5 py-4 font-semibold border-b-2 border-transparent hidden md:table-cell">Quantity</th>
                <th className="px-5 py-4 font-semibold border-b-2 border-transparent hidden md:table-cell">Customer Name</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredRecords.map((record, index) => (
                <tr 
                  key={record.id} 
                  className={`hover:bg-purple-50 transition-colors cursor-pointer md:cursor-default ${index !== sortedAndFilteredRecords.length - 1 ? 'border-b border-gray-100' : ''}`}
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      setSelectedRecord(record);
                    }
                  }}
                >
                  <td className="px-5 py-4 font-semibold text-black">{record.orderId}</td>
                  <td className="px-5 py-4 text-gray-700 font-medium whitespace-pre-wrap">{record.deviceName.replace(' ', '\n')}</td>
                  <td className="px-5 py-4 text-gray-700 font-medium hidden md:table-cell">{record.price}</td>
                  <td className="px-5 py-4 text-gray-700 font-medium hidden md:table-cell">{record.amount}</td>
                  <td className="px-5 py-4 text-gray-700 font-medium hidden md:table-cell">{record.change}</td>
                  <td className="px-5 py-4 text-gray-700 font-medium hidden md:table-cell">{record.qty}</td>
                  <td className="px-5 py-4 text-gray-700 font-medium hidden md:table-cell">{record.customerName}</td>
                </tr>
              ))}
              {sortedAndFilteredRecords.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500 font-medium">No records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-center items-center gap-4 mt-2">
          <button className="text-black hover:scale-125 transition-transform bg-transparent border-none cursor-pointer"><ChevronLeft size={20} /></button>
          <span className="font-semibold text-xl text-black">1/1</span>
          <button className="text-black hover:scale-125 transition-transform bg-transparent border-none cursor-pointer"><ChevronRight size={20} /></button>
        </div>

      {/* Mobile Record Info Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedRecord(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-black/5 flex justify-between items-center bg-purple-50/50">
              <h3 className="font-bold text-[#111] text-lg">Sale Record Details</h3>
              <button className="text-gray-400 hover:text-black transition-colors bg-transparent border-none cursor-pointer" onClick={() => setSelectedRecord(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4 text-left">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-[#666] font-medium">Order ID</span>
                <span className="font-bold text-[#111]">{selectedRecord.orderId}</span>
              </div>
              <div className="flex flex-col pb-3 border-b border-gray-100">
                <span className="text-[#666] font-medium mb-1">Device Name</span>
                <span className="font-bold text-[#111]">{selectedRecord.deviceName}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-[#666] font-medium">Customer</span>
                <span className="font-bold text-[#111] text-right">{selectedRecord.customerName}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-[#666] font-medium text-sm">Price</span>
                  <span className="font-bold text-[#111]">{selectedRecord.price}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[#666] font-medium text-sm">Amount Paid</span>
                  <span className="font-bold text-green-600">{selectedRecord.amount}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="flex flex-col">
                  <span className="text-[#666] font-medium text-sm">Change</span>
                  <span className="font-bold text-red-500">{selectedRecord.change}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[#666] font-medium text-sm">Quantity</span>
                  <span className="font-bold text-[#111]">{selectedRecord.qty}</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50/80 border-t border-black/5">
              <button 
                className="w-full py-2.5 rounded-xl bg-[#bd00ff] text-white font-semibold hover:bg-purple-700 transition-colors cursor-pointer border-none"
                onClick={() => setSelectedRecord(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
