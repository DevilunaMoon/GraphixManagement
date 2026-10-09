"use client";

import Link from 'next/link';
import { ChevronLeft, Palette } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function AdminThemes() {
  const { activeTheme, setActiveTheme, activeBg, setActiveBg, styles } = useTheme();

  const themeColors = [
    { id: 'purple', color: '#8100ff', label: 'Purple' },
    { id: 'ocean', color: '#0ea5e9', label: 'Ocean Blue' },
    { id: 'emerald', color: '#10b981', label: 'Emerald' },
    { id: 'amber', color: '#f59e0b', label: 'Amber' },
    { id: 'ruby', color: '#ef4444', label: 'Ruby' },
    { id: 'indigo', color: '#6366f1', label: 'Indigo' },
    { id: 'pink', color: '#ec4899', label: 'Pink' },
    { id: 'darkgray', color: '#3f3f46', label: 'Dark Gray' },
  ];

  const bgColors = [
    { id: 'bg1', color: '#f0f2f5', label: 'Default Gray' },
    { id: 'bg2', color: '#ffffff', label: 'Pure White', border: true },
    { id: 'bg3', color: '#1a1a2e', label: 'Dark Mode' },
    { id: 'bg4', color: '#f8f0ff', label: 'Light Purple' },
    { id: 'bg5', color: '#f0f8ff', label: 'Light Blue' },
    { id: 'bg6', color: '#eaffea', label: 'Light Green' },
    { id: 'bg7', color: '#fffce0', label: 'Light Yellow' },
    { id: 'bg8', color: '#fff0e6', label: 'Light Orange' },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Header with Responsive Back Button */}
      <div className="flex items-center gap-3 sm:gap-4 mb-1">
        <Link
          href="/admin/settings"
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-700 transition-all shrink-0 no-underline shadow-xs active:scale-95"
          title="Back to Settings"
        >
          <ChevronLeft size={20} className="sm:w-[22px] sm:h-[22px]" />
        </Link>
        <div className="w-10 h-10 sm:w-11 sm:h-11 bg-purple-100 rounded-xl sm:rounded-2xl flex items-center justify-center text-[#bd00ff] shadow-xs shrink-0">
          <Palette size={20} className="sm:w-[22px] sm:h-[22px]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 m-0 leading-tight">Theme Settings</h2>
          <p className="text-gray-500 m-0 text-xs sm:text-sm mt-0.5 truncate sm:whitespace-normal">
            Customize your workspace accent and background colors
          </p>
        </div>
      </div>

      {/* Color Theme Selection Card */}
      <div className={`bg-white/95 backdrop-blur-md rounded-2xl border-2 ${styles.borderMain} shadow-sm p-4 sm:p-6 md:p-8 w-full transition-colors duration-300`}>
        <div className="mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 m-0">Color Theme Selection</h3>
          <p className="text-gray-500 text-xs sm:text-sm mt-1 mb-0">Select your preferred accent theme color for the application.</p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 sm:gap-6 justify-items-center">
          {themeColors.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 cursor-pointer group active:scale-95 transition-transform" onClick={() => setActiveTheme(item.id as any)}>
              <div 
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-4 transition-all duration-300 ${activeTheme === item.id ? 'border-indigo-500 scale-110 shadow-lg' : 'border-transparent group-hover:scale-105 group-hover:shadow-md'}`}
                style={{ backgroundColor: item.color }}
              ></div>
              <span className={`text-xs sm:text-sm font-medium ${activeTheme === item.id ? `${styles.textActive} font-bold` : 'text-gray-800'}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Background Color Selection Card */}
      <div className={`bg-white/95 backdrop-blur-md rounded-2xl border-2 ${styles.borderMain} shadow-sm p-4 sm:p-6 md:p-8 w-full transition-colors duration-300`}>
        <div className="mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 m-0">Background Color Selection</h3>
          <p className="text-gray-500 text-xs sm:text-sm mt-1 mb-0">Select a background color for the application layout.</p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 sm:gap-6 justify-items-center">
          {bgColors.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 cursor-pointer group active:scale-95 transition-transform" onClick={() => setActiveBg(item.id as any)}>
               <div 
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-4 transition-all duration-300 ${activeBg === item.id ? 'border-indigo-500 scale-110 shadow-lg' : 'border-transparent group-hover:scale-105 group-hover:shadow-md'} ${item.border ? 'border border-gray-300 border-opacity-100 hover:border-transparent' : ''}`}
                style={{ backgroundColor: item.color }}
              ></div>
              <span className={`text-xs sm:text-sm font-medium ${activeBg === item.id ? `${styles.textActive} font-bold` : 'text-gray-800'}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
