"use client";

import { useState, useRef, useEffect } from 'react';
import { Filter, Search, Trash2, Loader2, ShieldCheck, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CashierVerifyPickupModal from '../../components/CashierSide/CashierVerifyPickupModal';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string | null;
  stock: number;
  specs?: string | null;
  variations?: any[];
  discount?: number;
  discountStartDate?: string | null;
  discountEndDate?: string | null;
}

interface CartItem extends Product {
  cartQty: number;
}

const getDeviceStorage = (device: Product): string => {
  if (device.variations && Array.isArray(device.variations)) {
    const storageVars = device.variations.filter(
      (v: any) => v.type && String(v.type).toLowerCase() === 'storage'
    );
    if (storageVars.length > 0) {
      const formatted = Array.from(
        new Set(
          storageVars.map((v: any) => {
            const val = String(v.name).trim();
            return /gb|tb/i.test(val) ? val.toUpperCase() : `${val}GB`;
          })
        )
      );
      return formatted.join(' / ');
    }
  }

  if (device.specs) {
    const specs = String(device.specs);
    const storageLineMatch =
      specs.match(/(?:ROM|storage|internal)\s*[:\-]?\s*([0-9\s/+,]+(?:GB|TB))/i) ||
      specs.match(/([0-9\s/+,]+(?:GB|TB))\s*(?:storage|ROM|internal)/i) ||
      specs.match(/([0-9]+(?:\s*\/\s*[0-9]+)?\s*(?:GB|TB))\s*storage/i);
    if (storageLineMatch && storageLineMatch[1]) {
      return storageLineMatch[1].trim();
    }
    const generalMatch = specs.match(/\b([0-9]{2,4}\s*(?:GB|TB))\b/i);
    if (generalMatch && generalMatch[1]) {
      return generalMatch[1].trim();
    }
  }

  return '—';
};

