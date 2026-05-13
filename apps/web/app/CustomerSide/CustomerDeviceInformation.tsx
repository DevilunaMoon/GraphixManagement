"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CustomerDeviceInformationProps {
  deviceId?: string;
}

export default function CustomerDeviceInformation({ deviceId }: CustomerDeviceInformationProps) {
  const router = useRouter();
  const navigate = router.push;
  const [feedback, setFeedback] = useState('');
  const [sentiment, setSentiment] = useState<'Positive' | 'Negative'>('Positive');
  const [isSaved, setIsSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [device, setDevice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!deviceId) return;
    setIsLoading(true);
    fetch(`/api/monitoring/${deviceId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setDevice(data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [deviceId]);

  const handleSave = async () => {
    if (!feedback.trim() || !device) return;
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: device.ownerName, 
          technicianName: device.technician || 'Unassigned', 
          feedbackText: feedback,
          sentiment: sentiment
        })
      });

      if (res.ok) {
        setFeedback('');
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      } else {
        alert('Failed to save feedback');
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!deviceId) return <div className="p-10 text-center">No device specified.</div>;

  return (
    <main className="flex-1 p-6 md:p-10 font-['Inter'] flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-5xl flex flex-col gap-8">
        
        {/* Device Information Card */}
        <section className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-[#bd00ff] flex flex-col gap-6">
          <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
            <button 
              onClick={() => navigate('/customer/monitoring')} 
              className="text-black hover:text-[#bd00ff] transition-colors bg-transparent border-none cursor-pointer p-0"
            >
              <ChevronLeft size={32} />
            </button>
            <h2 className="text-2xl font-bold text-black border-none m-0">Device Information</h2>
          </div>
          
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-purple-100 border-t-[#bd00ff] rounded-full animate-spin"></div>
              <p className="text-[#666] font-semibold animate-pulse text-lg">Loading device info...</p>
            </div>
          ) : !device ? (
            <div className="py-20 text-center text-red-500 font-bold">Device not found.</div>
          ) : (
            <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-center md:items-start w-full">
              <div className="flex flex-col gap-4 w-full md:w-[350px] shrink-0">
                <div className="w-full h-[300px] md:h-[350px] border-2 border-dashed border-[#bd00ff] rounded-2xl p-6 flex justify-center items-center bg-gray-50 overflow-hidden">
                  {device.image ? (
                    <img src={device.image} alt={device.deviceName} className="w-full h-full object-contain mix-blend-multiply" />
                  ) : (
                    <div className="text-gray-400 font-bold text-lg">No Image</div>
                  )}
                </div>
                {device.proofImage && (
                  <div className="w-full flex flex-col gap-2 mt-4">
                    <span className="font-bold text-gray-700 text-center uppercase tracking-wider text-sm">Proof of Repair</span>
                    <div className="w-full h-[250px] md:h-[300px] border-2 border-dashed border-gray-300 rounded-2xl p-2 flex justify-center items-center bg-gray-50 overflow-hidden">
                      <img src={device.proofImage} alt="Proof of Repair" className="w-full h-full object-cover rounded-xl" />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-6 text-lg md:text-xl w-full flex-1 pt-4">
                <p className="m-0 text-gray-700"><strong>Device Name:</strong> <span className="text-black">{device.deviceName}</span></p>
                <div className="h-[1px] bg-gray-100 w-full my-1"></div>
                <p className="m-0 text-gray-700"><strong>Owner:</strong> <span className="text-black">{device.ownerName}</span></p>
                <div className="h-[1px] bg-gray-100 w-full my-1"></div>
                <p className="m-0 text-gray-700">
                  <strong>Status:</strong> 
                  <span className={`font-bold ml-2 px-4 py-1.5 rounded-full text-base ${device.status === 'Completed' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-orange-50 text-orange-600 border border-orange-200'}`}>
                    {device.status}
                  </span>
                </p>
                <div className="h-[1px] bg-gray-100 w-full my-1"></div>
                <p className="m-0 text-gray-700"><strong>Cause of the problem:</strong> <span className="text-black">{device.cause || 'Not specified'}</span></p>
                <div className="h-[1px] bg-gray-100 w-full my-1"></div>
                <p className="m-0 text-gray-700"><strong>Technician:</strong> <span className="text-black">{device.technician || 'Unassigned'}</span></p>
                <div className="h-[1px] bg-gray-100 w-full my-1"></div>
                <p className="m-0 text-gray-700"><strong>Repair Cost:</strong> <span className="text-black font-bold text-2xl ml-2">₱{device.repairCost || 'Pending'}</span></p>
              </div>
            </div>
          )}
        </section>

        {/* Technician Feedback Section */}
        {device && (
          <section className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-gray-100 flex flex-col gap-4">
            <div className="flex justify-between items-center sm:flex-row flex-col gap-4">
              <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-[#4B0082] m-0 border-none">Technician Feedback</h3>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSentiment('Positive')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all cursor-pointer ${sentiment === 'Positive' ? 'bg-green-100 text-green-700 border-2 border-green-500 shadow-sm' : 'bg-gray-50 text-gray-500 border border-transparent hover:bg-gray-100'}`}
                >
                  <ThumbsUp size={18} /> Positive
                </button>
                <button 
                  onClick={() => setSentiment('Negative')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all cursor-pointer ${sentiment === 'Negative' ? 'bg-red-100 text-red-700 border-2 border-red-500 shadow-sm' : 'bg-gray-50 text-gray-500 border border-transparent hover:bg-gray-100'}`}
                >
                  <ThumbsDown size={18} /> Negative
                </button>
              </div>
            </div>
            <textarea 
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Type your feedback here..."
              className="w-full min-h-[150px] border-2 border-gray-200 rounded-xl p-4 text-black outline-none font-['Inter'] resize-vertical focus:border-[#bd00ff] transition-colors mt-2"
            />
            <div className="flex justify-end mt-2 items-center gap-4">
              {isSaved && <span className="text-green-500 font-bold animate-in fade-in">Feedback saved!</span>}
              <button 
                onClick={handleSave}
                disabled={isSubmitting || !feedback.trim()}
                className="px-10 py-3 bg-gradient-to-r from-[#bd00ff] to-[#01f0ff] text-white font-bold text-lg rounded-xl hover:shadow-[0_4px_15px_rgba(189,0,255,0.4)] transition-all cursor-pointer border-none disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
