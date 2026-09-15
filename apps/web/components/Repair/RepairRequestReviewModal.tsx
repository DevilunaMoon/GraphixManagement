"use client";

import React, { useState } from 'react';
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

  if (!isOpen || !request) return null;

  // Parse structured repair request history payload if available
  let parsedDetails: {
    brand?: string;
    deviceType?: string;
    imei?: string;
    problem?: string;
    problemDescription?: string;
    isWorking?: string;
    hasPhysicalDamage?: string;
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
  const isWorking = parsedDetails?.isWorking || 'Unknown';
  const hasPhysicalDamage = parsedDetails?.hasPhysicalDamage || 'Unknown';
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
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <div className="bg-white rounded-3xl max-w-3xl w-full my-auto shadow-2xl border border-purple-100 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 font-['Inter']">
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 via-white to-fuchsia-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                <Wrench size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 m-0">Repair Request Details</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
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
                <p className="text-xs text-gray-500 m-0 mt-0.5">Submitted by customer for review</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black flex items-center justify-center transition-colors cursor-pointer border-none"
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
            
            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                {actionError}
              </div>
            )}

            {/* Quick Meta Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-purple-50/60 p-4 rounded-2xl border border-purple-100 text-xs">
              <div>
                <span className="text-gray-400 font-semibold uppercase text-[10px] block">Branch</span>
                <span className="font-bold text-gray-900 flex items-center gap-1 mt-0.5">
                  <Building2 size={13} className="text-[#bd00ff]" /> {branchName}
                </span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold uppercase text-[10px] block">Submitted Date</span>
                <span className="font-bold text-gray-900 flex items-center gap-1 mt-0.5">
                  <Calendar size={13} className="text-[#bd00ff]" /> {formattedDate}
                </span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold uppercase text-[10px] block">Brand / Type</span>
                <span className="font-bold text-gray-900 mt-0.5 block">{brand} • {deviceType}</span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold uppercase text-[10px] block">IMEI / Serial</span>
                <span className="font-bold text-gray-900 mt-0.5 block truncate">{imei}</span>
              </div>
            </div>

            {/* Customer Info Card */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/70 flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <User size={14} className="text-[#bd00ff]" /> Customer Information
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-1">
                <div>
                  <span className="text-gray-400 font-medium block">Name</span>
                  <span className="font-bold text-gray-900 text-sm">{customerName}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Email</span>
                  <span className="font-bold text-gray-900 text-sm truncate block">{customerEmail}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Phone</span>
                  <span className="font-bold text-gray-900 text-sm">{customerPhone}</span>
                </div>
              </div>
            </div>

            {/* Device & Issue Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/70 flex flex-col gap-2">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone size={14} className="text-[#bd00ff]" /> Device Details
                </span>
                <div className="text-sm">
                  <div className="font-bold text-base text-gray-950">{request.deviceName}</div>
                  <div className="text-xs text-gray-600 mt-1">Brand: <strong className="text-black">{brand}</strong></div>
                  <div className="text-xs text-gray-600 mt-0.5">Type: <strong className="text-black">{deviceType}</strong></div>
                  <div className="text-xs text-gray-600 mt-0.5">IMEI: <strong className="text-black">{imei}</strong></div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/70 flex flex-col gap-2">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-[#bd00ff]" /> Device Condition
                </span>
                <div className="text-xs flex flex-col gap-1.5 mt-1">
                  <div>
                    <span className="text-gray-500">Is Currently Working:</span>{' '}
                    <span className={`font-bold px-2 py-0.5 rounded-md ${
                      isWorking === 'Yes' ? 'bg-green-100 text-green-800' : isWorking === 'Partially' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {isWorking}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Visible Physical Damage:</span>{' '}
                    <span className={`font-bold px-2 py-0.5 rounded-md ${
                      hasPhysicalDamage === 'Yes' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {hasPhysicalDamage}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reported Problem & Description */}
            <div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-200 flex flex-col gap-2">
              <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                Reported Problem: {problem}
              </span>
              <p className="text-sm text-gray-800 leading-relaxed bg-white p-4 rounded-xl border border-purple-100 m-0">
                "{problemDescription}"
              </p>
            </div>

            {/* Uploaded Photos Gallery */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon size={14} className="text-[#bd00ff]" /> Uploaded Device Photos ({photosList.length})
              </span>
              {photosList.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center py-0.5 font-semibold">
                        Photo {idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  No photos uploaded with this request.
                </div>
              )}
            </div>

          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-200 transition-colors cursor-pointer bg-white text-sm"
            >
              Close
            </button>

            {isPending && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleAction('REJECT')}
                  disabled={isProcessing}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-sm transition-colors cursor-pointer border-none flex items-center gap-1.5 disabled:opacity-50"
                >
                  <XCircle size={16} />
                  <span>Reject Request</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('ACCEPT')}
                  disabled={isProcessing}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-[#bd00ff] hover:from-purple-700 hover:to-[#9c00d6] text-white font-bold text-sm shadow-md transition-all cursor-pointer border-none flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle size={16} />
                  <span>Accept / Approve Request</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Lightbox / Enlarged Photo View */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 text-2xl font-bold bg-transparent border-none cursor-pointer"
            >
              ✕ Close
            </button>
            <img
              src={selectedImage}
              alt="Enlarged device preview"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}