export default function CashierDashboard() {
  const router = useRouter();
  const navigate = router.push;
  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState('All Brands');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ [key: string]: CartItem }>({});
  const [isLoading, setIsLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetch(`/api/devices?page=${currentPage}&limit=10&search=${encodeURIComponent(searchQuery)}&brand=${encodeURIComponent(brandFilter === 'All Brands' ? '' : brandFilter)}`)
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

            {/* Verify Customer In-Store Pickup */}
            <button
              type="button"
              onClick={() => setIsVerifyModalOpen(true)}
              className="flex items-center justify-center bg-[#bd00ff] hover:bg-[#9c00d6] text-white rounded-lg px-4 py-2 text-sm font-bold shadow-sm transition-all gap-1.5 cursor-pointer border-none shrink-0"
              title="Verify and collect cash for customer in-store pickups by Name, Phone, or Claim Code"
            >
              <ShieldCheck size={18} />
              <span className="hidden sm:inline">Verify Pickup</span>
            </button>
          </div>
        </div>
 
        {/* Products Table */}
        <div className="overflow-x-auto w-full border-2 border-[#bd00ff] rounded-xl bg-white shadow-sm">
          <table className="w-full text-left border-collapse border border-[#bd00ff]/30 min-w-[550px]">
            <thead>
              <tr className="bg-purple-50/80 text-black whitespace-nowrap">
                <th className="p-3.5 border border-[#bd00ff]/30 font-bold text-[0.95rem] text-left">Device Name</th>
                <th className="p-3.5 border border-[#bd00ff]/30 font-bold text-[0.95rem] text-center w-36">Storage</th>
                <th className="p-3.5 border border-[#bd00ff]/30 font-bold text-[0.95rem] text-right w-36">Price</th>
                <th className="p-3.5 border border-[#bd00ff]/30 font-bold text-[0.95rem] text-center w-28">Quantity</th>
                <th className="p-3.5 border border-[#bd00ff]/30 font-bold text-[0.95rem] text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center border border-[#bd00ff]/20">
                    <div className="flex flex-col justify-center items-center gap-3">
                      <Loader2 className="w-9 h-9 text-[#bd00ff] animate-spin" />
                      <span className="text-gray-500 font-semibold animate-pulse text-sm">Loading devices...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500 font-semibold border border-[#bd00ff]/20">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map(product => {
                  const currentQty = cart[product.name]?.cartQty || 0;
                  const remainingStock = Math.max(0, product.stock - currentQty);
                  const isMaxedOut = remainingStock <= 0;
                  const storage = getDeviceStorage(product);

                  const now = new Date();
                  const hasDiscount = (product.discount || 0) > 0;
                  const isScheduled = hasDiscount && product.discountStartDate && new Date(product.discountStartDate) > now;
                  const isExpired = hasDiscount && product.discountEndDate && new Date(product.discountEndDate) < now;
                  const isDiscountActive = hasDiscount && !isScheduled && !isExpired;
                  const effectivePrice = isDiscountActive ? product.price * (1 - (product.discount || 0) / 100) : product.price;

                  return (
                    <tr
                      key={product.id}
                      onClick={() => !isMaxedOut && addToCart(product)}
                      className={`transition-colors border-b border-[#bd00ff]/20 ${
                        isMaxedOut
                          ? 'opacity-55 bg-gray-50/50 cursor-not-allowed'
                          : 'cursor-pointer hover:bg-purple-50/60'
                      }`}
                      title={isMaxedOut ? 'Out of stock or max added' : `Click to add ${product.name} to cart`}
                    >
                      <td className="p-3.5 border border-[#bd00ff]/20 font-bold text-black text-[0.95rem] align-middle">
                        <span className="leading-snug">{product.name}</span>
                      </td>
                      <td className="p-3.5 border border-[#bd00ff]/20 text-center align-middle whitespace-nowrap">
                        {storage !== '—' ? (
                          <span className="inline-block px-2.5 py-1 text-xs font-bold bg-purple-50 text-[#9c00d6] rounded-md border border-purple-200">
                            {storage}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-medium text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3.5 border border-[#bd00ff]/20 text-right align-middle whitespace-nowrap">
                        {isDiscountActive ? (
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className="font-bold text-[#bd00ff] text-[0.95rem]">
                                ₱{effectivePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-1.5 py-0.5 rounded border border-rose-200">
                                {product.discount}% OFF
                              </span>
                            </div>
                            <span className="text-xs text-gray-400 line-through">
                              ₱{product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-black text-[0.95rem]">
                            ₱{product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 border border-[#bd00ff]/20 text-center align-middle whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full ${
                            isMaxedOut
                              ? 'bg-red-50 text-red-600 border border-red-200'
                              : 'bg-green-50 text-green-700 border border-green-200'
                          }`}
                        >
                          {isMaxedOut ? 'Max Out' : `${remainingStock}x left`}
                        </span>
                      </td>
                      <td className="p-3.5 border border-[#bd00ff]/20 text-center align-middle whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isMaxedOut) addToCart(product);
                          }}
                          disabled={isMaxedOut}
                          className="px-3.5 py-1.5 rounded-lg bg-[#bd00ff] hover:bg-[#9c00d6] text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1 mx-auto disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-none"
                          title={isMaxedOut ? 'No more stock available' : 'Add to Cart'}
                        >
                          <Plus size={14} />
                          <span>Add</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!isLoading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t border-purple-100 gap-4">
            <span className="text-sm font-semibold text-gray-500">
              Showing {totalItems === 0 ? 0 : (currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, totalItems)} of {totalItems} items
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
              onClick={() => {
                sessionStorage.setItem('pos_cart', JSON.stringify({
                  items: cartItemsArray,
                  total: cartTotal
                }));
                navigate('/cashier/payment');
              }}
              className="w-full py-3 bg-gradient-to-b from-[#BF00FF] to-[#4B0082] text-white rounded-lg text-lg font-semibold hover:opacity-90 transition-opacity shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              disabled={cartItemsArray.length === 0}
            >
              Confirm
            </button>
          </div>
        </div>
      </aside>

      <CashierVerifyPickupModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
      />
    </main>
  );
}
