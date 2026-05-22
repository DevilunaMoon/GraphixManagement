"use client";

import { useState, useRef, useEffect } from 'react';
import { Filter, Search, Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string | null;
  stock: number;
}

interface CartItem extends Product {
  cartQty: number;
}

export default function CashierDashboard() {
  const router = useRouter();
  const navigate = router.push;
  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState('All Brands');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ [key: string]: CartItem }>({});
  const [isLoading, setIsLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetch(`/api/devices?page=${currentPage}&limit=15&search=${encodeURIComponent(searchQuery)}&brand=${encodeURIComponent(brandFilter === 'All Brands' ? '' : brandFilter)}`)
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.devices)) {
            setProducts(data.devices);
            setTotalPages(data.totalPages || 1);
            setTotalItems(data.total || 0);
          } else {
            setProducts([]);
            setTotalPages(1);
            setTotalItems(0);
          }
        })
        .catch(err => {
          console.error(err);
          setProducts([]);
        })
        .finally(() => setIsLoading(false));
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchQuery, brandFilter]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBrandSelect = (brand: string) => {
    setBrandFilter(brand);
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev[product.name];
      const currentQty = existing ? existing.cartQty : 0;
      if (currentQty >= product.stock) return prev; // Limit reached

      if (existing) {
        return { ...prev, [product.name]: { ...existing, cartQty: existing.cartQty + 1 } };
      }
      return { ...prev, [product.name]: { ...product, cartQty: 1 } };
    });
  };

  const removeFromCart = (productName: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      delete newCart[productName];
      return newCart;
    });
  };

  const cartTotal = Object.values(cart).reduce((sum, item) => sum + (item.price * item.cartQty), 0);
  const cartItemsArray = Object.values(cart);

  return (
    <main className="flex-1 flex flex-col lg:flex-row p-3 md:p-5 gap-5 border-2 border-[#bd00ff] mx-3 my-3 rounded-xl bg-white overflow-hidden">
      
      {/* Products Section */}
      <section className="flex-1 flex flex-col gap-5 overflow-y-auto pr-2 custom-scrollbar">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-semibold text-black">Product Devices on Sale</h2>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            
            {/* Filter */}
            <div className="relative" ref={filterRef}>
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center justify-center w-full sm:w-auto bg-white border border-[#bd00ff] rounded-lg px-6 py-2 text-[1.1rem] text-black cursor-pointer hover:bg-gray-50 transition-colors gap-2"
              >
                <Filter size={18} />
                <span className="font-medium">{brandFilter}</span>
              </button>
 
              {isFilterOpen && (
                <div className="absolute top-[110%] left-0 bg-white border-2 border-[#bd00ff] rounded-lg shadow-lg min-w-[150px] flex flex-col py-2 z-10">
                  {['All Brands', 'Iphone', 'Oppo', 'Techno', 'Realme'].map(brand => (
                    <div 
                      key={brand}
                      className="px-5 py-2 cursor-pointer hover:bg-gray-100 font-medium transition-colors text-black"
                      onClick={() => handleBrandSelect(brand)}
                    >
                      {brand}
                    </div>
                  ))}
                </div>
              )}
            </div>
 
            {/* Search */}
            <div className="flex items-center border border-[#bd00ff] rounded-lg px-3 py-2 bg-white flex-1 sm:max-w-[250px]">
              <Search size={18} className="text-gray-500" />
              <input 
                type="text" 
                placeholder="Search By Device Name" 
                className="border-none outline-none pl-2 text-sm w-full text-black placeholder-gray-400 bg-transparent"
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
              />
            </div>
          </div>
        </div>
 
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {isLoading ? (
            <div className="col-span-full py-20 flex flex-col justify-center items-center gap-3">
              <Loader2 className="w-10 h-10 text-[#bd00ff] animate-spin" />
              <span className="text-gray-500 font-medium animate-pulse">Loading products...</span>
            </div>
          ) : (
            products.map(product => {
              const currentQty = cart[product.name]?.cartQty || 0;
              const isMaxedOut = currentQty >= product.stock;
 
              return (
                <div 
                  key={product.id}
                  onClick={() => !isMaxedOut && addToCart(product)}
                  className={`border border-[#c084fc] rounded-lg p-4 flex flex-col items-center text-center gap-2 transition-all duration-200 bg-white relative overflow-hidden ${isMaxedOut ? 'opacity-60 cursor-not-allowed grayscale' : 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_4px_10px_rgba(189,0,255,0.1)]'}`}
                >
                  {product.image ? (
                    <img src={product.image} alt={product.name} className={`h-20 object-contain transition-transform ${isMaxedOut ? '' : 'hover:scale-105'}`} />
                  ) : (
                    <div className="h-20 w-20 bg-gray-100 rounded-lg" />
                  )}
                  <span className="text-sm font-semibold leading-tight text-black mt-2">{product.name}</span>
                  <span className={`text-sm font-bold ${isMaxedOut ? 'text-red-500' : 'text-gray-500'}`}>
                    {isMaxedOut ? 'Max Out' : `${product.stock - currentQty}x left`}
                  </span>
                </div>
              );
            })
          )}
          {!isLoading && products.length === 0 && (
            <div className="col-span-full py-10 text-center text-gray-500">No products found.</div>
          )}
        </div>

        {/* Pagination Controls */}
        {!isLoading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t border-purple-100 gap-4">
            <span className="text-sm font-semibold text-gray-500">
              Showing {(currentPage - 1) * 15 + 1} to {Math.min(currentPage * 15, totalItems)} of {totalItems} items
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3.5 py-2 rounded-lg bg-white border border-[#bd00ff] text-[#bd00ff] hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-xs cursor-pointer shadow-sm"
              >
                Previous
              </button>
              
              {(() => {
                const range = [];
                const maxVisible = 5;
                let start = Math.max(1, currentPage - 2);
                let end = Math.min(totalPages, start + maxVisible - 1);
                
                if (end - start < maxVisible - 1) {
                  start = Math.max(1, end - maxVisible + 1);
                }
                
                for (let i = start; i <= end; i++) {
                  range.push(i);
                }
                return range.map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs transition-all border shadow-sm cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-gradient-to-r from-[#BF00FF] to-[#4B0082] text-white border-transparent'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-[#bd00ff] hover:text-[#bd00ff]'
                    }`}
                  >
                    {pageNum}
                  </button>
                ));
              })()}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3.5 py-2 rounded-lg bg-white border border-[#bd00ff] text-[#bd00ff] hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-xs cursor-pointer shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Cart Sidebar */}
      <aside className="w-full lg:w-[320px] shrink-0 border-2 border-[#bd00ff] rounded-lg flex flex-col overflow-hidden bg-white min-h-[400px] max-h-[600px] lg:max-h-none">
        <h3 className="p-4 text-xl font-semibold border-b border-gray-100 text-black">Item/s</h3>

        <div className="flex-1 p-0 overflow-y-auto">
          {cartItemsArray.length === 0 ? (
            <div className="p-5 text-gray-400 text-center h-full flex items-center justify-center">Cart is empty</div>
          ) : (
            <div className="flex flex-col">
              {cartItemsArray.map(item => (
                <div key={item.name} className="flex justify-between items-center border-b border-gray-100 px-4 py-3 group">
                  <div className="flex flex-col gap-1">
                    <strong className="text-[0.95rem] text-black leading-tight pr-2">{item.name}</strong>
                    <span className="text-sm text-gray-500">
                      ₱{item.price.toLocaleString()} x {item.cartQty}
                    </span>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.name)}
                    className="text-red-500 opacity-50 hover:opacity-100 transition-opacity p-2 hover:bg-red-50 rounded-full"
                    title="Remove Item"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col mt-auto shrink-0 bg-white">
          <div className="flex justify-start gap-3 p-4 font-semibold text-lg border-t border-b border-[#c084fc] text-black bg-gray-50/50">
            <span>Total:</span>
            <span>₱{cartTotal.toLocaleString()}</span>
          </div>
          <div className="p-4">
            <button 
              onClick={() => navigate('/cashier/payment')}
              className="w-full py-3 bg-gradient-to-b from-[#BF00FF] to-[#4B0082] text-white rounded-lg text-lg font-semibold hover:opacity-90 transition-opacity shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={cartItemsArray.length === 0}
            >
              Confirm
            </button>
          </div>
        </div>
      </aside>
    </main>
  );
}
