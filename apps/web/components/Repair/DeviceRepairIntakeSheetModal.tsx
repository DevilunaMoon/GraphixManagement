"use client";

import React, { useEffect, useState } from 'react';
import {
  X,
  Receipt,
  User,
  Phone,
  Mail,
  ShieldAlert,
  Smartphone,
  MapPin,
  Wrench,
  Camera,
  CheckCircle2,
  AlertCircle,
  ZoomIn,
  Calendar,
  Hash,
  FileText,
  Sparkles,
  Check,
} from 'lucide-react';
import MaterialBreakdownEditor, { MaterialItem } from './MaterialBreakdownEditor';

export interface IntakeSheetDevice {
  id: string;
  deviceName: string;
  ownerName?: string | null;
  branch?: string | null;
  progress: string;
  status?: string | null;
  technician?: string | null;
  cause?: string | null;
  materials?: string | null;
  downpayment?: string | null;
  repairHistory?: string | null;
  image?: string | null;
  proofImage?: string | null;
  trackingNumber?: string | null;
  createdAt?: string | null;
}

export interface DeviceRepairIntakeSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: IntakeSheetDevice | null;
  parsedDetails: any;
  cleanNotes?: string;
  extraSections?: React.ReactNode;
}

const REPAIR_STAGES = [
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'diagnostic', label: 'Diagnostic' },
  { key: 'repairing', label: 'Repairing' },
  { key: 'completed', label: 'Completed' },
];

function resolveStageInfo(progress?: string | null, status?: string | null) {
  const p = (progress || '').trim().toLowerCase();
  const s = (status || '').trim().toLowerCase();

  if (p === 'cancelled' || s === 'cancelled') {
    return {
      label: 'Cancelled',
      index: -1,
      isCancelled: true,
      badgeClass: 'bg-rose-500/20 text-white border-rose-300/50',
    };
  }
  if (p === 'completed' || p === '100%' || s === 'completed') {
    return {
      label: 'Completed',
      index: 4,
      isCancelled: false,
      badgeClass: 'bg-emerald-400/25 text-white border-emerald-200/50',
    };
  }
  if (p === 'repairing' || p === 'in progress' || p === '50%' || p === '75%') {
    return {
      label: 'Repairing',
      index: 3,
      isCancelled: false,
      badgeClass: 'bg-amber-400/25 text-white border-amber-200/50',
    };
  }
  if (p === 'diagnostic' || p === '25%') {
    return {
      label: 'Diagnostic',
      index: 2,
      isCancelled: false,
      badgeClass: 'bg-sky-400/25 text-white border-sky-200/50',
    };
  }
  if (p === 'accepted' || s === 'accepted') {
    return {
      label: 'Accepted',
      index: 1,
      isCancelled: false,
      badgeClass: 'bg-white/20 text-white border-white/40',
    };
  }
  return {
    label: 'Pending',
    index: 0,
    isCancelled: false,
    badgeClass: 'bg-white/20 text-white border-white/40',
  };
}

