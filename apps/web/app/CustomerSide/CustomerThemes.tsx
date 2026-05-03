"use client";

import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
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
    <main className="flex-1 p-3 sm:p-6 md:p-10 font-['Inter'] flex justify-center overflow-y-auto">
      <div className={`w-full max-w-4xl bg-white border-2 ${styles.borderMain} rounded-2xl p-4 sm:p-6 md:p-10 flex flex-col gap-6 sm:gap-10 shadow-sm relative transition-colors duration-300`}>
        
        <button 
          onClick={() => navigate('/customer/settings')}
          className={`absolute top-4 left-4 sm:top-6 sm:left-6 md:top-10 md:left-10 flex items-center gap-2 text-gray-500 ${styles.hoverText} transition-colors border-none bg-transparent cursor-pointer font-semibold`}
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        <div className="border-b border-gray-200 pb-4 text-center mt-8 sm:mt-10 md:mt-2">
          <h2 className={`text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${styles.textGradient} m-0 border-none transition-all duration-300`}>Themes</h2>
          <p className="text-gray-500 m-0 mt-2 font-medium">Customize the appearance, layout, and colors.</p>
        </div>

        <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-black border-none">Color Theme Selection</h3>
          <div className="border border-gray-200 rounded-xl p-4 sm:p-6 bg-gray-50/50">
            <p className="text-gray-600 mb-4 sm:mb-6 font-medium text-sm sm:text-base">Select your preferred accent color for the application.</p>
            <div className="flex flex-wrap gap-3 sm:gap-4 md:gap-8 justify-center items-center">
              {COLORS.map(color => (
                <div 
                  key={color.id} 
                  onClick={() => setActiveTheme(color.id as any)}
                  className={`flex flex-col items-center gap-2 cursor-pointer group transition-all duration-200 ${activeTheme === color.id ? 'scale-110' : 'hover:scale-105'}`}
                >
                  <div className={`w-14 h-14 rounded-full flex justify-center items-center p-1 transition-all ${activeTheme === color.id ? `border-2 ${styles.borderMain}` : 'border-2 border-transparent group-hover:border-gray-300'}`}>
                    <div className="w-full h-full rounded-full flex justify-center items-center shadow-inner" style={{ backgroundColor: color.hex }}>
                      {activeTheme === color.id && <Check color="white" size={24} />}
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${activeTheme === color.id ? `${styles.textActive} font-bold` : 'text-gray-600'}`}>{color.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-black border-none">Background Color</h3>
          <div className="border border-gray-200 rounded-xl p-4 sm:p-6 bg-gray-50/50">
            <p className="text-gray-600 mb-4 sm:mb-6 font-medium text-sm sm:text-base">Choose a solid background color for the main content area.</p>
            <div className="flex flex-wrap gap-3 sm:gap-4 md:gap-8 justify-center items-center">
              {BG_COLORS.map(bg => (
                <div 
                  key={bg.id} 
                  onClick={() => setActiveBg(bg.id as any)}
                  className={`flex flex-col items-center gap-2 cursor-pointer group transition-all duration-200 ${activeBg === bg.id ? 'scale-110' : 'hover:scale-105'}`}
                >
                  <div className={`w-14 h-14 rounded-full flex justify-center items-center p-1 transition-all ${activeBg === bg.id ? `border-2 ${styles.borderMain}` : 'border-2 border-transparent group-hover:border-gray-300'}`}>
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
                  <span className={`text-sm font-medium ${activeBg === bg.id ? `${styles.textActive} font-bold` : 'text-gray-600'}`}>{bg.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
