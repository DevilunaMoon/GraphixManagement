"use client";

import { useState, useRef, useEffect, useMemo } from 'react';
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

interface FlattenedItem {
  id: string;
  cartKey: string;
  name: string;
  cartName: string;
  storage: string;
  price: number;
  stock: number;
  discount?: number;
  discountStartDate?: string | null;
  discountEndDate?: string | null;
}

interface CartItem {
  id: string;
  name: string;
  cartKey: string;
  price: number;
  stock: number;
  cartQty: number;
  storage?: string;
  discount?: number;
  discountStartDate?: string | null;
  discountEndDate?: string | null;
}

const getNumericStorage = (name: string): number => {
  const match = name.match(/(\d+)/);
  if (!match || !match[1]) return 0;
  const num = parseInt(match[1], 10);
  if (/tb/i.test(name)) return num * 1024;
  return num;
};

const formatStorageLabel = (raw: string): string => {
  const trimmed = raw.trim();
  if (/gb|tb/i.test(trimmed)) return trimmed.toUpperCase();
  return `${trimmed}GB`;
};

const flattenProductsIntoStorageRows = (products: Product[]): FlattenedItem[] => {
  const items: FlattenedItem[] = [];

  for (const product of products) {
    const storageVars = (product.variations || []).filter(
      (v: any) => v.type && String(v.type).toLowerCase() === 'storage'
    );

    if (storageVars.length > 0) {
      const sorted = [...storageVars].sort((a, b) => {
        return getNumericStorage(String(a.name)) - getNumericStorage(String(b.name));
      });

      for (const v of sorted) {
        const storageLabel = formatStorageLabel(String(v.name));
        const itemPrice = (v.price && Number(v.price) > 0) ? Number(v.price) : product.price;
        const itemStock = (v.stock !== undefined && v.stock !== null) ? Number(v.stock) : product.stock;

        items.push({
          id: product.id,
          cartKey: `${product.id}_${v.id || v.name}`,
          name: product.name,
          cartName: `${product.name} (${storageLabel})`,
          storage: storageLabel,
          price: itemPrice,
          stock: itemStock,
          discount: product.discount,
          discountStartDate: product.discountStartDate,
          discountEndDate: product.discountEndDate
        });
      }
    } else {
      items.push({
        id: product.id,
        cartKey: product.id,
        name: product.name,
        cartName: product.name,
        storage: '—',
        price: product.price,
        stock: product.stock,
        discount: product.discount,
        discountStartDate: product.discountStartDate,
        discountEndDate: product.discountEndDate
      });
    }
  }

  return items;
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
  const itemsPerPage = 10;

  useEffect(() => {
    setIsLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetch(`/api/devices?page=1&limit=100&search=${encodeURIComponent(searchQuery)}&brand=${encodeURIComponent(brandFilter === 'All Brands' ? '' : brandFilter)}`)
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.devices)) {
            setProducts(data.devices);
          } else if (Array.isArray(data)) {
            setProducts(data);
          } else {
            setProducts([]);
          }
        })
        .catch(err => {
          console.error(err);
          setProducts([]);
        })
        .finally(() => setIsLoading(false));
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, brandFilter]);

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

  const flattenedItems = useMemo(() => {
    return flattenProductsIntoStorageRows(products);
  }, [products]);

  const totalPages = Math.max(1, Math.ceil(flattenedItems.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return flattenedItems.slice(startIndex, startIndex + itemsPerPage);
  }, [flattenedItems, currentPage]);

  const addToCart = (item: FlattenedItem) => {
    setCart(prev => {
      const existing = prev[item.cartKey];
      const currentQty = existing ? existing.cartQty : 0;
      if (currentQty >= item.stock) return prev; // Limit reached

      const now = new Date();
      const hasDiscount = (item.discount || 0) > 0;
      const isScheduled = hasDiscount && item.discountStartDate && new Date(item.discountStartDate) > now;
      const isExpired = hasDiscount && item.discountEndDate && new Date(item.discountEndDate) < now;
      const isDiscountActive = hasDiscount && !isScheduled && !isExpired;
      const effectivePrice = isDiscountActive ? item.price * (1 - (item.discount || 0) / 100) : item.price;

      if (existing) {
        return {
          ...prev,
          [item.cartKey]: { ...existing, cartQty: existing.cartQty + 1 }
        };
      }
      return {
        ...prev,
        [item.cartKey]: {
          id: item.id,
          name: item.cartName,
          cartKey: item.cartKey,
          price: effectivePrice,
          stock: item.stock,
          cartQty: 1,
          storage: item.storage,
          discount: item.discount,
          discountStartDate: item.discountStartDate,
          discountEndDate: item.discountEndDate
        }
      };
    });
  };

  const removeFromCart = (cartKey: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      delete newCart[cartKey];
      return newCart;
    });
  };

  const cartItemsArray = Object.values(cart);
  const cartTotal = cartItemsArray.reduce((sum, item) => sum + (item.price * item.cartQty), 0);

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
              ) : flattenedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500 font-semibold border border-[#bd00ff]/20">
                    No products found.
                  </td>
                </tr>
              ) : (
                paginatedItems.map(item => {
                  const currentQty = cart[item.cartKey]?.cartQty || 0;
                  const remainingStock = Math.max(0, item.stock - currentQty);
                  const isMaxedOut = remainingStock <= 0;

                  const now = new Date();
                  const hasDiscount = (item.discount || 0) > 0;
                  const isScheduled = hasDiscount && item.discountStartDate && new Date(item.discountStartDate) > now;
                  const isExpired = hasDiscount && item.discountEndDate && new Date(item.discountEndDate) < now;
                  const isDiscountActive = hasDiscount && !isScheduled && !isExpired;
                  const effectivePrice = isDiscountActive ? item.price * (1 - (item.discount || 0) / 100) : item.price;

                  return (
                    <tr
                      key={item.cartKey}
                      onClick={() => !isMaxedOut && addToCart(item)}
                      className={`transition-colors border-b border-[#bd00ff]/20 ${
                        isMaxedOut
                          ? 'opacity-55 bg-gray-50/50 cursor-not-allowed'
                          : 'cursor-pointer hover:bg-purple-50/60'
                      }`}
                      title={isMaxedOut ? 'Out of stock or max added' : `Click to add ${item.cartName} to cart`}
                    >
                      <td className="p-3.5 border border-[#bd00ff]/20 font-bold text-black text-[0.95rem] align-middle">
                        <span className="leading-snug">{item.name}</span>
                      </td>
                      <td className="p-3.5 border border-[#bd00ff]/20 text-center align-middle whitespace-nowrap">
                        {item.storage !== '—' ? (
                          <span className="inline-block px-2.5 py-1 text-xs font-bold bg-purple-50 text-[#9c00d6] rounded-md border border-purple-200">
                            {item.storage}
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
                                {item.discount}% OFF
                              </span>
                            </div>
                            <span className="text-xs text-gray-400 line-through">
                              ₱{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-black text-[0.95rem]">
                            ₱{productPriceFormatted(item.price)}
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
                            if (!isMaxedOut) addToCart(item);
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
              Showing {flattenedItems.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, flattenedItems.length)} of {flattenedItems.length} items
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
                <div key={item.cartKey} className="flex justify-between items-center border-b border-gray-100 px-4 py-3 group">
                  <div className="flex flex-col gap-1">
                    <strong className="text-[0.95rem] text-black leading-tight pr-2">{item.name}</strong>
                    <span className="text-sm text-gray-500">
                      ₱{item.price.toLocaleString()} x {item.cartQty}
                    </span>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.cartKey)}
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

const productPriceFormatted = (price: number): string => {
  return (price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
