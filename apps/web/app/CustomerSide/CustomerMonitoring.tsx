"use client";

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MonitoringDevice {
  id: string;
  deviceName: string;
  ownerName: string;
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

  const ITEMS_PER_PAGE = 8;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/monitoring')
      .then(res => res.json())
      .then(data => setDevices(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortedDevices = [...devices]
    .filter(d => d.ownerName.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // Basic sorting mock: in a real app you'd sort by a createdAt Date string
      if (filter === 'Newest') return a.deviceName.localeCompare(b.deviceName); // temporary sort
      return b.deviceName.localeCompare(a.deviceName);
    });

  const totalPages = Math.ceil(sortedDevices.length / ITEMS_PER_PAGE) || 1;
  const paginatedDevices = sortedDevices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getSemanticStatus = (device: MonitoringDevice) => {
    if (device.status === 'Completed' || device.progress === '100%') return 'Completed';
    if (device.progress === '0%' || device.progress === '25%') return 'Diagnosis';
    if (device.progress === '50%' || device.progress === '75%') return 'Repairing';
    return 'Pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Repairing': return 'text-orange-500';
      case 'Diagnosis': return 'text-blue-500';
      case 'Completed': return 'text-green-500';
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
            <h2 className="text-2xl font-bold text-inherit border-none m-0">Device Monitoring Progress</h2>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            {/* Search Bar */}
            <div className="flex items-center border border-[#bd00ff] rounded-lg px-4 py-2 bg-white w-full md:w-[300px]">
              <Search size={20} className="text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by the Owner..." 
                className="border-none outline-none pl-3 text-sm w-full text-black placeholder-gray-400 bg-transparent font-medium"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative w-full md:w-auto" ref={filterRef}>
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center justify-between gap-2 px-5 py-2.5 bg-white border border-[#bd00ff] rounded-lg text-black font-semibold cursor-pointer hover:bg-gray-50 transition-colors w-full md:w-auto"
              >
                <span>{filter}</span>
                {isFilterOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              
              {isFilterOpen && (
                <div className="absolute top-[110%] right-0 bg-white border border-[#bd00ff] rounded-lg shadow-lg w-full min-w-[120px] flex flex-col overflow-hidden z-10">
                  <button 
                    onClick={() => { setFilter('Newest'); setIsFilterOpen(false); }}
                    className={`px-4 py-2.5 text-left border-none cursor-pointer transition-colors ${filter === 'Newest' ? 'bg-[#bd00ff] text-white font-bold' : 'bg-transparent text-black hover:bg-purple-50'}`}
                  >
                    Newest
                  </button>
                  <button 
                    onClick={() => { setFilter('Oldest'); setIsFilterOpen(false); }}
                    className={`px-4 py-2.5 text-left border-none cursor-pointer transition-colors ${filter === 'Oldest' ? 'bg-[#bd00ff] text-white font-bold' : 'bg-transparent text-black hover:bg-purple-50'}`}
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
                  className="bg-white rounded-xl p-2 sm:p-4 shadow-sm border-2 border-[#5c0099] flex flex-col gap-2 sm:gap-4 cursor-pointer hover:shadow-md md:hover:-translate-y-1 transition-all group items-center text-center"
                >
                  <div className="h-24 sm:h-32 w-auto flex justify-center items-center overflow-hidden mb-1 sm:mb-2">
                    {device.image ? (
                      <img src={device.image} alt={device.deviceName} className="h-full w-auto object-contain mix-blend-multiply md:group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400">No Image</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 sm:gap-1 w-full text-black">
                    <p className="font-bold text-xs sm:text-sm leading-tight">Device Name: <span className="font-normal">{device.deviceName}</span></p>
                    <div className="h-[1px] bg-gray-200 w-full my-1"></div>
                    <p className="font-bold text-xs sm:text-sm">Owner: <span className="font-normal">{device.ownerName}</span></p>
                    <p className="text-black font-semibold text-xs sm:text-sm">Progress: <span className={`ml-1 font-bold ${getStatusColor(semanticStatus)}`}>{semanticStatus}</span></p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-10 text-center text-gray-500 font-bold">No active monitoring devices.</div>
          )}
        </div>

        {/* Pagination */}
        {sortedDevices.length > ITEMS_PER_PAGE && (
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
    </main>
  );
}
