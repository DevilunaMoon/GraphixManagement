"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Search, UserCircle2, ChevronRight, LogOut } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { logoutUser } from '../../actions/auth';

export default function CustomerLayout({ children, user }: { children: React.ReactNode, user?: any }) {
  const router = useRouter();
  const navigate = router.push;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
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
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
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

  return (
    <div className={`min-h-screen ${bgClass} flex flex-col font-['Signika'] transition-colors duration-300`}>
      
      {/* Navbar */}
      <nav className={`flex items-center justify-between px-3 sm:px-6 py-3 bg-gradient-to-r ${styles.gradient} shadow-md z-20 relative gap-2 sm:gap-4 flex-nowrap transition-all duration-300`}>
        
        {/* Left: Menu & Brand */}
        <div className="flex items-center gap-2 sm:gap-6 shrink-0">
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white hover:text-gray-200 transition-colors bg-transparent border-none cursor-pointer p-1"
            >
              <Menu size={36} strokeWidth={1.5} />
            </button>
            
            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className={`absolute top-[120%] left-0 w-64 bg-white border-2 ${styles.borderMain} rounded-xl shadow-lg flex flex-col p-2 animate-in slide-in-from-top-2`}>
                <button 
                  onClick={() => { setIsMenuOpen(false); navigate('/customer/notifications'); }}
                  className={`w-full flex justify-between items-center px-4 py-3 text-black ${styles.primaryLight} ${styles.hoverText} rounded-lg transition-colors border-none bg-transparent cursor-pointer font-medium`}
                >
                  <span>Notifications</span>
                  <ChevronRight size={18} />
                </button>
                <button 
                  onClick={() => { setIsMenuOpen(false); navigate('/customer/settings'); }}
                  className={`w-full flex justify-between items-center px-4 py-3 text-black ${styles.primaryLight} ${styles.hoverText} rounded-lg transition-colors border-none bg-transparent cursor-pointer font-medium`}
                >
                  <span>Settings</span>
                  <ChevronRight size={18} />
                </button>
                <button 
                  onClick={() => { setIsMenuOpen(false); navigate('/customer/about'); }}
                  className={`w-full flex justify-between items-center px-4 py-3 text-black ${styles.primaryLight} ${styles.hoverText} rounded-lg transition-colors border-none bg-transparent cursor-pointer font-medium border-b border-gray-100`}
                >
                  <span>About this Website</span>
                  <ChevronRight size={18} />
                </button>
                <button 
                  onClick={async () => { 
                    setIsMenuOpen(false); 
                    await logoutUser();
                    window.location.href = '/login'; 
                  }}
                  className="w-full flex justify-between items-center px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer font-medium mt-1"
                >
                  <span>Log Out</span>
                  <LogOut size={18} />
                </button>
              </div>
            )}
          </div>
          
          <div 
            className="flex items-center gap-2 sm:gap-4 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/customer/dashboard')}
          >
            <div className="w-[35px] h-[35px] sm:w-[50px] sm:h-[50px] bg-white rounded-full flex justify-center items-center shadow-sm overflow-hidden border-2 border-white p-0.5 shrink-0">
              <img src="/Images/graphix-logo.jpg" alt="Graphix Logo" className="w-full h-full object-contain rounded-full" />
            </div>
            <span className="hidden sm:block text-xl sm:text-2xl font-bold text-white tracking-wide">Graphix</span>
          </div>
        </div>

        {/* Center: Search */}
        <div className="flex items-center justify-center flex-1 w-full min-w-0 md:max-w-lg px-2 sm:px-8 relative z-50">
          <div 
             className="relative flex items-center w-full bg-white rounded-full px-3 sm:px-5 py-2 border-2 border-transparent transition-colors shadow-inner"
             ref={searchContainerRef}
          >
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
              className="w-full bg-transparent border-none outline-none text-black placeholder-gray-500 font-medium text-sm sm:text-base min-w-0"
            />
            <button 
              onClick={() => {
                if (searchQuery.trim().length > 0) {
                  setIsSearchOpen(false);
                  navigate(`/customer/products?search=${encodeURIComponent(searchQuery.trim())}`);
                }
              }}
              className="bg-transparent border-none outline-none cursor-pointer p-0 m-0"
            >
              <Search size={22} className="text-black ml-1 sm:ml-2 shrink-0 hover:text-[#bd00ff] transition-colors" />
            </button>

            {/* Dropdown Suggestions */}
            {isSearchOpen && searchQuery.length > 0 && (
              <div className="absolute top-[115%] left-0 w-full bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col py-2 max-h-[300px] overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2">
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
                      <div className="w-10 h-10 bg-gray-50 rounded bg-transparent flex justify-center items-center shrink-0">
                         {product.image ? (
                           <img src={product.image} alt={product.name} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                         ) : (
                           <span className="text-xs text-gray-400">img</span>
                         )}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-black font-semibold text-sm truncate">{product.name}</span>
                        <span className="text-gray-500 text-xs font-bold font-[Arial]">₱ {product.price?.toLocaleString()}</span>
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
        </div>

        {/* Right: User */}
        <div 
          className="flex items-center gap-3 cursor-pointer group shrink-0"
          onClick={() => navigate('/customer/profile')}
        >
          {user && (
            <div className="hidden sm:flex flex-col items-end mr-1 text-white">
              <span className="text-sm font-bold leading-tight">{user.name}</span>
              <span className="text-xs opacity-80 leading-tight">{user.role}</span>
            </div>
          )}
          {user?.image ? (
            <div className="w-[40px] h-[40px] rounded-full overflow-hidden border-2 border-white group-hover:scale-110 transition-transform flex justify-center items-center bg-white shrink-0">
              <img src={user.image} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <UserCircle2 size={40} className="text-white group-hover:scale-110 transition-transform shrink-0" strokeWidth={1.5} />
          )}
        </div>

      </nav>

      {/* Main Content Area */}
      {children}

      {/* Footer */}
      <footer className="bg-white pt-10 pb-6 px-6 text-gray-500 border-t border-gray-200 shrink-0 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 border-b border-gray-100 pb-8">
          <div className="col-span-1 md:col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#8b00cc] rounded-xl flex justify-center items-center overflow-hidden">
                <img src="/Images/graphix-logo.jpg" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-2xl font-black text-gray-900">Graphix</span>
            </div>
            <p className="text-gray-500 font-medium leading-relaxed max-w-sm">
              The premier electronics device management and sales tracking system built to organize your technical life.
            </p>
          </div>
          <div className="flex flex-col gap-3 font-semibold">
            <h4 className="text-gray-900 font-bold text-base mb-1">Platform</h4>
            <a href="/homepage#home" className="hover:text-[#8b00cc] transition-colors text-sm text-gray-500 no-underline">Home Selection</a>
            <a href="/homepage#about" className="hover:text-[#8b00cc] transition-colors text-sm text-gray-500 no-underline">Our Approach</a>
            <a href="/homepage#features" className="hover:text-[#8b00cc] transition-colors text-sm text-gray-500 no-underline">Feature Set</a>
          </div>
          <div className="flex flex-col gap-3 font-semibold">
            <h4 className="text-gray-900 font-bold text-base mb-1">Legal</h4>
            <a href="#" className="hover:text-[#8b00cc] transition-colors text-sm text-gray-500 no-underline">Privacy Policy</a>
            <a href="#" className="hover:text-[#8b00cc] transition-colors text-sm text-gray-500 no-underline">Terms of Service</a>
            <a href="#" className="hover:text-[#8b00cc] transition-colors text-sm text-gray-500 no-underline">Refund Policy</a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto text-center font-semibold flex flex-col md:flex-row justify-between items-center text-xs">
          <p>&copy; {new Date().getFullYear()} Graphix Management System.</p>
          <p className="mt-2 md:mt-0 text-[#8b00cc]">Designed & Built for Efficiency.</p>
        </div>
      </footer>

    </div>
  );
}
