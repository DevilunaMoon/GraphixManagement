"use client";

import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export interface DiscardChangesModalProps {
  isOpen: boolean;
  onKeepEditing: () => void;
  onConfirmDiscard: () => void;
  title?: string;
  description?: string;
}

export default function DiscardChangesModal({
  isOpen,
  onKeepEditing,
  onConfirmDiscard,
  title = 'Discard Unsaved Changes?',
  description = 'Are you sure you want to cancel? If you confirm, all the input fields and details you filled up in this form will be completely cleared and discarded.',
}: DiscardChangesModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onKeepEditing();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onKeepEditing]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onKeepEditing}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 flex flex-col items-center text-center gap-5 border border-rose-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-16 h-16 rounded-full bg-rose-50 border-2 border-rose-200 text-rose-600 flex items-center justify-center shadow-inner">
          <AlertTriangle size={34} className="text-rose-500 animate-pulse" />
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 m-0">{title}</h3>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed m-0">{description}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full pt-1">
          <button
            type="button"
            onClick={onKeepEditing}
            className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold rounded-xl transition-all border border-gray-200 cursor-pointer text-xs sm:text-sm"
          >
            No, Keep Editing
          </button>
          <button
            type="button"
            onClick={onConfirmDiscard}
            className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl transition-all shadow-md border-none cursor-pointer text-xs sm:text-sm"
          >
            Yes, Discard All
          </button>
        </div>
      </div>
    </div>
  );
}

