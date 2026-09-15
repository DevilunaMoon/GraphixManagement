"use client";

import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2, CheckCircle2, AlertCircle, Wrench, Building2, Smartphone, HelpCircle, ShieldCheck } from 'lucide-react';
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

  // Device Photos (up to 5)
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    if (photos.length + files.length > 5) {
      setErrorMessage('You can upload a maximum of 5 photos.');
      return;
    }
    setErrorMessage(null);

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
    };

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of files) {
      try {
        const compressedFile = await imageCompression(file, options);
        newFiles.push(compressedFile);
        newPreviews.push(URL.createObjectURL(compressedFile));
      } catch (err) {
        newFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      }
    }

    setPhotos(prev => [...prev, ...newFiles]);
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
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
        branch,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        submittedAt: new Date().toISOString()
      };

      formData.append('repairHistory', JSON.stringify(detailedPayload));

      // Append photos
      photos.forEach((file, index) => {
        formData.append(`photo_${index}`, file);
      });
      formData.append('photoCount', photos.length.toString());

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
    setPhotos([]);
    setPhotoPreviews([]);
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
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Is the device currently working? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
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
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Does the device have visible physical damage? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
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
            </div>

            {/* Section 4: Upload Device Photos */}
            <div className="flex flex-col gap-4 bg-gray-50/70 p-5 rounded-2xl border border-gray-100">
              <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
                <div className="flex items-center gap-2 text-purple-950 font-bold text-base">
                  <Upload size={18} className="text-[#bd00ff]" />
                  <span>4. Upload Device Photos</span>
                </div>
                <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2.5 py-1 rounded-full">
                  {photos.length} / 5 photos
                </span>
              </div>

              <p className="text-xs text-gray-500 -mt-2">
                Suggested photos: Front of device, Back of device, Damaged area, Screen/problem area, or other relevant angle.
              </p>

              {/* Photo Previews Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {photoPreviews.map((preview, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-xl overflow-hidden border-2 border-purple-200 bg-white group shadow-sm"
                  >
                    <img
                      src={preview}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-1.5 right-1.5 p-1.5 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity shadow cursor-pointer border-none"
                      title="Remove photo"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center py-0.5 font-bold">
                      Photo {index + 1}
                    </div>
                  </div>
                ))}

                {photos.length < 5 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-purple-300 hover:border-[#bd00ff] bg-purple-50/50 hover:bg-purple-100/50 flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-colors group">
                    <Upload size={22} className="text-purple-600 group-hover:scale-110 transition-transform mb-1" />
                    <span className="text-xs font-bold text-purple-800">Add Photo</span>
                    <span className="text-[10px] text-gray-400">Max 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
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
