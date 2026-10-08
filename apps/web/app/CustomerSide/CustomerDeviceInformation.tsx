"use client";

import { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ThumbsUp, 
  ThumbsDown, 
  Receipt, 
  Sparkles, 
  Smartphone, 
  CheckCircle2, 
  XCircle,
  AlertTriangle, 
  ShieldCheck, 
  Wrench, 
  Tag,
  Layers,
  MapPin,
  ExternalLink,
  ZoomIn,
  X,
  Activity,
  User,
  Calendar,
  Check
} from 'lucide-react';
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
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
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
        if (!data.error) {
          setDevice(data);
          setSelectedPhoto(data.image || data.proofImage || null);
        }
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

  const getStatusDetails = (statusVal?: string, progressVal?: string) => {
    const p = (progressVal || '').toLowerCase();
    const s = (statusVal || '').toLowerCase();

    if (s === 'completed' || p === '100%' || p === 'completed') {
      return {
        label: 'Completed',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dotColor: 'bg-emerald-500'
      };
    }
    if (p === 'cancelled' || s === 'cancelled' || p === 'rejected') {
      return {
        label: 'Cancelled',
        color: 'bg-red-50 text-red-700 border-red-200/80',
        dotColor: 'bg-red-500'
      };
    }
    if (p === 'accepted') {
      return {
        label: 'Accepted',
        color: 'bg-purple-50 text-[#8b00cc] border-purple-200/80',
        dotColor: 'bg-[#8b00cc]'
      };
    }
    if (p === 'diagnostic' || p === 'diagnosis') {
      return {
        label: 'Diagnostic',
        color: 'bg-blue-50 text-blue-700 border-blue-200/80',
        dotColor: 'bg-blue-500'
      };
    }
    if (p === 'repairing') {
      return {
        label: 'Repairing',
        color: 'bg-amber-50 text-amber-700 border-amber-200/80',
        dotColor: 'bg-amber-500'
      };
    }
    return {
      label: progressVal || statusVal || 'In Progress',
      color: 'bg-orange-50 text-orange-700 border-orange-200/80',
      dotColor: 'bg-orange-500'
    };
  };

  if (!deviceId) return <div className="p-10 text-center text-gray-500 font-semibold">No device specified.</div>;

  return (
    <div className="flex-1 w-full px-3 py-4 sm:p-6 md:p-10 font-['Inter'] flex flex-col items-center overflow-y-auto bg-[#fbfaff]">
      <div className="w-full max-w-5xl flex flex-col gap-5 sm:gap-8">
        
        {/* Main Device Card */}
        <section className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-7 md:p-9 shadow-sm border border-purple-100/90 flex flex-col gap-4 sm:gap-6 animate-in fade-in duration-300">
          
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-purple-100 pb-4 sm:pb-5">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button 
                onClick={() => navigate('/customer/monitoring')} 
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-[#8b00cc] flex items-center justify-center transition-colors border border-purple-100 cursor-pointer shadow-2xs shrink-0"
                title="Back to Device Monitoring"
              >
                <ChevronLeft size={20} className="sm:w-[22px] sm:h-[22px]" />
              </button>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-950 m-0 tracking-tight leading-tight">
                    Device Information
                  </h2>
                  <Sparkles size={18} className="text-[#bd00ff] shrink-0" />
                </div>
                <p className="text-gray-500 m-0 mt-0.5 text-[11px] sm:text-xs font-medium">
                  Real-time inspection details and repair breakdown
                </p>
              </div>
            </div>

            {device && (
              <button
                type="button"
                onClick={() => setReceiptModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] hover:from-[#7a00b3] hover:to-[#a900e6] text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer border-none shrink-0"
              >
                <Receipt size={16} />
                <span>Generate Repair Receipt</span>
              </button>
            )}
          </div>
          
          {isLoading ? (
            <div className="py-20 sm:py-24 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-purple-100 border-t-[#8b00cc] rounded-full animate-spin"></div>
              <p className="text-gray-500 font-semibold text-xs animate-pulse">Loading device information...</p>
            </div>
          ) : !device ? (
            <div className="py-16 sm:py-20 text-center text-red-500 font-bold text-sm">Device record not found.</div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-5 sm:gap-8 lg:gap-10 items-stretch w-full">
              
              {/* Left Column: Visuals & Proof */}
              {(() => {
                let parsedHistory: any = null;
                if (device.repairHistory && typeof device.repairHistory === 'string' && device.repairHistory.trim().startsWith('{')) {
                  try {
                    parsedHistory = JSON.parse(device.repairHistory);
                  } catch (e) {}
                }

                const allPhotos: string[] = [];
                if (device.image && !allPhotos.includes(device.image)) allPhotos.push(device.image);
                if (parsedHistory?.photos && Array.isArray(parsedHistory.photos)) {
                  parsedHistory.photos.forEach((p: string) => {
                    if (p && !allPhotos.includes(p)) allPhotos.push(p);
                  });
                }
                if (device.proofImage && !allPhotos.includes(device.proofImage)) allPhotos.push(device.proofImage);

                const currentPhoto = selectedPhoto || device.image || device.proofImage || null;

                return (
                  <div className="flex flex-col gap-3.5 sm:gap-5 w-full lg:w-[350px] shrink-0">
                    
                    {/* Main Device Image Card */}
                    <div 
                      onClick={() => currentPhoto && setLightboxImage(currentPhoto)}
                      className="w-full h-48 sm:h-64 lg:h-[340px] rounded-2xl sm:rounded-3xl p-3 sm:p-5 flex justify-center items-center bg-gradient-to-b from-purple-50/40 to-white border border-purple-100 shadow-xs overflow-hidden relative group cursor-pointer"
                      title={currentPhoto ? "Click to view high-resolution photo" : undefined}
                    >
                      {currentPhoto ? (
                        <>
                          <img 
                            src={currentPhoto} 
                            alt={device.deviceName || 'Device'} 
                            className="w-full h-full object-contain mix-blend-multiply drop-shadow-sm group-hover:scale-105 transition-transform duration-500" 
                          />
                          <div className="absolute bottom-2.5 right-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-xs text-white text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all opacity-90 group-hover:opacity-100">
                            <ZoomIn size={13} />
                            <span>Enlarge</span>
                          </div>
                          {currentPhoto === device.proofImage && (
                            <div className="absolute top-2.5 left-2.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                              Proof of Repair
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-purple-300">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-purple-50 flex items-center justify-center text-2xl border border-purple-100">
                            <Smartphone size={30} className="text-[#8b00cc]" />
                          </div>
                          <span className="font-bold text-xs text-gray-400">No Image Provided</span>
                        </div>
                      )}
                    </div>

                    {/* Interactive Thumbnail Carousel when multiple photos exist */}
                    {allPhotos.length > 1 && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">
                          Photos ({allPhotos.length}) - Tap to Preview
                        </span>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
                          {allPhotos.map((photo, idx) => {
                            const isSelected = photo === currentPhoto;
                            const isProof = photo === device.proofImage;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedPhoto(photo)}
                                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all p-0.5 bg-white shrink-0 cursor-pointer relative ${
                                  isSelected 
                                    ? 'border-[#8b00cc] ring-2 ring-[#bd00ff]/30 shadow-xs' 
                                    : 'border-purple-100 hover:border-purple-300 opacity-75 hover:opacity-100'
                                }`}
                              >
                                <img 
                                  src={photo} 
                                  alt={`Thumb ${idx + 1}`} 
                                  className="w-full h-full object-cover rounded-lg"
                                />
                                {isProof && (
                                  <span className="absolute bottom-0 inset-x-0 bg-emerald-600 text-[8px] font-black text-white text-center py-0.5 uppercase tracking-tighter">
                                    Proof
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Proof of Repair Highlight Card (Desktop & Mobile) */}
                    {device.proofImage && (
                      <div className="w-full flex flex-col gap-2 pt-1 border-t border-purple-100/70">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="font-black text-gray-900 tracking-wider text-xs uppercase">Proof of Repair</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setLightboxImage(device.proofImage)}
                            className="text-[11px] font-bold text-[#8b00cc] hover:text-[#7a00b3] flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                          >
                            <ExternalLink size={11} />
                            <span>View Full</span>
                          </button>
                        </div>
                        <div 
                          onClick={() => setLightboxImage(device.proofImage)}
                          className="w-full h-36 sm:h-44 lg:h-48 rounded-2xl p-1.5 flex justify-center items-center bg-white border border-purple-100 shadow-2xs overflow-hidden group cursor-pointer"
                        >
                          <img 
                            src={device.proofImage} 
                            alt="Proof of Repair" 
                            className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500" 
                          />
                        </div>
                      </div>
                    )}

                  </div>
                );
              })()}
              
              {/* Right Column: Details & Technical Breakdown */}
              <div className="flex flex-col w-full flex-1 gap-4 min-w-0">
                <div className="bg-purple-50/20 border border-purple-100/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 md:p-8 flex flex-col gap-4 sm:gap-6 h-full shadow-2xs">
                  
                  {/* Status & Repair Cost Header Row (Balanced 2-Column Responsive Grid) */}
                  {(() => {
                    const statusDetails = getStatusDetails(device.status, device.progress);
                    return (
                      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 pb-4 sm:pb-5 border-b border-purple-100/80">
                        {/* Status Card */}
                        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-purple-100/90 shadow-2xs flex flex-col justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <Activity size={12} className="text-gray-400 shrink-0" />
                            <span className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-wider">
                              Current Status
                            </span>
                          </div>
                          <div>
                            <span className={`inline-flex items-center gap-1.5 font-bold px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs border ${statusDetails.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusDetails.dotColor} animate-pulse`}></span>
                              <span className="truncate">{statusDetails.label}</span>
                            </span>
                          </div>
                        </div>

                        {/* Repair Cost Card */}
                        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-purple-100/90 shadow-2xs flex flex-col justify-between gap-1 text-left">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Receipt size={12} className="text-gray-400 shrink-0" />
                              <span className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-wider">
                                Repair Cost
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setReceiptModalOpen(true)}
                              className="hidden sm:inline-flex text-[11px] font-bold text-[#8b00cc] hover:text-[#7a00b3] hover:underline items-center gap-1 cursor-pointer bg-transparent border-none p-0 transition-colors"
                              title="View Official Receipt"
                            >
                              <span>Receipt</span>
                              <ExternalLink size={10} />
                            </button>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5">
                            <span className="text-xl sm:text-2xl md:text-3xl font-black text-[#8b00cc] tracking-tight">
                              {device.repairCost ? `₱${device.repairCost}` : 'Pending'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setReceiptModalOpen(true)}
                              className="sm:hidden text-[11px] font-bold text-[#8b00cc] hover:text-[#7a00b3] flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 hover:underline mt-0.5"
                            >
                              <Receipt size={11} />
                              <span>View Receipt</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Info Blocks */}
                  <div className="flex flex-col gap-4 sm:gap-5 pt-0.5">
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
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-wider">
                                Device Model & Details
                              </span>
                              {device.createdAt && (
                                <span className="text-[10px] text-gray-400 font-medium">
                                  {new Date(device.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Smartphone size={20} className="text-[#8b00cc] shrink-0" />
                              <h3 className="text-lg sm:text-2xl font-black text-gray-950 m-0 tracking-tight leading-tight">
                                {device.deviceName}
                              </h3>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-0.5">
                              {parsed?.brand && (
                                <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 font-bold px-2.5 py-1 rounded-lg border border-purple-200/80 text-[11px] sm:text-xs">
                                  <Tag size={11} />
                                  <span>{parsed.brand}</span>
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-700 font-semibold px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] sm:text-xs">
                                <Layers size={11} />
                                <span>{parsed?.deviceType || 'Smartphone'}</span>
                              </span>
                              {(parsed?.branch || device.branch) && (
                                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-lg border border-blue-200/80 text-[11px] sm:text-xs">
                                  <MapPin size={11} />
                                  <span>Branch: {parsed?.branch || device.branch}</span>
                                </span>
                              )}
                              {parsed?.imei && (
                                <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 font-mono text-[10px] sm:text-xs px-2.5 py-1 rounded-lg border border-gray-200">
                                  <span>IMEI: {parsed.imei}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Reported Issue Card */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                              <span className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-wider">
                                Reported Issue / Problem
                              </span>
                            </div>
                            
                            <div className="bg-white border border-purple-100/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col gap-3">
                              {parsed ? (
                                <>
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-[#bd00ff] shrink-0"></span>
                                      <span className="font-extrabold text-[#8b00cc] text-sm sm:text-base">
                                        {parsed.problem}
                                      </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed m-0 font-medium pl-4">
                                      {parsed.problemDescription}
                                    </p>
                                  </div>
                                  
                                  {(parsed.suggestedRepair || parsed.suggestionForRepair) && (
                                    <div className="pt-2.5 border-t border-purple-50 flex flex-col gap-1.5 bg-purple-50/40 -mx-3.5 sm:-mx-4 -mb-3.5 sm:-mb-4 p-3 sm:p-3.5 rounded-b-2xl">
                                      <div className="flex items-center gap-1.5 text-purple-800 font-bold text-[11px] sm:text-xs uppercase tracking-wider">
                                        <Wrench size={13} className="text-[#8b00cc]" />
                                        <span>Suggested Repair</span>
                                      </div>
                                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed m-0 font-medium">
                                        {parsed.suggestedRepair || parsed.suggestionForRepair}
                                      </p>
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
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-1.5">
                                <ShieldCheck size={13} className="text-purple-600 shrink-0" />
                                <span className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-wider">
                                  Device Condition (At Intake)
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                                {/* Is Device Working */}
                                <div className="bg-white border border-purple-100/90 rounded-2xl p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between">
                                  <span className="text-gray-400 font-bold text-[10px] sm:text-[11px] block">
                                    Device Power State
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    {parsed.isWorking?.toLowerCase() === 'no' ? (
                                      <>
                                        <XCircle size={15} className="text-rose-500 shrink-0" />
                                        <span className="font-black text-rose-700 text-xs sm:text-sm">Not Working</span>
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                                        <span className="font-black text-emerald-700 text-xs sm:text-sm">
                                          {parsed.isWorking || 'Working'}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Visible Damage */}
                                <div className="bg-white border border-purple-100/90 rounded-2xl p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between">
                                  <span className="text-gray-400 font-bold text-[10px] sm:text-[11px] block">
                                    Physical Condition
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    {parsed.hasPhysicalDamage?.toLowerCase() === 'yes' ? (
                                      <>
                                        <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                                        <span className="font-black text-amber-700 text-xs sm:text-sm">Damage Detected</span>
                                      </>
                                    ) : (
                                      <>
                                        <ShieldCheck size={15} className="text-blue-500 shrink-0" />
                                        <span className="font-black text-blue-700 text-xs sm:text-sm">No Damage</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {parsed.physicalDamageDescription && (
                                <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3 sm:p-3.5 flex items-start gap-2.5 mt-0.5">
                                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                  <div className="flex flex-col">
                                    <span className="font-bold text-amber-900 block text-xs">Damage Observations</span>
                                    <p className="text-amber-950 leading-relaxed m-0 text-xs font-medium mt-0.5">
                                      {parsed.physicalDamageDescription}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Uploaded Photos Gallery */}
                          {photosList.length > 0 && (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-wider">
                                  Uploaded Device Photos ({photosList.length})
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium">Tap photo to enlarge</span>
                              </div>
                              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-2.5">
                                {photosList.map((photo, i) => (
                                  <div
                                    key={i}
                                    onClick={() => setLightboxImage(photo)}
                                    className="aspect-square rounded-xl sm:rounded-2xl overflow-hidden border border-purple-100 bg-white hover:border-[#8b00cc] hover:shadow-xs transition-all block group relative cursor-pointer"
                                    title={`View photo ${i + 1}`}
                                  >
                                    <img 
                                      src={photo} 
                                      alt={`Photo ${i + 1}`} 
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                    />
                                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                      <ZoomIn size={16} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Unparsed repair history fallback */}
                          {!parsed && device.repairHistory && (
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-wider">Repair History</span>
                              <div className="bg-white border border-purple-100 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
                                <span className="text-xs sm:text-sm text-gray-700 leading-relaxed">{device.repairHistory}</span>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Assigned Technician Card */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-wider">
                        Assigned Technician
                      </span>
                      <div className="flex items-center justify-between bg-white p-3 sm:p-3.5 rounded-2xl border border-purple-100 shadow-2xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 text-[#8b00cc] flex items-center justify-center font-black text-base border border-purple-200/80 shadow-2xs shrink-0">
                            {device.technician ? device.technician.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm sm:text-base font-extrabold text-gray-900 truncate">
                              {device.technician || 'Pending Assignment'}
                            </span>
                            <span className="text-[11px] text-gray-400 font-medium">Service Technician</span>
                          </div>
                        </div>
                        {device.technician && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80 shrink-0">
                            <CheckCircle2 size={12} />
                            <span>Active</span>
                          </span>
                        )}
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
                        <div className="pt-3 sm:pt-4 border-t border-purple-100">
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
          <section className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 md:p-9 shadow-sm border border-purple-100/90 flex flex-col gap-4">
            <div className="flex justify-between items-start sm:items-center sm:flex-row flex-col gap-3.5 border-b border-purple-100 pb-4">
              <div>
                <h3 className="text-lg sm:text-2xl font-black text-gray-950 m-0">Technician Feedback</h3>
                <p className="text-gray-500 m-0 mt-0.5 text-[11px] sm:text-xs font-medium">Rate the service provided by your technician</p>
              </div>
              
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                <button 
                  type="button"
                  onClick={() => setSentiment('Positive')}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    sentiment === 'Positive' 
                      ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-500 shadow-xs' 
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <ThumbsUp size={16} />
                  <span>Positive</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setSentiment('Negative')}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
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
              className="w-full min-h-[110px] sm:min-h-[130px] border border-purple-100 bg-gray-50/60 focus:bg-white rounded-2xl p-3.5 sm:p-4 text-gray-900 outline-none font-['Inter'] resize-vertical focus:ring-2 focus:ring-purple-200 focus:border-[#8b00cc] transition-all text-xs sm:text-sm shadow-2xs"
            />

            <div className="flex flex-col sm:flex-row justify-between sm:justify-end items-stretch sm:items-center gap-3 pt-1">
              {isSaved && (
                <span className="text-emerald-600 font-bold text-xs sm:text-sm animate-in fade-in flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={16} />
                  <span>Feedback saved successfully!</span>
                </span>
              )}
              <button 
                type="button"
                onClick={handleSave}
                disabled={isSubmitting || !feedback.trim()}
                className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-[#8b00cc] via-[#9d00e6] to-[#bd00ff] hover:from-[#7a00b3] hover:to-[#a900e6] text-white font-black text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer border-none disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Saving...' : 'Save Feedback'}
              </button>
            </div>
          </section>
        )}

      </div>

      {/* High-Resolution Photo Lightbox Modal */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-2xl sm:rounded-3xl p-2 sm:p-4 flex flex-col items-center shadow-2xl overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer border-none z-10"
              title="Close image"
            >
              <X size={18} />
            </button>
            <div className="w-full h-full max-h-[82vh] flex items-center justify-center overflow-auto p-2">
              <img 
                src={lightboxImage} 
                alt="Enlarged inspection photo" 
                className="max-w-full max-h-[80vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Repair Billing & Service Receipt Modal */}
      <RepairServiceReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        device={device}
        userProfile={userProfile}
      />

    </div>
  );
}
