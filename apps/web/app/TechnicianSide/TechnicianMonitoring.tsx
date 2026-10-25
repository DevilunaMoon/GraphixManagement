"use client";

import React, { useState, useEffect } from 'react';
import { 
  Wrench, Search, RefreshCw, CheckCircle2, AlertCircle, Clock, 
  Smartphone, User, Camera, FileText, ChevronRight, X, ChevronLeft, 
  UploadCloud, Plus, Trash2, Cpu, CheckCircle, ShieldAlert, Receipt, Pencil, Eye,
  Building2, ChevronDown, Upload, Check
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import CustomerDetailsModal from '../../components/Common/CustomerDetailsModal';
import MaterialBreakdownEditor, { MaterialItem, PaymentDetails } from '../../components/Repair/MaterialBreakdownEditor';
import imageCompression from 'browser-image-compression';

const BRAND_OPTIONS = [
  'Apple',
  'Samsung',
  'Vivo',
  'Xiaomi',
  'Oppo',
  'Realme',
  'Infinix',
  'Huawei',
  'Lenovo',
  'Asus',
  'Other'
];

const DEVICE_TYPES = [
  'Smartphone',
  'Tablet',
  'Laptop',
  'Other'
];

const PROBLEM_OPTIONS = [
  'Broken LCD/Screen',
  'Battery Problem',
  'Charging Problem',
  'Cannot Turn On',
  'Camera Problem',
  'Speaker/Microphone Problem',
  'Software Problem',
  'Water/Liquid Damage',
  'Physical Damage',
  'Other'
];

const BRANCH_OPTIONS = [
  'Tagoloan',
  'Villanueva',
  'Jasaan'
];

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
  if (prog === 'completed' || prog === '100%') return 'text-green-600 bg-green-50 border-green-200';
  if (prog === 'repairing' || prog === '50%' || prog === '75%') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  if (prog === 'diagnostic' || prog === 'diagnosis' || prog === '25%' || prog === '0%') return 'text-blue-600 bg-blue-50 border-blue-200';
  if (prog === 'cancelled') return 'text-red-600 bg-red-50 border-red-200';
  return 'text-purple-600 bg-purple-50 border-purple-200';
};

