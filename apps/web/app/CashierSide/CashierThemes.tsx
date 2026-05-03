"use client";

import { useState } from 'react';
import { Check } from 'lucide-react';
import { useTheme, ThemeColor, BgColor } from '../../context/ThemeContext';

const COLORS = [
  { id: 'purple', name: 'Purple', hex: '#aa00ff' },
  { id: 'ocean', name: 'Ocean Blue', hex: '#0ea5e9' },
  { id: 'emerald', name: 'Emerald', hex: '#10b981' },
  { id: 'amber', name: 'Amber', hex: '#f59e0b' },
  { id: 'ruby', name: 'Ruby', hex: '#ef4444' },
  { id: 'indigo', name: 'Indigo', hex: '#6366f1' },
  { id: 'pink', name: 'Pink', hex: '#ec4899' },
  { id: 'darkgray', name: 'Dark Gray', hex: '#374151' },
];

const BG_COLORS = [
  { id: 'bg1', name: 'Default Gray', hex: '#f9fafb', border: true },
  { id: 'bg2', name: 'Pure White', hex: '#ffffff', border: true },
  { id: 'bg3', name: 'Dark Mode', hex: '#111827' },
  { id: 'bg4', name: 'Light Purple', hex: '#faf5ff' },
  { id: 'bg5', name: 'Light Blue', hex: '#f0f9ff' },
  { id: 'bg6', name: 'Light Green', hex: '#f0fdf4' },
  { id: 'bg7', name: 'Light Yellow', hex: '#fefce8' },
  { id: 'bg8', name: 'Light Orange', hex: '#fff7ed' },
];

export default function CashierThemes() {
  const { activeTheme, setActiveTheme, activeBg, setActiveBg } = useTheme();

  return (
    <main className="flex-1 p-6 md:p-10 font-['Inter'] flex flex-col items-center">
      <div className="w-full max-w-5xl bg-white border border-[#bd00ff] rounded-2xl p-6 md:p-10 flex flex-col gap-10 shadow-sm">
        
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-2xl font-bold text-black border-none">Theme Selection</h2>
        </div>

        <div className="flex flex-col gap-6">
          <h3 className="text-xl font-semibold text-black border-none">Color Theme Selection</h3>
          <div className="border border-gray-200 rounded-xl p-6 bg-gray-50/50">
            <p className="text-gray-600 mb-6">Select your preferred background theme color for the application.</p>
            <div className="flex flex-wrap gap-4 md:gap-8 justify-center items-center">
              {COLORS.map(color => (
                <div 
                  key={color.id} 
                  onClick={() => setActiveTheme(color.id as ThemeColor)}
                  className={`flex flex-col items-center gap-2 cursor-pointer group transition-all duration-200 ${activeTheme === color.id ? 'scale-110' : 'hover:scale-105'}`}
                >
                  <div className={`w-14 h-14 rounded-full flex justify-center items-center p-1 transition-all ${activeTheme === color.id ? 'border-2 border-gray-800' : 'border-2 border-transparent group-hover:border-gray-300'}`}>
                    <div className="w-full h-full rounded-full flex justify-center items-center shadow-inner" style={{ backgroundColor: color.hex }}>
                      {activeTheme === color.id && <Check color="white" size={24} />}
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${activeTheme === color.id ? 'text-black font-bold' : 'text-gray-600'}`}>{color.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        <div className="flex flex-col gap-6">
          <h3 className="text-xl font-semibold text-black border-none">Background Color</h3>
          <div className="border border-gray-200 rounded-xl p-6 bg-gray-50/50">
            <p className="text-gray-600 mb-6">Choose a solid background color for the main content area.</p>
            <div className="flex flex-wrap gap-4 md:gap-8 justify-center items-center">
              {BG_COLORS.map(bg => (
                <div 
                  key={bg.id} 
                  onClick={() => setActiveBg(bg.id as BgColor)}
                  className={`flex flex-col items-center gap-2 cursor-pointer group transition-all duration-200 ${activeBg === bg.id ? 'scale-110' : 'hover:scale-105'}`}
                >
                  <div className={`w-14 h-14 rounded-full flex justify-center items-center p-1 transition-all ${activeBg === bg.id ? 'border-2 border-gray-800' : 'border-2 border-transparent group-hover:border-gray-300'}`}>
                    <div 
                      className="w-full h-full rounded-full flex justify-center items-center shadow-inner" 
                      style={{ 
                        backgroundColor: bg.hex,
                        border: bg.border ? '1px solid #e5e7eb' : 'none'
                      }}
                    >
                      {activeBg === bg.id && <Check color={bg.hex === '#111827' ? 'white' : 'black'} size={24} />}
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${activeBg === bg.id ? 'text-black font-bold' : 'text-gray-600'}`}>{bg.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
