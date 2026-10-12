"use client";

import { useState, useEffect } from 'react';
import { Smartphone, CheckCircle2, AlertCircle, Loader2, X, ShieldCheck, ArrowRight, ArrowLeft, Check, HelpCircle } from 'lucide-react';
import { validateImeiFormat, checkLuhnChecksum } from '../../lib/imei';

interface CashierImeiPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: string;
  deviceName: string;
  referenceId?: string | null;
  customerName?: string | null;
  branch?: string | null;
  variations?: string | null;
  quantity?: number;
  initialImei?: string | null;
  unitIndex?: number;
  totalUnits?: number;
  onSaved?: (imei: string) => void;
}

function parseVariantDetails(variationsStr: string | null | undefined): { color: string; storage: string } {
  let color = 'Standard';
  let storage = '—';
  if (!variationsStr) return { color, storage };

  try {
    const parsed = typeof variationsStr === 'string' ? JSON.parse(variationsStr) : variationsStr;
    if (Array.isArray(parsed)) {
      for (const v of parsed) {
        if (typeof v === 'string') {
          if (/\b(gb|tb)\b/i.test(v)) storage = v;
          else color = v;
        } else if (v && typeof v === 'object') {
          const type = String(v.type || '').toLowerCase();
          const name = String(v.name || v.value || '');
          if (type.includes('color')) color = name;
          else if (type.includes('storage')) storage = /\b(gb|tb)\b/i.test(name) ? name : `${name}GB`;
          else if (!color || color === 'Standard') color = name;
        }
      }
    } else if (parsed && typeof parsed === 'object') {
      if (parsed.color) color = String(parsed.color);
      if (parsed.storage) storage = String(parsed.storage);
    }
  } catch (e) {
    const clean = String(variationsStr).trim();
    if (clean) color = clean;
  }

  return { color, storage };
}

interface ImeiCheckConflict {
  type?: string;
  orderRef?: string;
  deviceName?: string;
  customerName?: string;
  branch?: string;
  status?: string;
  reason?: string;
}

interface ImeiCheckResult {
  loading: boolean;
  checkedImei?: string;
  available?: boolean;
  conflict?: ImeiCheckConflict;
  error?: string;
}

