"use client";

import { useState, useEffect } from 'react';
import { Pencil, FileText, Search, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, Upload, Wrench, Receipt, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import MaterialBreakdownEditor, { MaterialItem } from '../../components/Repair/MaterialBreakdownEditor';
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
}

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
  const [addDeviceName, setAddDeviceName] = useState('');
  const [addOwnerName, setAddOwnerName] = useState('');
  const [addProgress, setAddProgress] = useState('Diagnostic');
  const [addCause, setAddCause] = useState('');
  const [addTechnician, setAddTechnician] = useState('');
  const [addRepairCost, setAddRepairCost] = useState('');
  const [addDownpayment, setAddDownpayment] = useState('');
  const [addRepairHistory, setAddRepairHistory] = useState('');
  const [addImage, setAddImage] = useState<File | null>(null);
  const [addImagePreview, setAddImagePreview] = useState<string | null>(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addMaterials, setAddMaterials] = useState<MaterialItem[]>([]);
  const [addLaborCost, setAddLaborCost] = useState<string>('0');
  const [addBranch, setAddBranch] = useState<string>('Tagoloan');

  // View Details Modal State
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [deviceToView, setDeviceToView] = useState<DeviceProgress | null>(null);

  // Account Linking States
  const [users, setUsers] = useState<UserData[]>([]);
  const [addCustomerEmail, setAddCustomerEmail] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [addUserId, setAddUserId] = useState<string | null>(null);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deviceToEdit, setDeviceToEdit] = useState<DeviceProgress | null>(null);
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editProgress, setEditProgress] = useState('Diagnostic');
  const [initialEditProgress, setInitialEditProgress] = useState('Diagnostic');
  const [editCause, setEditCause] = useState('');
  const [editTechnician, setEditTechnician] = useState('');
  const [editRepairCost, setEditRepairCost] = useState('');
  const [editDownpayment, setEditDownpayment] = useState('');
  const [editRepairHistory, setEditRepairHistory] = useState('');
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
    setEditRepairHistory(device.repairHistory || '');
    setEditImage(null);
    setEditImagePreview(device.proofImage || null);

    let items: MaterialItem[] = [];
    let labor = '0';
    if (device.materials) {
      try {
        const parsed = JSON.parse(device.materials);
        if (Array.isArray(parsed)) {
          items = parsed;
        } else if (parsed && typeof parsed === 'object') {
          items = parsed.items || [];
          labor = String(parsed.laborCost ?? 0);
        }
      } catch (e) {
        console.error("Failed to parse materials:", e);
      }
    }
    setEditMaterials(items);
    setEditLaborCost(labor);
    setEditModalOpen(true);
  };

  const handleAddImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
        const compressedFile = await imageCompression(file, options);
        setAddImage(compressedFile);
        const reader = new FileReader();
        reader.onloadend = () => setAddImagePreview(reader.result as string);
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Compression error:", error);
        setAddImage(file);
        const reader = new FileReader();
        reader.onloadend = () => setAddImagePreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleAddSave = async () => {
    if (!addDeviceName || !addProgress) {
      alert("Device Name and Progress are required.");
      return;
    }

    setIsSubmittingAdd(true);
    const formData = new FormData();
    formData.append('deviceName', addDeviceName);
    if (addOwnerName) formData.append('ownerName', addOwnerName);
    formData.append('progress', addProgress);
    if (addCause) formData.append('cause', addCause);
    if (addTechnician) formData.append('technician', addTechnician);
    if (addRepairCost) formData.append('repairCost', addRepairCost);
    if (addDownpayment) formData.append('downpayment', addDownpayment);
    if (addRepairHistory) formData.append('repairHistory', addRepairHistory);
    if (addImage) formData.append('image', addImage);
    if (addUserId) formData.append('userId', addUserId);
    if (isSuperAdmin && addBranch) formData.append('branch', addBranch);

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
        setAddProgress('');
        setAddCause('');
        setAddTechnician('');
        setAddRepairCost('');
        setAddRepairHistory('');
        setAddDownpayment('');
        setAddMaterials([]);
        setAddLaborCost('0');
        setAddImage(null);
        setAddImagePreview(null);
        setAddCustomerEmail('');
        setAddUserId(null);
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

    const formData = new FormData();
    formData.append('progress', editProgress);
    if (editOwnerName !== null) formData.append('ownerName', editOwnerName);
    if (editCause !== null) formData.append('cause', editCause);
    if (editTechnician !== null) formData.append('technician', editTechnician);
    if (editRepairCost !== null) formData.append('repairCost', editRepairCost);
    if (editDownpayment !== null) formData.append('downpayment', editDownpayment);
    formData.append('repairHistory', editRepairHistory);
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
          repairHistory: updatedDevice.repairHistory
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

  const getSnapshotText = () => {
    if (activeDevices.length === 0) return "No active repairs in the shop today.";
    
    const causesCount: Record<string, number> = {};
    activeDevices.forEach(d => {
      const cause = (d.cause || 'Unknown Issue').trim();
      causesCount[cause] = (causesCount[cause] || 0) + 1;
    });

    const sortedCauses = Object.entries(causesCount).sort((a, b) => b[1] - a[1]);
    
    let summaryText = `Today, there are ${activeDevices.length} devices in the shop`;
    
    if (sortedCauses.length > 0) {
      const parts = sortedCauses.slice(0, 3).map(([cause, count]) => {
        return `${count} ${count === 1 ? 'is' : 'are'} for ${cause.toLowerCase()}`;
      });
      
      if (parts.length > 1) {
        const last = parts.pop();
        summaryText += `: ${parts.join(', ')}, and ${last}.`;
      } else {
        summaryText += `: ${parts[0]}.`;
      }
      
      if (sortedCauses.length > 3) {
        summaryText = summaryText.slice(0, -1) + `, along with other various issues.`;
      }
    } else {
      summaryText += `.`;
    }
    
    return summaryText;
  };

  return (
    <main className="flex-1 flex flex-col p-3 md:p-5 gap-5 border-2 border-[#bd00ff] mx-3 my-3 rounded-xl bg-white overflow-hidden font-['Inter'] overflow-y-auto w-auto">
        
        {/* Daily Repair Snapshot */}
        {!isLoading && (
          <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 border border-purple-200 rounded-xl p-5 shadow-sm flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-white p-3 rounded-full shadow-sm text-purple-600 shrink-0">
              <FileText size={24} />
            </div>
            <div className="flex flex-col">
              <h3 className="font-bold text-purple-900 text-lg m-0">Daily Repair Snapshot</h3>
              <p className="text-purple-800 m-0 mt-1 font-medium leading-relaxed">{getSnapshotText()}</p>
            </div>
          </div>
        )}

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
                        <div className="flex gap-3 justify-center items-center">
                          <button 
                            onClick={() => {
                              setDeviceToView(device);
                              setViewDetailsOpen(true);
                            }}
                            className="w-10 h-10 rounded-full flex justify-center items-center bg-purple-50 text-[#bd00ff] hover:bg-[#bd00ff] hover:text-white transition-all shadow-sm border border-[#bd00ff]/30 cursor-pointer"
                            title="View Intake & Material Breakdown"
                          >
                            <Receipt size={18} />
                          </button>
                          <button 
                            onClick={() => openEditModal(device)}
                            className="w-10 h-10 rounded-full flex justify-center items-center bg-[#bd00ff] text-white hover:bg-[#9c00d6] hover:scale-110 transition-all shadow-md cursor-pointer border-none"
                            title="Edit Progress"
                          >
                            <Pencil size={18} />
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
      )}

      {/* Edit Progress Modal */}
      {editModalOpen && deviceToEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-3xl w-full flex flex-col gap-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-xl font-bold text-black border-none">Edit Device Progress</h2>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-black transition-colors font-bold text-xl cursor-pointer bg-transparent border-none">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-6">
              
              {/* Internal Image Display */}
              <div className="flex flex-col items-center gap-4 mt-2">
                <div className="w-[140px] h-[140px] rounded-2xl border-2 border-[#bd00ff] bg-white flex justify-center items-center overflow-hidden p-2">
                  {deviceToEdit.image ? (
                    <img src={deviceToEdit.image} alt={deviceToEdit.deviceName} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-gray-400 font-bold">No Image</span>
                  )}
                </div>
              </div>

              {/* Dynamic Form Fields */}
              <div className="flex flex-col gap-4">
                
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-base text-black">Device Name</label>
                  <input type="text" value={deviceToEdit.deviceName} readOnly className="h-10 border-2 border-gray-200 bg-gray-50 rounded-xl px-4 text-gray-500 outline-none cursor-not-allowed" />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-base text-black">Customer Name</label>
                  <input 
                    type="text" 
                    value={editOwnerName} 
                    onChange={(e) => setEditOwnerName(e.target.value)} 
                    placeholder="e.g. Marga Picardal" 
                    className="h-10 border-2 border-gray-300 rounded-xl px-4 text-black outline-none focus:border-[#bd00ff] transition-colors" 
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-base text-black">Progress</label>
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
                      className={`w-full h-10 border-2 border-gray-300 rounded-xl px-4 outline-none focus:border-[#bd00ff] transition-colors font-semibold appearance-none bg-white cursor-pointer ${getProgressColor(editProgress)}`}
                    >
                      <option value="Diagnostic" disabled={progressLevels.indexOf('Diagnostic') < initialProgressIndex} className="text-red-500 font-semibold">Diagnostic</option>
                      <option value="Repairing" disabled={progressLevels.indexOf('Repairing') < initialProgressIndex} className="text-yellow-500 font-semibold">Repairing</option>
                      <option value="Completed" disabled={progressLevels.indexOf('Completed') < initialProgressIndex} className="text-green-600 font-semibold">Completed</option>
                      <option value="Cancelled" className="text-red-500 font-semibold">Cancelled</option>
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                      <ChevronDown size={20} className="text-gray-500" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-base text-black">Cause of the problem</label>
                  <input 
                    type="text" 
                    value={editCause}
                    onChange={(e) => setEditCause(e.target.value)}
                    placeholder="e.g. Broken LCD" 
                    className="h-10 border-2 border-gray-300 rounded-xl px-4 text-black outline-none focus:border-[#bd00ff] transition-colors" 
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-base text-black">Repair History</label>
                  <input 
                    type="text" 
                    value={editRepairHistory}
                    onChange={(e) => setEditRepairHistory(e.target.value)}
                    placeholder="Where was this first repaired from? (e.g. First time repaired / Original Shop)" 
                    className="h-10 border-2 border-gray-300 rounded-xl px-4 text-black outline-none focus:border-[#bd00ff] transition-colors" 
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-base text-black">Technician</label>
                  <input 
                    type="text" 
                    value={editTechnician}
                    onChange={(e) => setEditTechnician(e.target.value)}
                    placeholder="Technician Name" 
                    className="h-10 border-2 border-gray-300 rounded-xl px-4 text-black outline-none focus:border-[#bd00ff] transition-colors" 
                  />
                </div>

                {/* Itemized Materials Breakdown */}
                <div className="pt-2 border-t border-gray-200">
                  <MaterialBreakdownEditor
                    items={editMaterials}
                    onItemsChange={setEditMaterials}
                    laborCost={editLaborCost}
                    onLaborCostChange={setEditLaborCost}
                    downpayment={editDownpayment}
                    onDownpaymentChange={setEditDownpayment}
                    onTotalCostCalculated={(total) => setEditRepairCost(total.toString())}
                    deviceName={deviceToEdit.deviceName}
                    customerName={editOwnerName || deviceToEdit.ownerName || 'Customer'}
                  />
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <label className="font-semibold text-base text-black">Proof of Repair</label>
                  <div className="flex flex-col items-start gap-4">
                    <div className="w-full max-w-[200px] aspect-video rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex justify-center items-center overflow-hidden relative group">
                      {editImagePreview ? (
                        <img src={editImagePreview} alt="Proof" className="w-full h-full object-contain bg-white" />
                      ) : (
                        <span className="text-gray-400 font-semibold text-sm">No Proof Image</span>
                      )}
                      <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                        <span className="text-white font-bold flex items-center gap-2 bg-[#bd00ff] px-4 py-2 rounded-lg">
                          <Upload size={16} />
                          Upload
                        </span>
                        <input type="file" accept="image/*" onChange={handleEditImageChange} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-4 mt-2">
               <button 
                 onClick={() => setEditModalOpen(false)}
                 className="px-6 py-2.5 border border-gray-400 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleEditSave}
                 disabled={isSavingEdit}
                 className="px-6 py-2.5 bg-[#bd00ff] text-white font-bold rounded-xl hover:bg-[#9c00d6] transition-colors disabled:opacity-50"
               >
                 {isSavingEdit ? "Saving..." : "Save Changes"}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Progress Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-3xl w-full flex flex-col gap-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-xl font-bold text-black border-none">Add Device Request</h2>
              <button onClick={() => setAddModalOpen(false)} className="text-gray-400 hover:text-black transition-colors font-bold text-xl cursor-pointer bg-transparent border-none">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-6">
              
              {/* Internal Image Display */}
              <div className="flex flex-col items-center gap-4 mt-2">
                <div className="w-[140px] h-[140px] rounded-2xl border-2 border-[#bd00ff] bg-[#f4f5f7] flex justify-center items-center text-gray-400 overflow-hidden relative">
                  {addImagePreview ? (
                    <img src={addImagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-400 font-bold text-center text-sm">No Image<br/>(Optional)</span>
                  )}
                </div>
                <label className="flex items-center gap-2 text-black font-semibold cursor-pointer hover:text-[#bd00ff] transition-colors text-sm">
                  Upload image
                  <input type="file" accept="image/*" onChange={handleAddImageChange} className="hidden" />
                </label>
              </div>

              {/* Dynamic Form Fields */}
              <div className="flex flex-col gap-4">
                
                <div className="flex flex-col gap-2 relative">
                  <label className="font-semibold text-base text-black flex justify-between">
                    <span>Link Customer Account (Optional)</span>
                    {addUserId && <span className="text-green-600 text-sm">Account Linked ✓</span>}
                  </label>
                  <input 
                    type="text" 
                    value={addCustomerEmail} 
                    onChange={(e) => {
                      setAddCustomerEmail(e.target.value);
                      setShowDropdown(true);
                      if (addUserId) setAddUserId(null);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    placeholder="Search by email..."
                    className="h-10 border-2 border-gray-300 rounded-xl px-4 outline-none focus:border-[#bd00ff] transition-colors text-black" 
                  />
                  {showDropdown && addCustomerEmail && (
                    <div className="absolute top-[100%] left-0 w-full mt-1 bg-white border border-[#bd00ff] rounded-xl shadow-lg z-50 max-h-40 overflow-y-auto">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                          <div 
                            key={user.id} 
                            className="px-4 py-2 hover:bg-purple-50 cursor-pointer border-b border-gray-100 last:border-none"
                            onClick={() => {
                              setAddCustomerEmail(user.email);
                              setAddUserId(user.id);
                              setShowDropdown(false);
                            }}
                          >
                            <p className="text-black font-semibold m-0">{user.email}</p>
                            <p className="text-gray-500 text-xs m-0">{user.name || 'No Name'}</p>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-gray-500 text-sm">No accounts found</div>
                      )}
                    </div>
                  )}
                </div>

                {isSuperAdmin && (
                  <div className="flex flex-col gap-2">
                    <label className="font-semibold text-base text-black flex items-center gap-1.5">
                      <Building2 size={16} className="text-[#bd00ff]" />
                      Branch Assignment
                    </label>
                    <select
                      value={addBranch}
                      onChange={(e) => setAddBranch(e.target.value)}
                      className="h-10 border-2 border-gray-300 rounded-xl px-4 text-black outline-none focus:border-[#bd00ff] transition-colors font-medium bg-white"
                    >
                      {branches.map(b => (
                        <option key={b.name} value={b.name}>{b.name} Branch</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-base text-black">Customer Name</label>
                  <input 
                    type="text" 
                    value={addOwnerName} 
                    onChange={(e) => setAddOwnerName(e.target.value)} 
                    placeholder="e.g. Marga Picardal" 
                    className="h-10 border-2 border-gray-300 rounded-xl px-4 outline-none focus:border-[#bd00ff] transition-colors text-black" 
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-base text-black">Device Name</label>
                  <input type="text" value={addDeviceName} onChange={(e) => setAddDeviceName(e.target.value)} placeholder="e.g. iPhone 11" className="h-10 border-2 border-gray-300 rounded-xl px-4 outline-none focus:border-[#bd00ff] transition-colors text-black" />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-base text-black">Progress</label>
                  <div className="relative">
                    <select 
                      value={addProgress}
                      onChange={(e) => setAddProgress(e.target.value)}
                      className={`w-full h-10 border-2 border-gray-300 rounded-xl px-4 outline-none focus:border-[#bd00ff] transition-colors font-semibold appearance-none bg-white cursor-pointer ${getProgressColor(addProgress)}`}
                    >
                      <option value="" disabled className="text-gray-400">Select Progress</option>
                      <option value="Diagnostic" className="text-red-500 font-semibold">Diagnostic</option>
                      <option value="Repairing" className="text-yellow-500 font-semibold">Repairing</option>
                      <option value="Completed" className="text-green-600 font-semibold">Completed</option>
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                      <ChevronDown size={20} className="text-gray-500" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-base text-black">Cause of the problem</label>
                  <input 
                    type="text" 
                    value={addCause} 
                    onChange={(e) => setAddCause(e.target.value)} 
                    placeholder="e.g. Broken LCD / Motherboard Issue" 
                    className="h-10 border-2 border-gray-300 rounded-xl px-4 text-black outline-none focus:border-[#bd00ff] transition-colors" 
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-base text-black">Repair History</label>
                  <input 
                    type="text" 
                    value={addRepairHistory} 
                    onChange={(e) => setAddRepairHistory(e.target.value)} 
                    placeholder="Where was this first repaired from? (e.g. First time repaired / Original Shop)" 
                    className="h-10 border-2 border-gray-300 rounded-xl px-4 text-black outline-none focus:border-[#bd00ff] transition-colors" 
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-base text-black">Technician</label>
                  <input 
                    type="text" 
                    value={addTechnician} 
                    onChange={(e) => setAddTechnician(e.target.value)} 
                    placeholder="Technician Name" 
                    className="h-10 border-2 border-gray-300 rounded-xl px-4 text-black outline-none focus:border-[#bd00ff] transition-colors" 
                  />
                </div>

                {/* Itemized Materials Breakdown */}
                <div className="pt-2 border-t border-gray-200">
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
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-4 mt-2">
               <button 
                 onClick={() => setAddModalOpen(false)}
                 className="px-6 py-2.5 border border-gray-400 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors cursor-pointer bg-white"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleAddSave}
                 disabled={isSubmittingAdd}
                 className="px-6 py-2.5 bg-[#bd00ff] text-white font-bold rounded-xl hover:bg-[#9c00d6] transition-colors disabled:opacity-50 cursor-pointer border-none"
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
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-3xl w-full flex flex-col gap-5 shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto border border-purple-100">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-[#bd00ff]">
                    <Receipt size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-black m-0">Device Repair Intake Sheet</h2>
                    <p className="text-xs text-gray-500 m-0">Line-item replacement parts breakdown & payment details</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewDetailsOpen(false)} 
                  className="text-gray-400 hover:text-black transition-colors font-bold text-2xl cursor-pointer bg-transparent border-none p-1"
                >
                  ✕
                </button>
              </div>

              {/* Summary Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
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

              {(deviceToView.cause || deviceToView.technician || deviceToView.repairHistory) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600 bg-gray-50 p-3 rounded-xl">
                  {deviceToView.cause && (
                    <div><strong className="text-black">Reported Issue:</strong> {deviceToView.cause}</div>
                  )}
                  {deviceToView.technician && (
                    <div><strong className="text-black">Assigned Tech:</strong> {deviceToView.technician}</div>
                  )}
                  {deviceToView.repairHistory && (
                    <div><strong className="text-black">Repair History:</strong> {deviceToView.repairHistory}</div>
                  )}
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

    </main>
  );
}
