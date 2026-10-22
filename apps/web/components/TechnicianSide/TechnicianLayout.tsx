"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Menu, X, LogOut, ChevronLeft, ChevronRight, LayoutDashboard, 
  Wrench, Package, History, Bell, Settings, User, KeyRound 
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { BranchProvider, useBranch } from '../../context/BranchContext';

function TechnicianLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { styles, bgClass } = useTheme();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeRepairsCount, setActiveRepairsCount] = useState(0);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [technician, setTechnician] = useState<any>(null);

  const scrollToAbsoluteTop = () => {
    if (typeof window === 'undefined') return;
    const html = document.documentElement;
    const prevScrollBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    html.scrollTop = 0;
    document.body.scrollTop = 0;

    const scrollables = document.querySelectorAll('main, .overflow-y-auto');
    scrollables.forEach((el) => {
      (el as HTMLElement).scrollTop = 0;
    });

    requestAnimationFrame(() => {
      html.style.scrollBehavior = prevScrollBehavior;
    });
  };

  useEffect(() => {
    scrollToAbsoluteTop();
    const rafId = requestAnimationFrame(scrollToAbsoluteTop);
    const timer = setTimeout(scrollToAbsoluteTop, 120);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, [pathname]);

  useEffect(() => {
    if (isLogoutModalOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isLogoutModalOpen]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          if (data && !data.error) {
            setTechnician(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch technician profile:', err);
      }
    };
    fetchProfile();
  }, [pathname]);

  const fetchActiveCounts = async () => {
    try {
      // 1. Fetch unread notifications
      const notifRes = await fetch('/api/notifications');
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        if (notifData && typeof notifData.unreadCount === 'number') {
          setUnreadCount(notifData.unreadCount);
        } else if (Array.isArray(notifData)) {
          setUnreadCount(notifData.filter((n: any) => !n.isRead).length);
        }
      }

      // 2. Fetch active repairs count
      const repairRes = await fetch('/api/monitoring?limit=100');
      if (repairRes.ok) {
        const repairData = await repairRes.json();
        const list = Array.isArray(repairData) ? repairData : repairData?.requests || [];
        const active = list.filter((r: any) => 
          r.status !== 'Completed' && 
          r.status !== 'Cancelled' && 
          r.progress?.toLowerCase() !== 'rejected'
        ).length;
        setActiveRepairsCount(active);
      }
    } catch (err) {
      console.error('Failed to fetch technician active counts:', err);
    }
  };

  useEffect(() => {
    fetchActiveCounts();
    const interval = setInterval(fetchActiveCounts, 12000);
    return () => clearInterval(interval);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const navItems = [
    { href: '/technician/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { 
      href: '/technician/monitoring', 
      label: 'Gadget Repair', 
      icon: Wrench, 
      badge: activeRepairsCount 
    },
    { href: '/technician/inventory', label: 'Spare Parts & Materials', icon: Package },
    { href: '/technician/history', label: 'Repair History', icon: History },
    { 
      href: '/technician/notifications', 
      label: 'Notifications', 
      icon: Bell, 
      badge: unreadCount 
    },
    { href: '/technician/settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (err) {
      console.error('Failed to logout:', err);
      window.location.href = '/login';
    }
  };

  return (
    <div className={`${bgClass} min-h-screen flex font-['Inter'] transition-colors duration-300`}>
      {/* Mobile Header */}
      <div className={`md:hidden w-full h-[60px] bg-gradient-to-r ${styles.gradient} px-4 flex items-center justify-between fixed top-0 left-0 z-50 shadow-md`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleSidebar} 
            aria-label="Open sidebar"
            className="text-white bg-transparent border-none p-1 flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
          >
            <Menu size={26} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/Images/graphix-logo.jpg" alt="Graphix Logo" className="w-8 h-8 rounded-full object-cover border border-white" />
            <span className="text-white text-base font-bold">Graphix Tech</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
            {technician?.branch || 'Branch'}
          </span>
        </div>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity" 
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside 
        style={{
          background: 'linear-gradient(180deg, #fcfaff 0%, #f4edff 100%)',
          borderRight: '1px solid #e9ddff'
        }}
        className={`fixed top-0 left-0 h-screen flex flex-col z-50 transition-all duration-300 shadow-[4px_0_24px_rgba(139,0,204,0.04)] ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'w-[260px] md:w-[84px]' : 'w-[260px]'}`}
      >
        {/* Desktop Shrink Toggle Button */}
        <button 
          onClick={toggleCollapse}
          className="hidden md:flex absolute -right-3.5 top-[23px] bg-white text-[#7e22ce] rounded-full p-1.5 shadow-[0_2px_10px_rgba(126,34,206,0.15)] border border-[#e4d8fb] hover:scale-110 hover:text-[#9b1fe8] hover:border-[#bd00ff] transition-all z-50 cursor-pointer"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} strokeWidth={2.5} /> : <ChevronLeft size={16} strokeWidth={2.5} />}
        </button>

        {/* Sidebar Header */}
        <div className={`p-4 flex ${isCollapsed ? 'flex-col items-center justify-center' : 'items-center justify-between'} border-b border-[#e9ddff] h-[85px]`}>
          <Link 
            href="/technician/dashboard"
            onClick={() => {
              setIsSidebarOpen(false);
              scrollToAbsoluteTop();
            }}
            className="flex items-center gap-3 cursor-pointer group no-underline text-inherit"
          >
            <div className="p-0.5 rounded-full bg-white shadow-xs border border-[#e4d8fb] group-hover:border-[#bd00ff] transition-all shrink-0">
              <img src="/Images/graphix-logo.jpg" alt="Graphix Logo" className={`rounded-full object-cover transition-all ${isCollapsed ? 'w-[36px] h-[36px]' : 'w-[42px] h-[42px]'}`} />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight leading-none text-[#2d1254] group-hover:text-[#7e22ce] transition-colors">Graphix</span>
                <span className="text-[10px] font-black text-[#8b7aa8] mt-1 tracking-wider uppercase bg-purple-100/60 px-1.5 py-0.5 rounded border border-purple-200/50 w-fit">
                  Technician Side
                </span>
              </div>
            )}
          </Link>
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            aria-label="Close sidebar"
            className="md:hidden text-[#7e22ce] hover:text-[#bd00ff] bg-transparent border-none p-1.5 -mr-1 cursor-pointer flex items-center justify-center active:scale-90 transition-transform"
          >
            <X size={22} />
          </button>
        </div>

        {/* Branch Indicator Pill */}
        {!isCollapsed && (
          <div className="mx-3 mt-3 px-3 py-1.5 rounded-xl bg-purple-50/80 border border-purple-200/60 flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Branch:</span>
            <span className="text-xs font-black text-purple-900">
              📍 {technician?.branch || 'Tagoloan'}
            </span>
          </div>
        )}

        {/* Nav Links */}
        <nav className={`flex flex-col py-4 flex-1 overflow-x-hidden ${isCollapsed ? 'px-2.5 gap-1.5' : 'px-3 gap-1'}`}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setIsSidebarOpen(false);
                  scrollToAbsoluteTop();
                }}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all group no-underline relative ${
                  isActive
                    ? 'bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white shadow-md shadow-purple-500/20'
                    : 'text-gray-700 hover:bg-purple-50/80 hover:text-[#8b00cc]'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon size={18} className={`shrink-0 ${isActive ? 'text-white' : 'text-[#8b00cc] group-hover:scale-110 transition-transform'}`} />
                {!isCollapsed && <span className="truncate flex-1">{item.label}</span>}
                
                {/* Active/Unread Badge */}
                {Boolean(item.badge && item.badge > 0) && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black shrink-0 ${
                    isActive ? 'bg-white text-purple-900' : 'bg-purple-600 text-white'
                  } ${isCollapsed ? 'absolute -top-1 -right-1 text-[9px] px-1' : ''}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User Info & Logout */}
        <div className="p-3 border-t border-[#e9ddff] bg-white/50">
          {!isCollapsed ? (
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-purple-50/50 border border-purple-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center font-bold text-xs shrink-0">
                  {technician?.image ? (
                    <img src={technician.image} alt={technician.name || 'Tech'} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    (technician?.name || 'T').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-900 truncate m-0 leading-tight">
                    {technician?.name || 'Technician'}
                  </p>
                  <p className="text-[10px] font-semibold text-gray-500 truncate m-0 mt-0.5">
                    {technician?.email || 'tech@graphix.com'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(true)}
                title="Log out"
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer shrink-0"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsLogoutModalOpen(true)}
              title="Log out"
              className="w-full py-2 flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border-none bg-transparent cursor-pointer"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Workspace Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
        isCollapsed ? 'md:ml-[84px]' : 'md:ml-[260px]'
      } pt-[60px] md:pt-0`}>
        {children}
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsLogoutModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-purple-100 animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <LogOut size={22} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Confirm Logout</h3>
            <p className="text-xs text-gray-500 mb-5">
              Are you sure you want to end your technician session?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-100 transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors text-xs shadow-md"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TechnicianLayout({ children }: { children: React.ReactNode }) {
  return (
    <BranchProvider>
      <TechnicianLayoutContent>{children}</TechnicianLayoutContent>
    </BranchProvider>
  );
}
