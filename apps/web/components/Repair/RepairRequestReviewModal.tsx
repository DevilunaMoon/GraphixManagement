"use client";

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Building2, Smartphone, Calendar, User, Phone, Mail, ShieldAlert, Image as ImageIcon, Wrench } from 'lucide-react';

export interface RepairRequestData {
  id: string;
  deviceName: string;
  ownerName?: string | null;
  progress: string;
  cause?: string | null;
  technician?: string | null;
  repairCost?: string | null;
  downpayment?: string | null;
  branch?: string | null;
  image?: string | null;
  proofImage?: string | null;
  repairHistory?: string | null;
  status: string;
  createdAt?: string;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}

interface RepairRequestReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: RepairRequestData | null;
  onStatusChange?: (updatedRequest: any) => void;
}

export default function RepairRequestReviewModal({
  isOpen,
  onClose,
  request,
  onStatusChange
}: RepairRequestReviewModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || !request) return null;

  // Parse structured repair request history payload if available
  let parsedDetails: {
    brand?: string;
    deviceType?: string;
    imei?: string;
    problem?: string;
    problemDescription?: string;
    suggestedRepair?: string;
    suggestionForRepair?: string;
    isWorking?: string;
    hasPhysicalDamage?: string;
    physicalDamageDescription?: string;
    physicalDamagePhotos?: Record<string, string>;
    mainProblemPhotos?: string[];
    branch?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    submittedAt?: string;
    photos?: string[];
  } | null = null;

  if (request.repairHistory) {
    try {
      if (request.repairHistory.trim().startsWith('{')) {
        parsedDetails = JSON.parse(request.repairHistory);
      }
    } catch (e) {
      console.error('Failed to parse repair history JSON:', e);
    }
  }

  // Combine photos: from parsedDetails.photos array or request.image / proofImage
  const photosList: string[] = [];
  if (parsedDetails?.photos && Array.isArray(parsedDetails.photos)) {
    parsedDetails.photos.forEach(p => {
      if (p && !photosList.includes(p)) photosList.push(p);
    });
  }
  if (request.image && !photosList.includes(request.image)) {
    photosList.unshift(request.image);
  }
  if (request.proofImage && !photosList.includes(request.proofImage)) {
    photosList.push(request.proofImage);
  }

  const customerName = parsedDetails?.customerName || request.ownerName || request.user?.name || 'Customer';
  const customerEmail = parsedDetails?.customerEmail || request.user?.email || 'N/A';
  const customerPhone = parsedDetails?.customerPhone || request.user?.phone || 'N/A';
  const branchName = parsedDetails?.branch || request.branch || 'Tagoloan';
  const brand = parsedDetails?.brand || 'N/A';
  const deviceType = parsedDetails?.deviceType || 'Smartphone';
  const imei = parsedDetails?.imei || 'None provided';
  const problem = parsedDetails?.problem || request.cause?.split(':')[0] || request.cause || 'General Issue';
  const problemDescription = parsedDetails?.problemDescription || request.cause?.split(':').slice(1).join(':').trim() || request.cause || 'No detailed description provided.';
  const suggestedRepair = parsedDetails?.suggestedRepair;
  const suggestionForRepair = parsedDetails?.suggestionForRepair;
  const isWorking = parsedDetails?.isWorking || 'Unknown';
  const hasPhysicalDamage = parsedDetails?.hasPhysicalDamage || 'Unknown';
  const physicalDamageDescription = parsedDetails?.physicalDamageDescription || '';
  const physicalDamagePhotos = parsedDetails?.physicalDamagePhotos || {};
  const mainProblemPhotos = parsedDetails?.mainProblemPhotos || [];
  const dateSubmitted = parsedDetails?.submittedAt || request.createdAt;

  const formattedDate = dateSubmitted
    ? new Date(dateSubmitted).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    : 'Recently';

  const isPending = request.progress?.toLowerCase() === 'pending';
  const isAccepted = request.progress?.toLowerCase() === 'accepted' || request.progress?.toLowerCase() === 'diagnostic' || request.progress?.toLowerCase() === 'diagnosis';
  const isRejected = request.progress?.toLowerCase() === 'rejected' || request.status?.toLowerCase() === 'cancelled';

  const handleAction = async (action: 'ACCEPT' | 'REJECT') => {
    setIsProcessing(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/monitoring/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          progress: action === 'ACCEPT' ? 'Accepted' : 'Rejected',
          status: action === 'ACCEPT' ? 'Active' : 'Cancelled'
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to ${action.toLowerCase()} repair request`);
      }

      const updated = await res.json();
      if (onStatusChange) {
        onStatusChange(updated);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Failed to update request.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 overflow-y-auto overscroll-contain">
        <div className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full my-auto shadow-2xl border border-purple-100 flex flex-col max-h-[94vh] sm:max-h-[92vh] overflow-hidden animate-in zoom-in-95 font-['Inter']">
          
          {/* Header */}
          <div className="px-4 py-3 sm:px-6 sm:py-5 border-b border-gray-100 flex items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-purple-50 via-white to-fuchsia-50">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shrink-0">
                <Wrench size={20} className="sm:w-[22px] sm:h-[22px]" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900 m-0">Repair Request Details</h2>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-bold shrink-0 ${
                    isPending
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : isAccepted
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : isRejected
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : 'bg-green-100 text-green-800 border border-green-300'
                  }`}>
                    {request.progress || 'Pending'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-gray-500 m-0 mt-0.5">Submitted by customer for review</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black flex items-center justify-center transition-colors cursor-pointer border-none shrink-0"
              aria-label="Close modal"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-3.5 sm:p-6 overflow-y-auto overscroll-contain flex-1 flex flex-col gap-3.5 sm:gap-5">
            
            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                {actionError}
              </div>
            )}

            {/* Quick Meta Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 bg-purple-50/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-purple-100 text-xs">
              <div className="min-w-0">
                <span className="text-gray-400 font-semibold uppercase text-[10px] block">Branch</span>
                <span className="font-bold text-gray-900 flex items-center gap-1 mt-0.5 truncate">
                  <Building2 size={13} className="text-[#bd00ff] shrink-0" /> <span className="truncate">{branchName}</span>
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-gray-400 font-semibold uppercase text-[10px] block">Submitted Date</span>
                <span className="font-bold text-gray-900 flex items-center gap-1 mt-0.5 text-[11px] sm:text-xs truncate">
                  <Calendar size={13} className="text-[#bd00ff] shrink-0" /> <span className="truncate">{formattedDate}</span>
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-gray-400 font-semibold uppercase text-[10px] block">Brand / Type</span>
                <span className="font-bold text-gray-900 mt-0.5 block truncate">{brand} • {deviceType}</span>
              </div>
              <div className="min-w-0">
                <span className="text-gray-400 font-semibold uppercase text-[10px] block">IMEI / Serial</span>
                <span className="font-bold text-gray-900 mt-0.5 block truncate" title={imei}>{imei}</span>
              </div>
            </div>

            {/* Customer Info Card */}
            <div className="bg-gray-50 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-200/70 flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <User size={14} className="text-[#bd00ff] shrink-0" /> Customer Information
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs mt-1">
                <div className="min-w-0">
                  <span className="text-gray-400 font-medium block">Name</span>
                  <span className="font-bold text-gray-900 text-sm break-words">{customerName}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-gray-400 font-medium block">Email</span>
                  <span className="font-bold text-gray-900 text-sm truncate block" title={customerEmail}>{customerEmail}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-gray-400 font-medium block">Phone</span>
                  <span className="font-bold text-gray-900 text-sm break-words">{customerPhone}</span>
                </div>
              </div>
            </div>

            {/* Device & Issue Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-gray-50 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-200/70 flex flex-col gap-2 min-w-0">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone size={14} className="text-[#bd00ff] shrink-0" /> Device Details
                </span>
                <div className="text-sm min-w-0">
                  <div className="font-bold text-base text-gray-950 break-words break-all">{request.deviceName}</div>
                  <div className="text-xs text-gray-600 mt-1">Brand: <strong className="text-black break-words">{brand}</strong></div>
                  <div className="text-xs text-gray-600 mt-0.5">Type: <strong className="text-black break-words">{deviceType}</strong></div>
                  <div className="text-xs text-gray-600 mt-0.5">IMEI: <strong className="text-black break-words break-all">{imei}</strong></div>
                </div>
              </div>

              <div className="bg-gray-50 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-200/70 flex flex-col gap-2 min-w-0">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-[#bd00ff] shrink-0" /> Device Condition
                </span>
                <div className="text-xs flex flex-col gap-1.5 mt-1">
                  <div>
                    <span className="text-gray-500">Is Currently Working:</span>{' '}
                    <span className={`font-bold px-2 py-0.5 rounded-md inline-block ${
                      isWorking === 'Yes' ? 'bg-green-100 text-green-800' : isWorking === 'Partially' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {isWorking}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Visible Physical Damage:</span>{' '}
                    <span className={`font-bold px-2 py-0.5 rounded-md inline-block ${
                      hasPhysicalDamage === 'Yes' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {hasPhysicalDamage}
                    </span>
                  </div>
                  {hasPhysicalDamage === 'Yes' && physicalDamageDescription && (
                    <div className="mt-1 pt-2 border-t border-gray-200 min-w-0">
                      <span className="text-gray-500 block text-[11px] font-semibold">Damage Description:</span>
                      <p className="text-gray-800 text-xs mt-0.5 m-0 font-medium italic break-words">"{physicalDamageDescription}"</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reported Problem & Description */}
            <div className="bg-purple-50/50 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-purple-200 flex flex-col gap-2.5 sm:gap-3 min-w-0">
              <div className="flex flex-col gap-1.5 min-w-0">
                <span className="text-xs font-bold text-purple-900 uppercase tracking-wider break-words">
                  Reported Problem: {problem}
                </span>
                <p className="text-sm text-gray-800 leading-relaxed bg-white p-3 sm:p-4 rounded-xl border border-purple-100 m-0 break-words break-all">
                  "{problemDescription}"
                </p>
              </div>

              {suggestedRepair && (
                <div className="flex flex-col gap-1 pt-2 border-t border-purple-200/60 min-w-0">
                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                    Suggested Repair
                  </span>
                  <p className="text-sm text-gray-800 leading-relaxed bg-white p-3 sm:p-3.5 rounded-xl border border-purple-100 m-0 break-words">
                    {suggestedRepair}
                  </p>
                </div>
              )}

              {suggestionForRepair && (
                <div className="flex flex-col gap-1 pt-2 border-t border-purple-200/60 min-w-0">
                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                    Suggestion for Repair
                  </span>
                  <p className="text-sm text-gray-800 leading-relaxed bg-white p-3 sm:p-3.5 rounded-xl border border-purple-100 m-0 break-words">
                    {suggestionForRepair}
                  </p>
                </div>
              )}
            </div>

            {/* Uploaded Photos Gallery */}
            <div className="flex flex-col gap-3 min-w-0">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon size={14} className="text-[#bd00ff] shrink-0" /> Uploaded Device Photos ({photosList.length})
              </span>
              
              {/* Physical damage slots if present */}
              {Object.keys(physicalDamagePhotos).length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                    Physical Damage Angle Photos
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {['front', 'back', 'right', 'left', 'top', 'bottom'].map((slot) => {
                      const photoUrl = physicalDamagePhotos[slot];
                      if (!photoUrl) return null;
                      return (
                        <div
                          key={slot}
                          onClick={() => setSelectedImage(photoUrl)}
                          className="group relative aspect-square rounded-xl overflow-hidden border border-amber-300 hover:border-amber-500 bg-gray-100 cursor-pointer shadow-sm transition-all"
                        >
                          <img
                            src={photoUrl}
                            alt={`${slot} angle`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                            View
                          </div>
                          <div className="absolute bottom-0 inset-x-0 bg-amber-900/80 text-white text-[9px] uppercase tracking-wider text-center py-0.5 font-bold truncate px-1">
                            {slot}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Main Issue / All Photos */}
              {photosList.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {Object.keys(physicalDamagePhotos).length > 0 && (
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                      All / Issue Photos
                    </span>
                  )}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 sm:gap-3">
                    {photosList.map((photoUrl, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedImage(photoUrl)}
                        className="group relative aspect-square rounded-xl overflow-hidden border-2 border-purple-100 hover:border-[#bd00ff] bg-gray-100 cursor-pointer shadow-sm transition-all"
                      >
                        <img
                          src={photoUrl}
                          alt={`Device photo ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                          View
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center py-0.5 font-semibold truncate px-1">
                          Photo {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  No photos uploaded with this request.
                </div>
              )}
            </div>

          </div>

          {/* Footer Actions */}
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-100 bg-gray-50 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-200 transition-colors cursor-pointer bg-white text-xs sm:text-sm text-center"
            >
              Close
            </button>

            {isPending && (
              <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-3">
                <button
                  type="button"
                  onClick={() => handleAction('REJECT')}
                  disabled={isProcessing}
                  className="w-full sm:w-auto px-3 sm:px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-colors cursor-pointer border-none flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <XCircle size={15} className="shrink-0" />
                  <span className="truncate">Reject Request</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('ACCEPT')}
                  disabled={isProcessing}
                  className="w-full sm:w-auto px-3 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-[#bd00ff] hover:from-purple-700 hover:to-[#9c00d6] text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer border-none flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle size={15} className="shrink-0" />
                  <span className="truncate">Accept / Approve</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Lightbox / Enlarged Photo View */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overscroll-contain"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center w-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 sm:-top-12 right-0 text-white hover:text-gray-300 text-sm sm:text-base font-bold bg-black/40 hover:bg-black/60 px-3 py-1.5 rounded-full border border-white/20 cursor-pointer flex items-center gap-1"
            >
              ✕ Close
            </button>
            <img
              src={selectedImage}
              alt="Enlarged device preview"
              className="max-w-full max-h-[80vh] sm:max-h-[85vh] object-contain rounded-xl sm:rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}
