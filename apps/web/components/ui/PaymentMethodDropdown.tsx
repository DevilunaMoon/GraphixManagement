"use client";

import React, { useState, useRef, useEffect } from 'react';
import { CreditCard, Banknote, Smartphone, Layers, ChevronDown, Check } from 'lucide-react';

export interface PaymentOption {
  value: string;
  label: string;
  icon: React.ElementType;
  iconColor: string;
  badgeBg: string;
}

const DEFAULT_OPTION: PaymentOption = {
  value: 'all',
  label: 'All Payments',
  icon: CreditCard,
  iconColor: 'text-purple-600',
  badgeBg: 'bg-purple-50'
};

const PAYMENT_OPTIONS: PaymentOption[] = [
  DEFAULT_OPTION,
  {
    value: 'Cash',
    label: 'Cash',
    icon: Banknote,
    iconColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-50'
  },
  {
    value: 'GCash',
    label: 'GCash',
    icon: Smartphone,
    iconColor: 'text-[#005ce6]',
    badgeBg: 'bg-blue-50'
  },
  {
    value: 'Skyro',
    label: 'Skyro',
    icon: CreditCard,
    iconColor: 'text-sky-600',
    badgeBg: 'bg-sky-50'
  },
  {
    value: 'Home Credit',
    label: 'Home Credit',
    icon: CreditCard,
    iconColor: 'text-rose-600',
    badgeBg: 'bg-rose-50'
  },
  {
    value: 'Split',
    label: 'Split',
    icon: Layers,
    iconColor: 'text-[#bd00ff]',
    badgeBg: 'bg-purple-50'
  }
];

interface PaymentMethodDropdownProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function PaymentMethodDropdown({
  value,
  onChange,
  className = ''
}: PaymentMethodDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption: PaymentOption = PAYMENT_OPTIONS.find(opt => opt.value === value) || DEFAULT_OPTION;
  const SelectedIcon = selectedOption.icon;

  // Click-outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative min-w-0 sm:min-w-[170px] w-full sm:w-auto ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full h-[42px] sm:h-[48px] px-3.5 sm:px-4 bg-gray-50 hover:bg-white border-2 rounded-2xl text-xs font-bold text-gray-800 transition-all cursor-pointer shadow-2xs flex items-center justify-between gap-2.5 outline-none select-none ${
          isOpen 
            ? 'border-[#bd00ff] ring-2 ring-purple-100 bg-white' 
            : 'border-gray-100 hover:border-purple-300'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1 rounded-lg ${selectedOption.badgeBg} ${selectedOption.iconColor} shrink-0`}>
            <SelectedIcon size={15} />
          </div>
          <span className="truncate text-xs font-bold text-gray-800">
            {selectedOption.label}
          </span>
        </div>

        <ChevronDown 
          size={15} 
          className={`text-gray-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-purple-600' : ''
          }`} 
        />
      </button>

      {/* Floating Options Menu */}
      {isOpen && (
        <div 
          role="listbox"
          className="absolute top-full right-0 sm:left-0 mt-2 z-50 min-w-[210px] w-full bg-white/95 backdrop-blur-md rounded-2xl border border-purple-100 shadow-xl p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150 origin-top"
        >
          {PAYMENT_OPTIONS.map((opt) => {
            const isSelected = opt.value === value;
            const OptIcon = opt.icon;

            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={`w-full px-2.5 py-2 rounded-xl text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer border-none ${
                  isSelected 
                    ? 'bg-purple-50 text-purple-950 font-extrabold shadow-2xs' 
                    : 'text-gray-700 hover:bg-purple-50/60 hover:text-purple-900 font-semibold bg-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-1.5 rounded-lg ${opt.badgeBg} ${opt.iconColor} shrink-0`}>
                    <OptIcon size={14} />
                  </div>
                  <span className="truncate">{opt.label}</span>
                </div>

                {isSelected && (
                  <Check size={14} className="text-[#bd00ff] shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

