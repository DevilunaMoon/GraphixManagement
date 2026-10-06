"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '../../context/ThemeContext';
import { logoutUser } from '../../actions/auth';
import {
  Menu, X, Search, UserCircle2, ChevronLeft, ChevronRight, LogOut,
  Grid, Bell, Settings, Info, ShoppingCart, Activity
} from 'lucide-react';

export default function CustomerLayout({ children, user }: { children: React.ReactNode, user?: any }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [selectedPolicyTitle, setSelectedPolicyTitle] = useState('');
  const [selectedPolicyContent, setSelectedPolicyContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [policies, setPolicies] = useState<any[]>([]);
  const router = useRouter();
  const navigate = router.push;
  const pathname = usePathname();
  const { styles, bgClass } = useTheme();

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLogoutModalOpen || isPolicyModalOpen) {
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
  }, [isLogoutModalOpen, isPolicyModalOpen]);

  const fetchCartCount = () => {
    fetch('/api/cart')
      .then(res => res.json())
      .then(data => setCartCount(Array.isArray(data) ? data.length : 0))
      .catch(console.error);
  };

  const fetchUnreadCount = () => {
    fetch('/api/notifications?page=1&limit=1')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchCartCount();
    window.addEventListener('cartUpdated', fetchCartCount);
    return () => window.removeEventListener('cartUpdated', fetchCartCount);
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    window.addEventListener('notificationsUpdated', fetchUnreadCount);
    // Refresh every 15 seconds to keep sidebar count fresh and pseudo-realtime!
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => {
      window.removeEventListener('notificationsUpdated', fetchUnreadCount);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    fetch('/api/devices')
      .then(res => res.json())
      .then(data => setAllProducts(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch('/api/policies')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPolicies(data);
        else if (data?.policies) setPolicies(data.policies);
      })
      .catch(console.error);
  }, []);

  const openPolicy = (e: any, type: string) => {
    e.preventDefault();
    const typeMapping: Record<string, string> = {
      'Privacy Policy': 'PRIVACY',
      'Terms of Service': 'PURCHASE',
      'Refund Policy': 'PURCHASE',
      'Purchase Policy': 'PURCHASE',
      'Payment Policy': 'PAYMENT',
      'Repair Policy': 'REPAIR'
    };
    const targetType = typeMapping[type] || type.toUpperCase().replace(/\s+/g, '_');
    const p = policies.find(p => (p.type || '').toUpperCase() === targetType);
    if (p) {
      setSelectedPolicyTitle(type);
      setSelectedPolicyContent(p.content);
    } else {
      setSelectedPolicyTitle(type);
      setSelectedPolicyContent(`No content available for ${type}.`);
    }
    setIsPolicyModalOpen(true);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProducts = searchQuery.trim() === '' 
    ? [] 
    : allProducts.filter(p => (p.name || '').toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <div className={`${bgClass} min-h-screen flex font-['Inter'] transition-colors duration-300`}>
      
      {/* Mobile Header */}
      <div className={`md:hidden w-full h-[60px] bg-gradient-to-r ${styles.gradient} px-5 flex items-center gap-4 fixed top-0 left-0 z-50 shadow-md transition-all duration-300`}>
        <button 
          onClick={toggleSidebar} 
          aria-label="Open sidebar"
          className="text-white bg-transparent border-none p-0 flex items-center justify-center cursor-pointer shrink-0 active:scale-90 transition-transform"
        >
          <Menu size={28} />
        </button>
        <Link 
          href="/customer/dashboard"
          onClick={() => setIsSidebarOpen(false)}
          className="flex items-center gap-3 no-underline cursor-pointer active:opacity-80 transition-opacity"
        >
          <img src="/Images/graphix-logo.jpg" alt="Graphix Logo" className="w-[35px] h-[35px] rounded-full object-cover border-2 border-white shadow-sm" />
          <span className="text-white text-lg font-bold">Graphix Shop</span>
        </Link>
      </div>

      {/* Sidebar Overlay */}
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
          {isCollapsed ? <ChevronRight size={16} strokeWidth={2.5} className="text-[#7e22ce]" /> : <ChevronLeft size={16} strokeWidth={2.5} className="text-[#7e22ce]" />}
        </button>

        <div className={`p-5 flex ${isCollapsed ? 'flex-col items-center justify-center' : 'items-center justify-between'} border-b border-[#e9ddff] h-[85px]`}>
          <Link 
            href="/customer/dashboard"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center gap-3 cursor-pointer group no-underline text-inherit"
          >
            <div className="p-0.5 rounded-full bg-white shadow-xs border border-[#e4d8fb] group-hover:border-[#bd00ff] transition-all shrink-0">
              <img src="/Images/graphix-logo.jpg" alt="Graphix Logo" className={`rounded-full object-cover transition-all ${isCollapsed ? 'w-[36px] h-[36px]' : 'w-[42px] h-[42px]'}`} />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tight leading-none text-[#2d1254] group-hover:text-[#7e22ce] transition-colors">Graphix</span>
                <span className="text-[11px] font-bold text-[#8b7aa8] mt-1 tracking-wide uppercase">Customer Portal</span>
              </div>
            )}
          </Link>
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            aria-label="Close sidebar"
            className="md:hidden text-[#7e22ce] hover:text-[#bd00ff] bg-transparent border-none p-2 -mr-2 cursor-pointer flex items-center justify-center active:scale-90 transition-transform"
          >
            <X size={24} />
          </button>
        </div>

        <nav className={`flex flex-col py-4 flex-1 overflow-x-hidden ${isCollapsed ? 'px-2.5 gap-1.5' : 'px-3 gap-1'}`}>
          {[
            { href: '/customer/dashboard', label: 'Dashboard', icon: Grid },
            { href: '/customer/products', label: 'Products', icon: ShoppingCart },
            { href: '/customer/monitoring', label: 'Device Monitoring', icon: Activity },
            { href: '/customer/notifications', label: 'Notifications', icon: Bell },
            { href: '/customer/settings', label: 'Settings', icon: Settings },
            { href: '/customer/about', label: 'About', icon: Info },
          ].map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link 
                key={item.href}
                href={item.href} 
                onClick={() => setIsSidebarOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center text-sm font-bold transition-all rounded-2xl no-underline relative group ${
                  isCollapsed ? 'px-0 py-3.5 justify-center my-0.5' : 'px-4 py-3 gap-3.5'
                } ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#8b00cc] to-[#a300eb] text-white shadow-[0_4px_16px_rgba(139,0,204,0.3)]' 
                    : 'text-[#5b4a7a] hover:bg-white/80 hover:text-[#8b00cc]'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={`${isCollapsed ? "mx-auto" : ""} ${isActive ? 'text-white' : 'text-[#6b588c] group-hover:text-[#8b00cc]'}`} />
                  {isCollapsed && item.label === 'Notifications' && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-xs">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1">
                    <span className={`tracking-tight ${isActive ? 'text-white font-extrabold' : 'text-[#4e3c6d] group-hover:text-[#8b00cc]'}`}>{item.label}</span>
                    {item.label === 'Notifications' && unreadCount > 0 && (
                      <span className={`px-2 py-0.5 text-xs font-black rounded-full shadow-xs ${isActive ? 'bg-white text-[#8b00cc]' : 'bg-rose-500 text-white'}`}>
                        {unreadCount}
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
      <main className={`flex-1 transition-all duration-300 min-h-screen flex flex-col pt-[60px] md:pt-0 w-full overflow-x-hidden ${
        isCollapsed ? 'md:ml-[84px] md:w-[calc(100%-84px)]' : 'md:ml-[260px] md:w-[calc(100%-260px)]'
      }`}>
        
        {/* Top Header */}
        <header className={`bg-gradient-to-r ${styles.gradient} border-b border-white/15 px-5 md:px-10 py-3.5 flex justify-between items-center shadow-sm fixed top-[60px] md:top-0 right-0 z-30 transition-all duration-300 ${
          isCollapsed ? 'left-0 md:left-[84px]' : 'left-0 md:left-[260px]'
        }`}>
          
          {/* Search Bar */}
          <div className="flex-1 max-w-lg relative" ref={searchContainerRef}>
            <div className={`flex items-center w-full bg-white rounded-full px-4 py-2 border transition-all shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${isSearchOpen ? 'border-purple-400 ring-2 ring-white/40' : 'border-white/60 hover:border-white'}`}>
              <Search size={18} className="text-gray-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Search products, brands, or devices..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim().length > 0) {
                    setIsSearchOpen(false);
                    navigate(`/customer/products?search=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
                className="w-full bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 font-medium text-xs sm:text-sm ml-2.5 min-w-0"
              />
            </div>

            {/* Search Dropdown */}
            {isSearchOpen && searchQuery.length > 0 && (
              <div className="absolute top-[120%] left-0 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col py-2 max-h-[300px] overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(product => (
                    <div 
                      key={product.id}
                      onClick={() => {
                        navigate(`/customer/product-info?id=${product.id}`);
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50/70 cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-50 rounded-xl border border-gray-100 flex justify-center items-center shrink-0 p-1">
                         {product.image ? (
                           <img src={product.image} alt={product.name} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                         ) : (
                           <span className="text-[10px] text-gray-400">img</span>
                         )}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-gray-900 font-bold text-xs sm:text-sm truncate">{product.name}</span>
                        <span className="text-[#8b00cc] text-xs font-black">₱ {product.price?.toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-4 text-xs text-gray-500 text-center font-semibold">
                    No products found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Header Right Side */}
          <div className="flex items-center gap-3 sm:gap-5 ml-4 shrink-0">
            {/* Cart Button */}
            <button 
              onClick={() => navigate('/customer/cart')}
              className="relative p-2 rounded-full hover:bg-white/15 transition-all bg-transparent border-none cursor-pointer flex items-center justify-center group"
              title="View Cart"
            >
              <ShoppingCart size={24} className="text-white group-hover:scale-110 transition-transform" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-xs animate-in zoom-in">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Profile */}
            <div 
              className="flex items-center gap-3 cursor-pointer group relative bg-white/10 hover:bg-white/20 p-1.5 sm:px-3 sm:py-1.5 rounded-full border border-white/25 transition-all"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              ref={profileDropdownRef}
            >
              {user && (
                <div className="hidden sm:flex flex-col items-end text-white text-right">
                  <span className="text-xs font-black leading-tight max-w-[130px] truncate">{user.name}</span>
                  <span className="text-[10px] font-bold text-purple-200 leading-tight uppercase tracking-wider">{user.role || "CUSTOMER"}</span>
                </div>
              )}
              {user?.image ? (
                <div className="w-[34px] h-[34px] rounded-full overflow-hidden border-2 border-white shadow-xs bg-white shrink-0">
                  <img src={user.image} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              ) : (
                <UserCircle2 size={34} className="text-white shrink-0" strokeWidth={1.8} />
              )}

              {/* Dropdown Menu */}
              {isProfileDropdownOpen && (
                <div className="absolute top-[125%] right-0 w-[210px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); navigate('/customer/profile'); setIsProfileDropdownOpen(false); }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 text-gray-700 hover:text-[#8b00cc] cursor-pointer transition-colors border-none bg-transparent text-left font-bold text-xs sm:text-sm"
                  >
                    <UserCircle2 size={18} className="text-purple-600" /> View Profile
                  </button>
                  <div className="h-px bg-gray-100 w-full my-1" />
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setIsProfileDropdownOpen(false);
                      setIsLogoutModalOpen(true); 
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-red-600 cursor-pointer transition-colors border-none bg-transparent text-left font-bold text-xs sm:text-sm"
                  >
                    <LogOut size={18} className="text-red-500" /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 w-full bg-[#fbfaff] mt-[64px] md:mt-[68px]">
          {children}
        </div>

        {/* Footer */}
        <footer className="bg-white pt-10 pb-6 px-6 text-gray-500 border-t border-purple-100/60 shrink-0">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 border-b border-gray-100 pb-8">
            <div className="col-span-1 md:col-span-2 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex justify-center items-center overflow-hidden shadow-xs border border-purple-100">
                  <img src="/Images/graphix-logo.jpg" alt="Logo" className="w-full h-full object-cover" />
                </div>
                <span className="text-2xl font-black text-gray-900 tracking-tight">Graphix</span>
              </div>
              <p className="text-gray-500 font-medium leading-relaxed max-w-sm text-xs sm:text-sm">
                The premier electronics device management and sales tracking system built to organize your technical life.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 font-semibold">
              <h4 className="text-gray-900 font-black text-sm mb-1 uppercase tracking-wider">Platform</h4>
              <a href="/homepage#home" className="hover:text-[#8b00cc] transition-colors text-xs sm:text-sm text-gray-500 no-underline font-medium">Home Selection</a>
              <a href="/homepage#about" className="hover:text-[#8b00cc] transition-colors text-xs sm:text-sm text-gray-500 no-underline font-medium">Our Approach</a>
              <a href="/homepage#features" className="hover:text-[#8b00cc] transition-colors text-xs sm:text-sm text-gray-500 no-underline font-medium">Feature Set</a>
            </div>
            <div className="flex flex-col gap-2.5 font-semibold">
              <h4 className="text-gray-900 font-black text-sm mb-1 uppercase tracking-wider">Legal</h4>
              <a href="#" onClick={(e) => openPolicy(e, 'Privacy Policy')} className="hover:text-[#8b00cc] transition-colors text-xs sm:text-sm text-gray-500 no-underline cursor-pointer font-medium">Privacy Policy</a>
              <a href="#" onClick={(e) => openPolicy(e, 'Terms of Service')} className="hover:text-[#8b00cc] transition-colors text-xs sm:text-sm text-gray-500 no-underline cursor-pointer font-medium">Terms of Service</a>
              <a href="#" onClick={(e) => openPolicy(e, 'Refund Policy')} className="hover:text-[#8b00cc] transition-colors text-xs sm:text-sm text-gray-500 no-underline cursor-pointer font-medium">Refund Policy</a>
            </div>
          </div>
          <div className="max-w-7xl mx-auto text-center font-bold flex flex-col md:flex-row justify-between items-center text-xs text-gray-400">
            <p>&copy; {new Date().getFullYear()} Graphix Management System. All rights reserved.</p>
          </div>
        </footer>

      </main>

      {/* Policy Modal */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain" onWheel={(e) => e.stopPropagation()}>
          <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col relative overflow-hidden animate-in fade-in zoom-in duration-300 overscroll-contain">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-2xl font-bold text-gray-900 m-0 border-none">{selectedPolicyTitle}</h2>
              <button 
                onClick={() => setIsPolicyModalOpen(false)}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all border border-gray-200 cursor-pointer shadow-sm p-0"
              >
                <X size={20} />
              </button>
            </div>
            {/* Content */}
            <div className="p-8 overflow-y-auto overscroll-contain font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">
              {selectedPolicyContent}
            </div>
          </div>
        </div>
      )}
      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200 overscroll-contain" onWheel={(e) => e.stopPropagation()} onClick={() => setIsLogoutModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-sm border border-gray-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-purple-50 text-[#bd00ff] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm animate-pulse">
                <LogOut size={32} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Confirm Log Out</h3>
              <p className="text-gray-500 font-semibold text-sm leading-relaxed mb-6">
                Are you sure you want to log out? You will need to sign back in to purchase products or check repairs.
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
                    await logoutUser();
                    window.location.href = '/login';
                  }}
                  className="flex-1 py-3 px-4 bg-[#bd00ff] hover:bg-[#9c00d6] text-white font-bold rounded-2xl transition-colors shadow-md hover:shadow-lg cursor-pointer border-none outline-none"
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
