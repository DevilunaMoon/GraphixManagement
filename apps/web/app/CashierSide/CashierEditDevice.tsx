"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, CheckCircle2, Upload } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CashierEditDevice() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deviceId = searchParams.get('id');
  const navigate = router.push;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const [deviceName, setDeviceName] = useState('');
  const [devicePrice, setDevicePrice] = useState('');
  const [deviceStocks, setDeviceStocks] = useState('');
  const [deviceSpecs, setDeviceSpecs] = useState('');
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!deviceId) {
      setError('No device ID provided');
      setIsLoading(false);
      return;
    }

    fetch(`/api/devices/${deviceId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch device');
        return res.json();
      })
      .then(data => {
        setDeviceName(data.name || '');
        setDevicePrice(data.price?.toString() || '');
        setDeviceStocks(data.stock?.toString() || '');
        setDeviceSpecs(data.specs || '');
        setExistingImage(data.image || null);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [deviceId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setError(null);
    if (!deviceName || !devicePrice || !deviceStocks) {
      setError('Device Name, Price, and Stocks are required.');
      return;
    }

    setIsSaving(true);
    const formData = new FormData();
    formData.append('deviceName', deviceName);
    formData.append('devicePrice', devicePrice);
    formData.append('deviceStocks', deviceStocks);
    formData.append('deviceSpecs', deviceSpecs);
    if (newImage) {
      formData.append('deviceImage', newImage);
    }

    try {
      const res = await fetch(`/api/devices/${deviceId}`, {
        method: 'PUT',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update device');
      }

      setSuccessModalOpen(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex-1 flex justify-center items-center p-6 font-['Signika']">
        <div className="w-12 h-12 border-4 border-purple-100 border-t-[#bd00ff] rounded-full animate-spin"></div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex justify-center items-start p-6 md:p-10 font-['Signika']">
      <div className="w-full max-w-4xl bg-white border border-[#bd00ff] rounded-2xl p-6 md:p-10 flex flex-col gap-8 shadow-sm">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
          <button onClick={() => navigate('/cashier/devices')} className="text-black hover:text-[#bd00ff] transition-colors bg-transparent border-none cursor-pointer">
            <ChevronLeft size={32} />
          </button>
          <h2 className="text-2xl font-bold text-black">Edit Device</h2>
        </div>

        {error && <div className="text-red-500 font-bold bg-red-50 p-4 rounded-lg flex justify-center text-center">{error}</div>}

        <form className="flex flex-col gap-8">
          
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
            
            {/* Image Display & Upload */}
            <div className="flex flex-col items-center gap-2">
              <label 
                htmlFor="deviceImage" 
                className="w-[150px] h-[150px] rounded-full border-2 border-dashed border-[#bd00ff] flex flex-col justify-center items-center gap-2 cursor-pointer hover:bg-purple-50 transition-colors text-[#bd00ff] overflow-hidden relative"
              >
                {imagePreview || existingImage ? (
                  <img src={imagePreview || existingImage || ''} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Upload size={32} />
                    <span className="text-sm font-semibold text-center">Change Photo</span>
                  </>
                )}
              </label>
              <input type="file" onChange={handleImageChange} id="deviceImage" accept="image/*" className="hidden" />
            </div>

            {/* Basic Fields Pre-filled */}
            <div className="flex flex-col gap-5 justify-center w-full">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-2 w-full">
                <label htmlFor="deviceName" className="w-full md:w-[120px] font-semibold text-lg text-black mb-1 md:mb-0">Device Name</label>
                <input type="text" id="deviceName" value={deviceName} onChange={e => setDeviceName(e.target.value)} className="w-full md:flex-1 h-12 min-h-[48px] border-2 border-[#bd00ff] rounded-xl px-4 text-black outline-none focus:shadow-[0_0_5px_rgba(189,0,255,0.4)] bg-transparent" />
              </div>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-2 w-full">
                <label htmlFor="devicePrice" className="w-full md:w-[120px] font-semibold text-lg text-black mb-1 md:mb-0">Price</label>
                <input type="number" step="0.01" id="devicePrice" value={devicePrice} onChange={e => setDevicePrice(e.target.value)} className="w-full md:flex-1 h-12 min-h-[48px] border-2 border-[#bd00ff] rounded-xl px-4 text-black outline-none focus:shadow-[0_0_5px_rgba(189,0,255,0.4)] bg-transparent" />
              </div>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-2 w-full">
                <label htmlFor="deviceStocks" className="w-full md:w-[120px] font-semibold text-lg text-black mb-1 md:mb-0">Stocks</label>
                <input type="number" id="deviceStocks" value={deviceStocks} onChange={e => setDeviceStocks(e.target.value)} className="w-full md:flex-1 h-12 min-h-[48px] border-2 border-[#bd00ff] rounded-xl px-4 text-black outline-none focus:shadow-[0_0_5px_rgba(189,0,255,0.4)] bg-transparent" />
              </div>
            </div>
          </div>

          {/* Specs */}
          <div className="flex flex-col md:flex-row items-start gap-1 md:gap-2 mt-4 w-full">
            <label htmlFor="deviceSpecs" className="w-full md:w-[120px] font-semibold text-lg text-black shrink-0 md:mt-3 mb-1 md:mb-0">Specs Description</label>
            <textarea 
              id="deviceSpecs" 
              rows={4} 
              value={deviceSpecs}
              onChange={e => setDeviceSpecs(e.target.value)}
              className="w-full flex-1 border-2 border-[#bd00ff] rounded-xl p-4 text-black outline-none min-h-[100px] focus:shadow-[0_0_5px_rgba(189,0,255,0.4)] resize-y bg-transparent"
            ></textarea>
          </div>

          <div className="flex justify-end mt-4">
            <button 
              type="button" 
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-3 bg-[#bd00ff] text-white font-bold rounded-xl hover:bg-[#9c00d6] transition-colors border-none cursor-pointer w-full md:w-auto text-lg disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Device'}
            </button>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      {successModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
            <h3 className="text-3xl font-extrabold text-[#111] mb-2 tracking-tight">Success!</h3>
            <p className="text-gray-600 font-medium mb-8 text-[0.95rem]">
              The device details have been updated successfully.
            </p>
            <button
              onClick={() => { setSuccessModalOpen(false); navigate('/cashier/devices'); }}
              className="w-full bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white py-3.5 rounded-full font-bold shadow-[0_8px_15px_-3px_rgba(139,0,204,0.4)] hover:shadow-[0_12px_20px_-3px_rgba(139,0,204,0.6)] hover:-translate-y-1 transition-all text-lg border-none cursor-pointer"
            >
              Back to Inventory
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
