"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronDown, Upload } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CashierEditProgress() {
  const router = useRouter();
  const navigate = router.push;
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [deviceData, setDeviceData] = useState<any>(null);
  const [progress, setProgress] = useState('0%');
  const [cause, setCause] = useState('');
  const [technician, setTechnician] = useState('');
  const [repairCost, setRepairCost] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      fetch(`/api/monitoring/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setDeviceData(data);
            setProgress(data.progress || '0%');
            setCause(data.cause || '');
            setTechnician(data.technician || '');
            setRepairCost(data.repairCost || '');
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [id]);

  const getProgressColor = () => {
    switch (progress) {
      case '100%': return 'text-green-600';
      case '75%': 
      case '50%': return 'text-yellow-500';
      case '25%':
      case '0%': return 'text-red-500';
      default: return 'text-black';
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/monitoring/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress,
          cause,
          technician,
          repairCost
        })
      });

      if (res.ok) {
        navigate('/cashier/monitoring');
      } else {
        alert('Failed to update progress.');
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      alert('An external error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex-1 p-6 md:p-10 font-['Signika'] flex justify-center items-center h-screen">
        <div className="w-12 h-12 border-4 border-purple-100 border-t-[#bd00ff] rounded-full animate-spin"></div>
      </main>
    );
  }

  if (!deviceData && !isLoading) {
    return (
      <main className="flex-1 p-6 md:p-10 font-['Signika'] flex flex-col justify-center items-center h-screen gap-4">
        <h2 className="text-xl font-bold">Device Data Not Found</h2>
        <button onClick={() => navigate('/cashier/monitoring')} className="px-6 py-2 bg-[#bd00ff] text-white rounded-lg">Return to Monitoring</button>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 md:p-10 font-['Signika'] flex justify-center items-start">
      <div className="w-full max-w-4xl bg-white border-2 border-[#bd00ff] rounded-2xl p-6 md:p-10 flex flex-col gap-8 shadow-sm">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
          <button onClick={() => navigate('/cashier/monitoring')} className="text-black hover:text-[#bd00ff] transition-colors bg-transparent border-none cursor-pointer">
            <ChevronLeft size={32} />
          </button>
          <h2 className="text-2xl font-bold text-black border-none">Edit Device Progress</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
          
          {/* Internal Image Display */}
          <div className="flex flex-col items-center gap-4 mt-2">
            <div className="w-[180px] h-[180px] rounded-2xl border-2 border-[#bd00ff] bg-white flex justify-center items-center overflow-hidden p-2">
              {deviceData.image ? (
                <img src={deviceData.image} alt={deviceData.deviceName} className="w-full h-full object-contain" />
              ) : (
                <span className="text-gray-400 font-bold">No Image</span>
              )}
            </div>
          </div>

          {/* Dynamic Form Fields */}
          <div className="flex flex-col gap-5">
            
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-lg text-black">Device Name</label>
              <input type="text" value={deviceData.deviceName} readOnly className="h-12 border-2 border-gray-200 bg-gray-50 rounded-xl px-4 text-gray-500 outline-none cursor-not-allowed" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-lg text-black">Name of the Owner</label>
              <input type="text" value={deviceData.ownerName} readOnly className="h-12 border-2 border-gray-200 bg-gray-50 rounded-xl px-4 text-gray-500 outline-none cursor-not-allowed" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-lg text-black">Progress</label>
              <div className="relative">
                <select 
                  value={progress}
                  onChange={(e) => setProgress(e.target.value)}
                  className={`w-full h-12 border-2 border-gray-300 rounded-xl px-4 outline-none focus:border-[#bd00ff] transition-colors font-semibold appearance-none bg-white cursor-pointer ${getProgressColor()}`}
                >
                  <option value="0%" className="text-red-500 font-semibold">0%</option>
                  <option value="25%" className="text-red-500 font-semibold">25%</option>
                  <option value="50%" className="text-yellow-500 font-semibold">50%</option>
                  <option value="75%" className="text-yellow-500 font-semibold">75%</option>
                  <option value="100%" className="text-green-600 font-semibold">100%</option>
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <ChevronDown size={20} className="text-gray-500" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-lg text-black">Cause of the problem</label>
              <input 
                type="text" 
                value={cause}
                onChange={(e) => setCause(e.target.value)}
                placeholder="e.g. Broken LCD" 
                className="h-12 border-2 border-gray-300 rounded-xl px-4 text-black outline-none focus:border-[#bd00ff] transition-colors" 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-lg text-black">Technician</label>
              <input 
                type="text" 
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="Technician Name" 
                className="h-12 border-2 border-gray-300 rounded-xl px-4 text-black outline-none focus:border-[#bd00ff] transition-colors" 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-lg text-black">Repair Cost</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-black">₱</span>
                <input 
                  type="text" 
                  value={repairCost}
                  onChange={(e) => setRepairCost(e.target.value)}
                  placeholder="2,000" 
                  className="h-12 w-full border-2 border-gray-300 rounded-xl pl-8 pr-4 text-black outline-none focus:border-[#bd00ff] transition-colors" 
                />
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-center md:justify-end mt-4">
           <button 
             onClick={handleSave}
             disabled={isSaving}
             className="w-full md:w-auto px-8 py-3 bg-[#bd00ff] text-white font-bold rounded-xl hover:bg-[#9c00d6] transition-colors text-lg disabled:opacity-50"
           >
             {isSaving ? "Saving..." : "Save and Send Notifications"}
           </button>
        </div>

      </div>
    </main>
  );
}
