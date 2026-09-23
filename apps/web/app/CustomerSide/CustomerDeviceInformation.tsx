"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, ThumbsUp, ThumbsDown, Receipt } from 'lucide-react';
import { useRouter } from 'next/navigation';
import RepairServiceReceiptModal from '../../components/Repair/RepairServiceReceiptModal';
import MaterialBreakdownEditor from '../../components/Repair/MaterialBreakdownEditor';

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
  const [userProfile, setUserProfile] = useState<{
    name: string;
    email: string;
    phone: string;
    branch: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          const rawPhone = data.phone || '';
          const phoneClean = (rawPhone && !rawPhone.includes('₱') && !rawPhone.toLowerCase().includes('cash'))
            ? rawPhone
            : '0917 123 4567';
          setUserProfile({
            name: data.name || 'Customer',
            email: data.email || 'customer@graphix.com',
            phone: phoneClean,
            branch: data.branch || 'Tagoloan Branch'
          });
        }
      })
      .catch(console.error);
  }, []);

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
          customerName: device.ownerName || userProfile?.name || 'Customer', 
          technicianName: device.technician || 'Unassigned', 
          feedbackText: feedback,
          sentiment: sentiment,
          branch: device.branch || 'Tagoloan'
        })
      });

      if (res.ok) {
        setFeedback('');
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Failed to save feedback');
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/customer/monitoring')} 
                className="text-black hover:text-[#bd00ff] transition-colors bg-transparent border-none cursor-pointer p-0"
              >
                <ChevronLeft size={32} />
              </button>
              <h2 className="text-2xl font-bold text-black border-none m-0">Device Information</h2>
            </div>
            {device && (
              <button
                type="button"
                onClick={() => setReceiptModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-[#bd00ff] hover:from-purple-700 hover:to-[#9c00d6] text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer border-none"
              >
                <Receipt size={18} />
                Generate Repair Receipt
              </button>
            )}
          </div>
          
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-purple-100 border-t-[#bd00ff] rounded-full animate-spin"></div>
              <p className="text-[#666] font-semibold animate-pulse text-lg">Loading device info...</p>
            </div>
          ) : !device ? (
            <div className="py-20 text-center text-red-500 font-bold">Device not found.</div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-stretch w-full">
              
              {/* Left Column: Images */}
              <div className="flex flex-col gap-6 w-full lg:w-[380px] shrink-0">
                <div className="w-full aspect-square md:h-[350px] lg:h-auto rounded-3xl p-6 flex justify-center items-center bg-gray-50 border border-gray-100 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden relative group">
                  {device.image ? (
                    <img src={device.image} alt={device.deviceName} className="w-full h-full object-contain mix-blend-multiply drop-shadow-sm group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl">📷</div>
                      <span className="font-semibold text-sm">No Image Provided</span>
                    </div>
                  )}
                </div>

                {device.proofImage && (
                  <div className="w-full flex flex-col gap-3">
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-2 h-2 rounded-full bg-[#bd00ff]"></div>
                      <span className="font-bold text-gray-800 tracking-wide text-sm uppercase">Proof of Repair</span>
                    </div>
                    <div className="w-full h-[220px] rounded-2xl p-2 flex justify-center items-center bg-gray-50 border border-gray-100 shadow-sm overflow-hidden group">
                      <img src={device.proofImage} alt="Proof of Repair" className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right Column: Details */}
              <div className="flex flex-col w-full flex-1 gap-4">
                <div className="bg-gray-50/50 border border-gray-100 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 h-full shadow-[inset_0_2px_10px_rgba(0,0,0,0.01)]">
                  
                  {/* Status Highlight */}
                  <div className="flex justify-between items-start pb-6 border-b border-gray-200/60">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Current Status</span>
                      <span className={`inline-flex font-bold px-4 py-1.5 rounded-full text-sm mt-1 w-fit ${
                        (device.status === 'Completed' || device.progress === '100%' || device.progress?.toLowerCase() === 'completed') 
                          ? 'bg-green-100 text-green-700' 
                          : (device.progress?.toLowerCase() === 'cancelled' || device.status?.toLowerCase() === 'cancelled' || device.progress?.toLowerCase() === 'rejected')
                            ? 'bg-red-100 text-red-700'
                            : (device.progress?.toLowerCase() === 'accepted')
                              ? 'bg-purple-100 text-purple-700'
                              : (device.progress?.toLowerCase() === 'diagnostic' || device.progress?.toLowerCase() === 'diagnosis')
                                ? 'bg-blue-100 text-blue-700'
                                : (device.progress?.toLowerCase() === 'repairing')
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-orange-100 text-orange-700'
                      }`}>
                        {(device.status === 'Completed' || device.progress === '100%' || device.progress?.toLowerCase() === 'completed') 
                          ? 'Completed' 
                          : (device.progress?.toLowerCase() === 'cancelled' || device.status?.toLowerCase() === 'cancelled' || device.progress?.toLowerCase() === 'rejected')
                            ? 'Cancelled'
                            : (device.progress?.toLowerCase() === 'accepted')
                              ? 'Accepted'
                              : (device.progress?.toLowerCase() === 'diagnostic' || device.progress?.toLowerCase() === 'diagnosis')
                                ? 'Diagnostic'
                                : (device.progress?.toLowerCase() === 'repairing')
                                  ? 'Repairing'
                                  : (device.progress || device.status)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right">
                      <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Repair Cost</span>
                      <span className="text-2xl font-black text-[#bd00ff]">₱{device.repairCost || 'Pending'}</span>
                      <button
                        type="button"
                        onClick={() => setReceiptModalOpen(true)}
                        className="text-xs font-bold text-[#bd00ff] hover:underline flex items-center gap-1 mt-0.5 cursor-pointer bg-transparent border-none p-0"
                      >
                        <Receipt size={13} /> View Official Receipt
                      </button>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6 pt-2">
                    {/* Parse structured repair request if available */}
                    {(() => {
                      let parsed: any = null;
                      if (device.repairHistory && typeof device.repairHistory === 'string' && device.repairHistory.trim().startsWith('{')) {
                        try {
                          parsed = JSON.parse(device.repairHistory);
                        } catch (e) {}
                      }

                      const photosList: string[] = [];
                      if (parsed?.photos && Array.isArray(parsed.photos)) {
                        parsed.photos.forEach((p: string) => {
                          if (p && !photosList.includes(p)) photosList.push(p);
                        });
                      }
                      if (device.image && !photosList.includes(device.image)) {
                        photosList.unshift(device.image);
                      }

                      return (
                        <>
                          <div className="flex flex-col gap-1 sm:col-span-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Device Model & Details</span>
                            <span className="text-lg font-bold text-gray-900">{device.deviceName}</span>
                            {parsed && (
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                                <span className="bg-purple-100 text-[#bd00ff] font-bold px-2.5 py-1 rounded-lg">
                                  {parsed.brand || 'Device'}
                                </span>
                                <span className="bg-gray-100 text-gray-700 font-semibold px-2.5 py-1 rounded-lg">
                                  {parsed.deviceType || 'Smartphone'}
                                </span>
                                {parsed.imei && (
                                  <span className="bg-gray-100 text-gray-700 font-mono px-2.5 py-1 rounded-lg">
                                    IMEI: {parsed.imei}
                                  </span>
                                )}
                                {parsed.branch && (
                                  <span className="bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-lg">
                                    Branch: {parsed.branch}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Reported Problem & Description */}
                          <div className="flex flex-col gap-1 sm:col-span-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reported Issue / Problem</span>
                            <div className="bg-white border border-gray-200/70 rounded-xl p-4 mt-1 shadow-sm">
                              {parsed ? (
                                <div className="flex flex-col gap-1.5">
                                  <span className="font-bold text-purple-900 text-sm">{parsed.problem}</span>
                                  <p className="text-sm text-gray-700 leading-relaxed m-0">{parsed.problemDescription}</p>
                                </div>
                              ) : (
                                <span className="text-base text-gray-700 leading-relaxed">{device.cause || 'No specific cause recorded.'}</span>
                              )}
                            </div>
                          </div>

                          {/* Device Condition if parsed */}
                          {parsed && (
                            <div className="flex flex-col gap-2 sm:col-span-2">
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Device Condition (At Intake)</span>
                              <div className="grid grid-cols-2 gap-3 mt-0.5">
                                <div className="bg-white border border-gray-200/70 rounded-xl p-3 text-xs">
                                  <span className="text-gray-400 font-medium block">Is Device Working</span>
                                  <span className="font-bold text-gray-900 text-sm mt-0.5 block">{parsed.isWorking || 'Yes'}</span>
                                </div>
                                <div className="bg-white border border-gray-200/70 rounded-xl p-3 text-xs">
                                  <span className="text-gray-400 font-medium block">Visible Damage</span>
                                  <span className="font-bold text-gray-900 text-sm mt-0.5 block">{parsed.hasPhysicalDamage || 'No'}</span>
                                </div>
                              </div>
                              {parsed.physicalDamageDescription && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mt-1 text-xs">
                                  <span className="font-bold text-amber-900 block mb-1">Physical Damage Description</span>
                                  <p className="text-amber-950 leading-relaxed m-0 text-sm">{parsed.physicalDamageDescription}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Uploaded Photos Gallery */}
                          {photosList.length > 0 && (
                            <div className="flex flex-col gap-2 sm:col-span-2">
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                Uploaded Device Photos ({photosList.length})
                              </span>
                              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {photosList.map((photo, i) => (
                                  <a
                                    key={i}
                                    href={photo}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="aspect-square rounded-xl overflow-hidden border border-gray-200 bg-white hover:border-[#bd00ff] transition-all block group"
                                  >
                                    <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Unparsed repair history fallback */}
                          {!parsed && device.repairHistory && (
                            <div className="flex flex-col gap-1.5 sm:col-span-2">
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Repair History</span>
                              <div className="bg-white border border-gray-100 rounded-xl p-4 mt-1 shadow-sm">
                                <span className="text-base text-gray-700 leading-relaxed">{device.repairHistory}</span>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned Technician</span>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                          {device.technician ? device.technician.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span className="text-lg font-semibold text-gray-900">{device.technician || 'Pending Assignment'}</span>
                      </div>
                    </div>

                    {/* Customer Itemized Material Breakdown */}
                    {device.materials && (() => {
                      let items: any[] = [];
                      let method: 'Cash' | 'GCash' | 'Split' = 'Cash';
                      let cash = '';
                      let gcash = '';
                      try {
                        const parsed = JSON.parse(device.materials);
                        if (Array.isArray(parsed)) {
                          items = parsed;
                        } else if (parsed && typeof parsed === 'object') {
                          items = parsed.items || [];
                          if (parsed.paymentMethod) method = parsed.paymentMethod;
                          if (parsed.cashAmount !== undefined) cash = String(parsed.cashAmount);
                          if (parsed.gcashAmount !== undefined) gcash = String(parsed.gcashAmount);
                        }
                      } catch (e) {
                        const lines = String(device.materials).split('\n');
                        for (const line of lines) {
                          if (line.includes('|') && !line.includes('---') && !line.toLowerCase().includes('unit price') && !line.toLowerCase().includes('subtotal')) {
                            const cells = line.split('|').map(c => c.trim()).filter(Boolean);
                            if (cells.length >= 4) {
                              const qty = parseInt(cells[0] || '1') || 1;
                              const desc = cells[1] || 'Part';
                              const unitPrice = parseFloat((cells[2] || '0').replace(/[^0-9.]/g, '')) || 0;
                              const total = parseFloat((cells[3] || '0').replace(/[^0-9.]/g, '')) || (qty * unitPrice);
                              items.push({ id: String(items.length + 1), qty, description: desc, unitPrice, total });
                            }
                          }
                        }
                      }
                      if (items.length === 0) return null;
                      if (!cash && !gcash && device.downpayment) {
                        if (method === 'GCash') gcash = device.downpayment;
                        else cash = device.downpayment;
                      }

                      return (
                        <div className="sm:col-span-2 pt-4 border-t border-gray-200">
                          <MaterialBreakdownEditor
                            readOnly
                            items={items}
                            paymentMethod={method}
                            cashAmount={cash}
                            gcashAmount={gcash}
                            downpayment={device.downpayment || '0'}
                            deviceName={device.deviceName}
                            customerName={device.ownerName || 'Customer'}
                          />
                        </div>
                      );
                    })()}
                  </div>

                </div>
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

      {/* Repair Billing & Service Receipt Modal */}
      <RepairServiceReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        device={device}
        userProfile={userProfile}
      />

    </main>
  );
}
