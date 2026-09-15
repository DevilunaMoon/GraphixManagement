"use client";

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search, Wrench, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CustomerRepairRequestModal from '../../components/CustomerSide/CustomerRepairRequestModal';

interface MonitoringDevice {
  id: string;
  deviceName: string;
  ownerName?: string;
  progress: string;
  image: string | null;
  status: string;
}

export default function CustomerMonitoring() {
  const router = useRouter();
  const navigate = router.push;
  const [filter, setFilter] = useState('Newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [devices, setDevices] = useState<MonitoringDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const ITEMS_PER_PAGE = 8;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, debouncedSearchQuery]);

  const fetchDevices = () => {
    setIsLoading(true);
    fetch(`/api/monitoring?page=${currentPage}&limit=${ITEMS_PER_PAGE}&search=${encodeURIComponent(debouncedSearchQuery)}&sort=${encodeURIComponent(filter)}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch paginated devices");
        return res.json();
      })
      .then(data => {
        if (data && Array.isArray(data.requests)) {
          setDevices(data.requests);
          setTotalCount(data.totalCount || 0);
          setTotalPages(data.totalPages || 1);
        } else {
          setDevices([]);
          setTotalCount(0);
          setTotalPages(1);
        }
      })
      .catch(err => {
        console.error(err);
        setDevices([]);
        setTotalCount(0);
        setTotalPages(1);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchDevices();
  }, [currentPage, debouncedSearchQuery, filter]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const paginatedDevices = devices;

  const getSemanticStatus = (device: MonitoringDevice) => {
    const prog = (device.progress || '').toLowerCase();
    if (prog === 'rejected' || prog === 'cancelled' || device.status?.toLowerCase() === 'cancelled') return 'Rejected';
    if (device.status === 'Completed' || device.progress === '100%' || prog === 'completed') return 'Completed';
    if (prog === 'pending') return 'Pending';
    if (prog === 'accepted') return 'Accepted';
    if (device.progress === '0%' || device.progress === '25%' || prog === 'diagnostic' || prog === 'diagnosis') return 'Diagnosis';
    if (device.progress === '50%' || device.progress === '75%' || prog === 'repairing') return 'Repairing';
    return 'Pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'text-amber-500';
      case 'Accepted': return 'text-blue-600';
      case 'Repairing': return 'text-orange-500';
      case 'Diagnosis': return 'text-blue-500';
      case 'Completed': return 'text-green-500';
      case 'Rejected': return 'text-red-500';
      default: return 'text-black';
    }
  };

  return (
    <main className="flex-1 p-6 md:p-10 font-['Inter'] flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-7xl flex flex-col gap-6">

        {/* Header & Filter */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-gray-200 pb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="flex items-center justify-center w-10 h-10 rounded-xl border-2 border-gray-200 bg-white hover:border-[#bd00ff] hover:text-[#bd00ff] text-gray-500 cursor-pointer transition-all shrink-0 p-0"
              title="Go Back"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-inherit border-none m-0">Device Monitoring Progress</h2>
              <p className="text-xs text-gray-500 m-0 mt-0.5">Track your repair progress or submit a new repair request</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Request Repair Button */}
            <button
              onClick={() => setIsRequestModalOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-[#bd00ff] hover:from-purple-700 hover:to-[#9c00d6] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer border-none w-full sm:w-auto text-sm shrink-0"
            >
              <Plus size={18} />
              <span>Request Repair</span>
            </button>

            {/* Search Bar */}
            <div className="flex items-center border border-[#bd00ff] rounded-xl px-4 py-2 bg-white w-full sm:w-[240px] md:w-[280px]">
              <Search size={18} className="text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by Device Name..." 
                className="border-none outline-none pl-2.5 text-sm w-full text-black placeholder-gray-400 bg-transparent font-medium"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative w-full sm:w-auto" ref={filterRef}>
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center justify-between gap-2 px-4 py-2.5 bg-white border border-[#bd00ff] rounded-xl text-black font-semibold cursor-pointer hover:bg-gray-50 transition-colors w-full sm:w-auto text-sm"
              >
                <span>{filter}</span>
                {isFilterOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              
              {isFilterOpen && (
                <div className="absolute top-[110%] right-0 bg-white border border-[#bd00ff] rounded-xl shadow-lg w-full min-w-[120px] flex flex-col overflow-hidden z-10">
                  <button 
                    onClick={() => { setFilter('Newest'); setIsFilterOpen(false); }}
                    className={`px-4 py-2.5 text-left border-none cursor-pointer transition-colors text-sm ${filter === 'Newest' ? 'bg-[#bd00ff] text-white font-bold' : 'bg-transparent text-black hover:bg-purple-50'}`}
                  >
                    Newest
                  </button>
                  <button 
                    onClick={() => { setFilter('Oldest'); setIsFilterOpen(false); }}
                    className={`px-4 py-2.5 text-left border-none cursor-pointer transition-colors text-sm ${filter === 'Oldest' ? 'bg-[#bd00ff] text-white font-bold' : 'bg-transparent text-black hover:bg-purple-50'}`}
                  >
                    Oldest
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {isLoading ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-purple-100 border-t-[#5c0099] rounded-full animate-spin"></div>
              <p className="text-[#666] font-semibold animate-pulse text-lg">Loading devices...</p>
            </div>
          ) : paginatedDevices.length > 0 ? (
            paginatedDevices.map(device => {
              const semanticStatus = getSemanticStatus(device);
              return (
                <div 
                  key={device.id} 
                  onClick={() => navigate('/customer/device-info/' + device.id)}
                  className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border-2 border-[#5c0099] flex flex-col gap-2 sm:gap-3 cursor-pointer hover:shadow-md md:hover:-translate-y-1 transition-all group items-center text-center relative"
                >
                  <div className="h-24 sm:h-32 w-full flex justify-center items-center overflow-hidden mb-1 rounded-xl bg-gray-50 p-2">
                    {device.image ? (
                      <img src={device.image} alt={device.deviceName} className="h-full w-auto object-contain mix-blend-multiply md:group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 text-xs font-medium">No Image</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 sm:gap-1 w-full text-black">
                    <p className="font-bold text-xs sm:text-sm leading-tight truncate">Device: <span className="font-semibold text-gray-800">{device.deviceName}</span></p>
                    <div className="h-[1px] bg-gray-200 w-full my-1"></div>
                    <p className="text-gray-700 font-semibold text-xs sm:text-sm flex items-center justify-center">
                      Progress: <span className={`ml-1 font-bold ${getStatusColor(semanticStatus)}`}>{semanticStatus}</span>
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-16 text-center flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border-2 border-dashed border-gray-200">
              <Wrench size={40} className="text-purple-300" />
              <p className="text-gray-500 font-bold text-base m-0">No active monitoring devices.</p>
              <p className="text-gray-400 text-xs m-0">Have a device that needs repair? Click the button below to submit a request.</p>
              <button
                onClick={() => setIsRequestModalOpen(true)}
                className="mt-2 px-5 py-2.5 bg-[#bd00ff] hover:bg-[#9c00d6] text-white font-bold rounded-xl text-sm shadow transition-colors cursor-pointer border-none"
              >
                + Request Repair Now
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="flex justify-center w-full mt-6">
            <div className="flex items-center justify-center gap-6 bg-white px-6 py-2 rounded-full shadow-sm border border-gray-100 mx-auto">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="bg-transparent border-none text-black cursor-pointer hover:text-[#bd00ff] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-black flex justify-center items-center p-0"
              >
                <ChevronLeft size={24} />
              </button>
              <span className="font-bold text-lg text-black">
                {currentPage}/{totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="bg-transparent border-none text-black cursor-pointer hover:text-[#bd00ff] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-black flex justify-center items-center p-0"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Customer Repair Request Modal */}
      <CustomerRepairRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={() => {
          fetchDevices();
        }}
      />
    </main>
  );
}
