"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Wrench, Search, RefreshCw, CheckCircle2, AlertCircle, Clock, 
  Smartphone, User, Camera, FileText, ChevronRight, X, ChevronLeft, 
  UploadCloud, Plus, Trash2, Cpu, CheckCircle, ShieldAlert
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface DeviceItem {
  id: string;
  deviceName: string;
  ownerName?: string;
  progress: string;
  status: string;
  cause?: string;
  technician?: string;
  repairCost?: string;
  materials?: string;
  branch: string;
  image?: string;
  proofImage?: string;
  repairHistory?: string;
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export default function TechnicianMonitoring() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusId = searchParams.get('focus');

  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DIAGNOSTIC' | 'REPAIRING' | 'COMPLETED'>('ALL');
  const [technician, setTechnician] = useState<any>(null);

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
      }, 1000);
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

  return (
    <main className="flex-1 p-3.5 sm:p-6 md:p-8 flex flex-col gap-6 max-w-7xl w-full mx-auto font-['Inter']">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-purple-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8b00cc] to-[#bd00ff] text-white flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
            <Wrench size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight m-0">
                Gadget Repair Workbench
              </h1>
              <span className="text-[11px] font-bold bg-purple-100 text-[#8b00cc] px-2 py-0.5 rounded-full border border-purple-200">
                📍 {technician?.branch || 'Branch'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 font-medium m-0 mt-0.5">
              Review assigned repairs, log diagnostics & parts, and update customer tracking.
            </p>
          </div>
        </div>

        <button
          onClick={fetchProfileAndDevices}
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#8b00cc] font-bold text-xs transition-colors flex items-center gap-2 border border-purple-200 cursor-pointer self-stretch sm:self-auto justify-center"
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-purple-100 shadow-sm">
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-purple-500 focus-within:bg-white flex-1 max-w-md">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search device, tracking ID, or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-medium text-gray-900 bg-transparent outline-none placeholder-gray-400"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-gray-100 rounded-xl">
          {(['ALL', 'DIAGNOSTIC', 'REPAIRING', 'COMPLETED'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-none ${
                statusFilter === tab
                  ? 'bg-white text-purple-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 bg-transparent'
              }`}
            >
              {tab === 'ALL' ? 'All Assigned' : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Devices Grid */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-gray-400 font-medium">
          Loading assigned repair queue...
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-[#8b00cc] flex items-center justify-center">
            <Wrench size={22} />
          </div>
          <h3 className="text-sm font-bold text-gray-900 m-0">No repair jobs found</h3>
          <p className="text-xs text-gray-500 m-0">No matching devices under this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevices.map((device) => {
            const isCompleted = device.status === 'Completed' || device.progress?.toLowerCase() === 'completed';
            const isRepairing = device.progress === 'Repairing';

            return (
              <div 
                key={device.id}
                className="bg-white rounded-2xl border border-purple-100 hover:border-purple-300 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex flex-col gap-3">
                  {/* Top Bar: Tracking ID & Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-black text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                      {device.trackingNumber || 'GRPX-DEVICE'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                      isCompleted 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : isRepairing
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {device.progress || 'Diagnostic'}
                    </span>
                  </div>

                  {/* Device Header */}
                  <div className="flex items-start gap-3">
                    <div 
                      onClick={() => device.image && setLightboxImage(device.image)}
                      className="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer text-gray-400 group relative"
                    >
                      {device.image ? (
                        <>
                          <img src={device.image} alt={device.deviceName} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                            View
                          </div>
                        </>
                      ) : (
                        <Smartphone size={24} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-gray-900 truncate m-0">
                        {device.deviceName}
                      </h3>
                      <p className="text-xs text-gray-500 m-0 mt-0.5 truncate">
                        Owner: <strong className="text-gray-700">{device.ownerName || 'Customer'}</strong>
                      </p>
                      <p className="text-[11px] text-gray-400 m-0 mt-0.5">
                        Assigned Tech: <span className="font-semibold text-purple-800">{device.technician || 'Branch Tech'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Issue snippet */}
                  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                    <span className="font-bold text-gray-700">Problem: </span>
                    <span className="text-gray-600 line-clamp-2">
                      {device.cause?.split(':')[0] || 'Technical inspection required'}
                    </span>
                  </div>
                </div>

                {/* Footer Action Button */}
                <button
                  type="button"
                  onClick={() => openWorkbenchModal(device)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] hover:brightness-110 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
                >
                  <Wrench size={15} />
                  <span>Manage Repair</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. WORKBENCH MODAL */}
      {isModalOpen && selectedDevice && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto overscroll-contain animate-in fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full my-auto shadow-2xl border border-purple-100 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-purple-900 via-indigo-900 to-[#8b00cc] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center">
                  <Wrench size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base m-0">
                    Repair Workbench: {selectedDevice.deviceName}
                  </h3>
                  <p className="text-xs text-purple-200 m-0">
                    {selectedDevice.trackingNumber} • {selectedDevice.ownerName || 'Customer'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg bg-transparent border-none cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveWorkbench} className="p-6 overflow-y-auto flex flex-col gap-5 text-xs">
              
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

              {/* Step 1: Repair Stage Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-gray-700 uppercase tracking-wide">
                  Current Repair Stage
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Diagnostic', 'Repairing', 'Completed'] as const).map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => setEditProgress(stage)}
                      className={`py-2.5 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        editProgress === stage
                          ? stage === 'Completed'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white border-purple-500 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {stage === 'Completed' ? <CheckCircle2 size={14} /> : stage === 'Repairing' ? <Cpu size={14} /> : <Search size={14} />}
                      <span>{stage}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Diagnostic Cause & Technical Findings */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-gray-700 uppercase tracking-wide">
                  Diagnostic Findings & Problem Cause
                </label>
                <textarea
                  rows={3}
                  value={editCause}
                  onChange={(e) => setEditCause(e.target.value)}
                  placeholder="Detail inspection results, root cause (e.g. Broken LCD flex cable, water damage in power IC)..."
                  className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 font-medium text-gray-900 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white resize-none"
                  required
                />
              </div>

              {/* Step 3: Spare Parts & Materials Breakdown */}
              <div className="flex flex-col gap-2">
                <label className="font-bold text-gray-700 uppercase tracking-wide">
                  Spare Parts & Materials Used
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. OEM LCD Screen Replacement"
                    value={newMaterialItem}
                    onChange={(e) => setNewMaterialItem(e.target.value)}
                    className="flex-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 font-medium text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="number"
                    placeholder="Cost (₱)"
                    value={newMaterialCost}
                    onChange={(e) => setNewMaterialCost(e.target.value)}
                    className="w-24 p-2.5 rounded-xl bg-gray-50 border border-gray-200 font-medium text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddMaterial}
                    className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-xl font-bold transition-colors cursor-pointer border-none flex items-center gap-1"
                  >
                    <Plus size={16} />
                    <span>Add</span>
                  </button>
                </div>

                {materialsList.length > 0 && (
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden mt-1">
                    {materialsList.map((m, idx) => (
                      <div key={idx} className="p-2.5 bg-white flex items-center justify-between">
                        <span className="font-bold text-gray-800">{m.item}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-gray-600">₱{m.cost.toLocaleString()}</span>
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

              {/* Step 4: Estimated Labor & Total Repair Cost */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-gray-700 uppercase tracking-wide">
                  Estimated Repair / Labor Cost (₱)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1500"
                  value={editRepairCost}
                  onChange={(e) => setEditRepairCost(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 font-mono font-bold text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Step 5: Upload Proof Photo (Required when Completing) */}
              <div className="flex flex-col gap-2">
                <label className="font-bold text-gray-700 uppercase tracking-wide">
                  Repair Proof / Finished Device Photo
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold cursor-pointer transition-colors flex items-center gap-2 border border-gray-200">
                    <Camera size={16} />
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedProofFile(file);
                          setProofPreviewUrl(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                  {proofPreviewUrl && (
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-purple-200">
                      <img src={proofPreviewUrl} alt="Proof Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-colors cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] hover:brightness-110 text-white font-bold shadow-md transition-all cursor-pointer border-none flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save & Update Progress'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={lightboxImage} alt="Enlarged" className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}

    </main>
  );
}
