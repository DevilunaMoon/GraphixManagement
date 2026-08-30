"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '../../context/ThemeContext';
import { BranchProvider, useBranch } from '../../context/BranchContext';
import {
  List,
  X,
  Grid,
  User,
  Box,
  BarChart2,
  Settings,
  LogOut,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  Wrench,
  ChevronDown,
  ChevronUp,
  FileText,
  Bell,
  Building2,
  ScrollText,
  Crown
} from 'lucide-react';

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);
  const [isGadgetRepairOpen, setIsGadgetRepairOpen] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [branchName, setBranchName] = useState('Tagoloan');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const { selectedBranch, setSelectedBranch, branches, isSuperAdmin } = useBranch();
  const router = useRouter();
  const pathname = usePathname();
  const { styles, bgClass } = useTheme();

  useEffect(() => {
    if (isLogoutModalOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      const scrollables = document.querySelectorAll('main, .overflow-y-auto');
      scrollables.forEach((el) => {
        if (!el.closest('.fixed.inset-0')) {
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
  }, [isLogoutModalOpen]);

  useEffect(() => {
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn) {
          if (data.name) setAdminName(data.name);
          if (data.branch) setBranchName(data.branch);
        }
      })
      .catch(err => console.error("Failed to fetch admin status", err));
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        if (data && typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        } else if (Array.isArray(data)) {
          const unread = data.filter((n: any) => !n.isRead).length;
          setUnreadCount(unread);
        }
      } catch (err) {
        console.error('Failed to fetch admin unread notifications:', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  // Dynamic Navigation Items
  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: Grid },
    { href: '/admin/notifications', label: 'Notifications', icon: Bell },
    { 
      label: 'Order History', 
      icon: ReceiptText,
      subItems: [
        { href: '/admin/transactions', label: 'Completed Purchases' }
      ]
    },
    { href: '/admin/accounts', label: 'User Management', icon: User },
    { href: '/admin/inventory', label: 'Inventory Management', icon: Box },
    { 
      label: 'Gadget Repair', 
      icon: Wrench,
      subItems: [
        { href: '/admin/monitoring', label: 'Devices Monitoring' },
        { href: '/admin/repairs/transactions', label: 'Completed Repairs' }
      ]
    },
    ...(isSuperAdmin ? [
      { href: '/admin/branches', label: 'Branch Management', icon: Building2 },
      { href: '/admin/activity-logs', label: 'Activity Logs', icon: ScrollText }
    ] : []),
    { href: '/admin/banners', label: 'Banners', icon: ImageIcon },
    { href: '/admin/about-editor', label: 'About Page', icon: FileText },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className={`${bgClass} min-h-screen flex overflow-x-hidden font-['Inter'] transition-colors duration-300`}>
      {/* Mobile Header */}
      <div className={`md:hidden w-full h-[60px] bg-gradient-to-r ${styles.gradient} px-4 flex items-center justify-between fixed top-0 left-0 z-50 shadow-md transition-all duration-300`}>
        <div className="flex items-center gap-3">
          <img src="/Images/graphix-logo.jpg" alt="Graphix Logo" className="w-[32px] h-[32px] rounded-full object-cover" />
          <span className="text-white text-base font-bold">Graphix Admin</span>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin ? (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="text-[11px] px-2 py-1 bg-white/20 border border-white/30 rounded-full font-bold uppercase tracking-wider text-white outline-none [&>option]:text-black"
            >
              <option value="all">🌐 All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.name}>📍 {b.name}</option>
              ))}
            </select>
          ) : (
            <span className="text-[11px] px-2 py-0.5 bg-white/20 border border-white/30 rounded-full font-bold uppercase tracking-wider text-white">{branchName}</span>
          )}
          <Link 
            href="/admin/notifications"
            className="relative text-white p-1.5 flex items-center justify-center"
            title="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-md animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <button onClick={toggleSidebar} className="text-white outline-none bg-transparent border-none cursor-pointer">
            <List size={26} />
          </button>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity" 
          onClick={toggleSidebar}
        />
      )}

      {/* Admin Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-screen bg-gradient-to-b ${styles.gradient} text-white flex flex-col z-50 transition-all duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.1)] ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'w-[260px] md:w-[80px]' : 'w-[260px]'}`}
      >
        {/* Desktop Shrink Toggle Button */}
        <button 
          onClick={toggleCollapse}
          className="hidden md:flex absolute -right-3.5 top-[23px] bg-white text-gray-900 rounded-full p-1.5 shadow-md border border-gray-100 hover:scale-110 hover:text-[var(--theme-primary,purple)] transition-transform z-50"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} strokeWidth={3} /> : <ChevronLeft size={18} strokeWidth={3} />}
        </button>

        <div className={`p-6 flex ${isCollapsed ? 'flex-col items-center justify-center' : 'items-center justify-between'} border-b border-white/10 h-[85px]`}>
          <div className="flex items-center gap-3">
            <img src="/Images/graphix-logo.jpg" alt="Graphix Logo" className={`rounded-full border-2 border-white object-cover shadow-sm transition-all ${isCollapsed ? 'w-[35px] h-[35px]' : 'w-[45px] h-[45px]'}`} />
            {!isCollapsed && (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-extrabold tracking-wide leading-none">Graphix</span>
                  {isSuperAdmin && (
                    <span className="px-1.5 py-0.5 bg-amber-400 text-slate-900 text-[10px] font-black rounded uppercase tracking-wider flex items-center gap-0.5">
                      <Crown size={10} /> Super
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium text-white/80 mt-1 truncate max-w-[130px]">{adminName}</span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button onClick={toggleSidebar} className="md:hidden text-white">
              <X size={24} />
            </button>
          )}
        </div>

        <nav className={`flex flex-col py-5 flex-1 overflow-y-auto ${isCollapsed ? 'px-2' : ''}`}>
          {navItems.map((item: any, idx) => {
            const Icon = item.icon;
            if (item.subItems) {
              const isAnySubActive = item.subItems.some((s: any) => pathname === s.href);
              const isOpen = item.label === 'Order History' ? isOrderHistoryOpen : isGadgetRepairOpen;
              const setIsOpen = item.label === 'Order History' ? setIsOrderHistoryOpen : setIsGadgetRepairOpen;
              
              return (
                <div key={idx} className="flex flex-col">
                  <div 
                    onClick={() => {
                      if (isCollapsed) toggleCollapse();
                      setIsOpen(!isOpen);
                    }}
                    title={isCollapsed ? item.label : undefined}
                    className={`cursor-pointer flex items-center text-lg font-medium transition-all hover:bg-white/10 hover:text-white ${isCollapsed ? 'px-0 py-4 justify-center rounded-xl my-1 border-b border-b-transparent' : 'px-6 py-4 gap-4 border-b border-white/5 text-white/80'} ${
                      isAnySubActive && !isOpen
                        ? isCollapsed 
                          ? 'bg-white/20 text-white shadow-sm' 
                          : 'bg-white/15 text-white border-l-4 border-l-white' 
                        : isCollapsed
                          ? 'text-white/70'
                          : 'text-white/70 border-l-4 border-l-transparent'
                    }`}
                  >
                    <Icon size={22} className={isCollapsed ? "mx-auto" : ""} />
                    {!isCollapsed && (
                      <div className="flex items-center justify-between flex-1">
                        <span>{item.label}</span>
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    )}
                  </div>
                  {!isCollapsed && isOpen && (
                    <div className="flex flex-col bg-black/10">
                      {item.subItems.map((sub: any) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setIsSidebarOpen(false)}
                          className={`pl-14 py-3 text-sm font-medium transition-colors ${
                            pathname === sub.href ? 'text-white bg-white/5 border-l-4 border-white' : 'text-white/60 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
                          }`}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href}
                href={item.href} 
                onClick={() => setIsSidebarOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={`relative flex items-center text-lg font-medium transition-all hover:bg-white/10 hover:text-white ${isCollapsed ? 'px-0 py-4 justify-center rounded-xl my-1 border-b border-b-transparent' : 'px-6 py-4 gap-4 border-b border-white/5 text-white/80'} ${
                  isActive 
                    ? isCollapsed 
                      ? 'bg-white/20 text-white shadow-sm' 
                      : 'bg-white/15 text-white border-l-4 border-l-white' 
                    : isCollapsed
                      ? 'text-white/70'
                      : 'text-white/70 border-l-4 border-l-transparent'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon size={22} className={isCollapsed ? "mx-auto" : ""} />
                  {item.label === 'Notifications' && unreadCount > 0 && isCollapsed && (
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-md animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1">
                    <span>{item.label}</span>
                    {item.label === 'Notifications' && unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full shadow-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 min-w-0 transition-all duration-300 min-h-screen flex flex-col pt-[60px] md:pt-0 ${
        isCollapsed ? 'md:ml-[80px]' : 'md:ml-[260px]'
      }`}>
        <header className={`bg-gradient-to-r ${styles.gradient} text-white p-5 md:px-10 flex justify-between items-center shadow-sm transition-all duration-300`}>
          <div>
            <h1 className="text-2xl font-bold mb-1">
              {isSuperAdmin ? "Super Admin Portal" : "Dashboard Overview"}
            </h1>
            <p className="text-sm text-white/90">
              Welcome Back {adminName}. {isSuperAdmin ? "System-wide multi-branch management" : "Here's the daily summary"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isSuperAdmin ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-xl text-xs md:text-sm font-bold text-white border border-white/30 shadow-inner">
                <Building2 size={16} />
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="bg-transparent text-white font-bold outline-none cursor-pointer pr-1 [&>option]:text-black"
                >
                  <option value="all">🌐 All Branches (System-Wide)</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.name}>📍 {b.name} Branch</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-white border border-white/30 shadow-inner">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {branchName} Branch
              </div>
            )}
            <Link
              href="/admin/notifications"
              title="Notifications"
              className="relative text-white hover:scale-110 transition-transform p-2 cursor-pointer bg-white/10 hover:bg-white/20 rounded-full border border-white/20 flex items-center justify-center"
            >
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-md animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <button 
              onClick={() => setIsLogoutModalOpen(true)}
              title="Log Out"
              className="text-white hover:scale-110 transition-transform p-2 cursor-pointer bg-transparent border-none outline-none flex items-center justify-center"
            >
              <LogOut size={22} />
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1">
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
            <p className="text-sm text-gray-500 font-medium mb-6">Are you sure you want to log out of the admin panel?</p>
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
                onClick={async () => {
                  try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                  } catch (e) {}
                  try {
                    const { logoutUser } = await import('../../actions/auth');
                    await logoutUser();
                  } catch (e) {}
                  window.location.href = '/login';
                }}
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <BranchProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </BranchProvider>
  );
}
