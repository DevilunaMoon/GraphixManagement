"use client";

import { Check, ChevronLeft, Palette } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../context/ThemeContext';

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

export default function CustomerThemes() {
  const router = useRouter();
  const navigate = router.push;
  const { activeTheme, setActiveTheme, activeBg, setActiveBg, styles } = useTheme();

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-8 font-['Inter'] flex justify-center overflow-y-auto w-full">
      <div className="w-full max-w-7xl flex flex-col gap-6">
        
        <section className="bg-white border border-purple-100/90 rounded-3xl p-6 sm:p-8 md:p-10 flex flex-col gap-8 shadow-sm transition-colors duration-300 w-full">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-purple-100/80 pb-5">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/customer/settings')}
                className="flex items-center justify-center w-10 h-10 rounded-xl border border-purple-100 bg-white hover:border-[#8b00cc] hover:text-[#8b00cc] text-gray-600 cursor-pointer transition-all shrink-0 shadow-sm p-0"
                title="Go Back"
              >
                <ChevronLeft size={22} />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-wide m-0 border-none">
                  Themes
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 font-medium m-0 mt-0.5">
                  Customize the appearance, layout, and colors
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-100 text-[#8b00cc] text-xs font-bold">
              <Palette size={15} />
              <span>Theme Customizer</span>
            </div>
          </div>

          <div className="flex flex-col gap-8 w-full max-w-3xl mx-auto">
            
            {/* Accent Color Section */}
            <div className="bg-white border border-purple-100/90 rounded-2xl p-5 sm:p-7 shadow-xs flex flex-col gap-5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 m-0 border-none">
                  Color Theme Selection
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 font-medium m-0 mt-1">
                  Select your preferred accent color for buttons, badges, and highlights.
                </p>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-4 sm:gap-5 justify-items-center pt-2">
                {COLORS.map(color => {
                  const isSelected = activeTheme === color.id;
                  return (
                    <div 
                      key={color.id} 
                      onClick={() => setActiveTheme(color.id as any)}
                      className="flex flex-col items-center gap-2 cursor-pointer group transition-all duration-200"
                    >
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex justify-center items-center p-0.5 transition-all ${
                        isSelected 
                          ? 'ring-4 ring-purple-100 border-2 border-[#bd00ff] scale-105 shadow-md' 
                          : 'border border-transparent group-hover:scale-105 group-hover:shadow-sm'
                      }`}>
                        <div 
                          className="w-full h-full rounded-full flex justify-center items-center shadow-inner transition-transform" 
                          style={{ backgroundColor: color.hex }}
                        >
                          {isSelected && <Check color="white" size={18} strokeWidth={3} />}
                        </div>
                      </div>
                      <span className={`text-[11px] sm:text-xs font-semibold text-center transition-colors truncate max-w-[65px] ${
                        isSelected ? 'text-[#8b00cc] font-bold' : 'text-gray-600 group-hover:text-gray-900'
                      }`}>
                        {color.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Background Color Section */}
            <div className="bg-white border border-purple-100/90 rounded-2xl p-5 sm:p-7 shadow-xs flex flex-col gap-5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 m-0 border-none">
                  Background Color
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 font-medium m-0 mt-1">
                  Choose a solid background tint for the main application workspace.
                </p>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-4 sm:gap-5 justify-items-center pt-2">
                {BG_COLORS.map(bg => {
                  const isSelected = activeBg === bg.id;
                  return (
                    <div 
                      key={bg.id} 
                      onClick={() => setActiveBg(bg.id as any)}
                      className="flex flex-col items-center gap-2 cursor-pointer group transition-all duration-200"
                    >
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex justify-center items-center p-0.5 transition-all ${
                        isSelected 
                          ? 'ring-4 ring-purple-100 border-2 border-[#bd00ff] scale-105 shadow-md' 
                          : 'border border-transparent group-hover:scale-105 group-hover:shadow-sm'
                      }`}>
                        <div 
                          className="w-full h-full rounded-full flex justify-center items-center shadow-inner transition-transform" 
                          style={{ 
                            backgroundColor: bg.hex,
                            border: bg.border ? '1px solid #e5e7eb' : 'none'
                          }}
                        >
                          {isSelected && (
                            <Check 
                              color={bg.hex === '#111827' ? 'white' : '#8b00cc'} 
                              size={18} 
                              strokeWidth={3} 
                            />
                          )}
                        </div>
                      </div>
                      <span className={`text-[11px] sm:text-xs font-semibold text-center transition-colors truncate max-w-[65px] ${
                        isSelected ? 'text-[#8b00cc] font-bold' : 'text-gray-600 group-hover:text-gray-900'
                      }`}>
                        {bg.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </section>

      </div>
    </main>
  );
}
