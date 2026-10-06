"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, ThumbsUp, ThumbsDown, Receipt, Sparkles, Smartphone, CheckCircle2, AlertTriangle, ShieldCheck, Wrench, User, Calendar, ExternalLink } from 'lucide-react';
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
          const rawPhone = (data.phone || '').trim();
          const phoneClean = (rawPhone && !rawPhone.includes('₱') && !rawPhone.toLowerCase().includes('cash'))
            ? rawPhone
            : '';
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

  if (!deviceId) return <div className="p-10 text-center text-gray-500 font-semibold">No device specified.</div>;

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-10 font-['Inter'] flex flex-col items-center overflow-y-auto bg-[#fbfaff]">
      <div className="w-full max-w-5xl flex flex-col gap-8">
        
        {/* Main Device Card */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-purple-100/90 flex flex-col gap-6 animate-in fade-in duration-300">
          
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-100 pb-5">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/customer/monitoring')} 
                className="w-10 h-10 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-[#8b00cc] flex items-center justify-center transition-colors border border-purple-100 cursor-pointer shadow-2xs"
                title="Back to Device Monitoring"
              >
                <ChevronLeft size={22} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl sm:text-3xl font-black text-gray-950 m-0 tracking-tight">Device Information</h2>
                  <Sparkles size={20} className="text-[#bd00ff]" />
                </div>
                <p className="text-gray-500 m-0 mt-0.5 text-xs font-medium">Real-time inspection details and repair breakdown</p>
              </div>
            </div>

            {device && (
              <button
                type="button"
                onClick={() => setReceiptModalOpen(true)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] hover:from-[#7a00b3] hover:to-[#a900e6] text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer border-none shrink-0"
              >
                <Receipt size={16} />
                <span>Generate Repair Receipt</span>
              </button>
            )}
          </div>
          
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-purple-100 border-t-[#8b00cc] rounded-full animate-spin"></div>
              <p className="text-gray-500 font-semibold text-xs animate-pulse">Loading device information...</p>
            </div>
          ) : !device ? (
            <div className="py-20 text-center text-red-500 font-bold text-sm">Device record not found.</div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-stretch w-full">
              
              {/* Left Column: Visuals & Proof */}
              <div className="flex flex-col gap-6 w-full lg:w-[360px] shrink-0">
                {/* Main Device Image Card */}
                <div className="w-full aspect-square md:h-[340px] lg:h-[340px] rounded-3xl p-6 flex justify-center items-center bg-gradient-to-b from-purple-50/40 to-white border border-purple-100 shadow-xs overflow-hidden relative group">
                  {device.image ? (
                    <img 
                      src={device.image} 
                      alt={device.deviceName} 
                      className="w-full h-full object-contain mix-blend-multiply drop-shadow-sm group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-purple-300">
                      <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center text-2xl border border-purple-100">
                        <Smartphone size={32} className="text-[#8b00cc]" />
                      </div>
                      <span className="font-bold text-xs text-gray-400">No Image Provided</span>
                    </div>
                  )}
                </div>

                {/* Proof of Repair if Available */}
                {device.proofImage && (
                  <div className="w-full flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#bd00ff] animate-pulse"></div>
                      <span className="font-black text-gray-900 tracking-wider text-xs uppercase">Proof of Repair</span>
                    </div>
                    <div className="w-full h-[220px] rounded-2xl p-1.5 flex justify-center items-center bg-white border border-purple-100 shadow-xs overflow-hidden group">
                      <img 
                        src={device.proofImage} 
                        alt="Proof of Repair" 
                        className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500" 
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right Column: Details & Technical Breakdown */}
              <div className="flex flex-col w-full flex-1 gap-4 min-w-0">
                <div className="bg-purple-50/20 border border-purple-100/90 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 h-full shadow-2xs">
                  
                  {/* Status & Repair Cost Header Row */}
                  <div className="flex flex-wrap justify-between items-start pb-5 border-b border-purple-100/80 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Current Status</span>
                      <span className={`inline-flex items-center gap-1.5 font-bold px-3.5 py-1 rounded-full text-xs w-fit border ${
                        (device.status === 'Completed' || device.progress === '100%' || device.progress?.toLowerCase() === 'completed') 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
                          : (device.progress?.toLowerCase() === 'cancelled' || device.status?.toLowerCase() === 'cancelled' || device.progress?.toLowerCase() === 'rejected')
                            ? 'bg-red-50 text-red-700 border-red-200/80'
                            : (device.progress?.toLowerCase() === 'accepted')
                              ? 'bg-purple-50 text-[#8b00cc] border-purple-200/80'
                              : (device.progress?.toLowerCase() === 'diagnostic' || device.progress?.toLowerCase() === 'diagnosis')
                                ? 'bg-blue-50 text-blue-700 border-blue-200/80'
                                : (device.progress?.toLowerCase() === 'repairing')
                                  ? 'bg-amber-50 text-amber-700 border-amber-200/80'
                                  : 'bg-orange-50 text-orange-700 border-orange-200/80'
                      }`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                        <span>
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
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1 text-right">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Repair Cost</span>
                      <span className="text-2xl sm:text-3xl font-black text-[#8b00cc]">
                        {device.repairCost ? `₱${device.repairCost}` : 'Pending'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setReceiptModalOpen(true)}
                        className="text-xs font-bold text-[#8b00cc] hover:text-[#7a00b3] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 transition-colors"
                      >
                        <Receipt size={12} />
                        <span>View Official Receipt</span>
                      </button>
                    </div>
                  </div>

                  {/* Info Blocks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 pt-1">
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
                          {/* Device Model Title & Chips */}
                          <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Device Model & Details</span>
                            <span className="text-lg sm:text-xl font-black text-gray-950">{device.deviceName}</span>
                            {parsed && (
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                                {parsed.brand && (
                                  <span className="bg-purple-100 text-[#8b00cc] font-bold px-3 py-1 rounded-xl border border-purple-200">
                                    {parsed.brand}
                                  </span>
                                )}
                                <span className="bg-gray-100 text-gray-700 font-semibold px-3 py-1 rounded-xl border border-gray-200">
                                  {parsed.deviceType || 'Smartphone'}
                                </span>
                                {parsed.imei && (
                                  <span className="bg-gray-100 text-gray-700 font-mono px-3 py-1 rounded-xl border border-gray-200">
                                    IMEI: {parsed.imei}
                                  </span>
                                )}
                                {parsed.branch && (
                                  <span className="bg-blue-50 text-blue-700 font-semibold px-3 py-1 rounded-xl border border-blue-200">
                                    Branch: {parsed.branch}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Reported Issue Card */}
                          <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Reported Issue / Problem</span>
                            <div className="bg-white border border-purple-100/90 rounded-2xl p-4 shadow-2xs flex flex-col gap-3">
                              {parsed ? (
                                <>
                                  <div className="flex flex-col gap-1">
                                    <span className="font-bold text-[#8b00cc] text-sm sm:text-base">{parsed.problem}</span>
                                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed m-0 font-medium">{parsed.problemDescription}</p>
                                  </div>
                                  {parsed.suggestedRepair && (
                                    <div className="pt-2.5 border-t border-gray-100 flex flex-col gap-1">
                                      <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Suggested Repair</span>
                                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed m-0">{parsed.suggestedRepair}</p>
                                    </div>
                                  )}
                                  {parsed.suggestionForRepair && (
                                    <div className="pt-2.5 border-t border-gray-100 flex flex-col gap-1">
                                      <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Suggestion for Repair</span>
                                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed m-0">{parsed.suggestionForRepair}</p>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs sm:text-sm text-gray-700 leading-relaxed font-medium">
                                  {device.cause || 'No specific cause recorded.'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Device Condition Intake Metrics */}
                          {parsed && (
                            <div className="flex flex-col gap-2 sm:col-span-2">
                              <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Device Condition (At Intake)</span>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white border border-purple-100/90 rounded-2xl p-3.5 shadow-2xs">
                                  <span className="text-gray-400 font-bold text-[11px] block">Is Device Working</span>
                                  <span className="font-black text-gray-900 text-sm mt-0.5 block">{parsed.isWorking || 'Yes'}</span>
                                </div>
                                <div className="bg-white border border-purple-100/90 rounded-2xl p-3.5 shadow-2xs">
                                  <span className="text-gray-400 font-bold text-[11px] block">Visible Damage</span>
                                  <span className="font-black text-gray-900 text-sm mt-0.5 block">{parsed.hasPhysicalDamage || 'No'}</span>
                                </div>
                              </div>
                              {parsed.physicalDamageDescription && (
                                <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-3.5 mt-1">
                                  <span className="font-bold text-amber-900 block mb-0.5 text-xs">Physical Damage Details</span>
                                  <p className="text-amber-950 leading-relaxed m-0 text-xs font-medium">{parsed.physicalDamageDescription}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Uploaded Photos Gallery */}
                          {photosList.length > 0 && (
                            <div className="flex flex-col gap-2 sm:col-span-2">
                              <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">
                                Uploaded Device Photos ({photosList.length})
                              </span>
                              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                                {photosList.map((photo, i) => (
                                  <a
                                    key={i}
                                    href={photo}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="aspect-square rounded-2xl overflow-hidden border border-purple-100 bg-white hover:border-[#8b00cc] hover:shadow-xs transition-all block group"
                                  >
                                    <img 
                                      src={photo} 
                                      alt={`Photo ${i + 1}`} 
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                    />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Unparsed repair history fallback */}
                          {!parsed && device.repairHistory && (
                            <div className="flex flex-col gap-1.5 sm:col-span-2">
                              <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Repair History</span>
                              <div className="bg-white border border-purple-100 rounded-2xl p-4 shadow-2xs">
                                <span className="text-xs sm:text-sm text-gray-700 leading-relaxed">{device.repairHistory}</span>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Assigned Technician Card */}
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Assigned Technician</span>
                      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-purple-100 shadow-2xs">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 text-[#8b00cc] flex items-center justify-center font-black text-sm border border-purple-200/80">
                          {device.technician ? device.technician.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm sm:text-base font-bold text-gray-900">{device.technician || 'Pending Assignment'}</span>
                          <span className="text-[11px] text-gray-400 font-medium">Service Technician</span>
                        </div>
                      </div>
                    </div>

                    {/* Itemized Materials Breakdown */}
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
                        <div className="sm:col-span-2 pt-4 border-t border-purple-100">
                          <MaterialBreakdownEditor
                            readOnly
                            items={items}
                            paymentMethod={method}
                            cashAmount={cash}
                            gcashAmount={gcash}
                            downpayment={device.downpayment || '0'}
                            deviceName={device.deviceName}
                            customerName={device.ownerName || 'Customer'}
                            branch={device.branch}
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

        {/* Technician Feedback Card */}
        {device && (
          <section className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-purple-100/90 flex flex-col gap-4">
            <div className="flex justify-between items-start sm:items-center sm:flex-row flex-col gap-4 border-b border-purple-100 pb-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-gray-950 m-0">Technician Feedback</h3>
                <p className="text-gray-500 m-0 mt-0.5 text-xs font-medium">Rate the service provided by your technician</p>
              </div>
              
              <div className="flex items-center gap-2.5">
                <button 
                  onClick={() => setSentiment('Positive')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    sentiment === 'Positive' 
                      ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500 shadow-xs' 
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <ThumbsUp size={16} />
                  <span>Positive</span>
                </button>
                <button 
                  onClick={() => setSentiment('Negative')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    sentiment === 'Negative' 
                      ? 'bg-rose-50 text-rose-700 border-2 border-rose-500 shadow-xs' 
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <ThumbsDown size={16} />
                  <span>Negative</span>
                </button>
              </div>
            </div>

            <textarea 
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Type your feedback here..."
              className="w-full min-h-[140px] border border-purple-100 bg-gray-50/60 focus:bg-white rounded-2xl p-4 text-gray-900 outline-none font-['Inter'] resize-vertical focus:ring-2 focus:ring-purple-200 focus:border-[#8b00cc] transition-all text-xs sm:text-sm shadow-2xs"
            />

            <div className="flex justify-end items-center gap-4 pt-2">
              {isSaved && (
                <span className="text-emerald-600 font-bold text-xs sm:text-sm animate-in fade-in flex items-center gap-1">
                  <CheckCircle2 size={16} />
                  <span>Feedback saved successfully!</span>
                </span>
              )}
              <button 
                onClick={handleSave}
                disabled={isSubmitting || !feedback.trim()}
                className="px-8 py-3 bg-gradient-to-r from-[#8b00cc] via-[#9d00e6] to-[#bd00ff] hover:from-[#7a00b3] hover:to-[#a900e6] text-white font-black text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer border-none disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Saving...' : 'Save Feedback'}
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

