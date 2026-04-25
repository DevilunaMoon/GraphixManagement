"use client";

import { useState, useEffect } from 'react';
import { Pencil, FileText, Search, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DeviceProgress {
  id: string;
  deviceName: string;
  ownerName: string;
  progress: string;
  image: string | null;
  status: string;
}



export default function CashierMonitoring() {
  const router = useRouter();
  const navigate = router.push;
  const [searchQuery, setSearchQuery] = useState('');
  const [devices, setDevices] = useState<DeviceProgress[]>([]);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [successCompleteOpen, setSuccessCompleteOpen] = useState(false);
  const [deviceToComplete, setDeviceToComplete] = useState<DeviceProgress | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const ITEMS_PER_PAGE = 8;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/monitoring')
      .then(res => res.json())
      .then(data => setDevices(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const activeDevices = devices.filter(d => d.status !== 'Completed');
  const filteredDevices = activeDevices.filter(d => 
    d.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredDevices.length / ITEMS_PER_PAGE) || 1;
  const paginatedDevices = filteredDevices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getProgressColor = (progress: string) => {
    switch (progress) {
      case '100%': return 'text-green-600';
      case '75%': 
      case '50%': return 'text-yellow-500';
      case '25%':
      case '0%': return 'text-red-500';
      default: return 'text-black';
    }
  };

  const openCompleteModal = (device: DeviceProgress) => {
    setDeviceToComplete(device);
    setCompleteModalOpen(true);
  };

  const confirmComplete = async () => {
    if (deviceToComplete) {
      setIsCompleting(true);
      try {
        const res = await fetch(`/api/monitoring/${deviceToComplete.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Completed' }),
        });

        if (res.ok) {
          setDevices(prev => prev.map(d => d.id === deviceToComplete.id ? { ...d, status: 'Completed' } : d));
          setCompleteModalOpen(false);
          setSuccessCompleteOpen(true);
        } else {
          alert('Failed to complete request');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsCompleting(false);
      }
    }
  };

  return (
    <main className="flex-1 flex flex-col p-3 md:p-5 gap-5 border-2 border-[#bd00ff] mx-3 my-3 rounded-xl bg-white overflow-hidden font-['Signika'] overflow-y-auto w-auto">
        
        {/* Header and Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#bd00ff] pb-4">
          <h2 className="text-2xl font-bold text-black border-none">Devices Monitoring</h2>
          
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
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

            <button 
              onClick={() => navigate('/cashier/add-progress')}
              className="bg-[#bd00ff] hover:bg-[#9c00d6] text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-sm whitespace-nowrap w-full md:w-auto cursor-pointer border-none"
            >
              Add Request Form +
            </button>
          </div>
        </div>

        {/* Devices Table */}
        <div className="w-full mt-2">
          {isLoading ? (
            <div className="w-full py-20 flex flex-col items-center justify-center gap-4 border-2 border-[#bd00ff] rounded-2xl bg-white shadow-sm">
              <div className="w-12 h-12 border-4 border-purple-100 border-t-[#bd00ff] rounded-full animate-spin"></div>
              <p className="text-[#666] font-semibold animate-pulse text-lg">Loading devices...</p>
            </div>
          ) : paginatedDevices.length > 0 ? (
            <div className="overflow-x-auto w-full border-2 border-[#bd00ff] rounded-2xl bg-white shadow-sm">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#bd00ff]/20 text-gray-700">
                    <th className="p-4 font-bold text-center w-28 text-[1.05rem]">Device</th>
                    <th className="p-4 font-bold text-[1.05rem]">Device Name</th>
                    <th className="p-4 font-bold text-[1.05rem]">Owner Name</th>
                    <th className="p-4 font-bold text-center text-[1.05rem]">Progress</th>
                    <th className="p-4 font-bold text-center text-[1.05rem]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDevices.map(device => (
                    <tr key={device.id} className="border-b border-gray-100/80 hover:bg-purple-50/50 transition-colors group">
                      <td className="p-4 flex justify-center align-middle">
                        <div className="h-16 w-16 shrink-0 rounded-full border border-gray-200 flex justify-center items-center overflow-hidden bg-white shadow-sm group-hover:border-[#bd00ff]/40 transition-colors">
                          {device.image ? (
                            <img src={device.image} alt={device.deviceName} className="h-full w-full object-contain p-1" />
                          ) : (
                            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">No Img</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-[1.1rem] text-black align-middle">{device.deviceName}</td>
                      <td className="p-4 text-gray-600 font-semibold text-base align-middle">{device.ownerName}</td>
                      <td className="p-4 align-middle text-center">
                        <span className={`font-bold text-lg ${getProgressColor(device.progress)}`}>{device.progress}</span>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex gap-4 justify-center items-center">
                          <button 
                            onClick={() => navigate('/cashier/edit-progress?id=' + device.id)}
                            className="w-11 h-11 rounded-full flex justify-center items-center bg-[#bd00ff] text-white hover:bg-[#9c00d6] hover:scale-110 transition-all shadow-md"
                            title="Edit Progress"
                          >
                            <Pencil size={18} />
                          </button>
                          <button 
                            onClick={() => openCompleteModal(device)}
                            className="w-11 h-11 rounded-full flex justify-center items-center bg-[#ffb703] text-white hover:bg-[#e0a100] hover:scale-110 transition-all shadow-md"
                            title="Complete Request"
                          >
                            <FileText size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="w-full py-12 text-center flex flex-col items-center justify-center border-2 border-[#bd00ff] rounded-2xl bg-white shadow-sm gap-2">
               <AlertCircle className="text-gray-400 w-12 h-12 mb-2" />
               <span className="text-gray-500 font-bold text-lg">No tracking requests available.</span>
               <span className="text-gray-400 text-sm">Add a new request form to see it here.</span>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {filteredDevices.length > ITEMS_PER_PAGE && (
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

      {/* Complete Confirmation Modal */}
      {completeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-[400px] w-full text-center shadow-2xl animate-in zoom-in-95 flex flex-col items-center">
            <AlertCircle className="text-yellow-500 w-16 h-16 mb-5" />
            <h3 className="text-xl font-bold mb-3 text-black">Complete Request?</h3>
            <p className="text-gray-600 mb-8">
              Are you sure you want to complete the request for <strong className="text-black">{deviceToComplete?.deviceName}</strong>?
            </p>
            <div className="flex gap-4 w-full justify-center">
              <button 
                onClick={() => setCompleteModalOpen(false)}
                className="px-6 py-2.5 border border-gray-400 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmComplete}
                disabled={isCompleting}
                className="px-6 py-2.5 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors disabled:opacity-50"
              >
                {isCompleting ? 'Completing...' : 'Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successCompleteOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-[400px] w-full text-center shadow-2xl animate-in zoom-in-95 flex flex-col items-center">
            <CheckCircle2 className="text-green-500 w-16 h-16 mb-5" />
            <h3 className="text-xl font-bold mb-3 text-black">Completed Successfully</h3>
            <p className="text-gray-600 mb-8">
              The request for <strong className="text-black">{deviceToComplete?.deviceName}</strong> has been marked as completed.
            </p>
            <button 
              onClick={() => setSuccessCompleteOpen(false)}
              className="px-8 py-2.5 bg-[#bd00ff] text-white rounded-lg font-medium hover:bg-[#9c00d6] transition-colors w-full"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
