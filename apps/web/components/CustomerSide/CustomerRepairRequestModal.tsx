"use client";

import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2, CheckCircle2, AlertCircle, Wrench, Building2, Smartphone, HelpCircle, ShieldCheck, Camera, Eye, RefreshCw } from 'lucide-react';
import imageCompression from 'browser-image-compression';

interface CustomerRepairRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

const PHYSICAL_DAMAGE_SLOTS = [
  { key: 'front', labelEn: 'Front of Phone', labelCeb: 'Atubangan sa Phone' },
  { key: 'back', labelEn: 'Back of Phone', labelCeb: 'Likod sa Phone' },
  { key: 'right', labelEn: 'Right Side', labelCeb: 'Tuong Kilid' },
  { key: 'left', labelEn: 'Left Side', labelCeb: 'Wala nga Kilid' },
  { key: 'top', labelEn: 'Top Side', labelCeb: 'Ibabaw nga Bahin' },
  { key: 'bottom', labelEn: 'Bottom Side', labelCeb: 'Ubos nga Bahin' }
] as const;

type PhysicalSlotKey = typeof PHYSICAL_DAMAGE_SLOTS[number]['key'];

export default function CustomerRepairRequestModal({
  isOpen,
  onClose,
  onSuccess
}: CustomerRepairRequestModalProps) {
  // Device Information
  const [deviceName, setDeviceName] = useState('');
  const [brand, setBrand] = useState('Apple');
  const [customBrand, setCustomBrand] = useState('');
  const [deviceType, setDeviceType] = useState('Smartphone');
  const [customDeviceType, setCustomDeviceType] = useState('');
  const [imei, setImei] = useState('');

  // Repair Problem
  const [problem, setProblem] = useState(PROBLEM_OPTIONS[0]);
  const [customProblem, setCustomProblem] = useState('');
  const [problemDescription, setProblemDescription] = useState('');

  // Device Condition
  const [isWorking, setIsWorking] = useState<'Yes' | 'No' | 'Partially'>('Yes');
  const [hasPhysicalDamage, setHasPhysicalDamage] = useState<'Yes' | 'No'>('No');
  const [physicalDamageDescription, setPhysicalDamageDescription] = useState('');

  // Physical Damage Photos (6 slots)
  const [physicalPhotos, setPhysicalPhotos] = useState<Record<PhysicalSlotKey, File | null>>({
    front: null,
    back: null,
    right: null,
    left: null,
    top: null,
    bottom: null
  });
  const [physicalPreviews, setPhysicalPreviews] = useState<Record<PhysicalSlotKey, string | null>>({
    front: null,
    back: null,
    right: null,
    left: null,
    top: null,
    bottom: null
  });

  // Section 4: Main Problem / Repair Issue Photos (up to 5)
  const [mainProblemPhotos, setMainProblemPhotos] = useState<File[]>([]);
  const [mainProblemPreviews, setMainProblemPreviews] = useState<string[]>([]);

  // Lightbox Modal for enlarged view
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; title: string } | null>(null);

  // Preferred Branch
  const [branch, setBranch] = useState('Tagoloan');

  // Customer Information (Auto-retrieved)
  const [customerInfo, setCustomerInfo] = useState<{
    name: string;
    email: string;
    phone: string;
  }>({
    name: 'Customer',
    email: '',
    phone: ''
  });

  // State flags
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch customer profile
    setIsLoadingProfile(true);
    fetch('/api/profile')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          const rawPhone = data.phone || '';
          const cleanPhone = (rawPhone && !rawPhone.includes('₱') && !rawPhone.toLowerCase().includes('cash'))
            ? rawPhone
            : '0917 123 4567';
          setCustomerInfo({
            name: data.name || 'Customer',
            email: data.email || 'customer@graphix.com',
            phone: cleanPhone
          });
          if (data.branch && (data.branch.includes('Tagoloan') || data.branch.includes('Villanueva') || data.branch.includes('Jasaan'))) {
            const cleanBranch = data.branch.replace(/\s*Branch/i, '').trim();
            setBranch(cleanBranch);
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingProfile(false));
  }, [isOpen]);

  // Image compression helper (Target ~2 MB max, preserving sharpness and aspect ratio)
  const compressImageFile = async (file: File): Promise<File> => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      throw new Error('Please upload a valid image file (JPG, JPEG, PNG, or WebP).');
    }

    if (file.size <= 1.5 * 1024 * 1024 && (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp')) {
      return file;
    }

    try {
      const options = {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: 0.85
      };
      const compressed = await imageCompression(file, options);
      return compressed;
    } catch (err) {
      console.warn('Image compression fallback to original:', err);
      return file;
    }
  };

  // Section 3: Physical damage photo upload
  const handlePhysicalPhotoUpload = async (slotKey: PhysicalSlotKey, file: File | null) => {
    if (!file) return;
    setErrorMessage(null);

    try {
      const compressed = await compressImageFile(file);
      const previewUrl = URL.createObjectURL(compressed);

      if (physicalPreviews[slotKey]) {
        URL.revokeObjectURL(physicalPreviews[slotKey]!);
      }

      setPhysicalPhotos(prev => ({ ...prev, [slotKey]: compressed }));
      setPhysicalPreviews(prev => ({ ...prev, [slotKey]: previewUrl }));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process image');
    }
  };

  const handleRemovePhysicalPhoto = (slotKey: PhysicalSlotKey) => {
    if (physicalPreviews[slotKey]) {
      URL.revokeObjectURL(physicalPreviews[slotKey]!);
    }
    setPhysicalPhotos(prev => ({ ...prev, [slotKey]: null }));
    setPhysicalPreviews(prev => ({ ...prev, [slotKey]: null }));
  };

  // Section 4: Main problem photo upload
  const handleMainProblemPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    if (mainProblemPhotos.length + files.length > 5) {
      setErrorMessage('You can upload a maximum of 5 main problem photos.');
      return;
    }
    setErrorMessage(null);

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of files) {
      try {
        const compressed = await compressImageFile(file);
        newFiles.push(compressed);
        newPreviews.push(URL.createObjectURL(compressed));
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to process image');
      }
    }

    setMainProblemPhotos(prev => [...prev, ...newFiles]);
    setMainProblemPreviews(prev => [...prev, ...newPreviews]);
  };

  const handleRemoveMainProblemPhoto = (index: number) => {
    if (mainProblemPreviews[index]) {
      URL.revokeObjectURL(mainProblemPreviews[index]);
    }
    setMainProblemPhotos(prev => prev.filter((_, i) => i !== index));
    setMainProblemPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleReplaceMainProblemPhoto = async (index: number, file: File | null) => {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      const previewUrl = URL.createObjectURL(compressed);

      if (mainProblemPreviews[index]) {
        URL.revokeObjectURL(mainProblemPreviews[index]);
      }

      setMainProblemPhotos(prev => {
        const copy = [...prev];
        copy[index] = compressed;
        return copy;
      });
      setMainProblemPreviews(prev => {
        const copy = [...prev];
        copy[index] = previewUrl;
        return copy;
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to replace image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!deviceName.trim()) {
      setErrorMessage('Please enter the Device Name/Model.');
      return;
    }

    const finalBrand = brand === 'Other' ? customBrand.trim() : brand;
    if (!finalBrand) {
      setErrorMessage('Please specify the device brand.');
      return;
    }

    const finalDeviceType = deviceType === 'Other' ? customDeviceType.trim() : deviceType;
    if (!finalDeviceType) {
      setErrorMessage('Please specify the device type.');
      return;
    }

    const finalProblem = problem === 'Other' ? (customProblem.trim() || 'Other Problem') : problem;

    if (!problemDescription.trim()) {
      setErrorMessage('Please describe the problem with your device.');
      return;
    }

    if (hasPhysicalDamage === 'Yes' && !physicalDamageDescription.trim()) {
      setErrorMessage('Please describe the visible physical damage.');
      return;
    }

    if (!branch) {
      setErrorMessage('Please select a preferred repair branch.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('deviceName', deviceName.trim());
      formData.append('ownerName', customerInfo.name);
      formData.append('progress', 'Pending');
      formData.append('cause', `${finalProblem}: ${problemDescription.trim()}`);
      formData.append('branch', branch);

      // Detailed JSON payload for structured repair information
      const detailedPayload = {
        brand: finalBrand,
        deviceType: finalDeviceType,
        imei: imei.trim() || null,
        problem: finalProblem,
        problemDescription: problemDescription.trim(),
        isWorking,
        hasPhysicalDamage,
        physicalDamageDescription: hasPhysicalDamage === 'Yes' ? physicalDamageDescription.trim() : '',
        branch,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        submittedAt: new Date().toISOString()
      };

      formData.append('repairHistory', JSON.stringify(detailedPayload));

      // Append physical damage photos by slot
      if (hasPhysicalDamage === 'Yes') {
        PHYSICAL_DAMAGE_SLOTS.forEach(slot => {
          const file = physicalPhotos[slot.key];
          if (file) {
            formData.append(`physical_photo_${slot.key}`, file);
          }
        });
      }

      // Append main problem photos
      mainProblemPhotos.forEach((file, index) => {
        formData.append(`main_photo_${index}`, file);
        formData.append(`photo_${index}`, file); // Backward compatibility
      });
      formData.append('mainPhotoCount', mainProblemPhotos.length.toString());
      formData.append('photoCount', mainProblemPhotos.length.toString());

      const res = await fetch('/api/monitoring', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit repair request');
      }

      setIsSuccessModalOpen(true);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An error occurred while submitting your request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setIsSuccessModalOpen(false);
    // Reset form
    setDeviceName('');
    setBrand('Apple');
    setCustomBrand('');
    setDeviceType('Smartphone');
    setCustomDeviceType('');
    setImei('');
    setProblem(PROBLEM_OPTIONS[0]);
    setCustomProblem('');
    setProblemDescription('');
    setIsWorking('Yes');
    setHasPhysicalDamage('No');
    setPhysicalDamageDescription('');
    setPhysicalPhotos({
      front: null,
      back: null,
      right: null,
      left: null,
      top: null,
      bottom: null
    });
    setPhysicalPreviews({
      front: null,
      back: null,
      right: null,
      left: null,
      top: null,
      bottom: null
    });
    setMainProblemPhotos([]);
    setMainProblemPreviews([]);
    setErrorMessage(null);
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <div className="bg-white rounded-3xl max-w-3xl w-full my-auto shadow-2xl border border-purple-100 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 font-['Inter']">
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 via-white to-fuchsia-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#bd00ff] text-white flex items-center justify-center shadow-md">
                <Wrench size={22} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 m-0">Request Device Repair</h2>
                <p className="text-xs sm:text-sm text-gray-500 m-0">Submit your device details for diagnostic and repair estimation</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black flex items-center justify-center transition-colors cursor-pointer border-none"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
            
            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-sm animate-in fade-in">
                <AlertCircle size={20} className="shrink-0 text-red-500" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            {/* Section 1: Device Information */}
            <div className="flex flex-col gap-4 bg-gray-50/70 p-5 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-2 text-purple-950 font-bold text-base border-b border-gray-200/80 pb-2">
                <Smartphone size={18} className="text-[#bd00ff]" />
                <span>1. Device Information</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Device Name / Model */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Device Name / Model <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., iPhone 11, Samsung S21 Ultra"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    className="h-11 px-4 rounded-xl border border-gray-300 focus:border-[#bd00ff] focus:ring-2 focus:ring-purple-100 outline-none text-sm font-medium text-black bg-white transition-all"
                  />
                </div>

                {/* Brand */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Brand <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="h-11 px-4 rounded-xl border border-gray-300 focus:border-[#bd00ff] focus:ring-2 focus:ring-purple-100 outline-none text-sm font-medium text-black bg-white transition-all cursor-pointer"
                  >
                    {BRAND_OPTIONS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  {brand === 'Other' && (
                    <input
                      type="text"
                      placeholder="Specify Brand Name"
                      value={customBrand}
                      onChange={(e) => setCustomBrand(e.target.value)}
                      className="h-10 mt-1 px-4 rounded-xl border border-purple-200 focus:border-[#bd00ff] outline-none text-sm font-medium text-black bg-white"
                    />
                  )}
                </div>

                {/* Device Type */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Device Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={deviceType}
                    onChange={(e) => setDeviceType(e.target.value)}
                    className="h-11 px-4 rounded-xl border border-gray-300 focus:border-[#bd00ff] focus:ring-2 focus:ring-purple-100 outline-none text-sm font-medium text-black bg-white transition-all cursor-pointer"
                  >
                    {DEVICE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {deviceType === 'Other' && (
                    <input
                      type="text"
                      placeholder="Specify Device Type"
                      value={customDeviceType}
                      onChange={(e) => setCustomDeviceType(e.target.value)}
                      className="h-10 mt-1 px-4 rounded-xl border border-purple-200 focus:border-[#bd00ff] outline-none text-sm font-medium text-black bg-white"
                    />
                  )}
                </div>

                {/* IMEI / Serial Number */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                    <span>IMEI / Serial Number</span>
                    <span className="text-gray-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 356984102938475"
                    value={imei}
                    onChange={(e) => setImei(e.target.value)}
                    className="h-11 px-4 rounded-xl border border-gray-300 focus:border-[#bd00ff] focus:ring-2 focus:ring-purple-100 outline-none text-sm font-medium text-black bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Repair Problem */}
            <div className="flex flex-col gap-4 bg-gray-50/70 p-5 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-2 text-purple-950 font-bold text-base border-b border-gray-200/80 pb-2">
                <HelpCircle size={18} className="text-[#bd00ff]" />
                <span>2. Repair Problem</span>
              </div>

              <div className="flex flex-col gap-4">
                {/* Problem Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Problem / Issue <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    className="h-11 px-4 rounded-xl border border-gray-300 focus:border-[#bd00ff] focus:ring-2 focus:ring-purple-100 outline-none text-sm font-medium text-black bg-white transition-all cursor-pointer"
                  >
                    {PROBLEM_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  {problem === 'Other' && (
                    <input
                      type="text"
                      placeholder="Specify the problem"
                      value={customProblem}
                      onChange={(e) => setCustomProblem(e.target.value)}
                      className="h-10 mt-1 px-4 rounded-xl border border-purple-200 focus:border-[#bd00ff] outline-none text-sm font-medium text-black bg-white"
                    />
                  )}
                </div>

                {/* Problem Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Describe the Problem <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g., The screen is cracked and sometimes does not respond to touch."
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                    className="p-4 rounded-xl border border-gray-300 focus:border-[#bd00ff] focus:ring-2 focus:ring-purple-100 outline-none text-sm font-medium text-black bg-white transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Device Condition */}
            <div className="flex flex-col gap-4 bg-gray-50/70 p-5 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-2 text-purple-950 font-bold text-base border-b border-gray-200/80 pb-2">
                <ShieldCheck size={18} className="text-[#bd00ff]" />
                <span>3. Device Condition</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Is Working? */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      IS THE DEVICE CURRENTLY WORKING? <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-gray-500 italic">
                      Mugana ba karon ang device? <span className="text-red-500">*</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {(['Yes', 'No', 'Partially'] as const).map((opt) => (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => setIsWorking(opt)}
                        className={`flex-1 py-2.5 px-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                          isWorking === opt
                            ? 'bg-[#bd00ff] border-[#bd00ff] text-white shadow-sm'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-purple-300'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visible Physical Damage? */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      DOES THE DEVICE HAVE VISIBLE PHYSICAL DAMAGE? <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-gray-500 italic">
                      Naa ba'y makita nga pisikal nga kadaot sa device? <span className="text-red-500">*</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {(['Yes', 'No'] as const).map((opt) => (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => setHasPhysicalDamage(opt)}
                        className={`flex-1 py-2.5 px-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                          hasPhysicalDamage === opt
                            ? 'bg-[#bd00ff] border-[#bd00ff] text-white shadow-sm'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-purple-300'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Conditional Physical Damage Details (When Yes) */}
              {hasPhysicalDamage === 'Yes' && (
                <div className="flex flex-col gap-5 pt-3 border-t border-purple-100 animate-in fade-in slide-in-from-top-2">
                  
                  {/* Physical Damage Description */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                          Describe the Visible Physical Damage <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[11px] text-gray-500 italic">
                          Ilaraw ang makita nga pisikal nga kadaot.
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-gray-400">
                        {physicalDamageDescription.length} / 500
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={500}
                      required={hasPhysicalDamage === 'Yes'}
                      placeholder="Example: Cracked screen, scratches on the back cover, dent on the side, broken camera glass, etc."
                      value={physicalDamageDescription}
                      onChange={(e) => setPhysicalDamageDescription(e.target.value)}
                      className="p-4 rounded-xl border border-gray-300 focus:border-[#bd00ff] focus:ring-2 focus:ring-purple-100 outline-none text-sm font-medium text-black bg-white transition-all resize-none"
                    />
                  </div>

                  {/* Physical Damage Evidence Photos */}
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <Camera size={16} className="text-[#bd00ff]" />
                        <span className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                          Physical Damage Evidence Photos
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 italic">
                        Mga Litrato sa Pisikal nga Kadaot
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 m-0">
                      Upload clear photos showing the physical condition of the device from different angles.
                    </p>
                    <p className="text-[11px] text-gray-500 italic -mt-1 m-0">
                      Pag-upload og klaro nga mga litrato sa device gikan sa lain-laing anggulo aron makita ang pisikal nga kondisyon ug kadaot niini.
                    </p>

                    {/* 6 Angle Slots Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 mt-2">
                      {PHYSICAL_DAMAGE_SLOTS.map((slot) => {
                        const preview = physicalPreviews[slot.key];
                        return (
                          <div
                            key={slot.key}
                            className="bg-white rounded-2xl border-2 border-dashed border-purple-200 p-2.5 flex flex-col items-center text-center relative hover:border-[#bd00ff] transition-all group shadow-sm min-h-[140px] justify-between"
                          >
                            {preview ? (
                              <div className="w-full flex flex-col items-center gap-1.5">
                                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-100 border border-purple-100 group/img">
                                  <img
                                    src={preview}
                                    alt={slot.labelEn}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEnlargedImage({ url: preview, title: `${slot.labelEn} (${slot.labelCeb})` })}
                                      className="p-1.5 bg-white/90 hover:bg-white text-gray-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer border-none shadow"
                                      title="View Photo"
                                    >
                                      <Eye size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemovePhysicalPhoto(slot.key)}
                                      className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer border-none shadow"
                                      title="Remove Photo"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex flex-col items-center text-center">
                                  <span className="text-[11px] font-bold text-gray-900 leading-tight">{slot.labelEn}</span>
                                  <span className="text-[10px] text-gray-500 italic leading-tight">{slot.labelCeb}</span>
                                </div>
                                <label className="w-full py-1 px-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-[#bd00ff] text-[10px] font-bold cursor-pointer transition-colors flex items-center justify-center gap-1">
                                  <RefreshCw size={11} />
                                  <span>Replace</span>
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                    onChange={(e) => handlePhysicalPhotoUpload(slot.key, e.target.files?.[0] || null)}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            ) : (
                              <label className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-2 cursor-pointer">
                                <div className="w-9 h-9 rounded-full bg-purple-50 group-hover:bg-purple-100 text-[#bd00ff] flex items-center justify-center transition-colors">
                                  <Camera size={18} />
                                </div>
                                <span className="text-xs font-bold text-purple-800 group-hover:text-[#bd00ff] transition-colors">
                                  + Add Photo
                                </span>
                                <div className="flex flex-col items-center text-center leading-tight">
                                  <span className="text-[11px] font-bold text-gray-800">{slot.labelEn}</span>
                                  <span className="text-[10px] text-gray-400 italic">{slot.labelCeb}</span>
                                </div>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/jpg,image/png,image/webp"
                                  onChange={(e) => handlePhysicalPhotoUpload(slot.key, e.target.files?.[0] || null)}
                                  className="hidden"
                                />
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Section 4: Upload Device Photos (Main Problem Photos) */}
            <div className="flex flex-col gap-4 bg-gray-50/70 p-5 rounded-2xl border border-gray-100">
              <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
                <div className="flex items-center gap-2 text-purple-950 font-bold text-base">
                  <Upload size={18} className="text-[#bd00ff]" />
                  <span>4. Upload Device Photos</span>
                </div>
                <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2.5 py-1 rounded-full">
                  {mainProblemPhotos.length} / 5 photos
                </span>
              </div>

              <div className="flex flex-col -mt-2">
                <p className="text-xs text-gray-600 m-0">
                  Upload photos showing the main problem or issue with your device.
                </p>
                <p className="text-[11px] text-gray-500 italic m-0">
                  Pag-upload og mga litrato nga nagpakita sa main nga problema o issue sa imong device.
                </p>
              </div>

              {/* Photo Previews Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {mainProblemPreviews.map((preview, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-xl overflow-hidden border-2 border-purple-200 bg-white group shadow-sm"
                  >
                    <img
                      src={preview}
                      alt={`Problem Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
                      <button
                        type="button"
                        onClick={() => setEnlargedImage({ url: preview, title: `Main Problem Photo ${index + 1}` })}
                        className="p-1.5 bg-black/60 hover:bg-black text-white rounded-full transition-opacity shadow cursor-pointer border-none"
                        title="View photo"
                      >
                        <Eye size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveMainProblemPhoto(index)}
                        className="p-1.5 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity shadow cursor-pointer border-none"
                        title="Remove photo"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <label
                      className="absolute bottom-0 inset-x-0 bg-black/70 hover:bg-black/90 text-white text-[10px] text-center py-1 font-bold cursor-pointer transition-colors flex items-center justify-center gap-1"
                      title="Replace photo"
                    >
                      <span>Replace Photo {index + 1}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => handleReplaceMainProblemPhoto(index, e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>
                ))}

                {mainProblemPhotos.length < 5 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-purple-300 hover:border-[#bd00ff] bg-purple-50/50 hover:bg-purple-100/50 flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-colors group">
                    <Upload size={22} className="text-purple-600 group-hover:scale-110 transition-transform mb-1" />
                    <span className="text-xs font-bold text-purple-800">+ Add Photo</span>
                    <span className="text-[10px] text-gray-400">Max 5 photos</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      multiple
                      onChange={handleMainProblemPhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Section 5: Preferred Repair Branch */}
            <div className="flex flex-col gap-4 bg-gray-50/70 p-5 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-2 text-purple-950 font-bold text-base border-b border-gray-200/80 pb-2">
                <Building2 size={18} className="text-[#bd00ff]" />
                <span>5. Preferred Repair Branch</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {BRANCH_OPTIONS.map((b) => (
                  <button
                    type="button"
                    key={b}
                    onClick={() => setBranch(b)}
                    className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold text-sm transition-all cursor-pointer ${
                      branch === b
                        ? 'bg-[#bd00ff] border-[#bd00ff] text-white shadow-md'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-purple-300'
                    }`}
                  >
                    <Building2 size={16} />
                    <span>{b} Branch</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 6: Customer Information (Auto-retrieved) */}
            <div className="flex flex-col gap-3 bg-purple-50/50 p-5 rounded-2xl border border-purple-100">
              <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                6. Customer Information (Auto-retrieved)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-purple-100">
                  <span className="text-gray-400 font-semibold block uppercase text-[10px]">Full Name</span>
                  <span className="font-bold text-gray-800 text-sm">{customerInfo.name || 'Customer'}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-purple-100">
                  <span className="text-gray-400 font-semibold block uppercase text-[10px]">Email Address</span>
                  <span className="font-bold text-gray-800 text-sm truncate block">{customerInfo.email || '—'}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-purple-100">
                  <span className="text-gray-400 font-semibold block uppercase text-[10px]">Phone Number</span>
                  <span className="font-bold text-gray-800 text-sm">{customerInfo.phone || '—'}</span>
                </div>
              </div>
            </div>

            {/* Section 7: Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-colors cursor-pointer bg-transparent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-[#bd00ff] hover:from-purple-700 hover:to-[#9c00d6] text-white font-bold shadow-lg shadow-purple-200 transition-all cursor-pointer border-none flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <Wrench size={18} />
                    <span>Submit Repair Request</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* Enlarged Photo Lightbox Modal */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between text-white mb-2">
              <span className="font-bold text-sm">{enlargedImage.title}</span>
              <button
                type="button"
                onClick={() => setEnlargedImage(null)}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer border-none transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={enlargedImage.url}
              alt={enlargedImage.title}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl bg-black"
            />
          </div>
        </div>
      )}

      {/* Success Modal */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 flex flex-col items-center border border-purple-100">
            <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Repair Request Submitted Successfully</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Your repair request for <strong className="text-black">{deviceName}</strong> has been sent to the <strong className="text-purple-700">{branch} Branch</strong> for review.
            </p>
            <div className="w-full bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-6 text-left text-xs text-purple-900 flex flex-col gap-1">
              <div><strong>Status:</strong> <span className="text-amber-600 font-bold">Pending Review</span></div>
              <div><strong>Selected Branch:</strong> {branch} Branch</div>
              <div><strong>Assigned To:</strong> Branch Admin & Cashier</div>
            </div>
            <button
              type="button"
              onClick={handleSuccessClose}
              className="w-full py-3.5 bg-[#bd00ff] hover:bg-[#9c00d6] text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer border-none"
            >
              Okay, Got It!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
