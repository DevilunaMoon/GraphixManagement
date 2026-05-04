"use client";

import { useState, useEffect } from 'react';
import { Pencil, FileText, Search, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DeviceProgress {
  id: string;
  deviceName: string;
  ownerName: string;
  progress: string;
  image: string | null;
  status: string;
  cause: string | null;
  technician: string | null;
  repairCost: string | null;
}

interface UserData {
  id: string;
  name: string | null;
  email: string;
}



export default function AdminMonitoring() {
  const router = useRouter();
  const navigate = router.push;
  const [searchQuery, setSearchQuery] = useState('');
  const [devices, setDevices] = useState<DeviceProgress[]>([]);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [successCompleteOpen, setSuccessCompleteOpen] = useState(false);
  const [deviceToComplete, setDeviceToComplete] = useState<DeviceProgress | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  // Add Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addDeviceName, setAddDeviceName] = useState('');
  const [addOwnerName, setAddOwnerName] = useState('');
  const [addProgress, setAddProgress] = useState('');
  const [addCause, setAddCause] = useState('');
  const [addTechnician, setAddTechnician] = useState('');
  const [addRepairCost, setAddRepairCost] = useState('');
  const [addImage, setAddImage] = useState<File | null>(null);
  const [addImagePreview, setAddImagePreview] = useState<string | null>(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Account Linking States
  const [users, setUsers] = useState<UserData[]>([]);
  const [addCustomerEmail, setAddCustomerEmail] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [addUserId, setAddUserId] = useState<string | null>(null);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deviceToEdit, setDeviceToEdit] = useState<DeviceProgress | null>(null);
  const [editProgress, setEditProgress] = useState('0%');
  const [initialEditProgress, setInitialEditProgress] = useState('0%');
  const [editCause, setEditCause] = useState('');
  const [editTechnician, setEditTechnician] = useState('');
  const [editRepairCost, setEditRepairCost] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const progressLevels = ['0%', '25%', '50%', '75%', '100%'];
  const initialProgressIndex = progressLevels.indexOf(initialEditProgress);

  const ITEMS_PER_PAGE = 8;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/monitoring?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => setDevices(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
      
    fetch('/api/admin/accounts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUsers(data);
      })
      .catch(console.error);
  }, []);

  const filteredUsers = addCustomerEmail 
    ? users.filter(u => u.email.toLowerCase().includes(addCustomerEmail.toLowerCase()))
    : users;

  const activeDevices = devices.filter(d => d.status !== 'Completed');
  const filteredDevices = activeDevices.filter(d => 
    d.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedDevices = [...filteredDevices].sort((a, b) => {
    if (a.progress === '100%' && b.progress !== '100%') return 1;
    if (a.progress !== '100%' && b.progress === '100%') return -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedDevices.length / ITEMS_PER_PAGE) || 1;
  const paginatedDevices = sortedDevices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getProgressColor = (progress: string) => {
    switch (progress) {
      case '100%': return 'text-green-600';
      case '75%': 
      case '50%': return 'text-yellow-500';
      case '25%':
      case '0%': return 'text-red-500';
      default: return 'text-black';
    }
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
    setEditProgress(device.progress || '0%');
    setInitialEditProgress(device.progress || '0%');
    setEditCause(device.cause || '');
    setEditTechnician(device.technician || '');
    setEditRepairCost(device.repairCost || '');
    setEditModalOpen(true);
  };

  const handleAddImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAddImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setAddImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAddSave = async () => {
    if (!addDeviceName || !addOwnerName || !addProgress) {
      alert("Device Name, Owner Name, and Progress are required.");
      return;
    }

    setIsSubmittingAdd(true);
    const formData = new FormData();
    formData.append('deviceName', addDeviceName);
    formData.append('ownerName', addOwnerName);
    formData.append('progress', addProgress);
    if (addCause) formData.append('cause', addCause);
    if (addTechnician) formData.append('technician', addTechnician);
    if (addRepairCost) formData.append('repairCost', addRepairCost);
    if (addImage) formData.append('image', addImage);
    if (addUserId) formData.append('userId', addUserId);

    try {
      const res = await fetch('/api/monitoring', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setAddModalOpen(false);
        fetch(`/api/monitoring?t=${Date.now()}`)
          .then(r => r.json())
          .then(data => setDevices(Array.isArray(data) ? data : []));
        setAddDeviceName('');
        setAddOwnerName('');
        setAddProgress('');
        setAddCause('');
        setAddTechnician('');
        setAddRepairCost('');
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

  const handleEditSave = async () => {
    if (!deviceToEdit) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/monitoring/${deviceToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress: editProgress,
          cause: editCause,
          technician: editTechnician,
          repairCost: editRepairCost
        })
      });

      if (res.ok) {
        setDevices(prev => prev.map(d => d.id === deviceToEdit.id ? { 
          ...d, 
          progress: editProgress,
          cause: editCause,
          technician: editTechnician,
          repairCost: editRepairCost
        } : d));
        setEditModalOpen(false);
      } else {
        alert('Failed to update progress.');
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      alert('An external error occurred.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = () => {
    if (!deviceToEdit) return;
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deviceToEdit) return;
    setIsDeleting(true);
    
    try {
      const res = await fetch(`/api/monitoring/${deviceToEdit.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setDevices(prev => prev.filter(d => d.id !== deviceToEdit.id));
        setDeleteModalOpen(false);
        setEditModalOpen(false);
      } else {
        alert('Failed to delete the request.');
      }
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('An external error occurred while deleting.');
    } finally {
      setIsDeleting(false);
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
                placeholder="Search by the Owner..." 
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
                    <th className="p-4 font-bold text-[1.05rem]">Device Name</th>
                    <th className="p-4 font-bold text-[1.05rem]">Owner Name</th>
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
                      <td className="p-4 font-bold text-[1.1rem] text-black align-middle">{device.deviceName}</td>
                      <td className="p-4 text-gray-600 font-semibold text-base align-middle">{device.ownerName}</td>
                      <td className="p-4 align-middle text-center">
                        <span className={`font-bold text-lg ${getProgressColor(device.progress)}`}>{device.progress}</span>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex gap-4 justify-center items-center">
                          <button 
                            onClick={() => openEditModal(device)}
                            className="w-11 h-11 rounded-full flex justify-center items-center bg-[#bd00ff] text-white hover:bg-[#9c00d6] hover:scale-110 transition-all shadow-md"
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
        {filteredDevices.length > ITEMS_PER_PAGE && (
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

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-[400px] w-full text-center shadow-2xl animate-in zoom-in-95 flex flex-col items-center">
            <Trash2 className="text-red-500 w-16 h-16 mb-5" />
            <h3 className="text-xl font-bold mb-3 text-black">Delete Request?</h3>
            <p className="text-gray-600 mb-8">
              Are you sure you want to delete the repair request for <strong className="text-black">{deviceToEdit?.deviceName}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-4 w-full justify-center">
              <button 
                onClick={() => setDeleteModalOpen(false)}
                className="px-6 py-2.5 border border-gray-400 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-6 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 border-none"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
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
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleDelete} 
                  className="text-red-500 hover:text-red-700 transition-colors cursor-pointer bg-transparent border-none p-1 flex items-center justify-center hover:bg-red-50 rounded-lg"
                  title="Delete Request"
                >
                  <Trash2 size={24} />
                </button>
                <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-black transition-colors font-bold text-xl cursor-pointer bg-transparent border-none">
                  ✕
                </button>
              </div>
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="font-semibold text-base text-black">Device Name</label>
                    <input type="text" value={deviceToEdit.deviceName} readOnly className="h-10 border-2 border-gray-200 bg-gray-50 rounded-xl px-4 text-gray-500 outline-none cursor-not-allowed" />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-semibold text-base text-black">Name of the Owner</label>
                    <input type="text" value={deviceToEdit.ownerName} readOnly className="h-10 border-2 border-gray-200 bg-gray-50 rounded-xl px-4 text-gray-500 outline-none cursor-not-allowed" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-base text-black">Progress</label>
                  <div className="relative">
                    <select 
                      value={editProgress}
                      onChange={(e) => setEditProgress(e.target.value)}
                      className={`w-full h-10 border-2 border-gray-300 rounded-xl px-4 outline-none focus:border-[#bd00ff] transition-colors font-semibold appearance-none bg-white cursor-pointer ${getProgressColor(editProgress)}`}
                    >
                      <option value="0%" disabled={progressLevels.indexOf('0%') < initialProgressIndex} className="text-red-500 font-semibold">0%</option>
                      <option value="25%" disabled={progressLevels.indexOf('25%') < initialProgressIndex} className="text-red-500 font-semibold">25%</option>
                      <option value="50%" disabled={progressLevels.indexOf('50%') < initialProgressIndex} className="text-yellow-500 font-semibold">50%</option>
                      <option value="75%" disabled={progressLevels.indexOf('75%') < initialProgressIndex} className="text-yellow-500 font-semibold">75%</option>
                      <option value="100%" disabled={progressLevels.indexOf('100%') < initialProgressIndex} className="text-green-600 font-semibold">100%</option>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <div className="flex flex-col gap-2">
                    <label className="font-semibold text-base text-black">Repair Cost</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-black">₱</span>
                      <input 
                        type="text" 
                        value={editRepairCost}
                        onChange={(e) => setEditRepairCost(e.target.value)}
                        placeholder="2,000" 
                        className="h-10 w-full border-2 border-gray-300 rounded-xl pl-8 pr-4 text-black outline-none focus:border-[#bd00ff] transition-colors" 
                      />
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
                              if (user.name) setAddOwnerName(user.name);
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="font-semibold text-base text-black">Device Name</label>
                    <input type="text" value={addDeviceName} onChange={(e) => setAddDeviceName(e.target.value)} className="h-10 border-2 border-gray-300 rounded-xl px-4 outline-none focus:border-[#bd00ff] transition-colors text-black" />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-semibold text-base text-black">Name of the Owner</label>
                    <input type="text" value={addOwnerName} onChange={(e) => setAddOwnerName(e.target.value)} className="h-10 border-2 border-gray-300 rounded-xl px-4 outline-none focus:border-[#bd00ff] transition-colors text-black" />
                  </div>
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
                  <label className="font-semibold text-base text-black">Cause of the problem</label>
                  <input 
                    type="text" 
                    value={addCause}
                    onChange={(e) => setAddCause(e.target.value)}
                    placeholder="e.g. Broken LCD" 
                    className="h-10 border-2 border-gray-300 rounded-xl px-4 text-black outline-none focus:border-[#bd00ff] transition-colors" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <div className="flex flex-col gap-2">
                    <label className="font-semibold text-base text-black">Repair Cost</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-black">₱</span>
                      <input 
                        type="text" 
                        value={addRepairCost}
                        onChange={(e) => setAddRepairCost(e.target.value)}
                        placeholder="2,000" 
                        className="h-10 w-full border-2 border-gray-300 rounded-xl pl-8 pr-4 text-black outline-none focus:border-[#bd00ff] transition-colors" 
                      />
                    </div>
                  </div>
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

    </main>
  );
}

