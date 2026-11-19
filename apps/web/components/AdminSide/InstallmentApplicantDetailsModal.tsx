"use client";

import React, { useState } from 'react';
import { 
  X, User, Phone, MapPin, Calendar, Briefcase, Hash, Smartphone, 
  Building2, Eye, Lock, ShieldCheck, AlertCircle, ExternalLink, FileText 
} from 'lucide-react';

interface InstallmentApplicant {
  id: string;
  customerId?: string | null;
  customerName: string;
  customerAge: number;
  customerPhone: string;
  validIdUrl: string;
  validIdBackUrl?: string | null;
  provider: string; // "Skyro" | "Home Credit"
  deviceId?: string | null;
  deviceName: string;
  branch: string;
  status: string; // "Pending" | "Contacted" | "Approved" | "Declined"
  notes?: string | null;
  address?: string | null;
  incomeSource?: string | null;
  idType?: string | null;
  referenceNo?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

interface InstallmentApplicantDetailsModalProps {
  isOpen: boolean;
  applicant: InstallmentApplicant | null;
  onClose: () => void;
  onStatusChange?: (appId: string, newStatus: string) => void;
  isUpdatingStatus?: boolean;
}

export default function InstallmentApplicantDetailsModal({
  isOpen,
  applicant,
  onClose,
  onStatusChange,
  isUpdatingStatus = false,
}: InstallmentApplicantDetailsModalProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>('Document Image');

  if (!isOpen || !applicant) return null;

  // Helper parser for notes string (e.g. "ID: PhilSys • Income: Business • Address: Purok 2 • Ref: 1234")
  const parseNotes = (notesStr?: string | null) => {
    let idType = applicant.idType || '';
    let incomeSource = applicant.incomeSource || '';
    let address = applicant.address || '';
    let referenceNo = applicant.referenceNo || '';

    if (notesStr) {
      const parts = notesStr.split(' • ');
      for (const p of parts) {
        const trimmed = p.trim();
        if (trimmed.startsWith('ID: ') && !idType) {
          idType = trimmed.replace('ID: ', '').trim();
        } else if (trimmed.startsWith('Income: ') && !incomeSource) {
          incomeSource = trimmed.replace('Income: ', '').trim();
        } else if (trimmed.startsWith('Address: ') && !address) {
          address = trimmed.replace('Address: ', '').trim();
        } else if (trimmed.startsWith('Ref: ') && !referenceNo) {
          referenceNo = trimmed.replace('Ref: ', '').trim();
        } else if (!address && !trimmed.includes(': ')) {
          address = trimmed;
        }
      }
    }

    return {
      idType: idType || 'Government Valid ID',
      incomeSource: incomeSource || 'Not Specified',
      address: address || 'No address provided',
      referenceNo: referenceNo || 'None'
    };
  };

  const parsed = parseNotes(applicant.notes);

  const formattedDate = applicant.createdAt 
    ? new Date(applicant.createdAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    : 'Unknown Date';

  const isSkyro = applicant.provider?.toLowerCase().includes('skyro');

  const openLightbox = (url: string, title: string) => {
    setLightboxUrl(url);
    setLightboxTitle(title);
  };

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-purple-100 animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between gap-4 bg-gradient-to-r from-purple-50/70 via-gray-50/40 to-white">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs ${
              isSkyro 
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <FileText size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-gray-950 m-0 tracking-tight">
                  {applicant.customerName}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  isSkyro 
                    ? 'bg-blue-100 text-blue-900 border-blue-200' 
                    : 'bg-rose-100 text-rose-900 border-rose-200'
                }`}>
                  {applicant.provider} Installment
                </span>
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <Lock size={10} />
                  View-Only Mode
                </span>
              </div>
              <p className="text-xs text-gray-500 m-0 mt-0.5 font-medium flex items-center gap-2 flex-wrap">
                <span>📍 {applicant.branch} Branch</span>
                <span>•</span>
                <span>Submitted: {formattedDate}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer border-none bg-transparent"
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-6">
          {/* Top Banner Notice: Customer Submission Read-Only Notice */}
          <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80 flex items-start gap-3">
            <ShieldCheck size={18} className="text-[#8b00cc] shrink-0 mt-0.5" />
            <div className="text-xs text-purple-950 leading-relaxed font-medium">
              <span className="font-bold text-[#690099]">Official Customer Requirement Submission:</span> The fields below are exact values submitted by the applicant through the Customer Portal. All personal information and submitted documents are displayed in <strong>view-only mode</strong> to preserve record integrity.
            </div>
          </div>

          {/* Grid Layout: Left Column (Valid ID Documents) + Right Column (Read-Only Customer Fields) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Valid ID Photos & Device Info (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                    Submitted Valid ID
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-[#690099] border border-purple-200">
                    ✓ {parsed.idType}
                  </span>
                </div>

                {/* Valid ID Front Image Card */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-600">
                    <span>Front of Valid ID</span>
                    <span className="text-[10px] text-purple-700 font-semibold flex items-center gap-1">
                      <Eye size={11} /> Click to enlarge
                    </span>
                  </div>
                  <div 
                    onClick={() => openLightbox(applicant.validIdUrl, `${applicant.customerName}'s Valid ID (Front)`)}
                    className="group relative w-full h-36 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 bg-white cursor-pointer hover:border-[#bd00ff] hover:shadow-md transition-all flex items-center justify-center"
                  >
                    <img 
                      src={applicant.validIdUrl} 
                      alt="Front of Valid ID" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1.5 transition-opacity">
                      <Eye size={16} />
                      <span>View Full Resolution</span>
                    </div>
                    <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[9px] font-black px-2 py-0.5 rounded">
                      FRONT
                    </span>
                  </div>
                </div>

                {/* Valid ID Back Image Card */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-600">
                    <span>Back of Valid ID</span>
                    {applicant.validIdBackUrl && (
                      <span className="text-[10px] text-purple-700 font-semibold flex items-center gap-1">
                        <Eye size={11} /> Click to enlarge
                      </span>
                    )}
                  </div>
                  {applicant.validIdBackUrl ? (
                    <div 
                      onClick={() => openLightbox(applicant.validIdBackUrl!, `${applicant.customerName}'s Valid ID (Back)`)}
                      className="group relative w-full h-36 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 bg-white cursor-pointer hover:border-[#bd00ff] hover:shadow-md transition-all flex items-center justify-center"
                    >
                      <img 
                        src={applicant.validIdBackUrl} 
                        alt="Back of Valid ID" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1.5 transition-opacity">
                        <Eye size={16} />
                        <span>View Full Resolution</span>
                      </div>
                      <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[9px] font-black px-2 py-0.5 rounded">
                        BACK
                      </span>
                    </div>
                  ) : (
                    <div className="w-full h-24 rounded-xl border border-dashed border-gray-200 bg-gray-100/60 flex items-center justify-center text-gray-400 text-xs italic font-medium">
                      No back image submitted
                    </div>
                  )}
                </div>
              </div>

              {/* Applied Device Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/50 to-white border border-purple-100 flex flex-col gap-2">
                <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone size={14} className="text-[#8b00cc]" />
                  Applied Device & Store
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-extrabold text-gray-900">
                    {applicant.deviceName}
                  </span>
                  <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                    <Building2 size={12} className="text-gray-400" />
                    {applicant.branch} Branch
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Read-Only Customer Input Fields (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              
              {/* Field 1: Full Legal Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                  <span>1. Full Legal Name</span>
                  <span className="text-[10px] text-gray-400 font-semibold">Customer Input</span>
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text"
                    readOnly
                    value={applicant.customerName}
                    className="w-full h-11 pl-10 pr-4 bg-gray-100/70 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none cursor-default select-all"
                  />
                </div>
              </div>

              {/* Field 2: Home Address (Based on Valid ID) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                    2. Home Address (Based on Valid ID)
                  </label>
                  <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                    <AlertCircle size={10} />
                    Verified against ID
                  </span>
                </div>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-3 text-gray-400 pointer-events-none" />
                  <textarea 
                    rows={2}
                    readOnly
                    value={parsed.address}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-100/70 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-900 outline-none cursor-default resize-none leading-relaxed select-all"
                  />
                </div>
              </div>

              {/* Fields 3 & 4: Age & Phone Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Field 3: Age */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                    3. Applicant Age
                  </label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text"
                      readOnly
                      value={`${applicant.customerAge} years old`}
                      className="w-full h-11 pl-10 pr-4 bg-gray-100/70 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none cursor-default select-all"
                    />
                  </div>
                </div>

                {/* Field 4: Contact Phone */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                      4. Phone Number
                    </label>
                    <a 
                      href={`tel:${applicant.customerPhone}`}
                      className="text-[10px] font-bold text-purple-700 hover:underline flex items-center gap-0.5"
                    >
                      <span>Call</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text"
                      readOnly
                      value={applicant.customerPhone}
                      className="w-full h-11 pl-10 pr-4 bg-gray-100/70 border border-gray-200 rounded-xl text-sm font-mono font-bold text-purple-950 outline-none cursor-default select-all"
                    />
                  </div>
                </div>
              </div>

              {/* Fields 5 & 6: Source of Income & Reference No. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Field 5: Source of Income */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                    5. Source of Income
                  </label>
                  <div className="relative">
                    <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text"
                      readOnly
                      value={parsed.incomeSource}
                      className="w-full h-11 pl-10 pr-4 bg-gray-100/70 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none cursor-default select-all"
                    />
                  </div>
                </div>

                {/* Field 6: Reference No. */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                    6. Reference / Account No.
                  </label>
                  <div className="relative">
                    <Hash size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text"
                      readOnly
                      value={parsed.referenceNo}
                      className="w-full h-11 pl-10 pr-4 bg-gray-100/70 border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-800 outline-none cursor-default select-all"
                    />
                  </div>
                </div>
              </div>

              {/* Review Status Row */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1">
                <div>
                  <span className="text-xs font-extrabold text-gray-800 block">
                    Application Review Status
                  </span>
                  <span className="text-[11px] text-gray-500 font-medium">
                    Current stage of customer's installment process
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {onStatusChange ? (
                    <select
                      value={applicant.status}
                      disabled={isUpdatingStatus}
                      onChange={(e) => onStatusChange(applicant.id, e.target.value)}
                      className={`text-xs font-black px-3.5 py-2 rounded-xl border outline-none cursor-pointer transition-colors ${
                        applicant.status === 'Pending'
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : applicant.status === 'Contacted'
                            ? 'bg-blue-50 text-blue-900 border-blue-300'
                            : applicant.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : 'bg-rose-50 text-rose-900 border-rose-300'
                      }`}
                    >
                      <option value="Pending">Pending Review</option>
                      <option value="Contacted">Contacted Applicant</option>
                      <option value="Approved">Approved</option>
                      <option value="Declined">Declined</option>
                    </select>
                  ) : (
                    <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${
                      applicant.status === 'Pending'
                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                        : applicant.status === 'Contacted'
                          ? 'bg-blue-50 text-blue-900 border-blue-300'
                          : applicant.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            : 'bg-rose-50 text-rose-900 border-rose-300'
                    }`}>
                      {applicant.status}
                    </span>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
          <a
            href={`tel:${applicant.customerPhone}`}
            className="px-4 py-2.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-[#690099] font-bold text-xs transition-colors flex items-center gap-1.5 no-underline"
          >
            <Phone size={14} />
            <span>Call Applicant ({applicant.customerPhone})</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-extrabold text-xs transition-colors cursor-pointer border-none"
          >
            Close Details
          </button>
        </div>
      </div>

      {/* Lightbox for Document Full Resolution View */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center gap-3">
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors border-none cursor-pointer"
              title="Close image"
            >
              <X size={20} />
            </button>
            <img 
              src={lightboxUrl} 
              alt={lightboxTitle} 
              className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl border border-white/10" 
            />
            <span className="text-white text-xs font-semibold bg-black/60 px-3 py-1 rounded-full border border-white/20">
              {lightboxTitle}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

