"use client";

import { useState } from 'react';
import { ChevronLeft, ChevronDown, Image as ImageIcon, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CashierAddProgress() {
  const router = useRouter();
  const navigate = router.push;
  
  const [deviceName, setDeviceName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [progress, setProgress] = useState('');
  const [cause, setCause] = useState('');
  const [technician, setTechnician] = useState('');
  const [repairCost, setRepairCost] = useState('');
  
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!deviceName || !ownerName || !progress) {
      alert("Device Name, Owner Name, and Progress are required.");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('deviceName', deviceName);
    formData.append('ownerName', ownerName);
    formData.append('progress', progress);
    if (cause) formData.append('cause', cause);
    if (technician) formData.append('technician', technician);
    if (repairCost) formData.append('repairCost', repairCost);
    if (image) formData.append('image', image);

    try {
      const res = await fetch('/api/monitoring', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        navigate('/cashier/monitoring');
      } else {
        const errorData = await res.json();
        alert('Error: ' + errorData.error);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to save the request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 p-6 md:p-10 font-['Inter'] flex justify-center items-start">
      <div className="w-full max-w-4xl bg-white border-2 border-[#bd00ff] rounded-2xl p-6 md:p-10 flex flex-col gap-8 shadow-sm">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
          <button onClick={() => navigate('/cashier/monitoring')} className="text-black hover:text-[#bd00ff] transition-colors bg-transparent border-none cursor-pointer">
            <ChevronLeft size={32} />
          </button>
          <h2 className="text-2xl font-bold text-black border-none">Add Device Request</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
          
          {/* Image Upload */}
          <div className="flex flex-col items-center gap-4 mt-2">
            <div className="w-[180px] h-[180px] rounded-2xl border-2 border-[#bd00ff] bg-[#f4f5f7] flex justify-center items-center text-gray-400 overflow-hidden relative">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={48} />
              )}
            </div>
            <label className="flex items-center gap-2 text-black font-semibold cursor-pointer hover:text-[#bd00ff] transition-colors">
              Upload an image <Upload size={18} />
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-5">
            
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-lg text-black">Device Name</label>
              <input type="text" value={deviceName} onChange={e => setDeviceName(e.target.value)} className="h-12 border-2 border-gray-300 rounded-xl px-4 text-black outline-none focus:border-[#bd00ff] transition-colors" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-lg text-black">Name of the Owner</label>
              <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} className="h-12 border-2 border-gray-300 rounded-xl px-4 text-black outline-none focus:border-[#bd00ff] transition-colors" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-lg text-black">Progress</label>
              <div className="relative">
                <select 
                  value={progress}
                  onChange={(e) => setProgress(e.target.value)}
                  className={`w-full h-12 border-2 border-gray-300 rounded-xl px-4 outline-none focus:border-[#bd00ff] transition-colors font-semibold appearance-none bg-white cursor-pointer ${getProgressColor()}`}
                >
                  <option value=""></option>
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
              <input type="text" value={cause} onChange={e => setCause(e.target.value)} className="h-12 border-2 border-gray-300 rounded-xl px-4 text-black outline-none focus:border-[#bd00ff] transition-colors" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-lg text-black">Technician</label>
              <input type="text" value={technician} onChange={e => setTechnician(e.target.value)} className="h-12 border-2 border-gray-300 rounded-xl px-4 text-black outline-none focus:border-[#bd00ff] transition-colors" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-lg text-black">Repair Cost</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-black">₱</span>
                <input type="text" value={repairCost} onChange={e => setRepairCost(e.target.value)} className="h-12 w-full border-2 border-gray-300 rounded-xl pl-8 pr-4 text-black outline-none focus:border-[#bd00ff] transition-colors" />
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-center md:justify-end mt-4">
          <button 
            onClick={handleSave}
            disabled={isSubmitting}
            className="w-full md:w-auto px-8 py-3 bg-[#bd00ff] text-white font-bold rounded-xl hover:bg-[#9c00d6] transition-colors text-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save and Send Notifications'}
          </button>
        </div>

      </div>
    </main>
  );
}
