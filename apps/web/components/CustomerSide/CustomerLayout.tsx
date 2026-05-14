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
  const router = useRouter();
  const navigate = router.push;
  const pathname = usePathname();
  const { styles, bgClass } = useTheme();

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [policies, setPolicies] = useState<any[]>([]);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [selectedPolicyTitle, setSelectedPolicyTitle] = useState('');
  const [selectedPolicyContent, setSelectedPolicyContent] = useState('');
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const fetchCartCount = () => {
    fetch('/api/cart')
      .then(res => res.json())
      .then(data => setCartCount(Array.isArray(data) ? data.length : 0))
      .catch(console.error);
  };

  useEffect(() => {
    fetchCartCount();
    window.addEventListener('cartUpdated', fetchCartCount);
    return () => window.removeEventListener('cartUpdated', fetchCartCount);
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
        if (data.policies) setPolicies(data.policies);
      })
      .catch(console.error);
  }, []);

  const openPolicy = (e: any, type: string) => {
    e.preventDefault();
    const p = policies.find(p => p.type === type);
    if (p) {
      setSelectedPolicyTitle(p.title);
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
      <div className={`md:hidden w-full h-[60px] bg-gradient-to-r ${styles.gradient} px-5 flex items-center justify-between fixed top-0 left-0 z-50 shadow-md transition-all duration-300`}>
        <div className="flex items-center gap-3">
          <img src="/Images/graphix-logo.jpg" alt="Graphix Logo" className="w-[35px] h-[35px] rounded-full object-cover border-2 border-white" />
          <span className="text-white text-lg font-bold">Graphix Shop</span>
        </div>
        <button onClick={toggleSidebar} className="text-white bg-transparent border-none">
          <Menu size={28} />
        </button>
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
        className={`fixed top-0 left-0 h-screen bg-gradient-to-b ${styles.gradient} text-white flex flex-col z-50 transition-all duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.1)] ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'w-[260px] md:w-[80px]' : 'w-[260px]'}`}
      >
        {/* Desktop Shrink Toggle Button */}
        <button 
          onClick={toggleCollapse}
          className="hidden md:flex absolute -right-3.5 top-[23px] bg-white text-gray-900 rounded-full p-1.5 shadow-md border border-gray-100 hover:scale-110 hover:text-[var(--theme-primary,purple)] transition-transform z-50 cursor-pointer"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} strokeWidth={3} /> : <ChevronLeft size={18} strokeWidth={3} />}
        </button>

        <div className={`p-6 flex ${isCollapsed ? 'flex-col items-center justify-center' : 'items-center justify-between'} border-b border-white/10 h-[85px]`}>
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/customer/dashboard')}>
            <img src="/Images/graphix-logo.jpg" alt="Graphix Logo" className={`rounded-full border-2 border-white object-cover shadow-sm transition-all ${isCollapsed ? 'w-[35px] h-[35px]' : 'w-[45px] h-[45px]'}`} />
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-2xl font-extrabold tracking-wide leading-none">Graphix</span>
                <span className="text-xs font-medium text-white/80 mt-1 truncate max-w-[130px]">Customer Portal</span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button onClick={toggleSidebar} className="md:hidden text-white bg-transparent border-none">
              <X size={24} />
            </button>
          )}
        </div>

        <nav className={`flex flex-col py-5 flex-1 overflow-x-hidden ${isCollapsed ? 'px-2' : ''}`}>
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
                className={`flex items-center text-lg font-medium transition-all hover:bg-white/10 hover:text-white no-underline ${isCollapsed ? 'px-0 py-4 justify-center rounded-xl my-1 border-b border-b-transparent' : 'px-6 py-4 gap-4 border-b border-white/5 text-white/80'} ${
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
      <main className={`flex-1 transition-all duration-300 min-h-screen flex flex-col pt-[60px] md:pt-0 w-full overflow-x-hidden ${
        isCollapsed ? 'md:ml-[80px] md:w-[calc(100%-80px)]' : 'md:ml-[260px] md:w-[calc(100%-260px)]'
      }`}>
        
        {/* Top Header */}
        <header className={`bg-gradient-to-r ${styles.gradient} border-b border-white/10 px-5 md:px-10 py-4 flex justify-between items-center shadow-sm fixed top-[60px] md:top-0 right-0 z-30 transition-all duration-300 ${
          isCollapsed ? 'left-0 md:left-[80px]' : 'left-0 md:left-[260px]'
        }`}>
          
          {/* Search Bar */}
          <div className="flex-1 max-w-xl relative" ref={searchContainerRef}>
            <div className={`flex items-center w-full bg-white rounded-full px-4 py-2.5 border-2 transition-colors ${isSearchOpen ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-transparent hover:border-white/50'}`}>
              <Search size={20} className="text-gray-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Search products..." 
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
                className="w-full bg-transparent border-none outline-none text-black placeholder-gray-500 font-medium text-sm ml-3 min-w-0"
              />
            </div>

            {/* Search Dropdown */}
            {isSearchOpen && searchQuery.length > 0 && (
              <div className="absolute top-[120%] left-0 w-full bg-white rounded-xl shadow-xl border border-gray-100 flex flex-col py-2 max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-top-2">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(product => (
                    <div 
                      key={product.id}
                      onClick={() => {
                        navigate(`/customer/product-info?id=${product.id}`);
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-purple-50 cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-50 rounded flex justify-center items-center shrink-0">
                         {product.image ? (
                           <img src={product.image} alt={product.name} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                         ) : (
                           <span className="text-xs text-gray-400">img</span>
                         )}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-black font-semibold text-sm truncate">{product.name}</span>
                        <span className="text-gray-500 text-xs font-bold">₱ {product.price?.toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center font-medium">
                    No products found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Header Right Side */}
          <div className="flex items-center gap-4 ml-4 shrink-0">
            {/* Cart Button */}
            <button 
              onClick={() => navigate('/customer/cart')}
              className="relative p-2 rounded-full hover:bg-white/10 transition-colors bg-transparent border-none cursor-pointer flex items-center justify-center group"
            >
              <ShoppingCart size={28} className="text-white group-hover:scale-110 transition-transform" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-purple-800 animate-in zoom-in">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Profile */}
            <div 
              className="flex items-center gap-3 cursor-pointer group relative"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              ref={profileDropdownRef}
            >
              {user && (
                <div className="hidden sm:flex flex-col items-end mr-1 text-white">
                  <span className="text-sm font-bold leading-tight">{user.name}</span>
                  <span className="text-xs opacity-80 leading-tight">{user.role}</span>
                </div>
              )}
              {user?.image ? (
                <div className="w-[42px] h-[42px] rounded-full overflow-hidden border-2 border-white/50 group-hover:border-white transition-all bg-white shrink-0">
                  <img src={user.image} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              ) : (
                <UserCircle2 size={42} className="text-white group-hover:scale-110 transition-transform shrink-0" strokeWidth={1.5} />
              )}

              {/* Dropdown Menu */}
              {isProfileDropdownOpen && (
                <div className="absolute top-[120%] right-0 w-[200px] bg-white rounded-xl shadow-xl border border-gray-100 flex flex-col py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); navigate('/customer/profile'); setIsProfileDropdownOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-purple-50 text-gray-700 hover:text-[#bd00ff] cursor-pointer transition-colors border-none bg-transparent text-left font-semibold text-sm"
                  >
                    <UserCircle2 size={18} /> View Profile
                  </button>
                  <div className="h-[1px] bg-gray-100 w-full my-1"></div>
                  <button 
                    onClick={async (e) => { 
                      e.stopPropagation(); 
                      await logoutUser(); 
                      window.location.href = '/login'; 
                    }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-500 cursor-pointer transition-colors border-none bg-transparent text-left font-semibold text-sm"
                  >
                    <LogOut size={18} /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 w-full bg-gray-50/50 mt-[76px]">
          {children}
        </div>

        {/* Footer */}
        <footer className="bg-white pt-10 pb-6 px-6 text-gray-500 border-t border-gray-200 shrink-0">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 border-b border-gray-100 pb-8">
            <div className="col-span-1 md:col-span-2 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#8b00cc] rounded-xl flex justify-center items-center overflow-hidden shadow-sm">
                  <img src="/Images/graphix-logo.jpg" alt="Logo" className="w-full h-full object-cover" />
                </div>
                <span className="text-2xl font-black text-gray-900 tracking-tight">Graphix</span>
              </div>
              <p className="text-gray-500 font-medium leading-relaxed max-w-sm text-sm">
                The premier electronics device management and sales tracking system built to organize your technical life.
              </p>
            </div>
            <div className="flex flex-col gap-3 font-semibold">
              <h4 className="text-gray-900 font-bold text-base mb-1">Platform</h4>
              <a href="/homepage#home" className="hover:text-[#bd00ff] transition-colors text-sm text-gray-500 no-underline">Home Selection</a>
              <a href="/homepage#about" className="hover:text-[#bd00ff] transition-colors text-sm text-gray-500 no-underline">Our Approach</a>
              <a href="/homepage#features" className="hover:text-[#bd00ff] transition-colors text-sm text-gray-500 no-underline">Feature Set</a>
            </div>
            <div className="flex flex-col gap-3 font-semibold">
              <h4 className="text-gray-900 font-bold text-base mb-1">Legal</h4>
              <a href="#" onClick={(e) => openPolicy(e, 'Privacy Policy')} className="hover:text-[#bd00ff] transition-colors text-sm text-gray-500 no-underline cursor-pointer">Privacy Policy</a>
              <a href="#" onClick={(e) => openPolicy(e, 'Terms of Service')} className="hover:text-[#bd00ff] transition-colors text-sm text-gray-500 no-underline cursor-pointer">Terms of Service</a>
              <a href="#" onClick={(e) => openPolicy(e, 'Refund Policy')} className="hover:text-[#bd00ff] transition-colors text-sm text-gray-500 no-underline cursor-pointer">Refund Policy</a>
            </div>
          </div>
          <div className="max-w-7xl mx-auto text-center font-semibold flex flex-col md:flex-row justify-between items-center text-xs">
            <p>&copy; {new Date().getFullYear()} Graphix Management System.</p>
          </div>
        </footer>

      </main>

      {/* Policy Modal */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col relative overflow-hidden animate-in fade-in zoom-in duration-300">
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
            <div className="p-8 overflow-y-auto font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">
              {selectedPolicyContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
