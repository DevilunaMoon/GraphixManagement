"use client";

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
    <div className="flex flex-col gap-6">
      <div className="mb-2">
        <h2 className="text-[1.6rem] font-bold text-[#111]">Color Theme Selection</h2>
      </div>

      <div className={`bg-white/95 backdrop-blur-md rounded-2xl border-2 ${styles.borderMain} shadow-sm p-6 md:p-10 w-full mb-6 transition-colors duration-300`}>
        <p className="mb-8 text-[#666] text-[1.05rem]">Select your preferred background theme color for the application.</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 justify-items-center">
          {themeColors.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => setActiveTheme(item.id as any)}>
              <div 
                className={`w-14 h-14 rounded-full border-4 transition-all duration-300 ${activeTheme === item.id ? 'border-indigo-500 scale-110 shadow-lg' : 'border-transparent group-hover:scale-105 group-hover:shadow-md'}`}
                style={{ backgroundColor: item.color }}
              ></div>
              <span className={`text-sm font-medium ${activeTheme === item.id ? `${styles.textActive} font-bold` : 'text-[#111]'}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>


      <div className="mb-2 mt-4">
        <h2 className="text-[1.6rem] font-bold text-[#111]">Background Color Selection</h2>
      </div>

      <div className={`bg-white/95 backdrop-blur-md rounded-2xl border-2 ${styles.borderMain} shadow-sm p-6 md:p-10 w-full mb-6 relative z-0 transition-colors duration-300`}>
        <p className="mb-8 text-[#666] text-[1.05rem]">Select a background color for the application layout.</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 justify-items-center">
          {bgColors.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => setActiveBg(item.id as any)}>
               <div 
                className={`w-14 h-14 rounded-full border-4 transition-all duration-300 ${activeBg === item.id ? 'border-indigo-500 scale-110 shadow-lg' : 'border-transparent group-hover:scale-105 group-hover:shadow-md'} ${item.border ? 'border border-gray-300 border-opacity-100 hover:border-transparent' : ''}`}
                style={{ backgroundColor: item.color }}
              ></div>
              <span className={`text-sm font-medium ${activeBg === item.id ? `${styles.textActive} font-bold` : 'text-[#111]'}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
