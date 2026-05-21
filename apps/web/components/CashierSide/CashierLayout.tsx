"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { List, X, LogOut, Paintbrush, ChevronLeft, ChevronRight, Home, Wrench, Smartphone, Bell, ReceiptText, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function CashierLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { styles, bgClass } = useTheme();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        if (Array.isArray(data)) {
          const unread = data.filter((n: any) => !n.isRead).length;
          setUnreadCount(unread);
        }
      } catch (err) {
        console.error('Failed to fetch unread count:', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (pathname.includes('/cashier/records')) {
      setIsOrderHistoryOpen(true);
    }
  }, [pathname]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const navItems = [
    { href: '/cashier/dashboard', label: 'Dashboard', icon: Home },
    { href: '/cashier/monitoring', label: 'Gadget Repair', icon: Wrench },
    { href: '/cashier/devices', label: 'Devices', icon: Smartphone },
    { href: '/cashier/notifications', label: 'Notifications', icon: Bell },
    { 
      label: 'Order History', 
      icon: ReceiptText,
      subItems: [
        { href: '/cashier/records', label: 'Completed Purchases' },
        { href: '/cashier/records/downpayments', label: 'Downpayments' }
      ]
    },
  ];

  return (
    <div className={`${bgClass} min-h-screen flex overflow-x-hidden font-['Inter'] transition-colors duration-300`}>
      {/* Mobile Header */}
      <div className={`md:hidden w-full h-[60px] bg-gradient-to-r ${styles.gradient} px-4 flex items-center justify-between fixed top-0 left-0 z-50 shadow-md transition-all duration-300`}>
        <div className="flex items-center gap-3">
          <img src="/Images/graphix-logo.jpg" alt="Graphix Logo" className="w-[30px] h-[30px] rounded-full object-cover" />
          <span className="text-white text-[17px] font-bold tracking-wide">Graphix POS</span>
        </div>
        <button onClick={toggleSidebar} className="text-white outline-none bg-transparent border-none cursor-pointer">
          <List size={26} />
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity" 
          onClick={toggleSidebar}
        />
      )}

      {/* Cashier Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-screen bg-gradient-to-b ${styles.gradient} text-white flex flex-col z-50 transition-all duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.1)] ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-[80px]' : 'w-[240px]'}`}
      >
        {/* Desktop Shrink Toggle Button */}
        <button 
          onClick={toggleCollapse}
          className="hidden md:flex absolute -right-3.5 top-[23px] bg-white text-gray-900 rounded-full p-1.5 shadow-md border border-gray-100 hover:scale-110 hover:text-[var(--theme-primary,purple)] transition-transform z-50 outline-none cursor-pointer"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} strokeWidth={3} /> : <ChevronLeft size={18} strokeWidth={3} />}
        </button>

        {/* Brand Header inside Sidebar */}
        <div className={`p-5 flex ${isCollapsed ? 'flex-col items-center' : 'items-center gap-3'} border-b border-white/10 h-[80px]`}>
          <img 
            src="/Images/graphix-logo.jpg" 
            alt="Graphix Logo" 
            onClick={() => router.push('/cashier/dashboard')}
            className={`${isCollapsed ? 'w-[35px] h-[35px] mt-1' : 'w-[35px] h-[35px]'} rounded-full border-2 border-white object-cover shadow-sm cursor-pointer hover:scale-105 transition-transform`} 
          />
          {!isCollapsed && <span className="text-[20px] font-black tracking-wide uppercase">Graphix</span>}
          {!isCollapsed && (
            <button onClick={toggleSidebar} className="md:hidden text-white ml-auto bg-transparent border-none cursor-pointer">
              <X size={22} />
            </button>
          )}
        </div>

        <nav className={`flex flex-col py-4 flex-1 overflow-y-auto overflow-x-hidden ${isCollapsed ? 'px-2' : ''}`}>
          {navItems.map((item: any, idx) => {
            const Icon = item.icon;
            
            if (item.subItems) {
              const isAnySubActive = item.subItems.some((s: any) => pathname === s.href);
              return (
                <div key={idx} className="flex flex-col w-full">
                  <button
                    onClick={() => {
                      if (isCollapsed) toggleCollapse();
                      setIsOrderHistoryOpen(!isOrderHistoryOpen);
                    }}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full cursor-pointer bg-transparent border-none ${isCollapsed ? 'px-0 py-4 justify-center rounded-xl my-1 border-b border-b-transparent' : 'text-left px-5 py-3.5 border-b border-white/5'} flex items-center font-semibold transition-all hover:bg-white/10 hover:text-white ${
                      isAnySubActive && !isOrderHistoryOpen
                        ? isCollapsed 
                          ? 'bg-white/20 text-white shadow-sm' 
                          : 'bg-white/15 text-white border-l-4 border-l-white' 
                        : isCollapsed
                          ? 'text-white/70'
                          : 'text-white/70 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-start pl-2 gap-3'} items-center w-full transition-all duration-300 relative text-left`}>
                      <Icon size={isCollapsed ? 22 : 20} strokeWidth={2} />
                      {!isCollapsed && (
                        <div className="flex items-center justify-between flex-1">
                          <span className="text-[15px] tracking-wide text-white">{item.label}</span>
                          {isOrderHistoryOpen ? <ChevronUp size={16} className="text-white" /> : <ChevronDown size={16} className="text-white" />}
                        </div>
                      )}
                    </div>
                  </button>
                  {!isCollapsed && isOrderHistoryOpen && (
                    <div className="flex flex-col bg-black/10">
                      {item.subItems.map((sub: any) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setIsSidebarOpen(false)}
                            className={`pl-14 py-3 text-[14px] font-semibold transition-colors border-l-4 text-left ${
                              isSubActive 
                                ? 'text-white bg-white/10 border-white shadow-sm font-bold' 
                                : 'text-white/60 hover:text-white hover:bg-white/5 border-transparent'
                            }`}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = pathname.includes(item.href);
            return (
              <button
                key={item.href}
                onClick={() => {
                   router.push(item.href);
                   setIsSidebarOpen(false);
                }}
                title={isCollapsed ? item.label : undefined}
                className={`w-full cursor-pointer bg-transparent border-none ${isCollapsed ? 'px-0 py-4 justify-center rounded-xl my-1 border-b border-b-transparent' : 'text-left px-5 py-3.5 border-b border-white/5'} flex items-center font-semibold transition-all hover:bg-white/10 hover:text-white ${
                  isActive 
                    ? isCollapsed 
                      ? 'bg-white/20 text-white shadow-sm' 
                      : 'bg-white/15 text-white border-l-4 border-l-white' 
                    : isCollapsed
                      ? 'text-white/70'
                      : 'text-white/70 border-l-4 border-l-transparent'
                }`}
              >
                <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-start pl-2 gap-3'} items-center w-full transition-all duration-300 relative text-left`}>
                  <Icon size={isCollapsed ? 22 : 20} strokeWidth={2} />
                  {item.label === 'Notifications' && unreadCount > 0 && (
                    <span className={`absolute bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md ${isCollapsed ? 'top-[-8px] right-[4px] w-4 h-4' : 'top-1/2 -translate-y-1/2 right-4 w-5 h-5'}`}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                  {!isCollapsed && <span className="text-[15px] tracking-wide text-white">{item.label}</span>}
                </div>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 w-full min-h-screen flex flex-col pt-[60px] md:pt-0 transition-all duration-300 ${isCollapsed ? 'md:ml-[80px]' : 'md:ml-[240px]'}`}>
        {/* Main Content Dashboard Header Bar */}
        <header className={`bg-gradient-to-r ${styles.gradient} text-white p-4 md:px-8 h-[80px] flex justify-between items-center shadow-sm transition-all duration-300`}>
          <div>
            <h1 className="text-[20px] font-bold tracking-wide uppercase">Point of Sale System</h1>
            <p className="text-[13px] text-white/90 hidden sm:block mt-0.5">Welcome back. Here is your operational dashboard.</p>
          </div>
          <div className="flex gap-3">
             {/* Themes configuration button */}
            <button 
              onClick={() => router.push('/cashier/themes')}
              className="text-white hover:scale-105 transition-transform p-2.5 cursor-pointer bg-white/10 rounded-lg shadow-sm outline-none border-none"
              title="Themes"
            >
              <Paintbrush size={20} />
            </button>
            <button 
              onClick={async () => {
                const { logoutUser } = await import('../../actions/auth');
                await logoutUser();
                window.location.href = '/login';
              }}
              className="text-white hover:scale-105 transition-transform p-2.5 cursor-pointer bg-white/10 rounded-lg shadow-sm outline-none border-none"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Dashboard Content Container */}
        <div className="flex-1 p-5 md:p-8 w-full overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
