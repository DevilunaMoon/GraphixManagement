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
  Crown,
  KeyRound
} from 'lucide-react';

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);
  const [isGadgetRepairOpen, setIsGadgetRepairOpen] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [branchName, setBranchName] = useState('Tagoloan');
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
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
          if (data.image) setAdminAvatar(data.image);
        }
      })
      .catch(err => console.error("Failed to fetch admin status", err));
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications?branch=${encodeURIComponent(selectedBranch || 'all')}`);
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
  }, [selectedBranch]);

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
    { href: '/admin/inventory', label: 'Product Inventory', icon: Box },
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
              className="text-[11px] px-2 py-1 bg-white/20 border border-white/30 rounded-full font-bold uppercase tracking-wider text-white outline-none [&>option]:text-slate-900"
            >
              <option value="all">🏢 All Branches</option>
              <option value="Tagoloan">Tagoloan</option>
              <option value="Villanueva">Villanueva</option>
              <option value="Jasaan">Jasaan</option>
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
        style={{
          background: 'linear-gradient(180deg, #faf5ff 0%, #ede4ff 100%)',
          borderRight: '1px solid #e4d8fb'
        }}
        className={`fixed top-0 left-0 h-screen flex flex-col z-50 transition-all duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.06)] ${
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

        <div className={`p-6 flex ${isCollapsed ? 'flex-col items-center justify-center' : 'items-center justify-between'} border-b border-[#e4d8fb] h-[85px]`}>
          <div className="flex items-center gap-3">
            <img src="/Images/graphix-logo.jpg" alt="Graphix Logo" className={`rounded-full border-2 border-[#e4d8fb] object-cover shadow-sm transition-all ${isCollapsed ? 'w-[35px] h-[35px]' : 'w-[45px] h-[45px]'}`} />
            {!isCollapsed && (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-extrabold tracking-wide leading-none text-[#3b1d6b]">Graphix</span>
                  {isSuperAdmin && (
                    <span className="px-1.5 py-0.5 bg-amber-400 text-slate-900 text-[10px] font-black rounded uppercase tracking-wider flex items-center gap-0.5">
                      <Crown size={10} /> Super
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium text-[#8b7aa8] mt-1 truncate max-w-[130px]">{adminName}</span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button onClick={toggleSidebar} className="md:hidden text-[#7e22ce] bg-transparent border-none">
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
                    className={`cursor-pointer flex items-center text-lg font-medium transition-all hover:bg-[rgba(155,31,232,0.08)] hover:text-[#7e22ce] ${isCollapsed ? 'px-0 py-4 justify-center rounded-xl my-1 border-b border-b-transparent' : 'px-6 py-4 gap-4 border-b border-[#e4d8fb]/40 text-[#5b4a7a]'} ${
                      isAnySubActive && !isOpen
                        ? isCollapsed 
                          ? 'bg-white text-[#7e22ce] shadow-[0_1px_3px_rgba(126,34,206,0.12)]' 
                          : 'bg-white text-[#7e22ce] border-l-4 border-l-[#9b1fe8] shadow-[0_1px_3px_rgba(126,34,206,0.12)]' 
                        : isCollapsed
                          ? 'text-[#5b4a7a]'
                          : 'text-[#5b4a7a] border-l-4 border-l-transparent'
                    }`}
                  >
                    <Icon size={22} className={`${isCollapsed ? "mx-auto" : ""} ${isAnySubActive && !isOpen ? 'text-[#9b1fe8]' : 'text-[#5b4a7a]'}`} />
                    {!isCollapsed && (
                      <div className="flex items-center justify-between flex-1">
                        <span className={isAnySubActive && !isOpen ? 'text-[#7e22ce] font-semibold' : 'text-[#5b4a7a]'}>{item.label}</span>
                        {isOpen ? <ChevronUp size={18} className="text-[#8b7aa8]" /> : <ChevronDown size={18} className="text-[#8b7aa8]" />}
                      </div>
                    )}
                  </div>
                  {!isCollapsed && isOpen && (
                    <div className="flex flex-col bg-[#ede4ff]/50">
                      {item.subItems.map((sub: any) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setIsSidebarOpen(false)}
                          className={`pl-14 py-3 text-sm font-medium transition-colors ${
                            pathname === sub.href 
                              ? 'text-[#7e22ce] bg-white border-l-4 border-[#9b1fe8] font-bold shadow-[0_1px_3px_rgba(126,34,206,0.12)]' 
                              : 'text-[#5b4a7a] hover:text-[#7e22ce] hover:bg-[rgba(155,31,232,0.08)] border-l-4 border-transparent'
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
                className={`relative flex items-center text-lg font-medium transition-all hover:bg-[rgba(155,31,232,0.08)] hover:text-[#7e22ce] ${isCollapsed ? 'px-0 py-4 justify-center rounded-xl my-1 border-b border-b-transparent' : 'px-6 py-4 gap-4 border-b border-[#e4d8fb]/40 text-[#5b4a7a]'} ${
                  isActive 
                    ? isCollapsed 
                      ? 'bg-white text-[#7e22ce] shadow-[0_1px_3px_rgba(126,34,206,0.12)]' 
                      : 'bg-white text-[#7e22ce] border-l-4 border-l-[#9b1fe8] shadow-[0_1px_3px_rgba(126,34,206,0.12)]' 
                    : isCollapsed
                      ? 'text-[#5b4a7a]'
                      : 'text-[#5b4a7a] border-l-4 border-l-transparent'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon size={22} className={`${isCollapsed ? "mx-auto" : ""} ${isActive ? 'text-[#9b1fe8]' : 'text-[#5b4a7a]'}`} />
                  {item.label === 'Notifications' && unreadCount > 0 && isCollapsed && (
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-md animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1">
                    <span className={isActive ? 'text-[#7e22ce] font-semibold' : 'text-[#5b4a7a]'}>{item.label}</span>
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
            <h1 className="text-2xl font-bold">
              {isSuperAdmin ? "Super Admin Portal" : "Dashboard Overview"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {isSuperAdmin ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white/20 hover:bg-white/25 backdrop-blur-md rounded-xl text-xs md:text-sm font-bold text-white border border-white/30 shadow-inner transition-all">
                <span className="text-sm">🏢</span>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="bg-transparent text-white font-bold outline-none cursor-pointer pr-1 [&>option]:text-slate-900 [&>option]:font-semibold"
                >
                  <option value="all">All Branches</option>
                  <option value="Tagoloan">Tagoloan</option>
                  <option value="Villanueva">Villanueva</option>
                  <option value="Jasaan">Jasaan</option>
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

            {/* Profile Dropdown / Quick Access */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                title="Admin Profile"
                className={`relative text-white hover:scale-110 transition-all p-2 cursor-pointer rounded-full border border-white/20 flex items-center justify-center overflow-hidden ${
                  isProfileMenuOpen ? 'bg-white/30 ring-2 ring-white/50' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {adminAvatar ? (
                  <img src={adminAvatar} alt={adminName} className="w-[22px] h-[22px] rounded-full object-cover" />
                ) : (
                  <User size={22} />
                )}
              </button>

              {isProfileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-purple-100 py-3 z-50 text-gray-900 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center overflow-hidden shrink-0 text-[#9b1fe8] font-bold text-base shadow-sm">
                        {adminAvatar ? (
                          <img src={adminAvatar} alt={adminName} className="w-full h-full object-cover" />
                        ) : (
                          adminName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 truncate">{adminName}</p>
                        <span className="inline-block text-[11px] font-bold text-[#9b1fe8] bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/60 mt-0.5">
                          {isSuperAdmin ? 'Super Admin' : 'Branch Admin'}
                        </span>
                        {!isSuperAdmin && (
                          <p className="text-[11px] text-gray-500 font-semibold truncate mt-1">
                            {branchName} Branch
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-1.5 space-y-0.5">
                      <Link
                        href="/admin/profile"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-gray-700 hover:text-[#9b1fe8] hover:bg-purple-50 rounded-xl transition-colors"
                      >
                        <User size={16} className="text-[#9b1fe8]" />
                        My Profile
                      </Link>
                      <Link
                        href="/admin/change-password"
                        onClick={() => setIsProfileMenuOpen(false)}
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
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

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
