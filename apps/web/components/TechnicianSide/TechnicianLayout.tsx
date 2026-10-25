"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Menu, X, LogOut, ChevronLeft, ChevronRight, Grid, 
  Wrench, Package, History, Bell, Settings, User, KeyRound, Check 
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
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const shouldLock = isLogoutModalOpen || (isSidebarOpen && isMobile);

    if (shouldLock) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      const scrollables = document.querySelectorAll('main, .overflow-y-auto');
      scrollables.forEach((el) => {
        if (!el.closest('.fixed.inset-0') && !el.closest('aside')) {
          (el as HTMLElement).style.overflow = 'hidden';
        }
      });
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      const scrollables = document.querySelectorAll('main, .overflow-y-auto');
      scrollables.forEach((el) => {
        (el as HTMLElement).style.overflow = '';
      });
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      const scrollables = document.querySelectorAll('main, .overflow-y-auto');
      scrollables.forEach((el) => {
        (el as HTMLElement).style.overflow = '';
      });
    };
  }, [isLogoutModalOpen, isSidebarOpen]);

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

    const handleNotificationsUpdated = () => {
      fetchActiveCounts();
    };

    window.addEventListener('notificationsUpdated', handleNotificationsUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notificationsUpdated', handleNotificationsUpdated);
    };
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const navItems = [
    { href: '/technician/dashboard', label: 'Dashboard', icon: Grid },
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
    } catch (e) {}
    try {
      const { logoutUser } = await import('../../actions/auth');
      await logoutUser();
    } catch (e) {}
    window.location.href = '/login';
  };

  const getPageTitle = (path: string) => {
    if (path.startsWith('/technician/monitoring')) return 'Gadget Repair';
    if (path.startsWith('/technician/inventory')) return 'Spare Parts & Materials';
    if (path.startsWith('/technician/history')) return 'Repair History';
    if (path.startsWith('/technician/notifications')) return 'Notifications';
    if (path.startsWith('/technician/settings')) return 'Settings';
    return 'Dashboard Overview';
  };

  const branchDisplay = technician?.branch 
    ? (technician.branch.toLowerCase().includes('branch') ? technician.branch : `${technician.branch} Branch`)
    : 'Tagoloan Branch';

  const renderProfileDropdown = () => (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
      <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-purple-100 py-3 z-50 text-gray-900 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center overflow-hidden shrink-0 text-[#9b1fe8] font-bold text-base shadow-sm">
            {technician?.image ? (
              <img src={technician.image} alt={technician?.name || 'Technician'} className="w-full h-full object-cover" />
            ) : (
              (technician?.name || 'T').charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 truncate">{technician?.name || 'Technician'}</p>
            <span className="inline-block text-[11px] font-bold text-[#9b1fe8] bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/60 mt-0.5">
              Staff Technician
            </span>
            <p className="text-[11px] text-gray-500 font-semibold truncate mt-1">
              {branchDisplay}
            </p>
          </div>
        </div>

        <div className="p-1.5 space-y-0.5">
          <Link
            href="/technician/settings"
            onClick={() => {
              setIsProfileMenuOpen(false);
              scrollToAbsoluteTop();
            }}
            className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-gray-700 hover:text-[#9b1fe8] hover:bg-purple-50 rounded-xl transition-colors"
          >
            <User size={16} className="text-[#9b1fe8]" />
            My Profile
          </Link>
          <Link
            href="/technician/settings"
            onClick={() => {
              setIsProfileMenuOpen(false);
              scrollToAbsoluteTop();
            }}
            className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-gray-700 hover:text-[#9b1fe8] hover:bg-purple-50 rounded-xl transition-colors"
          >
            <KeyRound size={16} className="text-[#9b1fe8]" />
            Change Password
          </Link>
        </div>

        <div className="pt-1 mt-1 border-t border-gray-100 p-1.5">
          <button
            type="button"
            onClick={() => {
              setIsProfileMenuOpen(false);
              setIsLogoutModalOpen(true);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border-none bg-transparent"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className={`${bgClass} min-h-screen flex overflow-x-hidden font-['Inter'] transition-colors duration-300`}>
      {/* Mobile Header */}
      <div className={`md:hidden w-full h-[60px] bg-gradient-to-r ${styles.gradient} px-3 sm:px-4 flex items-center justify-between fixed top-0 left-0 z-50 shadow-md transition-all duration-300`}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button 
            onClick={toggleSidebar} 
            aria-label="Open sidebar"
            className="text-white bg-transparent border-none p-0 flex items-center justify-center cursor-pointer shrink-0 active:scale-90 transition-transform"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <img src="/Images/graphix-logo.jpg" alt="Graphix Logo" className="w-[30px] h-[30px] rounded-full object-cover shrink-0" />
            <span className="text-white text-sm sm:text-base font-bold truncate">
              Graphix Tech
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="text-[10.5px] sm:text-[11px] px-2 py-0.5 bg-white/20 border border-white/30 rounded-full font-bold uppercase tracking-wider text-white">
            {technician?.branch || 'Branch'}
          </span>
          <Link 
            href="/technician/notifications"
            className="relative text-white p-1.5 flex items-center justify-center rounded-full hover:bg-white/10"
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-md">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              title="Technician Profile"
              className={`relative text-white p-1.5 cursor-pointer rounded-full border border-white/20 flex items-center justify-center overflow-hidden active:scale-95 transition-all ${
                isProfileMenuOpen ? 'bg-white/30 ring-2 ring-white/50' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {technician?.image ? (
                <img src={technician.image} alt={technician?.name || 'Technician'} className="w-[18px] h-[18px] rounded-full object-cover" />
              ) : (
                <User size={18} />
              )}
            </button>
            {isProfileMenuOpen && renderProfileDropdown()}
          </div>
        </div>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity touch-none" 
          onClick={toggleSidebar}
          onTouchMove={(e) => e.preventDefault()}
        />
      )}

      {/* Consistent Sidebar */}
      <aside 
        style={{
          background: 'linear-gradient(180deg, #faf5ff 0%, #ede4ff 100%)',
          borderRight: '1px solid #e4d8fb'
        }}
        className={`fixed top-0 left-0 h-screen h-[100dvh] max-h-[100dvh] flex flex-col z-50 transition-all duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.06)] overscroll-contain touch-pan-y ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'w-[260px] md:w-[80px]' : 'w-[260px]'}`}
      >
        {/* Desktop Shrink Toggle Button */}
        <button 
          onClick={toggleCollapse}
          className="hidden md:flex absolute -right-3.5 top-[23px] bg-white text-[#7e22ce] rounded-full p-1.5 shadow-md border border-[#e4d8fb] hover:scale-110 hover:text-[#9b1fe8] transition-all z-50 cursor-pointer"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} strokeWidth={3} className="text-[#7e22ce]" /> : <ChevronLeft size={18} strokeWidth={3} className="text-[#7e22ce]" />}
        </button>

        {/* Sidebar Header */}
        <div className={`p-6 flex ${isCollapsed ? 'flex-col items-center justify-center' : 'items-center justify-between'} border-b border-[#e4d8fb] h-[85px]`}>
          <div className="flex items-center gap-3">
            <img 
              src="/Images/graphix-logo.jpg" 
              alt="Graphix Logo" 
              className={`rounded-full border-2 border-[#e4d8fb] object-cover shadow-sm transition-all ${
                isCollapsed ? 'w-[35px] h-[35px]' : 'w-[45px] h-[45px]'
              }`} 
            />
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-2xl font-extrabold tracking-wide leading-none text-[#3b1d6b]">Graphix</span>
                <span className="text-xs font-medium text-[#8b7aa8] mt-1 truncate max-w-[130px]">
                  {technician?.name || `${technician?.branch || 'Tagoloan'} Branch Tech`}
                </span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button 
              onClick={toggleSidebar} 
              aria-label="Close sidebar"
              className="md:hidden text-[#7e22ce] bg-transparent border-none cursor-pointer"
            >
              <X size={24} />
            </button>
          )}
        </div>

        {/* Nav Links */}
        <nav 
          style={{ WebkitOverflowScrolling: 'touch' }}
          className={`flex flex-col py-5 pb-16 flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y ${isCollapsed ? 'px-2' : ''}`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const badgeCount = item.badge || 0;

            return (
              <Link 
                key={item.href}
                href={item.href} 
                onClick={() => {
                  setIsSidebarOpen(false);
                  scrollToAbsoluteTop();
                }}
                title={isCollapsed ? item.label : undefined}
                className={`relative flex items-center text-lg font-medium transition-all hover:bg-[rgba(155,31,232,0.08)] hover:text-[#7e22ce] ${
                  isCollapsed ? 'px-0 py-4 justify-center rounded-xl my-1 border-b border-b-transparent' : 'px-6 py-4 gap-4 border-b border-[#e4d8fb]/40 text-[#5b4a7a]'
                } ${
                  isActive 
                    ? isCollapsed 
                      ? 'bg-white text-[#7e22ce] shadow-[0_1px_3px_rgba(126,34,206,0.12)]' 
                      : 'bg-white text-[#7e22ce] border-l-4 border-l-[#9b1fe8] shadow-[0_1px_3px_rgba(126,34,206,0.12)] font-semibold' 
                    : isCollapsed
                      ? 'text-[#5b4a7a]'
                      : 'text-[#5b4a7a] border-l-4 border-l-transparent'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon size={22} className={`${isCollapsed ? "mx-auto" : ""} ${isActive ? 'text-[#9b1fe8]' : 'text-[#5b4a7a]'}`} />
                  {badgeCount > 0 && isCollapsed && (
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-md">
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1">
                    <span className={isActive ? 'text-[#7e22ce] font-semibold' : 'text-[#5b4a7a]'}>{item.label}</span>
                    {badgeCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full shadow-sm">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Workspace Area */}
      <main className={`flex-1 min-w-0 transition-all duration-300 min-h-screen flex flex-col pt-[60px] md:pt-0 ${
        isCollapsed ? 'md:ml-[80px]' : 'md:ml-[260px]'
      }`}>
        {/* Desktop Top Header Bar */}
        <header className={`hidden md:flex bg-gradient-to-r ${styles.gradient} text-white p-5 md:px-10 justify-between items-center shadow-sm transition-all duration-300`}>
          <div>
            <h1 className="text-2xl font-bold">
              {getPageTitle(pathname)}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Branch Badge Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-white border border-white/30 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {branchDisplay}
            </div>

            {/* Notifications Bell */}
            <Link
              href="/technician/notifications"
              title="Notifications"
              className="relative text-white hover:scale-110 transition-transform p-2 cursor-pointer bg-white/10 hover:bg-white/20 rounded-full border border-white/20 flex items-center justify-center"
            >
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-md">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Profile Dropdown / Quick Access */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                title="Technician Profile"
                className={`relative text-white hover:scale-110 transition-all p-2 cursor-pointer rounded-full border border-white/20 flex items-center justify-center overflow-hidden ${
                  isProfileMenuOpen ? 'bg-white/30 ring-2 ring-white/50' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {technician?.image ? (
                  <img src={technician.image} alt={technician?.name || 'Technician'} className="w-[22px] h-[22px] rounded-full object-cover" />
                ) : (
                  <User size={22} />
                )}
              </button>
              {isProfileMenuOpen && renderProfileDropdown()}
            </div>

            {/* Logout Button */}
            <button 
              onClick={() => setIsLogoutModalOpen(true)}
              title="Log Out"
              className="text-white hover:scale-110 transition-transform p-2 cursor-pointer bg-transparent border-none outline-none flex items-center justify-center"
            >
              <LogOut size={22} />
            </button>
          </div>
        </header>

        {/* Page Content Container */}
        <div className="flex-1 flex flex-col min-h-0">
          {children}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsLogoutModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-gray-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-purple-50 text-[#bd00ff] rounded-2xl flex items-center justify-center mb-4 shadow-sm animate-pulse">
              <LogOut size={32} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Confirm Log Out</h3>
            <p className="text-sm text-gray-500 font-medium mb-6">Are you sure you want to log out of the technician panel?</p>
            <div className="flex gap-3 w-full">
              <button 
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleLogout}
                className="flex-1 py-3 px-4 rounded-xl bg-[#bd00ff] hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-200 transition-all cursor-pointer"
              >
                Log Out
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
