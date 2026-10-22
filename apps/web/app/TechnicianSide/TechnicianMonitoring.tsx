"use client";

import React, { useState, useEffect } from 'react';
import { 
  Wrench, Search, RefreshCw, CheckCircle2, AlertCircle, Clock, 
  Smartphone, User, Camera, FileText, ChevronRight, X, ChevronLeft, 
  UploadCloud, Plus, Trash2, Cpu, CheckCircle, ShieldAlert, Receipt, Pencil, Eye
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import CustomerDetailsModal from '../../components/Common/CustomerDetailsModal';
import imageCompression from 'browser-image-compression';

interface DeviceItem {
  id: string;
  deviceName: string;
  ownerName?: string;
  progress: string;
  status: string;
  cause?: string;
  technician?: string;
  repairCost?: string;
  downpayment?: string;
  materials?: string;
  branch: string;
  image?: string;
  proofImage?: string;
  repairHistory?: string;
  trackingNumber?: string;
  createdAt: string;
  updatedAt?: string;
  user?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

interface StructuredRepairDetails {
  brand?: string;
  deviceType?: string;
  imei?: string | null;
  problem?: string;
  problemDescription?: string;
  suggestedRepair?: string;
  suggestionForRepair?: string;
  isWorking?: string;
  hasPhysicalDamage?: string;
  branch?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
  photos?: string[];
  submittedAt?: string;
}

const parseRepairDetails = (repairHistoryStr?: string | null): { parsed: StructuredRepairDetails | null; cleanNotes: string } => {
  if (!repairHistoryStr) return { parsed: null, cleanNotes: '' };
  const trimmed = repairHistoryStr.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as StructuredRepairDetails;
      return { parsed, cleanNotes: parsed.notes || '' };
    } catch (e) {
      return { parsed: null, cleanNotes: repairHistoryStr };
    }
  }
  return { parsed: null, cleanNotes: repairHistoryStr };
};

const formatProgress = (progress: string) => {
  const prog = (progress || '').toLowerCase();
  if (prog === 'completed' || prog === '100%') return 'Completed';
  if (prog === 'repairing' || prog === '50%' || prog === '75%') return 'Repairing';
  if (prog === 'diagnostic' || prog === 'diagnosis' || prog === '25%' || prog === '0%') return 'Diagnostic';
  if (prog === 'accepted') return 'Accepted';
  if (prog === 'pending') return 'Pending';
  if (prog === 'rejected') return 'Rejected';
  if (prog === 'cancelled') return 'Cancelled';
  return progress;
};