export default function CashierImeiPromptModal({
  isOpen,
  onClose,
  purchaseId,
  deviceName,
  referenceId,
  customerName,
  branch,
  variations,
  quantity = 1,
  initialImei,
  onSaved
}: CashierImeiPromptModalProps) {
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [imeis, setImeis] = useState<string[]>(['']);
  const [checkStatuses, setCheckStatuses] = useState<Record<number, ImeiCheckResult>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const totalQty = Math.max(1, quantity || 1);
  const { color, storage } = parseVariantDetails(variations);

  useEffect(() => {
    if (isOpen) {
      setStep('input');
      const initialList = (initialImei || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      
      const filled: string[] = [];
      for (let i = 0; i < totalQty; i++) {
        filled.push(initialList[i] || '');
      }
      setImeis(filled);
      setCheckStatuses({});
      setError(null);
      setIsSuccess(false);
      setIsSubmitting(false);
    }
  }, [isOpen, initialImei, purchaseId, totalQty]);

  // Debounced live IMEI duplicate & availability checker
  useEffect(() => {
    if (!isOpen) return;
    const timers: NodeJS.Timeout[] = [];

    imeis.forEach((val, idx) => {
      if (val.length === 15) {
        if (checkStatuses[idx]?.checkedImei !== val) {
          // Check internal duplicates within current form first
          const firstDuplicateIdx = imeis.findIndex((other, oIdx) => oIdx < idx && other === val);
          if (firstDuplicateIdx !== -1) {
            setCheckStatuses(prev => ({
              ...prev,
              [idx]: {
                loading: false,
                checkedImei: val,
                available: false,
                conflict: {
                  type: 'INTERNAL_DUPLICATE',
                  reason: `Duplicate IMEI entered. Unit ${idx + 1} and Unit ${firstDuplicateIdx + 1} have the same IMEI.`
                }
              }
            }));
            return;
          }

          // Local format & Luhn validation
          const validation = validateImeiFormat(val);
          if (!validation.valid) {
            setCheckStatuses(prev => ({
              ...prev,
              [idx]: {
                loading: false,
                checkedImei: val,
                available: false,
                error: validation.error || 'Invalid 15-digit IMEI checksum.'
              }
            }));
            return;
          }

          setCheckStatuses(prev => ({
            ...prev,
            [idx]: { loading: true, checkedImei: val }
          }));

          const timer = setTimeout(async () => {
            try {
              const res = await fetch(`/api/purchases/check-imei?imei=${encodeURIComponent(val)}&purchaseId=${encodeURIComponent(purchaseId)}`);
              const data = await res.json();
              if (res.ok && data.available) {
                setCheckStatuses(prev => ({
                  ...prev,
                  [idx]: { loading: false, checkedImei: val, available: true }
                }));
              } else {
                setCheckStatuses(prev => ({
                  ...prev,
                  [idx]: {
                    loading: false,
                    checkedImei: val,
                    available: false,
                    conflict: data.conflict,
                    error: data.error
                  }
                }));
              }
            } catch (err) {
              setCheckStatuses(prev => ({
                ...prev,
                [idx]: { loading: false, checkedImei: val, available: false, error: 'Network error checking IMEI.' }
              }));
            }
          }, 250);

          timers.push(timer);
        }
      } else {
        if (checkStatuses[idx]?.checkedImei) {
          setCheckStatuses(prev => {
            const next = { ...prev };
            delete next[idx];
            return next;
          });
        }
      }
    });

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [imeis, isOpen, purchaseId]);

  if (!isOpen) return null;

  const handleImeiChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 15);
    setImeis(prev => {
      const copy = [...prev];
      copy[index] = cleaned;
      return copy;
    });
    setError(null);
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate all IMEIs
    const seen = new Set<string>();
    for (let i = 0; i < totalQty; i++) {
      const current = imeis[i] || '';
      const validation = validateImeiFormat(current);
      if (!validation.valid) {
        setError(totalQty > 1 ? `Unit ${i + 1}: ${validation.error}` : (validation.error || 'Invalid IMEI.'));
        return;
      }
      if (seen.has(validation.cleanImei)) {
        setError(`Duplicate IMEI ${validation.cleanImei} entered. Each unit must have a unique IMEI.`);
        return;
      }
      seen.add(validation.cleanImei);
    }

    // Check for any unresolved conflict or loading state
    const isAnyChecking = Object.values(checkStatuses).some(s => s?.loading);
    if (isAnyChecking) {
      setError('Please wait a moment while the system verifies IMEI availability.');
      return;
    }

    const hasConflict = Object.values(checkStatuses).some(s => s?.available === false);
    if (hasConflict) {
      setError('Cannot proceed: One or more IMEIs are already used or invalid. Please check the alert messages above.');
      return;
    }

    setStep('confirm');
  };

  const handleFinalConfirmPickup = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/purchases/verify-pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseId,
          referenceId,
          action: 'COMPLETE_PICKUP',
          imeis: imeis.map(i => i.trim()),
          variations
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete device pickup and save IMEI');
      }

      setIsSuccess(true);
      setTimeout(() => {
        if (onSaved) onSaved(imeis.join(', '));
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'An error occurred while confirming pickup.');
      setStep('input');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allComplete = imeis.length === totalQty && imeis.every(i => i.length === 15);
  const isAnyChecking = Object.values(checkStatuses).some(s => s?.loading);
  const hasAnyConflict = Object.values(checkStatuses).some(s => s?.available === false);
  const canProceed = allComplete && !isAnyChecking && !hasAnyConflict;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200 max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-5 sm:p-6 text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all border-none cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white shadow-inner shrink-0">
              <Smartphone size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black m-0 leading-tight tracking-wide">
                {step === 'confirm' ? 'Confirm Device Pickup' : 'Record iPhone IMEI'}
              </h3>
              <p className="text-xs text-purple-200 m-0 mt-1">
                {step === 'confirm' 
                  ? 'Verify handover details before permanently linking IMEI'
                  : 'Enter the IMEI of the actual iPhone unit being handed to customer'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto flex flex-col gap-4">

          {/* Success Banner */}
          {isSuccess && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center gap-3 text-emerald-900 animate-in zoom-in-95">
              <CheckCircle2 size={28} className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-black m-0 text-sm">Pickup Completed & IMEI Linked!</p>
                <p className="text-xs text-emerald-700 m-0 mt-0.5">Physical device recorded for customer warranty and sales history.</p>
              </div>
            </div>
          )}

          {/* Inline Error Banner */}
          {error && (
            <div className="p-3.5 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-900 text-xs animate-in fade-in">
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-snug font-bold">{error}</div>
            </div>
          )}

          {/* STEP 1: IMEI INPUT FORM */}
          {step === 'input' && !isSuccess && (
            <form onSubmit={handleProceedToConfirm} className="flex flex-col gap-4">
              
              {/* Product & Customer Summary Card */}
              <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-4 flex flex-col gap-2 text-xs">
                <div className="flex justify-between items-center text-gray-700">
                  <span className="font-semibold text-gray-500">Device:</span>
                  <span className="font-black text-black text-sm">{deviceName}</span>
                </div>
                {referenceId && (
                  <div className="flex justify-between items-center text-gray-700">
                    <span className="font-semibold text-gray-500">Order Ref:</span>
                    <span className="font-mono font-black text-[#bd00ff]">{referenceId}</span>
                  </div>
                )}
                {customerName && (
                  <div className="flex justify-between items-center text-gray-700">
                    <span className="font-semibold text-gray-500">Customer:</span>
                    <span className="font-bold text-gray-900">{customerName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-gray-700 pt-1 border-t border-purple-100">
                  <span className="font-semibold text-gray-500">Selected Unit:</span>
                  <span className="font-bold text-purple-900">
                    {color} • {storage} (Qty: {totalQty})
                  </span>
                </div>
                {branch && (
                  <div className="flex justify-between items-center text-gray-700">
                    <span className="font-semibold text-gray-500">Selected Branch:</span>
                    <span className="font-semibold text-gray-800">{branch} Branch</span>
                  </div>
                )}
              </div>

              {/* IMEI Input Fields */}
              <div className="flex flex-col gap-3">
                {Array.from({ length: totalQty }).map((_, idx) => {
                  const val = imeis[idx] || '';
                  const isUnitComplete = val.length === 15;
                  const status = checkStatuses[idx];
                  const isChecking = Boolean(status?.loading);
                  const isConflict = status?.available === false;
                  const isAvailable = status?.available === true;

                  return (
                    <div 
                      key={idx} 
                      className={`flex flex-col gap-2 rounded-2xl p-3.5 transition-all ${
                        isConflict
                          ? 'bg-rose-50/60 border-2 border-rose-300'
                          : isAvailable
                          ? 'bg-emerald-50/50 border-2 border-emerald-300'
                          : 'bg-gray-50/70 border border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <label htmlFor={`imei-input-${idx}`} className="text-xs font-black text-gray-800 uppercase tracking-wide">
                          {totalQty > 1 ? `Unit ${idx + 1} — 15-Digit IMEI Number` : '15-Digit IMEI Number'} <span className="text-red-500">*</span>
                        </label>
                        <span className={`text-xs font-mono font-extrabold ${
                          isConflict ? 'text-rose-600' : isAvailable ? 'text-emerald-600' : isUnitComplete ? 'text-purple-600' : 'text-gray-400'
                        }`}>
                          {val.length} / 15
                        </span>
                      </div>

                      <div className="relative">
                        <input
                          id={`imei-input-${idx}`}
                          type="text"
                          inputMode="numeric"
                          autoFocus={idx === 0}
                          placeholder="352XXXXXXXXXXXX"
                          value={val}
                          onChange={(e) => handleImeiChange(idx, e.target.value)}
                          maxLength={15}
                          disabled={isSubmitting}
                          className={`w-full h-12 px-4 rounded-xl border-2 font-mono text-base font-bold tracking-widest text-black bg-white transition-all outline-none placeholder:text-gray-300 placeholder:tracking-normal placeholder:font-normal ${
                            isChecking
                              ? 'border-purple-400 ring-4 ring-purple-100'
                              : isConflict
                              ? 'border-rose-500 ring-4 ring-rose-100 bg-rose-50/20'
                              : isAvailable
                              ? 'border-emerald-500 ring-4 ring-emerald-100 bg-emerald-50/10'
                              : 'border-purple-200 focus:border-[#bd00ff] focus:ring-4 focus:ring-purple-100'
                          }`}
                        />
                        
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                          {isChecking ? (
                            <Loader2 size={18} className="animate-spin text-purple-600" />
                          ) : isConflict ? (
                            <AlertCircle size={20} className="text-rose-600" />
                          ) : isAvailable ? (
                            <CheckCircle2 size={20} className="text-emerald-600" />
                          ) : isUnitComplete ? (
                            <ShieldCheck size={20} className="text-purple-500" />
                          ) : null}
                        </div>
                      </div>

                      {/* Real-time Status / Conflict Banner */}
                      {isChecking && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-purple-800 bg-purple-100/70 px-3 py-1.5 rounded-xl border border-purple-200 animate-pulse">
                          <Loader2 size={13} className="animate-spin text-purple-600 shrink-0" />
                          <span>Checking IMEI in system records...</span>
                        </div>
                      )}

                      {isConflict && (
                        <div className="flex flex-col gap-1 text-xs text-rose-900 bg-rose-100/80 p-3 rounded-xl border border-rose-300 animate-in fade-in">
                          <div className="flex items-center gap-1.5 font-black text-rose-700">
                            <AlertCircle size={15} className="shrink-0" />
                            <span>THIS IMEI IS ALREADY USED</span>
                          </div>
                          {status.conflict ? (
                            <p className="m-0 text-[11px] text-rose-900 leading-normal font-semibold">
                              {status.conflict.reason ? (
                                status.conflict.reason
                              ) : (
                                <>
                                  Already permanently assigned to <strong>{status.conflict.deviceName || 'a device'}</strong>
                                  {status.conflict.orderRef && <> under Order <strong>{status.conflict.orderRef}</strong></>}
                                  {status.conflict.customerName && <> (Customer: <strong>{status.conflict.customerName}</strong>)</>}
                                  {status.conflict.branch && <> at <strong>{status.conflict.branch} Branch</strong></>}.
                                </>
                              )}
                            </p>
                          ) : (
                            <p className="m-0 text-[11px] text-rose-900 leading-normal font-semibold">
                              {status.error || 'This IMEI number is invalid or not accepted.'}
                            </p>
                          )}
                          <span className="text-[10px] font-black text-rose-700 uppercase tracking-wide pt-0.5">
                            ⚠️ Please verify the physical device and enter its unique, unused IMEI.
                          </span>
                        </div>
                      )}

                      {isAvailable && (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-300 animate-in fade-in">
                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                          <span>IMEI is available and valid for this unit.</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex items-start gap-2 text-[11px] text-gray-500 bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
                  <HelpCircle size={15} className="text-blue-500 shrink-0 mt-0.5" />
                  <span>
                    Enter the IMEI printed on the actual device, SIM tray, original packaging, or dial <strong>*#06#</strong> on the device.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel / Back
                </button>
                <button
                  type="submit"
                  disabled={!canProceed || isSubmitting}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none"
                >
                  <span>Review & Confirm Pickup</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: FINAL CONFIRMATION SCREEN (Section 11) */}
          {step === 'confirm' && !isSuccess && (
            <div className="flex flex-col gap-4 animate-in fade-in">
              
              <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-2xl flex flex-col gap-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-purple-900 m-0 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-[#bd00ff]" />
                  Pickup Verification Summary
                </h4>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-purple-100">
                  <div>
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Customer:</span>
                    <strong className="text-black">{customerName || 'Customer'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Branch:</span>
                    <strong className="text-black">{branch || 'Tagoloan'} Branch</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Device:</span>
                    <strong className="text-black">{deviceName}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Color / Storage:</span>
                    <strong className="text-purple-950">{color} • {storage}</strong>
                  </div>
                  <div className="col-span-2 bg-white p-2.5 rounded-xl border border-purple-200">
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">
                      {imeis.length > 1 ? 'Recorded Physical IMEIs:' : 'Recorded 15-Digit IMEI:'}
                    </span>
                    <div className="font-mono font-black text-sm text-purple-700 tracking-wider mt-0.5">
                      {imeis.join(' , ')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Handover Confirmation Question */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-950 flex items-center gap-2">
                <HelpCircle size={18} className="text-amber-600 shrink-0" />
                <span>
                  <strong>Question:</strong> Are you sure this is the exact physical device being handed to the customer?
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mt-1 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Edit</span>
                </button>
                <button
                  type="button"
                  onClick={handleFinalConfirmPickup}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Completing Pickup...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Confirm Pickup</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
