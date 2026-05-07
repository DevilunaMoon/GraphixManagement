"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '../../context/ThemeContext';
import { logoutUser } from '../../actions/auth';
import {
  Menu, X, Search, UserCircle2, ChevronLeft, ChevronRight, LogOut,
  Grid, Bell, Settings, Info
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

  useEffect(() => {
    fetch('/api/devices')
      .then(res => res.json())
      .then(data => setAllProducts(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
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
    <div className={`${bgClass} min-h-screen flex overflow-x-hidden font-['Signika'] transition-colors duration-300`}>
      
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

        {/* Log Out at bottom of sidebar */}
        <div className={`p-4 border-t border-white/10 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <button
            onClick={async () => {
              await logoutUser();
              window.location.href = '/login';
            }}
            title={isCollapsed ? "Log Out" : undefined}
            className={`flex items-center text-red-300 hover:text-red-100 hover:bg-red-900/30 transition-all rounded-lg bg-transparent border-none outline-none cursor-pointer ${
              isCollapsed ? 'p-3 justify-center' : 'w-full py-3 px-4 gap-3'
            }`}
          >
            <LogOut size={22} className="shrink-0" />
            {!isCollapsed && <span className="font-bold text-lg">Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 transition-all duration-300 w-full min-h-screen flex flex-col pt-[60px] md:pt-0 ${
        isCollapsed ? 'md:ml-[80px]' : 'md:ml-[260px]'
      }`}>
        
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-5 md:px-10 py-4 flex justify-between items-center shadow-sm sticky top-[60px] md:top-0 z-30 transition-all">
          
          {/* Search Bar */}
          <div className="flex-1 max-w-xl relative" ref={searchContainerRef}>
            <div className={`flex items-center w-full bg-gray-100 rounded-full px-4 py-2.5 border-2 transition-colors ${isSearchOpen ? 'border-[#bd00ff] bg-white shadow-sm' : 'border-transparent hover:border-gray-200'}`}>
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

          {/* User Profile */}
          <div 
            className="flex items-center gap-3 ml-4 cursor-pointer group shrink-0"
            onClick={() => navigate('/customer/profile')}
          >
            {user && (
              <div className="hidden sm:flex flex-col items-end mr-1">
                <span className="text-sm font-bold text-gray-800 leading-tight">{user.name}</span>
                <span className="text-xs text-gray-500 leading-tight">{user.role}</span>
              </div>
            )}
            {user?.image ? (
              <div className="w-[42px] h-[42px] rounded-full overflow-hidden border-2 border-gray-200 group-hover:border-[#bd00ff] transition-all bg-gray-100 shrink-0">
                <img src={user.image} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <UserCircle2 size={42} className="text-gray-400 group-hover:text-[#bd00ff] transition-colors shrink-0" strokeWidth={1.5} />
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 w-full bg-gray-50/50">
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
              <a href="#" className="hover:text-[#bd00ff] transition-colors text-sm text-gray-500 no-underline">Privacy Policy</a>
              <a href="#" className="hover:text-[#bd00ff] transition-colors text-sm text-gray-500 no-underline">Terms of Service</a>
              <a href="#" className="hover:text-[#bd00ff] transition-colors text-sm text-gray-500 no-underline">Refund Policy</a>
            </div>
          </div>
          <div className="max-w-7xl mx-auto text-center font-semibold flex flex-col md:flex-row justify-between items-center text-xs">
            <p>&copy; {new Date().getFullYear()} Graphix Management System.</p>
            <p className="mt-2 md:mt-0 text-[#bd00ff]">Designed & Built for Efficiency.</p>
          </div>
        </footer>

      </main>
    </div>
  );
}
