"use client";

import { useState, useEffect } from 'react';
import { 
  Pencil, FileText, Search, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, 
  ChevronDown, Upload, Wrench, Receipt, Building2, Eye, Smartphone, HelpCircle, 
  X, Plus, Trash2, Camera, User, Phone, Mail, Check, ShieldAlert, Cpu
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import MaterialBreakdownEditor, { MaterialItem } from '../../components/Repair/MaterialBreakdownEditor';
import RepairRequestReviewModal from '../../components/Repair/RepairRequestReviewModal';
import { useBranch } from '../../context/BranchContext';

interface DeviceProgress {
  id: string;
  deviceName: string;
  ownerName?: string;
  progress: string;
  image: string | null;
  proofImage: string | null;
  status: string;
  cause: string | null;
  technician: string | null;
  repairCost: string | null;
  downpayment: string | null;
  materials?: string | null;
  branch?: string;
  repairHistory: string | null;
  createdAt?: string;
}

interface UserData {
  id: string;
  name: string | null;
  email: string;
  phone?: string | null;
  role?: string;
  branch?: string | null;
}

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

interface StructuredRepairDetails {
  brand?: string;
  deviceType?: string;
  imei?: string | null;
  problem?: string;
  problemDescription?: string;
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

export default function AdminMonitoring() {
  const router = useRouter();
  const navigate = router.push;
  const { selectedBranch, branches, isSuperAdmin } = useBranch();
  const [searchQuery, setSearchQuery] = useState('');
  const [devices, setDevices] = useState<DeviceProgress[]>([]);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [successCompleteOpen, setSuccessCompleteOpen] = useState(false);
  const [deviceToComplete, setDeviceToComplete] = useState<DeviceProgress | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  // Add Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addBrand, setAddBrand] = useState('Apple');
  const [addCustomBrand, setAddCustomBrand] = useState('');
  const [addDeviceType, setAddDeviceType] = useState('Smartphone');
  const [addCustomDeviceType, setAddCustomDeviceType] = useState('');
  const [addDeviceName, setAddDeviceName] = useState('');
  const [addImei, setAddImei] = useState('');
  const [addProblem, setAddProblem] = useState('Broken LCD/Screen');
  const [addCustomProblem, setAddCustomProblem] = useState('');
  const [addProblemDescription, setAddProblemDescription] = useState('');
  const [addIsWorking, setAddIsWorking] = useState('Yes');
  const [addHasPhysicalDamage, setAddHasPhysicalDamage] = useState('No');
  const [addBranch, setAddBranch] = useState<string>('Tagoloan');
  const [addOwnerName, setAddOwnerName] = useState('');
  const [addCustomerPhone, setAddCustomerPhone] = useState('');
  const [addCustomerEmail, setAddCustomerEmail] = useState('');
  const [addUserId, setAddUserId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [addProgress, setAddProgress] = useState('Diagnostic');
  const [addCause, setAddCause] = useState('');
  const [addTechnician, setAddTechnician] = useState('');
  const [addRepairCost, setAddRepairCost] = useState('');
  const [addDownpayment, setAddDownpayment] = useState('');
  const [addRepairHistory, setAddRepairHistory] = useState('');
  const [addPhotos, setAddPhotos] = useState<File[]>([]);
  const [addPhotoPreviews, setAddPhotoPreviews] = useState<string[]>([]);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addMaterials, setAddMaterials] = useState<MaterialItem[]>([]);
  const [addLaborCost, setAddLaborCost] = useState<string>('0');

  // View Details Modal State
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [deviceToView, setDeviceToView] = useState<DeviceProgress | null>(null);

  // Account Linking States
  const [users, setUsers] = useState<UserData[]>([]);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deviceToEdit, setDeviceToEdit] = useState<DeviceProgress | null>(null);
  const [editBrand, setEditBrand] = useState('Apple');
  const [editCustomBrand, setEditCustomBrand] = useState('');
  const [editDeviceType, setEditDeviceType] = useState('Smartphone');
  const [editCustomDeviceType, setEditCustomDeviceType] = useState('');
  const [editDeviceName, setEditDeviceName] = useState('');
  const [editImei, setEditImei] = useState('');
  const [editProblem, setEditProblem] = useState('Broken LCD/Screen');
  const [editCustomProblem, setEditCustomProblem] = useState('');
  const [editProblemDescription, setEditProblemDescription] = useState('');
  const [editIsWorking, setEditIsWorking] = useState('Yes');
  const [editHasPhysicalDamage, setEditHasPhysicalDamage] = useState('No');
  const [editBranch, setEditBranch] = useState('Tagoloan');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editCustomerEmail, setEditCustomerEmail] = useState('');
  const [editProgress, setEditProgress] = useState('Diagnostic');
  const [initialEditProgress, setInitialEditProgress] = useState('Diagnostic');
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
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editMaterials, setEditMaterials] = useState<MaterialItem[]>([]);
  const [editLaborCost, setEditLaborCost] = useState<string>('0');

  const progressLevels = ['Diagnostic', 'Repairing', 'Completed'];
  const initialProgressIndex = progressLevels.indexOf(initialEditProgress);

  const ITEMS_PER_PAGE = 8;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedBranch]);

  const fetchMonitoring = () => {
    setIsLoading(true);
    const branchQuery = (isSuperAdmin && selectedBranch) ? `&branch=${encodeURIComponent(selectedBranch)}` : '';
    fetch(`/api/monitoring?page=${currentPage}&limit=${ITEMS_PER_PAGE}&search=${encodeURIComponent(searchQuery)}${branchQuery}`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.requests)) {
          setDevices(data.requests);
          setTotalCount(data.totalCount || 0);
          setTotalPages(data.totalPages || 1);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchMonitoring();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchQuery, selectedBranch]);

  useEffect(() => {
    fetch('/api/admin/accounts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUsers(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!addCustomerEmail) {
      setAddUserId(null);
      return;
    }
    const matchedUser = users.find(u => u.email.toLowerCase() === addCustomerEmail.toLowerCase());
    if (matchedUser) {
      setAddUserId(matchedUser.id);
      if (!addOwnerName && matchedUser.name) {
        setAddOwnerName(matchedUser.name);
      }
    } else {
      setAddUserId(null);
    }
  }, [addCustomerEmail, users]);

  const filteredUsers = addCustomerEmail 
    ? users.filter(u => u.email.toLowerCase().includes(addCustomerEmail.toLowerCase()))
    : users;

  const activeDevices = devices.filter(d => d.status !== 'Completed');
  const paginatedDevices = devices;

  const [reviewRequestModalOpen, setReviewRequestModalOpen] = useState(false);
  const [requestToReview, setRequestToReview] = useState<DeviceProgress | null>(null);

  const getProgressColor = (progress: string) => {
    const prog = (progress || '').toLowerCase();
    switch (prog) {
      case 'completed':
      case '100%': 
        return 'text-green-600';
      case 'repairing':
      case '75%': 
      case '50%': 
        return 'text-yellow-500';
      case 'diagnostic':
      case 'diagnosis':
      case '25%':
      case '0%': 
        return 'text-blue-500';
      case 'accepted':
        return 'text-blue-600';
      case 'pending':
        return 'text-amber-500';
      case 'rejected':
      case 'cancelled':
        return 'text-red-500';
      default: 
        return 'text-black';
    }
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

  const openEditModal = (device: DeviceProgress) => {
    setDeviceToEdit(device);
    setEditOwnerName(device.ownerName || '');
    setEditProgress(device.progress || 'Diagnostic');
    setInitialEditProgress(device.progress || 'Diagnostic');
    setEditCause(device.cause || '');
    setEditTechnician(device.technician || '');
    setEditRepairCost(device.repairCost || '');
    setEditDownpayment(device.downpayment || '');
    setEditBranch(device.branch || 'Tagoloan');
    setEditDeviceName(device.deviceName || '');

    // Parse repairHistory for structured details
    const { parsed, cleanNotes } = parseRepairDetails(device.repairHistory);
    setEditRepairHistory(cleanNotes);

    if (parsed) {
      if (parsed.brand && BRAND_OPTIONS.includes(parsed.brand)) {
        setEditBrand(parsed.brand);
        setEditCustomBrand('');
      } else if (parsed.brand) {
        setEditBrand('Other');
        setEditCustomBrand(parsed.brand);
      } else {
        setEditBrand('Apple');
        setEditCustomBrand('');
      }

      if (parsed.deviceType && DEVICE_TYPES.includes(parsed.deviceType)) {
        setEditDeviceType(parsed.deviceType);
        setEditCustomDeviceType('');
      } else if (parsed.deviceType) {
        setEditDeviceType('Other');
        setEditCustomDeviceType(parsed.deviceType);
      } else {
        setEditDeviceType('Smartphone');
        setEditCustomDeviceType('');
      }

      setEditImei(parsed.imei || '');

      if (parsed.problem && PROBLEM_OPTIONS.includes(parsed.problem)) {
        setEditProblem(parsed.problem);
        setEditCustomProblem('');
      } else if (parsed.problem) {
        setEditProblem('Other');
        setEditCustomProblem(parsed.problem);
      } else {
        setEditProblem('Broken LCD/Screen');
        setEditCustomProblem('');
      }

      setEditProblemDescription(parsed.problemDescription || '');
      setEditIsWorking(parsed.isWorking || 'Yes');
      setEditHasPhysicalDamage(parsed.hasPhysicalDamage || 'No');
      setEditCustomerPhone(parsed.customerPhone || '');
      setEditCustomerEmail(parsed.customerEmail || '');
      if (parsed.branch) setEditBranch(parsed.branch);

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
      setEditIsWorking('Yes');
      setEditHasPhysicalDamage('No');
      setEditCustomerPhone('');
      setEditCustomerEmail('');
      setEditExistingPhotos(device.image ? [device.image] : []);
    }

    setEditNewPhotos([]);
    setEditNewPhotoPreviews([]);
    setEditImage(null);
    setEditImagePreview(device.proofImage || null);

    let items: MaterialItem[] = [];
    let labor = '0';
    if (device.materials) {
      try {
        const parsedMats = JSON.parse(device.materials);
        if (Array.isArray(parsedMats)) {
          items = parsedMats;
        } else if (parsedMats && typeof parsedMats === 'object') {
          items = parsedMats.items || [];
          labor = String(parsedMats.laborCost ?? 0);
        }
      } catch (e) {
        console.error("Failed to parse materials:", e);
      }
    }
    setEditMaterials(items);
    setEditLaborCost(labor);
    setEditModalOpen(true);
  };

  const handleAddPhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    for (const file of files) {
      try {
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
        const compressedFile = await imageCompression(file, options);
        setAddPhotos(prev => [...prev, compressedFile]);
        const reader = new FileReader();
        reader.onloadend = () => {
          setAddPhotoPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Compression error:", error);
        setAddPhotos(prev => [...prev, file]);
        const reader = new FileReader();
        reader.onloadend = () => {
          setAddPhotoPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removeAddPhoto = (index: number) => {
    setAddPhotos(prev => prev.filter((_, i) => i !== index));
    setAddPhotoPreviews(prev => prev.filter((_, i) => i !== index));
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

  const handleAddSave = async () => {
    const finalDeviceName = addDeviceName.trim();
    if (!finalDeviceName || !addProgress) {
      alert("Device Name/Model and Progress are required.");
      return;
    }

    const finalBrand = addBrand === 'Other' ? addCustomBrand.trim() || 'Other' : addBrand;
    const finalDeviceType = addDeviceType === 'Other' ? addCustomDeviceType.trim() || 'Other' : addDeviceType;
    const finalProblem = addProblem === 'Other' ? addCustomProblem.trim() || 'Other' : addProblem;
    const finalCause = addCause.trim() || `${finalProblem}${addProblemDescription.trim() ? ': ' + addProblemDescription.trim() : ''}`;

    setIsSubmittingAdd(true);
    const formData = new FormData();
    formData.append('deviceName', finalDeviceName);
    if (addOwnerName) formData.append('ownerName', addOwnerName);
    formData.append('progress', addProgress);
    formData.append('cause', finalCause);
    if (addTechnician) formData.append('technician', addTechnician);
    if (addRepairCost) formData.append('repairCost', addRepairCost);
    if (addDownpayment) formData.append('downpayment', addDownpayment);
    if (addUserId) formData.append('userId', addUserId);
    formData.append('branch', addBranch || 'Tagoloan');

    const structuredPayload: StructuredRepairDetails = {
      brand: finalBrand,
      deviceType: finalDeviceType,
      imei: addImei.trim() || null,
      problem: finalProblem,
      problemDescription: addProblemDescription.trim(),
      isWorking: addIsWorking,
      hasPhysicalDamage: addHasPhysicalDamage,
      branch: addBranch || 'Tagoloan',
      customerName: addOwnerName,
      customerEmail: addCustomerEmail,
      customerPhone: addCustomerPhone,
      notes: addRepairHistory.trim(),
      submittedAt: new Date().toISOString()
    };

    formData.append('repairHistory', JSON.stringify(structuredPayload));

    if (addPhotos.length > 0) {
      addPhotos.forEach((file, index) => {
        formData.append(`photo_${index}`, file);
      });
      formData.append('photoCount', addPhotos.length.toString());
      if (addPhotos[0]) formData.append('image', addPhotos[0]);
    }

    formData.append('materials', JSON.stringify({
      items: addMaterials,
      laborCost: parseFloat(addLaborCost) || 0
    }));

    try {
      const res = await fetch('/api/monitoring', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setAddModalOpen(false);
        fetchMonitoring();
        setAddDeviceName('');
        setAddOwnerName('');
        setAddCustomerEmail('');
        setAddCustomerPhone('');
        setAddUserId(null);
        setAddProgress('Diagnostic');
        setAddCause('');
        setAddTechnician('');
        setAddRepairCost('');
        setAddRepairHistory('');
        setAddDownpayment('');
        setAddMaterials([]);
        setAddLaborCost('0');
        setAddPhotos([]);
        setAddPhotoPreviews([]);
        setAddImei('');
        setAddProblemDescription('');
      } else {
        const errorData = await res.json();
        alert('Error: ' + errorData.error);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to save the request.');
    } finally {
      setIsSubmittingAdd(false);
    }
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

  const handleEditSave = async () => {
    if (!deviceToEdit) return;
    setIsSavingEdit(true);

    const finalBrand = editBrand === 'Other' ? editCustomBrand.trim() || 'Other' : editBrand;
    const finalDeviceType = editDeviceType === 'Other' ? editCustomDeviceType.trim() || 'Other' : editDeviceType;
    const finalProblem = editProblem === 'Other' ? editCustomProblem.trim() || 'Other' : editProblem;
    const finalCause = editCause.trim() || `${finalProblem}${editProblemDescription.trim() ? ': ' + editProblemDescription.trim() : ''}`;

    const formData = new FormData();
    formData.append('progress', editProgress);
    if (editOwnerName !== null) formData.append('ownerName', editOwnerName);
    formData.append('cause', finalCause);
    if (editTechnician !== null) formData.append('technician', editTechnician);
    if (editRepairCost !== null) formData.append('repairCost', editRepairCost);
    if (editDownpayment !== null) formData.append('downpayment', editDownpayment);

    const structuredPayload: StructuredRepairDetails = {
      brand: finalBrand,
      deviceType: finalDeviceType,
      imei: editImei.trim() || null,
      problem: finalProblem,
      problemDescription: editProblemDescription.trim(),
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
      laborCost: parseFloat(editLaborCost) || 0
    }));

    try {
      const res = await fetch(`/api/monitoring/${deviceToEdit.id}`, {
        method: 'PATCH',
        body: formData
      });

      if (res.ok) {
        const updatedDevice = await res.json();
        setDevices(prev => prev.map(d => d.id === deviceToEdit.id ? { 
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
          image: updatedDevice.image || d.image
        } : d));
        setEditModalOpen(false);
      } else {
        const text = await res.text();
        let errMsg = text;
        try {
          const errObj = JSON.parse(text);
          errMsg = errObj.error || 'Unknown error';
        } catch (e) {}
        alert(`Failed to update (${res.status}): ${errMsg.slice(0, 100)}`);
      }
    } catch (error: any) {
      console.error('Error saving progress:', error);
      alert('An external error occurred: ' + (error.message || 'Network error'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCancelDevice = () => {
    setCancelModalOpen(true);
  };

  const confirmCancelDevice = async () => {
    if (!deviceToEdit) return;
    setIsSavingEdit(true);
    
    const formData = new FormData();
    formData.append('progress', 'Cancelled');
    
    try {
      const res = await fetch(`/api/monitoring/${deviceToEdit.id}`, {
        method: 'PATCH',
        body: formData
      });

      if (res.ok) {
        setDevices(prev => prev.map(d => d.id === deviceToEdit.id ? { 
          ...d, 
          progress: 'Cancelled'
        } : d));
        setCancelModalOpen(false);
        setEditModalOpen(false);
      } else {
        alert('Failed to cancel the repair request.');
      }
    } catch (error) {
      console.error('Error cancelling repair request:', error);
      alert('An error occurred while cancelling the request.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col p-3 md:p-5 gap-5 border-2 border-[#bd00ff] mx-3 my-3 rounded-xl bg-white overflow-hidden font-['Inter'] overflow-y-auto w-auto">
        
        {/* Header and Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#bd00ff] pb-4">
          <h2 className="text-2xl font-bold text-black border-none">Devices Monitoring</h2>
          
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex items-center border border-[#bd00ff] rounded-lg px-4 py-2 bg-white w-full md:w-[300px]">
              <Search size={20} className="text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by Device Name..." 
                className="border-none outline-none pl-3 text-sm w-full text-black placeholder-gray-400 bg-transparent font-medium"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <button 
              onClick={() => setAddModalOpen(true)}
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
                    <th className="p-4 font-bold text-[1.05rem]">Device & Customer</th>
                    {isSuperAdmin && <th className="p-4 font-bold text-center text-[1.05rem]">Branch</th>}
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
                      <td className="p-4 font-bold text-[1.1rem] text-black align-middle">
                        <div>{device.deviceName}</div>
                        {device.ownerName ? (
                          <div className="text-xs text-purple-700 font-medium mt-0.5 flex items-center gap-1">
                            <span>👤</span> {device.ownerName}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 font-normal mt-0.5">Walk-in Customer</div>
                        )}
                      </td>
                      {isSuperAdmin && (
                        <td className="p-4 align-middle text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-[#bd00ff] border border-purple-200">
                            <Building2 size={12} />
                            {device.branch || 'Tagoloan'}
                          </span>
                        </td>
                      )}
                      <td className="p-4 align-middle text-center">
                        <span className={`font-bold text-lg ${getProgressColor(device.progress)}`}>{formatProgress(device.progress)}</span>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex gap-2 justify-center items-center">
                          {device.progress?.toLowerCase() === 'pending' && (
                            <button 
                              onClick={() => {
                                setRequestToReview(device);
                                setReviewRequestModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-[#bd00ff] hover:bg-[#9c00d6] text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1 cursor-pointer border-none"
                              title="Review Customer Repair Request"
                            >
                              <Eye size={13} />
                              <span>Review</span>
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              setDeviceToView(device);
                              setViewDetailsOpen(true);
                            }}
                            className="w-9 h-9 rounded-full flex justify-center items-center bg-purple-50 text-[#bd00ff] hover:bg-[#bd00ff] hover:text-white transition-all shadow-sm border border-[#bd00ff]/30 cursor-pointer"
                            title="View Intake & Material Breakdown"
                          >
                            <Receipt size={16} />
                          </button>
                          <button 
                            onClick={() => openEditModal(device)}
                            className="w-9 h-9 rounded-full flex justify-center items-center bg-[#bd00ff] text-white hover:bg-[#9c00d6] hover:scale-105 transition-all shadow-sm cursor-pointer border-none"
                            title="Edit Progress"
                          >
                            <Pencil size={16} />
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
        {totalPages > 1 && (
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
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
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

      {/* Cancel Confirmation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-[400px] w-full text-center shadow-2xl animate-in zoom-in-95 flex flex-col items-center">
            <AlertCircle className="text-red-500 w-16 h-16 mb-5" />
            <h3 className="text-xl font-bold mb-3 text-black">Cancel Repair Request?</h3>
            <p className="text-gray-600 mb-8">
              Are you sure you want to cancel the repair request for <strong className="text-black">{deviceToEdit?.deviceName}</strong>? This progress update will be visible to the customer.
            </p>
            <div className="flex gap-4 w-full justify-center">
              <button 
                onClick={() => setCancelModalOpen(false)}
                className="px-6 py-2.5 border border-gray-400 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors bg-transparent cursor-pointer"
              >
                Go Back
              </button>
              <button 
                onClick={confirmCancelDevice}
                disabled={isSavingEdit}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 border-none cursor-pointer"
              >
                {isSavingEdit ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}      {/* Edit Progress Modal */}
      {editModalOpen && deviceToEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full flex flex-col gap-6 shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto border border-purple-100">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#bd00ff]/10 flex items-center justify-center text-[#bd00ff]">
                  <Pencil size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-black m-0">Edit Device Progress & Intake</h2>
                  <p className="text-xs text-gray-500 m-0">Update repair status, diagnostic problem, and device details</p>
                </div>
              </div>
              <button 
                onClick={() => setEditModalOpen(false)} 
                className="text-gray-400 hover:text-black transition-colors font-bold text-xl cursor-pointer bg-transparent border-none p-1"
              >
                ✕
              </button>
            </div>

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
                      onChange={(e) => setEditOwnerName(e.target.value)} 
                      placeholder="e.g. Juan Dela Cruz" 
                      className="h-10 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-4 text-black text-sm outline-none transition-colors" 
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700">Phone Number</label>
                    <input 
                      type="text" 
                      value={editCustomerPhone} 
                      onChange={(e) => setEditCustomerPhone(e.target.value)} 
                      placeholder="e.g. 09123456789" 
                      className="h-10 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-4 text-black text-sm outline-none transition-colors" 
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700">Email Address</label>
                    <input 
                      type="email" 
                      value={editCustomerEmail} 
                      onChange={(e) => setEditCustomerEmail(e.target.value)} 
                      placeholder="customer@example.com" 
                      className="h-10 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-4 text-black text-sm outline-none transition-colors" 
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
                      onChange={(e) => setEditBranch(e.target.value)}
                      className="h-10 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-3 text-black text-sm outline-none transition-colors font-medium"
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
                      onChange={(e) => setEditBrand(e.target.value)}
                      className="h-10 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-3 text-black text-sm outline-none transition-colors font-medium"
                    >
                      {BRAND_OPTIONS.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    {editBrand === 'Other' && (
                      <input 
                        type="text"
                        value={editCustomBrand}
                        onChange={(e) => setEditCustomBrand(e.target.value)}
                        placeholder="Specify brand..."
                        className="h-9 border border-[#bd00ff] rounded-lg px-3 text-xs text-black outline-none mt-1"
                      />
                    )}
                  </div>

                  {/* Device Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700">Device Type</label>
                    <select
                      value={editDeviceType}
                      onChange={(e) => setEditDeviceType(e.target.value)}
                      className="h-10 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-3 text-black text-sm outline-none transition-colors font-medium"
                    >
                      {DEVICE_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {editDeviceType === 'Other' && (
                      <input 
                        type="text"
                        value={editCustomDeviceType}
                        onChange={(e) => setEditCustomDeviceType(e.target.value)}
                        placeholder="Specify type..."
                        className="h-9 border border-[#bd00ff] rounded-lg px-3 text-xs text-black outline-none mt-1"
                      />
                    )}
                  </div>

                  {/* Device Name / Model */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700">Device Model / Name</label>
                    <input 
                      type="text" 
                      value={editDeviceName} 
                      onChange={(e) => setEditDeviceName(e.target.value)} 
                      placeholder="e.g. iPhone 11 Pro" 
                      className="h-10 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-4 text-black text-sm outline-none transition-colors font-semibold" 
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
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'Cancelled') {
                            handleCancelDevice();
                          } else {
                            setEditProgress(val);
                          }
                        }}
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
                    onChange={(e) => setEditProblemDescription(e.target.value)}
                    placeholder="Provide details of the problem..."
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
                  laborCost={editLaborCost}
                  onLaborCostChange={setEditLaborCost}
                  downpayment={editDownpayment}
                  onDownpaymentChange={setEditDownpayment}
                  onTotalCostCalculated={(total) => setEditRepairCost(total.toString())}
                  deviceName={editDeviceName || deviceToEdit.deviceName}
                  customerName={editOwnerName || deviceToEdit.ownerName || 'Customer'}
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
                 onClick={() => setEditModalOpen(false)}
                 className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors cursor-pointer bg-white"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleEditSave}
                 disabled={isSavingEdit}
                 className="px-6 py-2.5 bg-[#bd00ff] text-white font-bold rounded-xl hover:bg-[#9c00d6] transition-colors disabled:opacity-50 cursor-pointer border-none shadow-md shadow-purple-200"
               >
                 {isSavingEdit ? "Saving Changes..." : "Save Changes"}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Device Request Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full flex flex-col gap-6 shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto border border-purple-100">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#bd00ff]/10 flex items-center justify-center text-[#bd00ff]">
                  <Plus size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-black m-0">Add Device Request Form</h2>
                  <p className="text-xs text-gray-500 m-0">Create new repair intake with auto-retrieved customer info and device diagnosis</p>
                </div>
              </div>
              <button 
                onClick={() => setAddModalOpen(false)} 
                className="text-gray-400 hover:text-black transition-colors font-bold text-xl cursor-pointer bg-transparent border-none p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-6">

              {/* 1. Customer Information & Account Linking */}
              <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-200/80 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-black uppercase tracking-wider flex items-center gap-2 m-0">
                    <User size={16} className="text-[#bd00ff]" />
                    Customer Information (Auto-retrieved)
                  </h3>
                  {addUserId && (
                    <span className="text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-full font-semibold border border-green-200 flex items-center gap-1">
                      <Check size={13} /> Account Linked
                    </span>
                  )}
                </div>

                <div className="relative">
                  <label className="font-semibold text-xs text-gray-700 mb-1 block">Link Customer Account (Search Email / Name)</label>
                  <input 
                    type="text" 
                    value={addCustomerEmail} 
                    onChange={(e) => {
                      setAddCustomerEmail(e.target.value);
                      setShowDropdown(true);
                      if (addUserId) setAddUserId(null);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 250)}
                    placeholder="Search registered user email or name..."
                    className="w-full h-10 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-4 outline-none transition-colors text-black text-sm" 
                  />
                  {showDropdown && addCustomerEmail && (
                    <div className="absolute top-[100%] left-0 w-full mt-1 bg-white border-2 border-[#bd00ff] rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto p-1">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                          <div 
                            key={user.id} 
                            className="px-4 py-2.5 hover:bg-purple-50 rounded-xl cursor-pointer border-b border-gray-50 last:border-none flex justify-between items-center transition-colors"
                            onMouseDown={() => {
                              setAddCustomerEmail(user.email);
                              setAddUserId(user.id);
                              if (user.name) setAddOwnerName(user.name);
                              if (user.phone) setAddCustomerPhone(user.phone);
                              setShowDropdown(false);
                            }}
                          >
                            <div>
                              <p className="text-black font-bold text-sm m-0">{user.name || 'Registered Customer'}</p>
                              <p className="text-gray-500 text-xs m-0">{user.email}</p>
                            </div>
                            {user.phone && (
                              <span className="text-xs font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded-lg">{user.phone}</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-400 text-xs text-center">No matching accounts found (Manual input allowed below)</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700">Customer Full Name</label>
                    <input 
                      type="text" 
                      value={addOwnerName} 
                      onChange={(e) => setAddOwnerName(e.target.value)} 
                      placeholder="e.g. Marga Picardal" 
                      className="h-10 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-4 outline-none transition-colors text-black text-sm" 
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700">Customer Phone Number</label>
                    <input 
                      type="text" 
                      value={addCustomerPhone} 
                      onChange={(e) => setAddCustomerPhone(e.target.value)} 
                      placeholder="e.g. 09171234567" 
                      className="h-10 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-4 outline-none transition-colors text-black text-sm" 
                    />
                  </div>
                </div>
              </div>

              {/* 2. Branch & Device Info */}
              <div className="bg-white p-5 rounded-2xl border-2 border-gray-100 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-black uppercase tracking-wider flex items-center gap-2 m-0">
                  <Smartphone size={16} className="text-[#bd00ff]" />
                  Device & Branch Selection
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Preferred Branch */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700 flex items-center gap-1">
                      <Building2 size={13} className="text-[#bd00ff]" />
                      Preferred Repair Branch
                    </label>
                    <select
                      value={addBranch}
                      onChange={(e) => setAddBranch(e.target.value)}
                      className="h-10 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-3 text-black text-sm outline-none transition-colors font-medium"
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
                      value={addBrand}
                      onChange={(e) => setAddBrand(e.target.value)}
                      className="h-10 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-3 text-black text-sm outline-none transition-colors font-medium"
                    >
                      {BRAND_OPTIONS.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    {addBrand === 'Other' && (
                      <input 
                        type="text"
                        value={addCustomBrand}
                        onChange={(e) => setAddCustomBrand(e.target.value)}
                        placeholder="Enter brand name..."
                        className="h-9 border border-[#bd00ff] rounded-lg px-3 text-xs text-black outline-none mt-1"
                      />
                    )}
                  </div>

                  {/* Device Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700">Device Type</label>
                    <select
                      value={addDeviceType}
                      onChange={(e) => setAddDeviceType(e.target.value)}
                      className="h-10 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-3 text-black text-sm outline-none transition-colors font-medium"
                    >
                      {DEVICE_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {addDeviceType === 'Other' && (
                      <input 
                        type="text"
                        value={addCustomDeviceType}
                        onChange={(e) => setAddCustomDeviceType(e.target.value)}
                        placeholder="Enter device type..."
                        className="h-9 border border-[#bd00ff] rounded-lg px-3 text-xs text-black outline-none mt-1"
                      />
                    )}
                  </div>

                  {/* Device Name / Model */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700">Device Name / Model *</label>
                    <input 
                      type="text" 
                      value={addDeviceName} 
                      onChange={(e) => setAddDeviceName(e.target.value)} 
                      placeholder="e.g. iPhone 11" 
                      className="h-10 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-4 outline-none transition-colors text-black text-sm font-semibold" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* IMEI / Serial */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700">IMEI / Serial Number (Optional)</label>
                    <input 
                      type="text" 
                      value={addImei} 
                      onChange={(e) => setAddImei(e.target.value)} 
                      placeholder="e.g. 867543029182736" 
                      className="h-10 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-4 outline-none transition-colors text-black text-sm font-mono" 
                    />
                  </div>

                  {/* Initial Progress */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700">Initial Progress</label>
                    <div className="relative">
                      <select 
                        value={addProgress}
                        onChange={(e) => setAddProgress(e.target.value)}
                        className={`w-full h-10 border-2 border-gray-200 rounded-xl px-4 outline-none focus:border-[#bd00ff] transition-colors font-bold text-sm appearance-none bg-white cursor-pointer ${getProgressColor(addProgress)}`}
                      >
                        <option value="Diagnostic" className="text-blue-500 font-semibold">Diagnostic</option>
                        <option value="Repairing" className="text-yellow-500 font-semibold">Repairing</option>
                        <option value="Completed" className="text-green-600 font-semibold">Completed</option>
                      </select>
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                        <ChevronDown size={18} className="text-gray-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Problem & Description */}
              <div className="bg-white p-5 rounded-2xl border-2 border-gray-100 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-black uppercase tracking-wider flex items-center gap-2 m-0">
                  <ShieldAlert size={16} className="text-[#bd00ff]" />
                  Repair Problem & Description
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700">Problem / Issue Category</label>
                    <select
                      value={addProblem}
                      onChange={(e) => setAddProblem(e.target.value)}
                      className="h-10 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-3 text-black text-sm outline-none transition-colors font-medium"
                    >
                      {PROBLEM_OPTIONS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    {addProblem === 'Other' && (
                      <input 
                        type="text"
                        value={addCustomProblem}
                        onChange={(e) => setAddCustomProblem(e.target.value)}
                        placeholder="Enter problem category..."
                        className="h-9 border border-[#bd00ff] rounded-lg px-3 text-xs text-black outline-none mt-1"
                      />
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-xs text-gray-700">Assigned Technician</label>
                    <input 
                      type="text" 
                      value={addTechnician} 
                      onChange={(e) => setAddTechnician(e.target.value)} 
                      placeholder="Technician Name" 
                      className="h-10 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-4 text-black text-sm outline-none transition-colors" 
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-xs text-gray-700">Describe the Problem</label>
                  <textarea 
                    rows={3}
                    value={addProblemDescription} 
                    onChange={(e) => setAddProblemDescription(e.target.value)} 
                    placeholder="e.g. The screen is cracked after a fall, touch is not responding on the top half." 
                    className="border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl p-3 text-black text-sm outline-none transition-colors resize-none" 
                  />
                </div>
              </div>

              {/* 4. Device Condition & Multi-Photo Upload */}
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
                          onClick={() => setAddIsWorking(opt)}
                          className={`py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer ${
                            addIsWorking === opt 
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
                          onClick={() => setAddHasPhysicalDamage(opt)}
                          className={`py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer ${
                            addHasPhysicalDamage === opt 
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

                {/* Upload Device Photos */}
                <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-xs text-gray-700">Upload Device Photos (Multi-select)</label>
                    <label className="text-xs font-bold text-[#bd00ff] hover:underline cursor-pointer flex items-center gap-1">
                      <Upload size={14} />
                      Choose Photos
                      <input type="file" multiple accept="image/*" onChange={handleAddPhotosChange} className="hidden" />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-3 items-center">
                    {addPhotoPreviews.map((preview, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-xl border-2 border-[#bd00ff] overflow-hidden group bg-purple-50 shadow-sm">
                        <img src={preview} alt={`Upload ${idx+1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeAddPhoto(idx)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none shadow"
                          title="Remove photo"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    {addPhotoPreviews.length === 0 && (
                      <div className="w-full py-4 text-center border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400">
                        No photos selected. Click &quot;Choose Photos&quot; to upload device condition images.
                      </div>
                    )}
                  </div>
                </div>

                {/* Clean Repair History */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100">
                  <label className="font-semibold text-xs text-gray-700 flex items-center gap-1.5">
                    <FileText size={14} className="text-[#bd00ff]" />
                    Repair History & Background Notes
                  </label>
                  <input 
                    type="text" 
                    value={addRepairHistory} 
                    onChange={(e) => setAddRepairHistory(e.target.value)} 
                    placeholder="Where was this first repaired from? (e.g. First time repaired / Original Shop)" 
                    className="h-10 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-4 text-black text-sm outline-none transition-colors" 
                  />
                  <span className="text-[11px] text-gray-400">Clean text notes regarding prior repairs (never raw JSON).</span>
                </div>
              </div>

              {/* 5. Itemized Materials Breakdown */}
              <div className="bg-white p-5 rounded-2xl border-2 border-gray-100">
                <MaterialBreakdownEditor
                  items={addMaterials}
                  onItemsChange={setAddMaterials}
                  laborCost={addLaborCost}
                  onLaborCostChange={setAddLaborCost}
                  downpayment={addDownpayment}
                  onDownpaymentChange={setAddDownpayment}
                  onTotalCostCalculated={(total) => setAddRepairCost(total.toString())}
                  deviceName={addDeviceName || 'Device'}
                  customerName={addOwnerName || addCustomerEmail || 'Customer'}
                />
              </div>

            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
               <button 
                 onClick={() => setAddModalOpen(false)}
                 className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors cursor-pointer bg-white"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleAddSave}
                 disabled={isSubmittingAdd}
                 className="px-6 py-2.5 bg-[#bd00ff] text-white font-bold rounded-xl hover:bg-[#9c00d6] transition-colors disabled:opacity-50 cursor-pointer border-none shadow-md shadow-purple-200"
               >
                 {isSubmittingAdd ? "Saving..." : "Save and Send Notifications"}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* View Intake & Material Breakdown Modal */}
      {viewDetailsOpen && deviceToView && (() => {
        let items: MaterialItem[] = [];
        let labor = '0';
        if (deviceToView.materials) {
          try {
            const parsed = JSON.parse(deviceToView.materials);
            if (Array.isArray(parsed)) {
              items = parsed;
            } else if (parsed && typeof parsed === 'object') {
              items = parsed.items || [];
              labor = String(parsed.laborCost ?? 0);
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
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full flex flex-col gap-6 shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto border border-purple-100">
              
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
              {(parsed?.customerEmail || parsed?.customerPhone || deviceToView.ownerName) && (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 flex flex-col gap-2">
                  <span className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-1.5">
                    <User size={14} className="text-[#bd00ff]" />
                    Customer Information (Auto-retrieved)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-700">
                    <div><strong className="text-black">Full Name:</strong> {deviceToView.ownerName || parsed?.customerName || 'Walk-in Customer'}</div>
                    <div><strong className="text-black">Email:</strong> {parsed?.customerEmail || 'Not provided'}</div>
                    <div><strong className="text-black">Phone:</strong> {parsed?.customerPhone || 'Not provided'}</div>
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
                      <a 
                        key={idx} 
                        href={photo} 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-24 h-24 rounded-2xl border-2 border-purple-200 overflow-hidden hover:scale-105 transition-transform bg-white shadow-sm flex items-center justify-center p-1"
                        title="Click to view full image"
                      >
                        <img src={photo} alt={`Device photo ${idx+1}`} className="w-full h-full object-contain" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Render Read-Only Material Breakdown */}
              <MaterialBreakdownEditor
                readOnly
                items={items}
                laborCost={labor}
                downpayment={deviceToView.downpayment || '0'}
                deviceName={deviceToView.deviceName}
                customerName={deviceToView.ownerName || 'Walk-in Customer'}
              />

              <div className="flex justify-end pt-3 border-t border-gray-100">
                <button
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

      {/* Repair Request Review Modal */}
      <RepairRequestReviewModal
        isOpen={reviewRequestModalOpen}
        onClose={() => {
          setReviewRequestModalOpen(false);
          setRequestToReview(null);
        }}
        request={requestToReview as any}
        onStatusChange={() => {
          fetchMonitoring();
        }}
      />

    </main>
  );
}
