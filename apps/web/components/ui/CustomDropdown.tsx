"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ElementType;
  iconColor?: string;
  badgeBg?: string;
  dotColor?: string; // e.g. 'bg-emerald-500' for active status
  customContent?: React.ReactNode;
}

export interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  prefix?: string;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  variant?: 'rounded' | 'pill'; // 'rounded' = rounded-2xl, 'pill' = rounded-full
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'right';
  footerAction?: {
    label: string;
    icon?: React.ElementType;
    onClick: () => void;
  };
}

export default function CustomDropdown({
  value,
  onChange,
  options,
  prefix,
  placeholder = 'Select option',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  variant = 'rounded',
  size = 'md',
  align = 'left',
  footerAction
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fallbackOption: DropdownOption = options[0] || { value: '', label: placeholder };
  const selectedOption: DropdownOption = options.find(opt => opt.value === value) || fallbackOption;
  const SelectedIcon = selectedOption.icon;

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

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const roundedClasses = variant === 'pill' ? 'rounded-full' : 'rounded-2xl';
  
  const sizeClasses = {
    sm: 'h-[36px] px-3 text-xs',
    md: 'h-[42px] sm:h-[48px] px-3.5 sm:px-4 text-xs',
    lg: 'h-[48px] sm:h-[52px] px-4 sm:px-5 text-sm'
  }[size];

  return (
    <div ref={containerRef} className={`relative min-w-0 w-full sm:w-auto ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full ${sizeClasses} ${roundedClasses} bg-gray-50/90 hover:bg-white border-2 text-gray-800 transition-all cursor-pointer shadow-2xs flex items-center justify-between gap-2 outline-none select-none ${
          isOpen
            ? 'border-[#bd00ff] ring-2 ring-purple-100 bg-white'
            : 'border-gray-100 hover:border-purple-300'
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {SelectedIcon && (
            <div className={`p-1 rounded-lg ${selectedOption.badgeBg || 'bg-purple-50'} ${selectedOption.iconColor || 'text-purple-600'} shrink-0`}>
              <SelectedIcon size={14} />
            </div>
          )}

          {selectedOption.dotColor && (
            <span className={`w-2 h-2 rounded-full ${selectedOption.dotColor} shrink-0`} />
          )}

          <div className="flex items-center gap-1 min-w-0 text-left">
            {prefix && (
              <span className="text-gray-500 font-semibold truncate">
                {prefix}
              </span>
            )}
            <span className="font-bold text-gray-900 truncate">
              {selectedOption.label}
            </span>
          </div>
        </div>

        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-purple-600' : ''
          }`}
        />
      </button>

      {/* Floating Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute top-full mt-2 z-50 min-w-[200px] w-full max-w-xs bg-white/95 backdrop-blur-md rounded-2xl border border-purple-100 shadow-xl p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150 origin-top ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${menuClassName}`}
        >
          <div className="max-h-60 overflow-y-auto pr-0.5 flex flex-col gap-0.5 scrollbar-thin scrollbar-thumb-purple-200">
            {options.map((opt) => {
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
                  <div className="flex items-center gap-2 min-w-0">
                    {OptIcon && (
                      <div className={`p-1.5 rounded-lg ${opt.badgeBg || 'bg-purple-50'} ${opt.iconColor || 'text-purple-600'} shrink-0`}>
                        <OptIcon size={13} />
                      </div>
                    )}

                    {opt.dotColor && (
                      <span className={`w-2 h-2 rounded-full ${opt.dotColor} shrink-0`} />
                    )}

                    <span className="truncate">{opt.label}</span>
                  </div>

                  {isSelected && (
                    <Check size={14} className="text-[#bd00ff] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {footerAction && (
            <div className="border-t border-purple-100 mt-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  footerAction.onClick();
                }}
                className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-[#5c0099] hover:bg-purple-50 flex items-center gap-1.5 transition-colors cursor-pointer border-none bg-transparent"
              >
                {footerAction.icon && <footerAction.icon size={14} />}
                <span>{footerAction.label}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