export default function DeviceRepairIntakeSheetModal({
  isOpen,
  onClose,
  device,
  parsedDetails,
  cleanNotes,
  extraSections,
}: DeviceRepairIntakeSheetModalProps) {
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomedPhoto) setZoomedPhoto(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, zoomedPhoto, onClose]);

  if (!isOpen || !device) return null;

  // Parse materials JSON cleanly
  let items: MaterialItem[] = [];
  let parsedMethod: 'Cash' | 'GCash' | 'Split' = 'Cash';
  let parsedCash = '';
  let parsedGcash = '';

  if (device.materials) {
    try {
      const m = JSON.parse(device.materials);
      if (Array.isArray(m)) {
        items = m;
      } else if (m && typeof m === 'object') {
        items = m.items || [];
        if (m.paymentMethod) parsedMethod = m.paymentMethod;
        if (m.cashAmount !== undefined) parsedCash = String(m.cashAmount);
        if (m.gcashAmount !== undefined) parsedGcash = String(m.gcashAmount);
      }
    } catch (e) {
      console.error('Failed to parse repair materials:', e);
    }
  }
  if (!parsedCash && !parsedGcash && device.downpayment) {
    if (parsedMethod === 'GCash') parsedGcash = device.downpayment;
    else parsedCash = device.downpayment;
  }

  // Gather unique device photos
  const photosList: string[] = [];
  if (parsedDetails?.photos && Array.isArray(parsedDetails.photos)) {
    parsedDetails.photos.forEach((p: string) => {
      if (p && !photosList.includes(p)) photosList.push(p);
    });
  }
  if (device.image && !photosList.includes(device.image)) {
    photosList.unshift(device.image);
  }

  const stage = resolveStageInfo(device.progress, device.status);
  const trackingLabel = device.trackingNumber
    ? device.trackingNumber.startsWith('#')
      ? device.trackingNumber
      : `#${device.trackingNumber}`
    : null;

  const workingCondition = parsedDetails?.isWorking || 'Yes';
  const visibleDamage = parsedDetails?.hasPhysicalDamage || 'No';
  const reportedIssue = parsedDetails?.problem
    ? `${parsedDetails.problem}${parsedDetails.problemDescription ? ` — ${parsedDetails.problemDescription}` : ''}`
    : device.cause || 'Diagnostic required';

  const hasCustomerInfo = Boolean(
    parsedDetails?.customerEmail ||
      parsedDetails?.customerPhone ||
      parsedDetails?.emergencyContactPhone ||
      device.ownerName
  );

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overscroll-contain animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-purple-200/60 animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sticky Gradient Header */}
          <div className="shrink-0 bg-gradient-to-r from-[#4a007a] via-[#6f00b8] to-[#9b1fe8] px-5 py-4 sm:px-7 sm:py-5 text-white flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0 shadow-inner">
                <Receipt size={22} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight m-0 text-white">
                    Device Repair Intake Sheet
                  </h2>
                  {trackingLabel && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-white/15 border border-white/30 text-white">
                      <Hash size={10} /> {trackingLabel.replace(/^#/, '')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-purple-100/90 font-medium m-0 mt-0.5">
                  Complete device inspection, customer record &amp; line-item parts breakdown
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border backdrop-blur-sm ${stage.badgeClass}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {stage.label}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close intake sheet"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer border border-white/15"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-7 bg-gradient-to-b from-purple-50/35 via-gray-50/40 to-white flex flex-col gap-5">
            {/* Quick-Glance Summary Tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl p-3.5 border border-purple-100 shadow-2xs flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#7a00cc] flex items-center justify-center shrink-0">
                  <Smartphone size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                    Device Model
                  </span>
                  <span className="text-xs sm:text-sm font-black text-gray-900 block truncate" title={device.deviceName}>
                    {device.deviceName}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-3.5 border border-purple-100 shadow-2xs flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-fuchsia-50 text-[#bd00ff] flex items-center justify-center shrink-0">
                  <User size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                    Customer
                  </span>
                  <span
                    className="text-xs sm:text-sm font-black text-[#6f00b8] block truncate"
                    title={device.ownerName || 'Walk-in Customer'}
                  >
                    {device.ownerName || 'Walk-in Customer'}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-3.5 border border-purple-100 shadow-2xs flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <MapPin size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                    Branch
                  </span>
                  <span className="text-xs sm:text-sm font-black text-gray-900 block truncate">
                    {device.branch || 'Tagoloan'}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-3.5 border border-purple-100 shadow-2xs flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <Wrench size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                    Assigned Tech
                  </span>
                  <span className="text-xs sm:text-sm font-black text-gray-900 block truncate">
                    {device.technician || 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Repair Stage Stepper */}
            <div className="bg-white rounded-2xl p-4 border border-purple-100/90 shadow-2xs">
              {stage.isCancelled ? (
                <div className="flex items-center gap-2.5 text-rose-700 bg-rose-50 px-3.5 py-2.5 rounded-xl border border-rose-200 text-xs font-bold">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>This repair job has been marked as Cancelled.</span>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto pb-0.5">
                  {REPAIR_STAGES.map((st, idx) => {
                    const isDone = idx < stage.index;
                    const isCurrent = idx === stage.index;
                    return (
                      <React.Fragment key={st.key}>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${
                              isDone
                                ? 'bg-emerald-500 text-white'
                                : isCurrent
                                ? 'bg-[#bd00ff] text-white ring-4 ring-purple-100'
                                : 'bg-gray-100 text-gray-400 border border-gray-200'
                            }`}
                          >
                            {isDone ? <Check size={12} strokeWidth={3} /> : idx + 1}
                          </div>
                          <span
                            className={`text-[11px] font-bold whitespace-nowrap ${
                              isCurrent
                                ? 'text-[#6f00b8] font-black'
                                : isDone
                                ? 'text-emerald-700'
                                : 'text-gray-400'
                            }`}
                          >
                            {st.label}
                          </span>
                        </div>
                        {idx < REPAIR_STAGES.length - 1 && (
                          <div
                            className={`flex-1 min-w-[16px] h-0.5 rounded-full ${
                              idx < stage.index ? 'bg-emerald-400' : 'bg-gray-200'
                            }`}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2-Column Customer & Diagnostic Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Customer & Contact Information */}
              {hasCustomerInfo && (
                <div className="bg-white rounded-2xl border border-purple-100/90 shadow-2xs overflow-hidden flex flex-col">
                  <div className="px-4 py-3 bg-purple-50/50 border-b border-purple-100/70 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                      <User size={14} className="text-[#bd00ff]" />
                      Customer Information
                    </span>
                    {parsedDetails?.smsRecipient === 'EMERGENCY_CONTACT' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                        <ShieldAlert size={11} /> SMS: Emergency Contact
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                        <Phone size={10} /> SMS: Primary Phone
                      </span>
                    )}
                  </div>

                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Full Name
                      </span>
                      <span className="font-bold text-gray-900 mt-0.5 block">
                        {device.ownerName || parsedDetails?.customerName || 'Walk-in Customer'}
                      </span>
                    </div>

                    <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <Phone size={10} /> Primary Phone
                      </span>
                      <span className="font-bold text-gray-900 mt-0.5 block font-mono">
                        {parsedDetails?.customerPhone || 'Not provided'}
                      </span>
                    </div>

                    <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <ShieldAlert size={10} /> Emergency Contact
                      </span>
                      <span className="font-bold text-gray-900 mt-0.5 block">
                        {parsedDetails?.emergencyContactPhone
                          ? `${parsedDetails.emergencyContactPhone}${
                              parsedDetails.emergencyContactName ? ` (${parsedDetails.emergencyContactName})` : ''
                            }`
                          : 'None provided'}
                      </span>
                    </div>

                    <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <Mail size={10} /> Email Address
                      </span>
                      <span className="font-bold text-gray-900 mt-0.5 block break-all">
                        {parsedDetails?.customerEmail || 'Not provided'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Device & Diagnostic Details */}
              <div
                className={`bg-white rounded-2xl border border-purple-100/90 shadow-2xs overflow-hidden flex flex-col ${
                  !hasCustomerInfo ? 'lg:col-span-2' : ''
                }`}
              >
                <div className="px-4 py-3 bg-purple-50/50 border-b border-purple-100/70 flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone size={14} className="text-[#bd00ff]" />
                    Device &amp; Diagnostic Details
                  </span>
                </div>

                <div className="p-4 flex flex-col gap-3.5 text-xs">
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-gray-50/80 rounded-xl p-2.5 border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Brand</span>
                      <span className="font-bold text-gray-900 mt-0.5 block truncate">
                        {parsedDetails?.brand || 'Apple'}
                      </span>
                    </div>
                    <div className="bg-gray-50/80 rounded-xl p-2.5 border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Device Type</span>
                      <span className="font-bold text-gray-900 mt-0.5 block truncate">
                        {parsedDetails?.deviceType || 'Smartphone'}
                      </span>
                    </div>
                    <div className="bg-gray-50/80 rounded-xl p-2.5 border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">IMEI / Serial</span>
                      <span className="font-bold text-gray-900 mt-0.5 block font-mono truncate">
                        {parsedDetails?.imei || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200/80">
                      Working Condition:{' '}
                      <strong
                        className={
                          String(workingCondition).toLowerCase() === 'yes'
                            ? 'text-emerald-700'
                            : String(workingCondition).toLowerCase() === 'partially'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }
                      >
                        {workingCondition}
                      </strong>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200/80">
                      Visible Damage:{' '}
                      <strong
                        className={
                          String(visibleDamage).toLowerCase() === 'no' ? 'text-emerald-700' : 'text-rose-700'
                        }
                      >
                        {visibleDamage}
                      </strong>
                    </span>
                  </div>

                  <div className="bg-purple-50/60 border border-purple-200/70 rounded-xl p-3">
                    <span className="text-[10px] font-extrabold text-[#6f00b8] uppercase tracking-wider block mb-0.5">
                      Reported Issue
                    </span>
                    <p className="text-xs font-semibold text-gray-800 m-0 leading-relaxed">{reportedIssue}</p>
                  </div>

                  {(parsedDetails?.suggestedRepair || parsedDetails?.suggestionForRepair || cleanNotes) && (
                    <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
                      {parsedDetails?.suggestedRepair && (
                        <div className="text-xs text-gray-700 flex items-start gap-1.5">
                          <Sparkles size={13} className="text-[#bd00ff] shrink-0 mt-0.5" />
                          <span>
                            <strong className="text-gray-900">Suggested Repair:</strong> {parsedDetails.suggestedRepair}
                          </span>
                        </div>
                      )}
                      {parsedDetails?.suggestionForRepair && (
                        <div className="text-xs text-gray-700 flex items-start gap-1.5">
                          <Sparkles size={13} className="text-[#bd00ff] shrink-0 mt-0.5" />
                          <span>
                            <strong className="text-gray-900">Suggestion for Repair:</strong>{' '}
                            {parsedDetails.suggestionForRepair}
                          </span>
                        </div>
                      )}
                      {cleanNotes && (
                        <div className="text-xs text-gray-700 flex items-start gap-1.5">
                          <FileText size={13} className="text-gray-400 shrink-0 mt-0.5" />
                          <span>
                            <strong className="text-gray-900">Repair History Notes:</strong> {cleanNotes}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Uploaded Device Photos & Completion Proof */}
            {(photosList.length > 0 || device.proofImage) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {photosList.length > 0 && (
                  <div
                    className={`bg-white rounded-2xl p-4 border border-purple-100/90 shadow-2xs flex flex-col gap-3 ${
                      !device.proofImage ? 'md:col-span-2' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Camera size={14} className="text-[#bd00ff]" />
                        Uploaded Device Photos ({photosList.length})
                      </span>
                      <span className="text-[11px] text-gray-400 font-medium">Click photo to zoom</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {photosList.map((photo, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setZoomedPhoto(photo)}
                          className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-purple-200/80 overflow-hidden bg-gray-50 shadow-xs hover:border-[#bd00ff] transition-all cursor-pointer relative group p-0"
                          title="Click to view full image"
                        >
                          <img src={photo} alt={`Device photo ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <ZoomIn size={20} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {device.proofImage && (
                  <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200 shadow-2xs flex flex-col gap-3">
                    <span className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      Completion Proof Photo
                    </span>
                    <div>
                      <button
                        type="button"
                        onClick={() => setZoomedPhoto(device.proofImage!)}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-emerald-300 overflow-hidden bg-white shadow-xs hover:border-emerald-500 transition-all cursor-pointer relative group p-0"
                        title="Click to zoom completion proof"
                      >
                        <img src={device.proofImage} alt="Completion Proof" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <ZoomIn size={20} />
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Read-Only Material & Cost Breakdown */}
            <div className="bg-white rounded-2xl p-4 border border-purple-100/90 shadow-2xs">
              <MaterialBreakdownEditor
                readOnly
                items={items}
                paymentMethod={parsedMethod}
                cashAmount={parsedCash}
                gcashAmount={parsedGcash}
                downpayment={device.downpayment || '0'}
                deviceName={device.deviceName}
                customerName={device.ownerName || 'Walk-in Customer'}
                branch={device.branch || undefined}
              />
            </div>

            {/* Optional Extra Sections (e.g., Technician SMS Notification Log) */}
            {extraSections}
          </div>

          {/* Sticky Footer */}
          <div className="shrink-0 px-5 py-3.5 sm:px-7 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
            <div className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5 truncate">
              <Calendar size={13} className="text-gray-400 shrink-0" />
              <span>
                {device.createdAt
                  ? `Logged ${new Date(device.createdAt).toLocaleString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}`
                  : `${device.branch || 'Tagoloan'} Branch Intake Record`}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-[#6f00b8] to-[#9b1fe8] hover:opacity-95 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer border-none shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Built-in Fullscreen Photo Lightbox */}
      {zoomedPhoto && (
        <div
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setZoomedPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setZoomedPhoto(null)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 cursor-pointer"
            aria-label="Close image preview"
          >
            <X size={22} />
          </button>
          <img
            src={zoomedPhoto}
            alt="Full size preview"
            className="max-w-full max-h-[88vh] object-contain rounded-2xl shadow-2xl border border-white/15"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