export default function TechnicianMonitoring() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusId = searchParams.get('focus');

  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DIAGNOSTIC' | 'REPAIRING' | 'DOWNPAYMENTS' | 'COMPLETED'>('ALL');
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

  // Edit / Workbench Fields
  const [editBrand, setEditBrand] = useState('Apple');
  const [editCustomBrand, setEditCustomBrand] = useState('');
  const [editDeviceType, setEditDeviceType] = useState('Smartphone');
  const [editCustomDeviceType, setEditCustomDeviceType] = useState('');
  const [editDeviceName, setEditDeviceName] = useState('');
  const [editImei, setEditImei] = useState('');
  const [editProblem, setEditProblem] = useState('Broken LCD/Screen');
  const [editCustomProblem, setEditCustomProblem] = useState('');
  const [editProblemDescription, setEditProblemDescription] = useState('');
  const [editSuggestedRepair, setEditSuggestedRepair] = useState('');
  const [editSuggestionForRepair, setEditSuggestionForRepair] = useState('');
  const [editIsWorking, setEditIsWorking] = useState('Yes');
  const [editHasPhysicalDamage, setEditHasPhysicalDamage] = useState('No');
  const [editBranch, setEditBranch] = useState('Tagoloan');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editCustomerEmail, setEditCustomerEmail] = useState('');
  const [editProgress, setEditProgress] = useState('Accepted');
  const [initialEditProgress, setInitialEditProgress] = useState('Accepted');
  const [editCause, setEditCause] = useState('');
  const [editTechnician, setEditTechnician] = useState('');
  const [editRepairCost, setEditRepairCost] = useState('');
  const [editDownpayment, setEditDownpayment] = useState('');
  const [editRepairHistory, setEditRepairHistory] = useState('');
  const [editExistingPhotos, setEditExistingPhotos] = useState<string[]>([]);
  const [editNewPhotos, setEditNewPhotos] = useState<File[]>([]);
  const [editNewPhotoPreviews, setEditNewPhotoPreviews] = useState<string[]>([]);
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  const [editMaterials, setEditMaterials] = useState<MaterialItem[]>([]);
  const [editPaymentMethod, setEditPaymentMethod] = useState<'Cash' | 'GCash' | 'Split'>('Cash');
  const [editCashAmount, setEditCashAmount] = useState<string>('');
  const [editGcashAmount, setEditGcashAmount] = useState<string>('');
  const [editPaymentDetails, setEditPaymentDetails] = useState<PaymentDetails | null>(null);

  const progressLevels = ['Accepted', 'Diagnostic', 'Repairing', 'Completed'];
  const initialProgressIndex = progressLevels.indexOf(initialEditProgress);

  // Photo Lightbox
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Lock background scrolling when any modal is open
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      isModalOpen ||
      viewDetailsOpen ||
      customerDetailsTarget ||
      lightboxImage
    );

    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [
    isModalOpen,
    viewDetailsOpen,
    customerDetailsTarget,
    lightboxImage
  ]);

  const fetchProfileAndDevices = async () => {
    setIsLoading(true);
    try {
      const profRes = await fetch('/api/profile');
      let profile: any = null;
      if (profRes.ok) {
        profile = await profRes.json();
        setTechnician(profile);
        if (profile?.branch) {
          setEditBranch(profile.branch);
        }
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

    const formattedProg = formatProgress(device.progress || 'Diagnostic');
    setEditProgress(formattedProg);
    setInitialEditProgress(formattedProg);

    setEditDeviceName(device.deviceName || '');
    setEditOwnerName(device.ownerName || device.user?.name || '');
    setEditTechnician(device.technician || technician?.name || '');
    setEditCause(device.cause || '');
    setEditRepairCost(device.repairCost || '');
    setEditDownpayment(device.downpayment || '');

    const { parsed, cleanNotes } = parseRepairDetails(device.repairHistory);
    setEditRepairHistory(cleanNotes);

    if (parsed) {
      if (parsed.brand) {
        if (BRAND_OPTIONS.includes(parsed.brand)) {
          setEditBrand(parsed.brand);
          setEditCustomBrand('');
        } else {
          setEditBrand('Other');
          setEditCustomBrand(parsed.brand);
        }
      } else {
        setEditBrand('Apple');
        setEditCustomBrand('');
      }

      if (parsed.deviceType) {
        if (DEVICE_TYPES.includes(parsed.deviceType)) {
          setEditDeviceType(parsed.deviceType);
          setEditCustomDeviceType('');
        } else {
          setEditDeviceType('Other');
          setEditCustomDeviceType(parsed.deviceType);
        }
      } else {
        setEditDeviceType('Smartphone');
        setEditCustomDeviceType('');
      }

      setEditImei(parsed.imei || '');

      if (parsed.problem) {
        if (PROBLEM_OPTIONS.includes(parsed.problem)) {
          setEditProblem(parsed.problem);
          setEditCustomProblem('');
        } else {
          setEditProblem('Other');
          setEditCustomProblem(parsed.problem);
        }
      } else {
        setEditProblem('Broken LCD/Screen');
        setEditCustomProblem('');
      }

      setEditProblemDescription(parsed.problemDescription || '');
      setEditSuggestedRepair(parsed.suggestedRepair || '');
      setEditSuggestionForRepair(parsed.suggestionForRepair || '');
      setEditIsWorking(parsed.isWorking || 'Yes');
      setEditHasPhysicalDamage(parsed.hasPhysicalDamage || 'No');
      setEditCustomerPhone(parsed.customerPhone || device.user?.phone || '');
      setEditCustomerEmail(parsed.customerEmail || device.user?.email || '');
      setEditBranch(parsed.branch || device.branch || 'Tagoloan');

      const photosList: string[] = [];
      if (Array.isArray(parsed.photos)) {
        photosList.push(...parsed.photos);
      }
      if (device.image && !photosList.includes(device.image)) {
        photosList.unshift(device.image);
      }
      setEditExistingPhotos(photosList);
    } else {
      setEditBrand('Apple');
      setEditCustomBrand('');
      setEditDeviceType('Smartphone');
      setEditCustomDeviceType('');
      setEditImei('');
      setEditProblem('Broken LCD/Screen');
      setEditCustomProblem('');
      setEditProblemDescription(device.cause || '');
      setEditSuggestedRepair('');
      setEditSuggestionForRepair('');
      setEditIsWorking('Yes');
      setEditHasPhysicalDamage('No');
      setEditCustomerPhone(device.user?.phone || '');
      setEditCustomerEmail(device.user?.email || '');
      setEditBranch(device.branch || 'Tagoloan');
      setEditExistingPhotos(device.image ? [device.image] : []);
    }

    setEditNewPhotos([]);
    setEditNewPhotoPreviews([]);
    setEditImage(null);
    setEditImagePreview(device.proofImage || null);

    let items: MaterialItem[] = [];
    let method: 'Cash' | 'GCash' | 'Split' = 'Cash';
    let cash = '';
    let gcash = '';
    if (device.materials) {
      try {
        const parsedMats = typeof device.materials === 'string' ? JSON.parse(device.materials) : device.materials;
        let rawItems: any[] = [];
        if (Array.isArray(parsedMats)) {
          rawItems = parsedMats;
        } else if (parsedMats && typeof parsedMats === 'object') {
          rawItems = parsedMats.items || [];
          if (parsedMats.paymentMethod) method = parsedMats.paymentMethod;
          if (parsedMats.cashAmount !== undefined) cash = String(parsedMats.cashAmount);
          if (parsedMats.gcashAmount !== undefined) gcash = String(parsedMats.gcashAmount);
        }
        items = rawItems.map((it: any, idx: number) => {
          const qty = Math.max(1, parseInt(String(it.qty || it.quantity || 1), 10) || 1);
          const unitPrice = Math.max(0, parseFloat(String(it.unitPrice ?? it.price ?? it.cost ?? 0).replace(/[^0-9.]/g, '')) || 0);
          const itemTotal = parseFloat(String(it.total).replace(/[^0-9.]/g, ''));
          const lineTotal = !isNaN(itemTotal) && itemTotal > 0 ? itemTotal : (qty * unitPrice);
          return {
            id: it.id || `mat-${Date.now()}-${idx}`,
            qty,
            description: it.description || it.item || it.name || it.part || `${device.deviceName || 'Device'} Replacement Part`,
            unitPrice,
            total: lineTotal
          };
        });
      } catch (e) {
        console.error("Failed to parse materials:", e);
      }
    }
    if (!cash && !gcash && device.downpayment) {
      if (method === 'GCash') gcash = device.downpayment;
      else cash = device.downpayment;
    }
    // If no materials were itemized yet, but repairCost exists, initialize a repair service item so cost is preserved
    if (items.length === 0 && device.repairCost) {
      const parsedCost = parseFloat(String(device.repairCost).replace(/[^0-9.]/g, '')) || 0;
      if (parsedCost > 0) {
        items = [{
          id: `mat-${Date.now()}-0`,
          qty: 1,
          description: `${device.deviceName || 'Device'} Repair Service`,
          unitPrice: parsedCost,
          total: parsedCost
        }];
        if (!cash && !gcash) cash = String(parsedCost);
      }
    }
    setEditMaterials(items);
    setEditPaymentMethod(method);
    setEditCashAmount(cash);
    setEditGcashAmount(gcash);
    setIsModalOpen(true);
  };

  const handleEditNewPhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    for (const file of files) {
      try {
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
        const compressedFile = await imageCompression(file, options);
        setEditNewPhotos(prev => [...prev, compressedFile]);
        const reader = new FileReader();
        reader.onloadend = () => {
          setEditNewPhotoPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Compression error:", error);
        setEditNewPhotos(prev => [...prev, file]);
        const reader = new FileReader();
        reader.onloadend = () => {
          setEditNewPhotoPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removeEditExistingPhoto = (index: number) => {
    setEditExistingPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const removeEditNewPhoto = (index: number) => {
    setEditNewPhotos(prev => prev.filter((_, i) => i !== index));
    setEditNewPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
        const compressedFile = await imageCompression(file, options);
        setEditImage(compressedFile);
        const reader = new FileReader();
        reader.onloadend = () => setEditImagePreview(reader.result as string);
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Compression error:", error);
        setEditImage(file);
        const reader = new FileReader();
        reader.onloadend = () => setEditImagePreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSaveWorkbench = async () => {
    if (!selectedDevice) return;
    setIsSubmitting(true);
    setModalError(null);
    setModalSuccess(null);

    const finalBrand = editBrand === 'Other' ? editCustomBrand.trim() || 'Other' : editBrand;
    const finalDeviceType = editDeviceType === 'Other' ? editCustomDeviceType.trim() || 'Other' : editDeviceType;
    const finalProblem = editProblem === 'Other' ? editCustomProblem.trim() || 'Other' : editProblem;
    const finalCause = editCause.trim() || `${finalProblem}${editProblemDescription.trim() ? ': ' + editProblemDescription.trim() : ''}`;

    const formData = new FormData();
    formData.append('progress', editProgress);
    if (editOwnerName !== null) formData.append('ownerName', editOwnerName);
    formData.append('cause', finalCause);
    formData.append('technician', editTechnician || technician?.name || selectedDevice.technician || 'Branch Technician');
    if (editRepairCost !== null) formData.append('repairCost', editRepairCost);
    if (editDownpayment !== null) formData.append('downpayment', editDownpayment);

    if (editProgress === 'Completed') {
      formData.append('status', 'Completed');
    } else if (editProgress === 'Cancelled') {
      formData.append('status', 'Cancelled');
    } else {
      formData.append('status', 'Active');
    }

    const structuredPayload: StructuredRepairDetails = {
      brand: finalBrand,
      deviceType: finalDeviceType,
      imei: editImei.trim() || null,
      problem: finalProblem,
      problemDescription: editProblemDescription.trim(),
      suggestedRepair: editSuggestedRepair.trim(),
      suggestionForRepair: editSuggestionForRepair.trim(),
      isWorking: editIsWorking,
      hasPhysicalDamage: editHasPhysicalDamage,
      branch: editBranch,
      customerName: editOwnerName,
      customerEmail: editCustomerEmail,
      customerPhone: editCustomerPhone,
      notes: editRepairHistory.trim(),
      photos: editExistingPhotos,
      submittedAt: new Date().toISOString()
    };

    formData.append('repairHistory', JSON.stringify(structuredPayload));

    if (editNewPhotos.length > 0) {
      editNewPhotos.forEach((file, index) => {
        formData.append(`photo_${index}`, file);
      });
      formData.append('photoCount', editNewPhotos.length.toString());
    }

    if (editImage) formData.append('proofImage', editImage);

    formData.append('materials', JSON.stringify({
      items: editMaterials,
      paymentMethod: editPaymentMethod,
      cashAmount: parseFloat(editCashAmount) || 0,
      gcashAmount: parseFloat(editGcashAmount) || 0,
      totalPaid: editPaymentDetails?.totalPaid ?? (parseFloat(editDownpayment) || 0),
      change: editPaymentDetails?.change ?? 0,
      balanceDue: editPaymentDetails?.balanceDue ?? 0,
      isFullyPaid: editPaymentDetails?.isFullyPaid ?? false
    }));

    try {
      const res = await fetch(`/api/monitoring/${selectedDevice.id}`, {
        method: 'PATCH',
        body: formData
      });

      if (res.ok) {
        const updatedDevice = await res.json();
        setDevices(prev => prev.map(d => d.id === selectedDevice.id ? { 
          ...d, 
          progress: updatedDevice.progress,
          ownerName: updatedDevice.ownerName,
          cause: updatedDevice.cause,
          technician: updatedDevice.technician,
          repairCost: updatedDevice.repairCost,
          downpayment: updatedDevice.downpayment,
          materials: updatedDevice.materials,
          proofImage: updatedDevice.proofImage,
          repairHistory: updatedDevice.repairHistory,
          image: updatedDevice.image || d.image,
          status: updatedDevice.status || (editProgress === 'Completed' ? 'Completed' : 'Active')
        } : d));
        setModalSuccess('Repair details updated successfully!');
        setTimeout(() => {
          setIsModalOpen(false);
          fetchProfileAndDevices();
        }, 800);
      } else {
        const text = await res.text();
        let errMsg = text;
        try {
          const errObj = JSON.parse(text);
          errMsg = errObj.error || 'Unknown error';
        } catch (e) {}
        setModalError(`Failed to update (${res.status}): ${errMsg.slice(0, 100)}`);
      }
    } catch (err: any) {
      console.error('Error saving progress:', err);
      setModalError('An external error occurred: ' + (err.message || 'Network error'));
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
    if (statusFilter === 'DOWNPAYMENTS') {
      const downVal = parseFloat(String(d.downpayment || '0').replace(/[^0-9.]/g, ''));
      let matsPaid = 0;
      if (d.materials) {
        try {
          const parsed = typeof d.materials === 'string' ? JSON.parse(d.materials) : d.materials;
          matsPaid = parseFloat(String(parsed?.cashAmount || parsed?.totalPaid || parsed?.downpayment || 0).replace(/[^0-9.]/g, '')) || 0;
        } catch {}
      }
      return downVal > 0 || matsPaid > 0;
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
          {(['ALL', 'DIAGNOSTIC', 'REPAIRING', 'DOWNPAYMENTS', 'COMPLETED'] as const).map((tab) => (
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
              {tab === 'ALL' ? 'All Assigned' : tab === 'DOWNPAYMENTS' ? 'Downpayments' : tab.charAt(0) + tab.slice(1).toLowerCase()}
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
                          <div className="font-bold text-[0.98rem] text-[#1F1728] leading-snug flex items-center gap-2 flex-wrap">
                            <span>{device.deviceName}</span>
                            {device.trackingNumber && (
                              <span className="font-mono text-[10px] font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                {device.trackingNumber}
                              </span>
                            )}
                            {(() => {
                              const downVal = parseFloat(String(device.downpayment || '0').replace(/[^0-9.]/g, ''));
                              let matsPaid = 0;
                              if (device.materials) {
                                try {
                                  const parsed = typeof device.materials === 'string' ? JSON.parse(device.materials) : device.materials;
                                  matsPaid = parseFloat(String(parsed?.cashAmount || parsed?.totalPaid || parsed?.downpayment || 0).replace(/[^0-9.]/g, '')) || 0;
                                } catch {}
                              }
                              const paid = downVal > 0 ? downVal : matsPaid;
                              if (paid > 0) {
                                return (
                                  <span className="font-mono text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    ₱{paid.toLocaleString()} Paid
                                  </span>
                                );
                              }
                              return null;
                            })()}
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

                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          {device.trackingNumber && (
                            <span className="font-mono text-[10px] font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 inline-block">
                              {device.trackingNumber}
                            </span>
                          )}
                          {(() => {
                            const downVal = parseFloat(String(device.downpayment || '0').replace(/[^0-9.]/g, ''));
                            let matsPaid = 0;
                            if (device.materials) {
                              try {
                                const parsed = typeof device.materials === 'string' ? JSON.parse(device.materials) : device.materials;
                                matsPaid = parseFloat(String(parsed?.cashAmount || parsed?.totalPaid || parsed?.downpayment || 0).replace(/[^0-9.]/g, '')) || 0;
                              } catch {}
                            }
                            const paid = downVal > 0 ? downVal : matsPaid;
                            if (paid > 0) {
                              return (
                                <span className="font-mono text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  ₱{paid.toLocaleString()} Paid
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>

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
        let items: MaterialItem[] = [];
        let parsedMethod: 'Cash' | 'GCash' | 'Split' = 'Cash';
        let parsedCash = '';
        let parsedGcash = '';
        if (deviceToView.materials) {
          try {
            const parsed = JSON.parse(deviceToView.materials);
            if (Array.isArray(parsed)) {
              items = parsed;
            } else if (parsed && typeof parsed === 'object') {
              items = parsed.items || [];
              if (parsed.paymentMethod) parsedMethod = parsed.paymentMethod;
              if (parsed.cashAmount !== undefined) parsedCash = String(parsed.cashAmount);
              if (parsed.gcashAmount !== undefined) parsedGcash = String(parsed.gcashAmount);
            }
          } catch (e) {
            console.error(e);
          }
        }
        if (!parsedCash && !parsedGcash && deviceToView.downpayment) {
          if (parsedMethod === 'GCash') parsedGcash = deviceToView.downpayment;
          else parsedCash = deviceToView.downpayment;
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

              {/* Customer Contact & Account Info */}
              {(parsed?.customerEmail || parsed?.customerPhone || deviceToView.ownerName || deviceToView.user?.email || deviceToView.user?.phone) && (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 flex flex-col gap-2">
                  <span className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-1.5">
                    <User size={14} className="text-[#bd00ff]" />
                    Customer Information (Auto-retrieved)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-700">
                    <div><strong className="text-black">Full Name:</strong> {deviceToView.ownerName || parsed?.customerName || deviceToView.user?.name || 'Walk-in Customer'}</div>
                    <div><strong className="text-black">Email:</strong> {parsed?.customerEmail || deviceToView.user?.email || 'Not provided'}</div>
                    <div><strong className="text-black">Phone:</strong> {parsed?.customerPhone || deviceToView.user?.phone || 'Not provided'}</div>
                  </div>
                </div>
              )}

              {/* Structured Device Details */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 flex flex-col gap-3">
                <span className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone size={14} className="text-[#bd00ff]" />
                  Device & Diagnostic Details
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-700">
                  <div><strong className="text-black">Brand:</strong> {parsed?.brand || 'Apple'}</div>
                  <div><strong className="text-black">Device Type:</strong> {parsed?.deviceType || 'Smartphone'}</div>
                  <div><strong className="text-black">IMEI/Serial:</strong> {parsed?.imei || 'N/A'}</div>
                  <div><strong className="text-black">Assigned Tech:</strong> {deviceToView.technician || 'Pending'}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-700 pt-2 border-t border-gray-200">
                  <div><strong className="text-black">Working Condition:</strong> {parsed?.isWorking || 'Yes'}</div>
                  <div><strong className="text-black">Visible Damage:</strong> {parsed?.hasPhysicalDamage || 'No'}</div>
                </div>

                <div className="pt-2 border-t border-gray-200 text-xs text-gray-700">
                  <div><strong className="text-black">Reported Issue:</strong> {parsed?.problem ? `${parsed.problem} - ${parsed.problemDescription || ''}` : (deviceToView.cause || 'Diagnostic required')}</div>
                </div>

                {parsed?.suggestedRepair && (
                  <div className="pt-2 border-t border-gray-200 text-xs text-gray-700">
                    <div><strong className="text-black">Suggested Repair:</strong> {parsed.suggestedRepair}</div>
                  </div>
                )}

                {parsed?.suggestionForRepair && (
                  <div className="pt-2 border-t border-gray-200 text-xs text-gray-700">
                    <div><strong className="text-black">Suggestion for Repair:</strong> {parsed.suggestionForRepair}</div>
                  </div>
                )}

                {cleanNotes && (
                  <div className="pt-2 border-t border-gray-200 text-xs text-gray-700">
                    <div><strong className="text-black">Repair History Notes:</strong> {cleanNotes}</div>
                  </div>
                )}
              </div>

              {/* Photos Gallery */}
              {photosList.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 flex flex-col gap-2">
                  <span className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-1.5">
                    <Camera size={14} className="text-[#bd00ff]" />
                    Uploaded Device Photos ({photosList.length})
                  </span>
                  <div className="flex flex-wrap gap-3 items-center pt-1">
                    {photosList.map((photo, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setLightboxImage(photo)}
                        className="w-24 h-24 rounded-2xl border-2 border-purple-200 overflow-hidden hover:scale-105 transition-transform bg-white shadow-sm flex items-center justify-center p-1 cursor-pointer group relative"
                        title="Click to zoom image"
                      >
                        <img src={photo} alt={`Device photo ${idx+1}`} className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold rounded-2xl">
                          Zoom
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Render Read-Only Material Breakdown */}
              <MaterialBreakdownEditor
                readOnly
                items={items}
                paymentMethod={parsedMethod}
                cashAmount={parsedCash}
                gcashAmount={parsedGcash}
                downpayment={deviceToView.downpayment || '0'}
                deviceName={deviceToView.deviceName}
                customerName={deviceToView.ownerName || 'Walk-in Customer'}
                branch={deviceToView.branch}
              />

              {/* Completion Proof Photo */}
              {deviceToView.proofImage && (
                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 flex flex-col gap-2">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    Completion Proof Photo
                  </span>
                  <div className="pt-1">
                    <div 
                      onClick={() => setLightboxImage(deviceToView.proofImage!)}
                      className="w-24 h-24 rounded-2xl border-2 border-emerald-300 overflow-hidden hover:scale-105 transition-transform bg-white shadow-sm flex items-center justify-center p-1 cursor-pointer group relative"
                      title="Click to zoom completion proof"
                    >
                      <img src={deviceToView.proofImage} alt="Completion Proof" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold rounded-2xl">
                        Zoom
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setViewDetailsOpen(false)}
                  className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors cursor-pointer border-none"
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
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full flex flex-col gap-6 shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto overscroll-contain border border-purple-100"
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

            {/* Error & Success Alerts */}
            {modalError && (
              <div className="p-3.5 rounded-xl bg-red-50 text-red-600 font-bold border border-red-200 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}
            {modalSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle size={16} />
                <span>{modalSuccess}</span>
              </div>
            )}

            <div className="flex flex-col gap-6">

              {/* 1. Customer Information Section */}
              <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-200/80 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-black uppercase tracking-wider flex items-center gap-2 m-0">
                    <User size={16} className="text-[#bd00ff]" />
                    Customer Information (Auto-retrieved)
                  </h3>
                  <span className="text-xs text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full font-semibold border border-purple-200">
                    Auto-linked Account
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700">Full Name</label>
                    <input 
                      type="text" 
                      value={editOwnerName} 
                      readOnly
                      placeholder="e.g. Juan Dela Cruz" 
                      className="h-10 border-2 border-gray-200 bg-gray-100 rounded-xl px-4 text-gray-700 text-sm outline-none cursor-not-allowed select-none font-medium" 
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700">Phone Number</label>
                    <input 
                      type="text" 
                      value={editCustomerPhone} 
                      readOnly
                      placeholder="e.g. 09123456789" 
                      className="h-10 border-2 border-gray-200 bg-gray-100 rounded-xl px-4 text-gray-700 text-sm outline-none cursor-not-allowed select-none font-medium" 
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700">Email Address</label>
                    <input 
                      type="email" 
                      value={editCustomerEmail} 
                      readOnly
                      placeholder="customer@example.com" 
                      className="h-10 border-2 border-gray-200 bg-gray-100 rounded-xl px-4 text-gray-700 text-sm outline-none cursor-not-allowed select-none font-medium" 
                    />
                  </div>
                </div>
              </div>

              {/* 2. Branch & Device Info Section */}
              <div className="bg-white p-5 rounded-2xl border-2 border-gray-100 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-black uppercase tracking-wider flex items-center gap-2 m-0">
                  <Smartphone size={16} className="text-[#bd00ff]" />
                  Device & Branch Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Preferred Branch */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700 flex items-center gap-1">
                      <Building2 size={13} className="text-[#bd00ff]" />
                      Preferred Branch
                    </label>
                    <select
                      value={editBranch}
                      disabled
                      className="h-10 border-2 border-gray-200 bg-gray-100 rounded-xl px-3 text-gray-700 text-sm outline-none font-medium cursor-not-allowed"
                    >
                      {BRANCH_OPTIONS.map(b => (
                        <option key={b} value={b}>{b} Branch</option>
                      ))}
                    </select>
                  </div>

                  {/* Brand */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700">Brand</label>
                    <select
                      value={editBrand}
                      disabled
                      className="h-10 border-2 border-gray-200 bg-gray-100 rounded-xl px-3 text-gray-700 text-sm outline-none font-medium cursor-not-allowed"
                    >
                      {BRAND_OPTIONS.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    {editBrand === 'Other' && (
                      <input 
                        type="text"
                        value={editCustomBrand}
                        readOnly
                        placeholder="Specify brand..."
                        className="h-9 border border-gray-200 bg-gray-100 rounded-lg px-3 text-xs text-gray-700 outline-none mt-1 cursor-not-allowed"
                      />
                    )}
                  </div>

                  {/* Device Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700">Device Type</label>
                    <select
                      value={editDeviceType}
                      disabled
                      className="h-10 border-2 border-gray-200 bg-gray-100 rounded-xl px-3 text-gray-700 text-sm outline-none font-medium cursor-not-allowed"
                    >
                      {DEVICE_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {editDeviceType === 'Other' && (
                      <input 
                        type="text"
                        value={editCustomDeviceType}
                        readOnly
                        placeholder="Specify type..."
                        className="h-9 border border-gray-200 bg-gray-100 rounded-lg px-3 text-xs text-gray-700 outline-none mt-1 cursor-not-allowed"
                      />
                    )}
                  </div>

                  {/* Device Name / Model */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700">Device Model / Name</label>
                    <input 
                      type="text" 
                      value={editDeviceName} 
                      readOnly
                      placeholder="e.g. iPhone 11 Pro" 
                      className="h-10 border-2 border-gray-200 bg-gray-100 rounded-xl px-4 text-gray-700 text-sm outline-none font-semibold cursor-not-allowed select-none" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* IMEI / Serial Number */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700">IMEI / Serial Number (Optional)</label>
                    <input 
                      type="text" 
                      value={editImei} 
                      onChange={(e) => setEditImei(e.target.value)} 
                      placeholder="e.g. 356948112345678" 
                      className="h-10 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-4 text-black text-sm outline-none transition-colors font-mono" 
                    />
                  </div>

                  {/* Progress Status */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700">Repair Progress</label>
                    <div className="relative">
                      <select 
                        value={editProgress}
                        onChange={(e) => setEditProgress(e.target.value)}
                        className={`w-full h-10 border-2 border-gray-200 rounded-xl px-4 outline-none focus:border-[#bd00ff] transition-colors font-bold text-sm appearance-none bg-white cursor-pointer ${getProgressColor(editProgress)}`}
                      >
                        <option value="Diagnostic" disabled={progressLevels.indexOf('Diagnostic') < initialProgressIndex} className="text-blue-500 font-semibold">Diagnostic</option>
                        <option value="Repairing" disabled={progressLevels.indexOf('Repairing') < initialProgressIndex} className="text-yellow-500 font-semibold">Repairing</option>
                        <option value="Completed" disabled={progressLevels.indexOf('Completed') < initialProgressIndex} className="text-green-600 font-semibold">Completed</option>
                        <option value="Cancelled" className="text-red-500 font-semibold">Cancelled</option>
                      </select>
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                        <ChevronDown size={18} className="text-gray-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Problem & Description Section */}
              <div className="bg-white p-5 rounded-2xl border-2 border-gray-100 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-black uppercase tracking-wider flex items-center gap-2 m-0">
                  <ShieldAlert size={16} className="text-[#bd00ff]" />
                  Problem & Issue Description
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700">Problem / Issue Category</label>
                    <select
                      value={editProblem}
                      onChange={(e) => setEditProblem(e.target.value)}
                      className="h-10 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-3 text-black text-sm outline-none transition-colors font-medium"
                    >
                      {PROBLEM_OPTIONS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    {editProblem === 'Other' && (
                      <input 
                        type="text"
                        value={editCustomProblem}
                        onChange={(e) => setEditCustomProblem(e.target.value)}
                        placeholder="Specify problem..."
                        className="h-9 border border-[#bd00ff] rounded-lg px-3 text-xs text-black outline-none mt-1"
                      />
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700">Assigned Technician</label>
                    <input 
                      type="text" 
                      value={editTechnician} 
                      onChange={(e) => setEditTechnician(e.target.value)} 
                      placeholder="Technician Name" 
                      className="h-10 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-4 text-black text-sm outline-none transition-colors" 
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-xs text-gray-700">Describe the Problem</label>
                  <textarea 
                    rows={3}
                    value={editProblemDescription}
                    readOnly
                    placeholder="Provide details of the problem..."
                    className="border-2 border-gray-200 bg-gray-100 rounded-xl p-3 text-gray-700 text-sm outline-none resize-none cursor-not-allowed select-none font-medium"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-xs text-gray-700">Suggested Repair</label>
                  <textarea 
                    rows={3}
                    value={editSuggestedRepair}
                    onChange={(e) => setEditSuggestedRepair(e.target.value)}
                    placeholder="e.g. Replace the damaged LCD/screen with a compatible replacement part."
                    className="border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl p-3 text-black text-sm outline-none transition-colors resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-xs text-gray-700">Suggestion for Repair</label>
                  <textarea 
                    rows={3}
                    value={editSuggestionForRepair}
                    onChange={(e) => setEditSuggestionForRepair(e.target.value)}
                    placeholder="e.g. Replace the damaged part and test the device after repair to ensure it is functioning properly."
                    className="border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl p-3 text-black text-sm outline-none transition-colors resize-none"
                  />
                </div>
              </div>

              {/* 4. Device Condition & Photos Section */}
              <div className="bg-white p-5 rounded-2xl border-2 border-gray-100 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-black uppercase tracking-wider flex items-center gap-2 m-0">
                  <Camera size={16} className="text-[#bd00ff]" />
                  Device Condition & Photos
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Is Working */}
                  <div className="flex flex-col gap-2">
                    <label className="font-semibold text-xs text-gray-700">Is the device still turning on / working?</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Yes', 'No', 'Partially'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setEditIsWorking(opt)}
                          className={`py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer ${
                            editIsWorking === opt 
                              ? 'border-[#bd00ff] bg-purple-50 text-[#bd00ff]' 
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Physical Damage */}
                  <div className="flex flex-col gap-2">
                    <label className="font-semibold text-xs text-gray-700">Visible physical / screen damage?</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Yes', 'No'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setEditHasPhysicalDamage(opt)}
                          className={`py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer ${
                            editHasPhysicalDamage === opt 
                              ? 'border-[#bd00ff] bg-purple-50 text-[#bd00ff]' 
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Uploaded Device Photos Gallery */}
                <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-xs text-gray-700">Upload Device Photos</label>
                    <label className="text-xs font-bold text-[#bd00ff] hover:underline cursor-pointer flex items-center gap-1">
                      <Plus size={14} />
                      Add More Photos
                      <input type="file" multiple accept="image/*" onChange={handleEditNewPhotosChange} className="hidden" />
                    </label>
                  </div>

                  {/* Photo Thumbnails */}
                  <div className="flex flex-wrap gap-3 items-center">
                    {/* Existing Photos */}
                    {editExistingPhotos.map((url, idx) => (
                      <div key={`existing-${idx}`} className="relative w-20 h-20 rounded-xl border border-gray-200 overflow-hidden group bg-gray-50 shadow-sm">
                        <img src={url} alt={`Photo ${idx+1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeEditExistingPhoto(idx)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none shadow"
                          title="Remove photo"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    {/* New Upload Previews */}
                    {editNewPhotoPreviews.map((preview, idx) => (
                      <div key={`new-${idx}`} className="relative w-20 h-20 rounded-xl border-2 border-[#bd00ff] overflow-hidden group bg-purple-50 shadow-sm">
                        <img src={preview} alt={`New upload ${idx+1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 bg-[#bd00ff] text-white text-[9px] font-bold text-center py-0.5">NEW</span>
                        <button
                          type="button"
                          onClick={() => removeEditNewPhoto(idx)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none shadow"
                          title="Remove photo"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    {editExistingPhotos.length === 0 && editNewPhotoPreviews.length === 0 && (
                      <div className="w-full py-4 text-center border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400">
                        No photos attached. Click &quot;Add More Photos&quot; to upload device images.
                      </div>
                    )}
                  </div>
                </div>

                {/* Repair History Clean Text */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100">
                  <label className="font-semibold text-xs text-gray-700 flex items-center gap-1.5">
                    <FileText size={14} className="text-[#bd00ff]" />
                    Repair History & Background Notes
                  </label>
                  <input 
                    type="text" 
                    value={editRepairHistory}
                    onChange={(e) => setEditRepairHistory(e.target.value)}
                    placeholder="Where was this first repaired from? (e.g. First time repaired / Original Shop)" 
                    className="h-10 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-4 text-black text-sm outline-none transition-colors" 
                  />
                  <span className="text-[11px] text-gray-400">Clean notes regarding prior repairs (never displays raw JSON).</span>
                </div>
              </div>

              {/* 5. Itemized Materials Breakdown */}
              <div className="bg-white p-5 rounded-2xl border-2 border-gray-100">
                <MaterialBreakdownEditor
                  items={editMaterials}
                  onItemsChange={setEditMaterials}
                  paymentMethod={editPaymentMethod}
                  onPaymentMethodChange={setEditPaymentMethod}
                  cashAmount={editCashAmount}
                  onCashAmountChange={setEditCashAmount}
                  gcashAmount={editGcashAmount}
                  onGcashAmountChange={setEditGcashAmount}
                  onPaymentDetailsChange={setEditPaymentDetails}
                  downpayment={editDownpayment}
                  onDownpaymentChange={setEditDownpayment}
                  onTotalCostCalculated={(total) => setEditRepairCost(total.toString())}
                  deviceName={editDeviceName || selectedDevice.deviceName}
                  customerName={editOwnerName || selectedDevice.ownerName || 'Customer'}
                  branch={editBranch || selectedDevice.branch}
                />
              </div>

              {/* 6. Proof of Repair Image */}
              <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-200/80 flex flex-col gap-3">
                <label className="font-semibold text-xs text-gray-700 uppercase tracking-wider">Proof of Repair (Diagnostic / Final Receipt / Finished Device)</label>
                <div className="flex flex-col items-start gap-3">
                  <div className="w-full max-w-[220px] aspect-video rounded-xl border-2 border-dashed border-gray-300 bg-white flex justify-center items-center overflow-hidden relative group shadow-sm">
                    {editImagePreview ? (
                      <img src={editImagePreview} alt="Proof" className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="text-gray-400 font-semibold text-xs">No Proof Image</span>
                    )}
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                      <span className="text-white font-bold text-xs flex items-center gap-1.5 bg-[#bd00ff] px-3.5 py-1.5 rounded-lg shadow">
                        <Upload size={14} />
                        Upload
                      </span>
                      <input type="file" accept="image/*" onChange={handleEditImageChange} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSaveWorkbench}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[#bd00ff] text-white font-bold rounded-xl hover:bg-[#9c00d6] transition-colors disabled:opacity-50 cursor-pointer border-none shadow-md shadow-purple-200 flex items-center gap-2"
              >
                {isSubmitting && <RefreshCw size={14} className="animate-spin" />}
                <span>{isSubmitting ? "Saving Changes..." : "Save Changes"}</span>
              </button>
            </div>
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
