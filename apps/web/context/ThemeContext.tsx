"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeColor = 'purple' | 'ocean' | 'emerald' | 'amber' | 'ruby' | 'indigo' | 'pink' | 'darkgray';
export type BgColor = 'bg1' | 'bg2' | 'bg3' | 'bg4' | 'bg5' | 'bg6' | 'bg7' | 'bg8';

interface ThemeStyles {
  gradient: string;
  border: string;
  borderMain: string;
  hoverText: string;
  textGradient: string;
  primaryLight: string;
  textActive: string;
}

const themeStyleMap: Record<ThemeColor, ThemeStyles> = {
  purple: { gradient: 'from-[#8b00cc] via-[#a200ea] to-[#8b00cc]', border: 'border-[#bd00ff]', borderMain: 'border-[#5c0099]', hoverText: 'hover:text-[#bd00ff]', textGradient: 'from-gray-900 to-[#bd00ff]', primaryLight: 'hover:bg-purple-50', textActive: 'text-[#bd00ff]' },
  ocean: { gradient: 'from-sky-600 via-sky-400 to-sky-600', border: 'border-sky-500', borderMain: 'border-sky-700', hoverText: 'hover:text-sky-500', textGradient: 'from-gray-900 to-sky-500', primaryLight: 'hover:bg-sky-50', textActive: 'text-sky-500' },
  emerald: { gradient: 'from-emerald-600 via-emerald-400 to-emerald-600', border: 'border-emerald-500', borderMain: 'border-emerald-700', hoverText: 'hover:text-emerald-500', textGradient: 'from-gray-900 to-emerald-500', primaryLight: 'hover:bg-emerald-50', textActive: 'text-emerald-500' },
  amber: { gradient: 'from-amber-600 via-amber-400 to-amber-600', border: 'border-amber-500', borderMain: 'border-amber-700', hoverText: 'hover:text-amber-500', textGradient: 'from-gray-900 to-amber-500', primaryLight: 'hover:bg-amber-50', textActive: 'text-amber-500' },
  ruby: { gradient: 'from-rose-600 via-rose-400 to-rose-600', border: 'border-rose-500', borderMain: 'border-rose-700', hoverText: 'hover:text-rose-500', textGradient: 'from-gray-900 to-rose-500', primaryLight: 'hover:bg-rose-50', textActive: 'text-rose-500' },
  indigo: { gradient: 'from-indigo-600 via-indigo-400 to-indigo-600', border: 'border-indigo-500', borderMain: 'border-indigo-700', hoverText: 'hover:text-indigo-500', textGradient: 'from-gray-900 to-indigo-500', primaryLight: 'hover:bg-indigo-50', textActive: 'text-indigo-500' },
  pink: { gradient: 'from-pink-600 via-pink-400 to-pink-600', border: 'border-pink-500', borderMain: 'border-pink-700', hoverText: 'hover:text-pink-500', textGradient: 'from-gray-900 to-pink-500', primaryLight: 'hover:bg-pink-50', textActive: 'text-pink-500' },
  darkgray: { gradient: 'from-gray-800 via-gray-600 to-gray-800', border: 'border-gray-500', borderMain: 'border-gray-800', hoverText: 'hover:text-gray-700', textGradient: 'from-gray-900 to-gray-700', primaryLight: 'hover:bg-gray-100', textActive: 'text-gray-700' },
};

const bgStyleMap: Record<BgColor, string> = {
  bg1: 'bg-[#f4f5f7]', // keep default grey
  bg2: 'bg-[#ffffff]',
  bg3: 'bg-[#111827]',
  bg4: 'bg-[#faf5ff]',
  bg5: 'bg-[#f0f9ff]',
  bg6: 'bg-[#f0fdf4]',
  bg7: 'bg-[#fefce8]',
  bg8: 'bg-[#fff7ed]',
};

interface ThemeContextType {
  activeTheme: ThemeColor;
  setActiveTheme: (theme: ThemeColor) => void;
  activeBg: BgColor;
  setActiveBg: (bg: BgColor) => void;
  styles: ThemeStyles;
  bgClass: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [activeTheme, setActiveTheme] = useState<ThemeColor>('purple');
  const [activeBg, setActiveBg] = useState<BgColor>('bg1');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem('customer_theme') as ThemeColor;
    const storedBg = localStorage.getItem('customer_bg') as BgColor;
    if (storedTheme && themeStyleMap[storedTheme]) setActiveTheme(storedTheme);
    if (storedBg && bgStyleMap[storedBg]) setActiveBg(storedBg);
  }, []);

  const handleSetTheme = (theme: ThemeColor) => {
    setActiveTheme(theme);
    localStorage.setItem('customer_theme', theme);
  };

  const handleSetBg = (bg: BgColor) => {
    setActiveBg(bg);
    localStorage.setItem('customer_bg', bg);
  };

  // Prevent flash of incorrect theme, though for SSR it's unavoidable without a complex script injection.
  // Rendering default to prevent hydration errors.
  const themeStyles = themeStyleMap[activeTheme] || themeStyleMap.purple;
  let currentBgClass = bgStyleMap[activeBg] || bgStyleMap.bg1;
  const isDarkMode = currentBgClass.includes('#111827');

  return (
    <ThemeContext.Provider value={{
      activeTheme,
      setActiveTheme: handleSetTheme,
      activeBg,
      setActiveBg: handleSetBg,
      styles: themeStyles,
      bgClass: currentBgClass + (isDarkMode ? ' text-white' : ' text-black'),
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
