"use client";

import { useState, useEffect } from 'react';
import { Smartphone, CheckCircle2, AlertCircle, Loader2, X, ShieldCheck } from 'lucide-react';
import { validateImeiFormat, checkLuhnChecksum } from '../../lib/imei';

interface CashierImeiPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: string;
  deviceName: string;
  referenceId?: string | null;
  customerName?: string | null;
  initialImei?: string | null;
  unitIndex?: number;
  totalUnits?: number;
  onSaved?: (imei: string) => void;
}

export default function CashierImeiPromptModal({
  isOpen,
  onClose,
  purchaseId,
  deviceName,
  referenceId,
  customerName,
  initialImei,
  unitIndex,
  totalUnits,
  onSaved
}: CashierImeiPromptModalProps) {
  const [imei, setImei] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setImei(initialImei || '');
      setError(null);
      setIsSuccess(false);
      setIsSubmitting(false);
    }
  }, [isOpen, initialImei, purchaseId]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 15 digits
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 15);
    setImei(cleaned);
    setError(null);
  };

  const isComplete = imei.length === 15;
  const isLuhnValid = isComplete && checkLuhnChecksum(imei);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateImeiFormat(imei);
    if (!validation.valid) {
      setError(validation.error || 'Invalid IMEI number.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/purchases/${purchaseId}/imei`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imei: validation.cleanImei })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record IMEI');
      }

      setIsSuccess(true);
      setTimeout(() => {
        if (onSaved) onSaved(validation.cleanImei);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the IMEI.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#BF00FF] to-[#4B0082] p-6 text-white relative">
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
              <h3 className="text-xl font-bold m-0 leading-tight">
                Record iPhone IMEI
              </h3>
              <p className="text-xs text-white/80 m-0 mt-1">
                Link device serial number to completed purchase
              </p>
            </div>
          </div>

          {totalUnits && totalUnits > 1 && unitIndex !== undefined && (
            <div className="mt-3 inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-bold tracking-wider uppercase">
              Unit {unitIndex + 1} of {totalUnits}
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {/* Product & Order Info Summary */}
          <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-4 flex flex-col gap-1 text-xs">
            <div className="flex justify-between items-center text-gray-700">
              <span className="font-semibold text-gray-500">Device:</span>
              <span className="font-bold text-black text-sm">{deviceName}</span>
            </div>
            {referenceId && (
              <div className="flex justify-between items-center text-gray-700">
                <span className="font-semibold text-gray-500">Order Ref:</span>
                <span className="font-mono font-bold text-[#bd00ff]">{referenceId}</span>
              </div>
            )}
            {customerName && (
              <div className="flex justify-between items-center text-gray-700">
                <span className="font-semibold text-gray-500">Customer:</span>
                <span className="font-medium text-gray-800">{customerName}</span>
              </div>
            )}
          </div>

          {/* Success State */}
          {isSuccess && (
            <div className="p-4 bg-green-50 border-2 border-green-200 rounded-2xl flex items-center gap-3 text-green-800 animate-in zoom-in-95">
              <CheckCircle2 size={24} className="text-green-600 shrink-0" />
              <div>
                <p className="font-bold m-0 text-sm">IMEI Successfully Linked!</p>
                <p className="text-xs text-green-700 m-0 mt-0.5">Recorded for warranty and inventory reference.</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-red-800 text-xs">
              <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div className="leading-snug font-medium">{error}</div>
            </div>
          )}

          {/* Input Field */}
          {!isSuccess && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label htmlFor="imei-input" className="text-sm font-bold text-gray-800">
                  15-Digit IMEI Number <span className="text-red-500">*</span>
                </label>
                <span className={`text-xs font-mono font-bold ${isComplete ? 'text-green-600' : 'text-gray-400'}`}>
                  {imei.length} / 15
                </span>
              </div>

              <div className="relative">
                <input
                  id="imei-input"
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  placeholder="e.g. 352156108954123"
                  value={imei}
                  onChange={handleInputChange}
                  maxLength={15}
                  disabled={isSubmitting}
                  className="w-full h-12 px-4 rounded-xl border-2 border-purple-200 focus:border-[#bd00ff] focus:ring-4 focus:ring-purple-100 outline-none font-mono text-lg font-bold tracking-widest text-black bg-white transition-all placeholder:text-gray-300 placeholder:tracking-normal placeholder:font-normal"
                />
                {isComplete && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <ShieldCheck size={20} className={isLuhnValid ? "text-green-500" : "text-purple-500"} />
                  </div>
                )}
              </div>

              <p className="text-[11px] text-gray-400 m-0">
                Found on the iPhone's packaging box, SIM tray, or dial <strong>*#06#</strong> on the device.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-sm transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel / Skip
            </button>
            <button
              type="submit"
              disabled={isSubmitting || imei.length !== 15 || isSuccess}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#BF00FF] to-[#4B0082] hover:opacity-95 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save IMEI</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