const renderProgressBadge = (progress: string) => {
  const prog = (progress || '').toLowerCase();
  let badgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
  let dotClass = 'bg-purple-500';
  
  if (prog === 'completed' || prog === '100%') {
    badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dotClass = 'bg-emerald-500';
  } else if (prog === 'repairing' || prog === '50%' || prog === '75%') {
    badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
    dotClass = 'bg-amber-500';
  } else if (prog === 'diagnostic' || prog === 'diagnosis' || prog === '25%' || prog === '0%') {
    badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
    dotClass = 'bg-blue-500';
  } else if (prog === 'accepted') {
    badgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
    dotClass = 'bg-purple-500';
  } else if (prog === 'pending') {
    badgeClass = 'bg-orange-50 text-orange-700 border-orange-200';
    dotClass = 'bg-orange-500';
  } else if (prog === 'rejected' || prog === 'cancelled') {
    badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
    dotClass = 'bg-rose-500';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badgeClass} shadow-2xs`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></span>
      {formatProgress(progress)}
    </span>
  );
};

const getProgressColor = (progress: string) => {
  const prog = (progress || '').toLowerCase();
  if (prog === 'completed') return 'text-emerald-600';
  if (prog === 'repairing') return 'text-amber-600';
  if (prog === 'diagnostic' || prog === 'diagnosis') return 'text-blue-600';
  if (prog === 'accepted') return 'text-purple-600';
  return 'text-gray-600';
};

export default function TechnicianMonitoring() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusId = searchParams.get('focus');

  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DIAGNOSTIC' | 'REPAIRING' | 'COMPLETED'>('ALL');
  const [technician, setTechnician] = useState<any>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [customerDetailsTarget, setCustomerDetailsTarget] = useState<{ id?: string; name?: string } | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [deviceToView, setDeviceToView] = useState<DeviceItem | null>(null);

  // Workbench Modal State
  const [selectedDevice, setSelectedDevice] = useState<DeviceItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Workbench Form Inputs
  const [editProgress, setEditProgress] = useState<'Diagnostic' | 'Repairing' | 'Completed'>('Diagnostic');
  const [editCause, setEditCause] = useState('');
  const [editRepairCost, setEditRepairCost] = useState('');
  const [materialsList, setMaterialsList] = useState<{ item: string; cost: number }[]>([]);
  const [newMaterialItem, setNewMaterialItem] = useState('');
  const [newMaterialCost, setNewMaterialCost] = useState('');
  const [selectedProofFile, setSelectedProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);

  // Photo Lightbox
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fetchProfileAndDevices = async () => {
    setIsLoading(true);
    try {
      const profRes = await fetch('/api/profile');
      let profile: any = null;
      if (profRes.ok) {
        profile = await profRes.json();
        setTechnician(profile);
      }

      const res = await fetch('/api/monitoring?limit=100');
      if (res.ok) {
        const data = await res.json();
        const list: DeviceItem[] = Array.isArray(data) ? data : data?.requests || [];
        setDevices(list);

        // If focus query param is present, open that device directly
        if (focusId) {
          const matched = list.find(d => d.id === focusId);
          if (matched) {
            openWorkbenchModal(matched);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching technician devices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndDevices();
  }, [focusId]);

  const openWorkbenchModal = (device: DeviceItem) => {
    setSelectedDevice(device);
    setModalError(null);
    setModalSuccess(null);
    setSelectedProofFile(null);
    setProofPreviewUrl(device.proofImage || null);

    // Initial progress setup
    const prog = device.progress || 'Diagnostic';
    if (prog === 'Completed' || device.status === 'Completed') {
      setEditProgress('Completed');
    } else if (prog === 'Repairing') {
      setEditProgress('Repairing');
    } else {
      setEditProgress('Diagnostic');
    }

    setEditCause(device.cause || '');
    setEditRepairCost(device.repairCost || '');

    // Parse existing materials
    let parsedMaterials: { item: string; cost: number }[] = [];
    if (device.materials) {
      try {
        if (device.materials.trim().startsWith('[')) {
          parsedMaterials = JSON.parse(device.materials);
        } else if (device.materials.trim().startsWith('{')) {
          const parsedObj = JSON.parse(device.materials);
          parsedMaterials = parsedObj.items || [];
        } else {
          parsedMaterials = device.materials.split(',').map(m => ({ item: m.trim(), cost: 0 }));
        }
      } catch (e) {
        parsedMaterials = [{ item: device.materials, cost: 0 }];
      }
    }
    setMaterialsList(parsedMaterials);
    setIsModalOpen(true);
  };

  const handleAddMaterial = () => {
    if (!newMaterialItem.trim()) return;
    const cost = parseFloat(newMaterialCost) || 0;
    setMaterialsList([...materialsList, { item: newMaterialItem.trim(), cost }]);
    setNewMaterialItem('');
    setNewMaterialCost('');
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterialsList(materialsList.filter((_, i) => i !== index));
  };

  const handleProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      setSelectedProofFile(compressedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error("Compression error:", error);
      setSelectedProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveWorkbench = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice) return;

    setIsSubmitting(true);
    setModalError(null);
    setModalSuccess(null);

    try {
      const formData = new FormData();
      formData.append('progress', editProgress);
      formData.append('cause', editCause);
      formData.append('repairCost', editRepairCost);
      formData.append('materials', JSON.stringify(materialsList));
      formData.append('technician', technician?.name || selectedDevice.technician || 'Branch Technician');

      if (editProgress === 'Completed') {
        formData.append('status', 'Completed');
      } else {
        formData.append('status', 'Active');
      }

      if (selectedProofFile) {
        formData.append('proofImage', selectedProofFile);
      }

      const res = await fetch(`/api/monitoring/${selectedDevice.id}`, {
        method: 'PATCH',
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update repair workbench');
      }

      setModalSuccess('Repair details updated successfully!');
      setTimeout(() => {
        setIsModalOpen(false);
        fetchProfileAndDevices();
      }, 900);
    } catch (err: any) {
      console.error(err);
      setModalError(err.message || 'Failed to save changes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter devices by search and status tab
  const filteredDevices = devices.filter(d => {
    const q = searchQuery.toLowerCase();
    const matchSearch = 
      (d.deviceName || '').toLowerCase().includes(q) ||
      (d.trackingNumber || '').toLowerCase().includes(q) ||
      (d.ownerName || '').toLowerCase().includes(q) ||
      (d.cause || '').toLowerCase().includes(q);

    if (!matchSearch) return false;

    const prog = (d.progress || '').toLowerCase();
    const stat = (d.status || '').toLowerCase();

    if (statusFilter === 'DIAGNOSTIC') {
      return prog === 'diagnostic' || prog === 'diagnosis' || prog === 'accepted';
    }
    if (statusFilter === 'REPAIRING') {
      return prog === 'repairing';
    }
    if (statusFilter === 'COMPLETED') {
      return stat === 'completed' || prog === 'completed';
    }
    return true;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage);
  const paginatedDevices = filteredDevices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <main className="flex-1 flex flex-col p-2.5 sm:p-5 md:p-6 lg:p-8 gap-4 sm:gap-6 bg-[#FAF7FF] min-h-screen font-['Inter'] w-full overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#E9D8FD] shadow-[0_4px_24px_rgba(147,51,234,0.04)] p-3.5 sm:p-5 md:p-7 flex flex-col gap-5 sm:gap-6 w-full">
        
        {/* Header and Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 sm:pb-5 border-b border-[#F3E8FF]">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-[#1F1728] tracking-tight">Devices Monitoring</h2>
              <span className="text-[11px] font-bold bg-purple-100 text-[#8b00cc] px-2.5 py-0.5 rounded-full border border-purple-200">
                📍 {technician?.branch || 'Tagoloan'} Branch
              </span>
            </div>
            <p className="text-xs text-[#7e6a99] mt-0.5 font-medium">
              Track real-time repair progress, customer devices, and service records
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
            {/* Search Bar */}
            <div className="flex items-center border border-[#E9D8FD] rounded-xl px-3.5 py-2 bg-[#FAF7FF]/60 hover:bg-white focus-within:bg-white focus-within:border-[#9333EA] focus-within:ring-2 focus-within:ring-[#9333EA]/15 transition-all w-full sm:w-[260px] md:w-[300px]">
              <Search size={18} className="text-[#8b7aa8] shrink-0" />
              <input 
                type="text" 
                placeholder="Search by Device Name..." 
                className="border-none outline-none pl-2.5 text-sm w-full text-[#1F1728] placeholder-[#8b7aa8] bg-transparent font-medium"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Refresh Queue Button */}
            <button 
              onClick={fetchProfileAndDevices}
              disabled={isLoading}
              className="bg-[#9333EA] hover:bg-[#7e22ce] active:scale-[0.98] text-white px-4 sm:px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-xs hover:shadow-[0_4px_12px_rgba(147,51,234,0.25)] flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer border-none disabled:opacity-50"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Filter Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(['ALL', 'DIAGNOSTIC', 'REPAIRING', 'COMPLETED'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setStatusFilter(tab);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                statusFilter === tab
                  ? 'bg-[#9333EA] text-white border-[#9333EA] shadow-xs'
                  : 'bg-[#FAF7FF] text-[#5b4a7a] border-[#E9D8FD] hover:bg-white hover:text-[#9333EA]'
              }`}
            >
              {tab === 'ALL' ? 'All Assigned' : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Devices Table / Mobile Cards */}
        <div className="w-full">
          {isLoading ? (
            <div className="w-full py-20 flex flex-col items-center justify-center gap-4 rounded-2xl border border-[#E9D8FD] bg-[#FAF7FF]/40">
              <div className="w-10 h-10 border-3 border-purple-200 border-t-[#9333EA] rounded-full animate-spin"></div>
              <p className="text-[#7e6a99] font-medium text-sm animate-pulse">Loading repair requests...</p>
            </div>
          ) : paginatedDevices.length > 0 ? (
            <>
              {/* --- DESKTOP VIEW: Data Table (Hidden on Mobile) --- */}
              <div className="hidden md:block overflow-x-auto w-full rounded-2xl border border-[#E9D8FD] bg-white">
                <table className="w-full text-left border-collapse min-w-[720px]">
                  <thead>
                    <tr className="bg-[#FAF7FF] border-b border-[#E9D8FD] text-[#5b4a7a]">
                      <th className="py-3.5 px-4 font-semibold text-center w-24 text-xs uppercase tracking-wider">Device</th>
                      <th className="py-3.5 px-5 font-semibold text-xs uppercase tracking-wider">Device & Customer</th>
                      <th className="py-3.5 px-4 font-semibold text-center text-xs uppercase tracking-wider">Progress</th>
                      <th className="py-3.5 px-5 font-semibold text-center text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3E8FF]">
                    {paginatedDevices.map(device => (
                      <tr key={device.id} className="hover:bg-[#FAF7FF]/70 transition-colors group">
                        <td className="py-4 px-4 text-center align-middle">
                          <div 
                            onClick={() => device.image && setLightboxImage(device.image)}
                            className="h-14 w-14 mx-auto shrink-0 rounded-xl border border-[#E9D8FD] flex justify-center items-center overflow-hidden bg-[#FAF7FF] group-hover:border-[#C084FC] transition-colors cursor-pointer"
                            title="Click to zoom image"
                          >
                            {device.image ? (
                              <img src={device.image} alt={device.deviceName} className="h-full w-full object-contain p-1" />
                            ) : (
                              <span className="text-[10px] text-[#8b7aa8] font-bold uppercase tracking-wider">NO IMG</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-5 align-middle">
                          <div className="font-bold text-[0.98rem] text-[#1F1728] leading-snug flex items-center gap-2">
                            <span>{device.deviceName}</span>
                            {device.trackingNumber && (
                              <span className="font-mono text-[10px] font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                {device.trackingNumber}
                              </span>
                            )}
                          </div>
                          {device.ownerName ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCustomerDetailsTarget({ name: device.ownerName });
                              }}
                              className="text-xs text-[#7e22ce] hover:text-[#581c87] hover:underline font-medium mt-1 flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 transition-colors"
                              title="Click to view complete customer details"
                            >
                              <User size={13} className="text-[#9333EA]" />
                              <span>{device.ownerName}</span>
                            </button>
                          ) : (
                            <div className="text-xs text-[#8b7aa8] font-normal mt-1 flex items-center gap-1">
                              <User size={13} className="text-[#8b7aa8]" />
                              <span>Walk-in Customer</span>
                            </div>
                          )}
                          {device.cause && (
                            <div className="text-[11px] text-gray-500 mt-1 line-clamp-1 max-w-md">
                              <span className="font-semibold text-gray-700">Problem:</span> {device.cause}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 align-middle text-center">
                          {renderProgressBadge(device.progress)}
                        </td>
                        <td className="py-4 px-5 align-middle">
                          <div className="flex gap-2 justify-center items-center">
                            {/* View Intake & Details Button */}
                            <button 
                              onClick={() => {
                                setDeviceToView(device);
                                setViewDetailsOpen(true);
                              }}
                              className="w-9 h-9 rounded-xl flex justify-center items-center bg-[#FAF5FF] text-[#7e22ce] hover:bg-[#9333EA] hover:text-white transition-all shadow-xs border border-[#E9D8FD] cursor-pointer"
                              title="View Intake & Material Breakdown"
                            >
                              <Receipt size={16} />
                            </button>
                            {/* Manage Workbench / Edit Button */}
                            <button 
                              onClick={() => openWorkbenchModal(device)}
                              className="w-9 h-9 rounded-xl flex justify-center items-center bg-[#9333EA] text-white hover:bg-[#7e22ce] active:scale-95 transition-all shadow-xs cursor-pointer border-none"
                              title="Edit Device Progress & Workbench"
                            >
                              <Pencil size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* --- MOBILE VIEW: Responsive Cards (Hidden on Desktop) --- */}
              <div className="block md:hidden space-y-3">
                {paginatedDevices.map(device => (
                  <div 
                    key={device.id} 
                    className="bg-white rounded-2xl border border-[#E9D8FD] p-3.5 shadow-xs flex flex-col gap-3 hover:border-[#C084FC] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        onClick={() => device.image && setLightboxImage(device.image)}
                        className="h-14 w-14 shrink-0 rounded-xl border border-[#E9D8FD] flex justify-center items-center overflow-hidden bg-[#FAF7FF] cursor-pointer"
                      >
                        {device.image ? (
                          <img src={device.image} alt={device.deviceName} className="h-full w-full object-contain p-1" />
                        ) : (
                          <span className="text-[9px] text-[#8b7aa8] font-bold uppercase tracking-wider">NO IMG</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-[#1F1728] leading-tight break-words">{device.deviceName}</h4>
                          <div className="shrink-0 scale-90 origin-top-right">
                            {renderProgressBadge(device.progress)}
                          </div>
                        </div>

                        {device.trackingNumber && (
                          <span className="font-mono text-[10px] font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 inline-block mt-1">
                            {device.trackingNumber}
                          </span>
                        )}

                        <div className="mt-1">
                          {device.ownerName ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCustomerDetailsTarget({ name: device.ownerName });
                              }}
                              className="text-xs text-[#7e22ce] hover:text-[#581c87] hover:underline font-medium flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 transition-colors"
                            >
                              <User size={12} className="text-[#9333EA]" />
                              <span>{device.ownerName}</span>
                            </button>
                          ) : (
                            <div className="text-xs text-[#8b7aa8] font-normal flex items-center gap-1">
                              <User size={12} className="text-[#8b7aa8]" />
                              <span>Walk-in Customer</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {device.cause && (
                      <div className="text-xs text-gray-600 bg-[#FAF7FF] p-2.5 rounded-xl border border-[#E9D8FD]/60">
                        <strong className="text-gray-800">Problem:</strong> {device.cause}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#F3E8FF]">
                      <button
                        onClick={() => {
                          setDeviceToView(device);
                          setViewDetailsOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#FAF5FF] text-[#7e22ce] border border-[#E9D8FD] font-semibold text-xs flex items-center gap-1.5"
                      >
                        <Receipt size={14} />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => openWorkbenchModal(device)}
                        className="px-3 py-1.5 rounded-xl bg-[#9333EA] text-white font-semibold text-xs flex items-center gap-1.5 border-none"
                      >
                        <Pencil size={14} />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="w-full py-16 text-center flex flex-col items-center justify-center rounded-2xl border border-[#E9D8FD] bg-[#FAF7FF]/30 gap-2">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF5FF] border border-[#E9D8FD] flex items-center justify-center text-[#9333EA] mb-1">
                <AlertCircle size={22} />
              </div>
              <span className="text-[#1F1728] font-bold text-base">No tracking requests available</span>
              <span className="text-[#8b7aa8] text-xs max-w-xs">No active repair devices found under this filter at this branch.</span>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center w-full pt-2">
            <div className="flex items-center justify-center gap-4 bg-[#FAF7FF] px-4 py-2 rounded-xl border border-[#E9D8FD]">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg bg-white border border-[#E9D8FD] text-[#5b4a7a] hover:text-[#9333EA] hover:border-[#9333EA] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-[#5b4a7a] disabled:hover:border-[#E9D8FD] flex justify-center items-center cursor-pointer transition-all shadow-2xs"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-semibold text-xs text-[#5b4a7a] px-2">
                Page <span className="text-[#1F1728] font-bold">{currentPage}</span> of <span className="text-[#1F1728] font-bold">{totalPages}</span>
              </span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-lg bg-white border border-[#E9D8FD] text-[#5b4a7a] hover:text-[#9333EA] hover:border-[#9333EA] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-[#5b4a7a] disabled:hover:border-[#E9D8FD] flex justify-center items-center cursor-pointer transition-all shadow-2xs"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 1. View Intake & Material Breakdown Modal */}
      {viewDetailsOpen && deviceToView && (() => {
        let items: { item: string; cost: number }[] = [];
        if (deviceToView.materials) {
          try {
            if (deviceToView.materials.trim().startsWith('[')) {
              items = JSON.parse(deviceToView.materials);
            } else if (deviceToView.materials.trim().startsWith('{')) {
              const parsed = JSON.parse(deviceToView.materials);
              items = parsed.items || [];
            }
          } catch (e) {
            console.error(e);
          }
        }

        const { parsed, cleanNotes } = parseRepairDetails(deviceToView.repairHistory);
        const photosList: string[] = [];
        if (parsed?.photos && Array.isArray(parsed.photos)) {
          photosList.push(...parsed.photos);
        }
        if (deviceToView.image && !photosList.includes(deviceToView.image)) {
          photosList.unshift(deviceToView.image);
        }

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full flex flex-col gap-6 shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto overscroll-contain border border-purple-100">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-[#bd00ff]">
                    <Receipt size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-black m-0">Device Repair Intake Sheet</h2>
                    <p className="text-xs text-gray-500 m-0">Complete device inspection, customer information & line-item parts breakdown</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewDetailsOpen(false)} 
                  className="text-gray-400 hover:text-black transition-colors font-bold text-2xl cursor-pointer bg-transparent border-none p-1"
                >
                  ✕
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-purple-50/60 p-4 rounded-2xl border border-purple-100">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Device</span>
                  <span className="text-sm font-bold text-black block truncate">{deviceToView.deviceName}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Customer</span>
                  <span className="text-sm font-bold text-purple-700 block truncate">{deviceToView.ownerName || 'Walk-in'}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Branch</span>
                  <span className="text-sm font-bold text-black block">{deviceToView.branch || 'Tagoloan'}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Status</span>
                  <span className={`text-sm font-bold block ${getProgressColor(deviceToView.progress)}`}>
                    {formatProgress(deviceToView.progress)}
                  </span>
                </div>
              </div>

              {/* Photos Gallery */}
              {photosList.length > 0 && (
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-2.5">
                    Attached Photos ({photosList.length})
                  </h4>
                  <div className="flex flex-wrap gap-2.5">
                    {photosList.map((imgUrl, idx) => (
                      <div 
                        key={idx}
                        onClick={() => setLightboxImage(imgUrl)}
                        className="w-20 h-20 rounded-xl border border-[#E9D8FD] overflow-hidden bg-gray-50 cursor-pointer hover:border-purple-500 transition-all group relative"
                      >
                        <img src={imgUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                          Zoom
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagnosis & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                  <span className="text-xs font-bold text-gray-700 block mb-1">Reported Problem / Cause</span>
                  <p className="text-xs text-gray-600 m-0 whitespace-pre-wrap">
                    {deviceToView.cause || parsed?.problemDescription || 'No diagnosis logged yet.'}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                  <span className="text-xs font-bold text-gray-700 block mb-1">Customer / Service Notes</span>
                  <p className="text-xs text-gray-600 m-0 whitespace-pre-wrap">
                    {cleanNotes || 'No additional notes provided.'}
                  </p>
                </div>
              </div>

              {/* Materials Breakdown */}
              {items.length > 0 && (
                <div className="border border-purple-100 rounded-2xl overflow-hidden">
                  <div className="p-3 bg-purple-50 border-b border-purple-100 text-xs font-bold text-purple-900">
                    Logged Materials & Parts Breakdown
                  </div>
                  <div className="divide-y divide-gray-100">
                    {items.map((m, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-800">{m.item}</span>
                        <span className="font-bold text-purple-700">₱{(Number(m.cost) || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Proof Image */}
              {deviceToView.proofImage && (
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-2">Completion Proof Photo</h4>
                  <div 
                    onClick={() => setLightboxImage(deviceToView.proofImage!)}
                    className="w-32 h-32 rounded-2xl border border-emerald-200 overflow-hidden bg-emerald-50/50 cursor-pointer"
                  >
                    <img src={deviceToView.proofImage} alt="Completion Proof" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setViewDetailsOpen(false)}
                  className="px-6 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer border-none"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 2. Edit Device Progress & Workbench Modal */}
      {isModalOpen && selectedDevice && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overscroll-contain"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 md:p-8 max-w-4xl w-full flex flex-col gap-4 sm:gap-6 shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto overscroll-contain border border-purple-100"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#bd00ff]/10 flex items-center justify-center text-[#bd00ff]">
                  <Pencil size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-black m-0">Edit Device Progress & Workbench</h2>
                  <p className="text-xs text-gray-500 m-0">Update repair status, diagnostic problem, and device details</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-gray-400 hover:text-black transition-colors font-bold text-xl cursor-pointer bg-transparent border-none p-1"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveWorkbench} className="flex flex-col gap-5 text-xs">
              {modalError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 font-bold border border-red-200">
                  {modalError}
                </div>
              )}
              {modalSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span>{modalSuccess}</span>
                </div>
              )}

              {/* Device Overview Banner */}
              <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-gray-900 text-sm block">{selectedDevice.deviceName}</span>
                  <span className="text-gray-500 text-xs">Owner: <strong className="text-purple-700">{selectedDevice.ownerName || 'Walk-in'}</strong></span>
                </div>
                {selectedDevice.trackingNumber && (
                  <span className="font-mono text-xs font-bold text-purple-900 bg-white px-2.5 py-1 rounded-lg border border-purple-200 self-start sm:self-auto">
                    {selectedDevice.trackingNumber}
                  </span>
                )}
              </div>

              {/* Progress Selector */}
              <div>
                <label className="font-bold text-gray-700 block mb-2">Repair Progress Stage</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(['Diagnostic', 'Repairing', 'Completed'] as const).map((stage) => {
                    const active = editProgress === stage;
                    return (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => setEditProgress(stage)}
                        className={`py-3 px-3 rounded-xl font-bold text-xs transition-all flex flex-col items-center gap-1 cursor-pointer border ${
                          active
                            ? stage === 'Completed'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : stage === 'Repairing'
                                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                : 'bg-[#9333EA] text-white border-[#9333EA] shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {stage === 'Diagnostic' && <Search size={16} />}
                        {stage === 'Repairing' && <Wrench size={16} />}
                        {stage === 'Completed' && <CheckCircle size={16} />}
                        <span>{stage}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cause / Diagnostics Findings */}
              <div>
                <label className="font-bold text-gray-700 block mb-1.5">
                  Diagnostic Problem & Cause Findings
                </label>
                <textarea
                  rows={3}
                  value={editCause}
                  onChange={(e) => setEditCause(e.target.value)}
                  placeholder="Detail the root cause identified (e.g. Broken LCD flex cable, burnt charging IC)..."
                  className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/20 outline-none text-xs font-medium text-gray-800"
                />
              </div>

              {/* Materials & Parts Breakdown */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col gap-3">
                <span className="font-bold text-gray-800 text-xs">Spare Parts & Materials Used</span>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Material or Part Name (e.g. Original LCD Screen)"
                    value={newMaterialItem}
                    onChange={(e) => setNewMaterialItem(e.target.value)}
                    className="flex-1 p-2.5 rounded-xl border border-gray-300 bg-white text-xs outline-none focus:border-[#9333EA]"
                  />
                  <input
                    type="number"
                    placeholder="Cost (₱)"
                    value={newMaterialCost}
                    onChange={(e) => setNewMaterialCost(e.target.value)}
                    className="w-full sm:w-28 p-2.5 rounded-xl border border-gray-300 bg-white text-xs outline-none focus:border-[#9333EA]"
                  />
                  <button
                    type="button"
                    onClick={handleAddMaterial}
                    className="px-4 py-2.5 rounded-xl bg-[#9333EA] hover:bg-[#7e22ce] text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer border-none"
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>

                {materialsList.length > 0 && (
                  <div className="divide-y divide-gray-200 border border-gray-200 rounded-xl bg-white overflow-hidden">
                    {materialsList.map((m, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-800">{m.item}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-purple-700">₱{(Number(m.cost) || 0).toLocaleString()}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterial(idx)}
                            className="text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Labor / Total Cost */}
              <div>
                <label className="font-bold text-gray-700 block mb-1.5">Total Repair / Service Cost (₱)</label>
                <input
                  type="text"
                  placeholder="e.g. 1500"
                  value={editRepairCost}
                  onChange={(e) => setEditRepairCost(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/20 outline-none text-xs font-semibold text-gray-800"
                />
              </div>

              {/* Completion Proof Photo */}
              <div>
                <label className="font-bold text-gray-700 block mb-1.5">
                  Completion Proof / Fixed Device Photo
                </label>
                <div className="flex items-center gap-4">
                  {proofPreviewUrl && (
                    <div className="w-20 h-20 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 shrink-0">
                      <img src={proofPreviewUrl} alt="Proof" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <label className="flex-1 border-2 border-dashed border-gray-300 hover:border-purple-400 rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer bg-gray-50/50 hover:bg-purple-50/30 transition-colors">
                    <Camera size={20} className="text-gray-400" />
                    <span className="text-xs font-semibold text-gray-600">Upload repair photo</span>
                    <span className="text-[10px] text-gray-400">PNG, JPG up to 10MB</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleProofFileChange}
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50 transition-colors cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#9333EA] hover:bg-[#7e22ce] text-white font-semibold shadow-xs hover:shadow transition-all cursor-pointer border-none disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <RefreshCw size={14} className="animate-spin" />}
                  <span>{isSubmitting ? 'Saving Changes...' : 'Save & Update Progress'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Customer Details Modal */}
      <CustomerDetailsModal
        isOpen={!!customerDetailsTarget}
        onClose={() => setCustomerDetailsTarget(null)}
        customerName={customerDetailsTarget?.name}
      />

      {/* 4. Photo Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img src={lightboxImage} alt="Enlarged" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-black font-bold flex items-center justify-center cursor-pointer shadow-lg border-none"
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
