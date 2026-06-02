"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '../../context/ThemeContext';
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
  ChevronUp
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { styles, bgClass } = useTheme();

  useEffect(() => {
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn && data.name) {
          setAdminName(data.name);
        }
      })
      .catch(err => console.error("Failed to fetch admin status", err));
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <div className={`${bgClass} min-h-screen flex overflow-x-hidden font-['Inter'] transition-colors duration-300`}>
      {/* Mobile Header */}
      <div className={`md:hidden w-full h-[60px] bg-gradient-to-r ${styles.gradient} px-5 flex items-center justify-between fixed top-0 left-0 z-50 shadow-md transition-all duration-300`}>
        <div className="flex items-center gap-3">
          <img src="/Images/graphix-logo.jpg" alt="Graphix Logo" className="w-[35px] h-[35px] rounded-full object-cover" />
          <span className="text-white text-lg font-bold">Graphix Admin</span>
        </div>
        <button onClick={toggleSidebar} className="text-white">
          <List size={28} />
        </button>
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
                <span className="text-2xl font-extrabold tracking-wide leading-none">Graphix</span>
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

        <nav className={`flex flex-col py-5 flex-1 overflow-x-hidden ${isCollapsed ? 'px-2' : ''}`}>
          {[
            { href: '/admin/dashboard', label: 'Dashboard', icon: Grid },
            { 
              label: 'Order History', 
              icon: ReceiptText,
              subItems: [
                { href: '/admin/transactions', label: 'Completed Purchases' },
                { href: '/admin/transactions/downpayments', label: 'Downpayments' }
              ]
            },
            { href: '/admin/accounts', label: 'User Management', icon: User },
            { href: '/admin/inventory', label: 'Inventory Management', icon: Box },
            { href: '/admin/monitoring', label: 'Gadget Repair', icon: Wrench },
            { href: '/admin/banners', label: 'Banners', icon: ImageIcon },
            { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
            { href: '/admin/settings', label: 'Settings', icon: Settings },
          ].map((item: any, idx) => {
            const Icon = item.icon;
            if (item.subItems) {
              const isAnySubActive = item.subItems.some((s: any) => pathname === s.href);
              return (
                <div key={idx} className="flex flex-col">
                  <div 
                    onClick={() => {
                      if (isCollapsed) toggleCollapse();
                      setIsOrderHistoryOpen(!isOrderHistoryOpen);
                    }}
                    title={isCollapsed ? item.label : undefined}
                    className={`cursor-pointer flex items-center text-lg font-medium transition-all hover:bg-white/10 hover:text-white ${isCollapsed ? 'px-0 py-4 justify-center rounded-xl my-1 border-b border-b-transparent' : 'px-6 py-4 gap-4 border-b border-white/5 text-white/80'} ${
                      isAnySubActive && !isOrderHistoryOpen
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
                        {isOrderHistoryOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    )}
                  </div>
                  {!isCollapsed && isOrderHistoryOpen && (
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
                className={`flex items-center text-lg font-medium transition-all hover:bg-white/10 hover:text-white ${isCollapsed ? 'px-0 py-4 justify-center rounded-xl my-1 border-b border-b-transparent' : 'px-6 py-4 gap-4 border-b border-white/5 text-white/80'} ${
                  isActive 
                    ? isCollapsed 
                      ? 'bg-white/20 text-white shadow-sm' 
                      : 'bg-white/15 text-white border-l-4 border-l-white' 
                    : isCollapsed
                      ? 'text-white/70'
                      : 'text-white/70 border-l-4 border-l-transparent'
                }`}
              >
                <Icon size={22} className={isCollapsed ? "mx-auto" : ""} />
                {!isCollapsed && <span>{item.label}</span>}
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
            <h1 className="text-2xl font-bold mb-1">Dashboard Overview</h1>
            <p className="text-sm text-white/90">Welcome Back {adminName}. Here's the daily summary</p>
          </div>
          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            title="Log Out"
            className="text-white hover:scale-110 transition-transform p-2 cursor-pointer bg-transparent border-none outline-none flex items-center justify-center"
          >
            <LogOut size={28} />
          </button>
        </header>

        <div className="flex-1 p-5 md:p-10 mx-auto w-full max-w-[1600px] overflow-hidden">
          {children}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setIsLogoutModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-sm border border-gray-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm animate-pulse">
                <LogOut size={32} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Confirm Log Out</h3>
              <p className="text-gray-500 font-semibold text-sm leading-relaxed mb-6">
                Are you sure you want to log out? You will need to sign back in to access your admin dashboard.
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-colors cursor-pointer border-none outline-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const { logoutUser } = await import('../../actions/auth');
                    await logoutUser();
                    window.location.href = '/login';
                  }}
                  className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl transition-colors shadow-md hover:shadow-lg cursor-pointer border-none outline-none"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
