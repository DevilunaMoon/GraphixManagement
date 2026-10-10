"use client";

import { useState, useEffect, useMemo } from 'react';
import { Search, Trash2, Loader2, ShieldCheck, ShoppingCart, Plus, Minus, X, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CashierVerifyPickupModal from '../../components/CashierSide/CashierVerifyPickupModal';
import { useBranch } from '../../context/BranchContext';

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
  isPreOwned?: boolean;
}

interface FlattenedItem {
  id: string;
  variantId?: string;
  productId: string;
  cartKey: string;
  name: string;
  cartName: string;
  storage: string;
  price: number;
  originalPrice: number;
  stock: number;
  isPreOwned?: boolean;
  discount?: number;
  discountStartDate?: string | null;
  discountEndDate?: string | null;
}

interface CartItem {
  id: string;
  variantId?: string;
  productId?: string;
  name: string;
  baseName: string;
  cartKey: string;
  price: number;
  originalPrice: number;
  stock: number;
  cartQty: number;
  storage?: string;
  isPreOwned?: boolean;
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
  if (/^\d+$/.test(trimmed)) return `${trimmed} GB`;
  return trimmed;
};

const formatAutoProductId = (modelName: string, variantName?: string, customProductId?: string): string => {
  if (customProductId && customProductId.trim()) {
    return customProductId.trim().toUpperCase();
  }
  const cleanModel = (modelName || 'DEVICE')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  if (!variantName || !variantName.trim() || variantName.toLowerCase() === 'standard' || variantName.toLowerCase() === 'std') {
    return `${cleanModel}-STD`;
  }

  const trimmedVariant = variantName.trim().toUpperCase();
  const storageNumMatch = trimmedVariant.match(/^(\d+)\s*(GB|TB)$/i);
  let cleanVariant = '';
  if (storageNumMatch && storageNumMatch[1]) {
    cleanVariant = storageNumMatch[1];
  } else {
    cleanVariant = trimmedVariant
      .replace(/[^A-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  if (!cleanVariant) cleanVariant = 'STD';
  return `${cleanModel}-${cleanVariant}`;
};

const flattenProductsIntoStorageRows = (products: Product[]): FlattenedItem[] => {
  const items: FlattenedItem[] = [];

  for (const product of products) {
    const rawVars = product.variations || [];
    const storageVars = rawVars.filter(
      (v: any) => !v.type || String(v.type).toLowerCase() === 'storage' || String(v.type).toLowerCase() === 'unit'
    );

    if (storageVars.length > 0) {
      const sorted = [...storageVars].sort((a, b) => {
        return getNumericStorage(String(a.name)) - getNumericStorage(String(b.name));
      });

      for (const v of sorted) {
        const storageLabel = formatStorageLabel(String(v.name));
        const itemPrice = (v.price && Number(v.price) > 0) ? Number(v.price) : product.price;
        const itemStock = (v.stock !== undefined && v.stock !== null) ? Number(v.stock) : product.stock;
        const prodId = v.productId || formatAutoProductId(product.name, v.name);

        items.push({
          id: product.id,
          variantId: v.id,
          productId: prodId,
          cartKey: `${product.id}_${v.id || prodId || v.name}`,
          name: product.name,
          cartName: `${product.name} (${storageLabel})`,
          storage: storageLabel,
          price: itemPrice,
          originalPrice: itemPrice,
          stock: itemStock,
          isPreOwned: product.isPreOwned,
          discount: product.discount,
          discountStartDate: product.discountStartDate,
          discountEndDate: product.discountEndDate
        });
      }
    } else {
      const defaultProdId = (rawVars[0]?.productId) || formatAutoProductId(product.name, 'STD');
      items.push({
        id: product.id,
        variantId: rawVars[0]?.id,
        productId: defaultProdId,
        cartKey: product.id,
        name: product.name,
        cartName: product.name,
        storage: '—',
        price: product.price,
        originalPrice: product.price,
        stock: product.stock,
        isPreOwned: product.isPreOwned,
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
  const { userBranch } = useBranch();
  const [searchQuery, setSearchQuery] = useState('');
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ [key: string]: CartItem }>({});
  const [isLoading, setIsLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setIsLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const activeBranch = userBranch || 'Tagoloan';
      fetch(`/api/devices?page=1&limit=100&search=${encodeURIComponent(searchQuery)}&branch=${encodeURIComponent(activeBranch)}`)
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
  }, [searchQuery, userBranch]);

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
          variantId: item.variantId,
          productId: item.productId,
          name: item.cartName,
          baseName: item.name,
          cartKey: item.cartKey,
          price: effectivePrice,
          originalPrice: item.price,
          stock: item.stock,
          cartQty: 1,
          storage: item.storage,
          isPreOwned: item.isPreOwned,
          discount: item.discount,
          discountStartDate: item.discountStartDate,
          discountEndDate: item.discountEndDate
        }
      };
    });
  };

  const removeFromCart = (cartKey: string) => {
    setCart(prev => {
      const existing = prev[cartKey];
      if (!existing) return prev;

      if (existing.cartQty > 1) {
        return {
          ...prev,
          [cartKey]: {
            ...existing,
            cartQty: existing.cartQty - 1
          }
        };
      }

      const newCart = { ...prev };
      delete newCart[cartKey];
      return newCart;
    });
  };

  const deleteItemFromCart = (cartKey: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      delete newCart[cartKey];
      return newCart;
    });
  };

  const cartItemsArray = Object.values(cart);
  const cartTotal = cartItemsArray.reduce((sum, item) => sum + (item.price * item.cartQty), 0);
  const totalCartCount = useMemo(() => cartItemsArray.reduce((sum, item) => sum + item.cartQty, 0), [cartItemsArray]);

  const handleCheckout = () => {
    if (cartItemsArray.length === 0) return;
    sessionStorage.setItem('pos_cart', JSON.stringify({
      items: cartItemsArray,
      total: cartTotal
    }));
    navigate('/cashier/payment');
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row p-2.5 sm:p-4 md:p-5 gap-4 lg:gap-5 border sm:border-2 border-[#bd00ff] rounded-2xl bg-white shadow-xs pb-24 lg:pb-5">
      
      {/* Products Section */}
      <section className="flex-1 flex flex-col gap-4 overflow-y-auto pr-0 sm:pr-2 custom-scrollbar">
        {/* Top Controls: Title, Search, Verify */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">Devices on Sale</h2>
            <span className="sm:hidden text-xs font-bold px-2.5 py-1 bg-purple-50 text-[#bd00ff] rounded-full border border-purple-200">
              {flattenedItems.length} items
            </span>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="flex items-center border border-[#bd00ff] rounded-xl px-3 py-2 bg-white flex-1 sm:w-64 shadow-xs focus-within:ring-2 focus-within:ring-[#bd00ff]/20">
              <Search size={18} className="text-[#bd00ff] shrink-0" />
              <input 
                type="text" 
                placeholder="Search device name..." 
                className="border-none outline-none pl-2 text-sm w-full text-black placeholder-gray-400 bg-transparent"
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
              />
            </div>

            {/* Verify Customer In-Store Pickup */}
            <button
              type="button"
              onClick={() => setIsVerifyModalOpen(true)}
              className="flex items-center justify-center bg-gradient-to-r from-[#bd00ff] to-[#9c00d6] hover:brightness-105 active:scale-95 text-white rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold shadow-sm transition-all gap-1.5 cursor-pointer border-none shrink-0"
              title="Verify and collect cash for customer in-store pickups"
            >
              <ShieldCheck size={18} className="shrink-0" />
              <span className="whitespace-nowrap">Verify Pickup</span>
            </button>
          </div>
        </div>

        {/* --- DESKTOP VIEW: Products Table (Hidden on Mobile) --- */}
        <div className="hidden md:block overflow-x-auto w-full border-2 border-[#bd00ff]/30 rounded-xl bg-white shadow-sm">
          <table className="w-full text-left border-collapse border border-[#bd00ff]/30 min-w-[550px]">
            <thead>
              <tr className="bg-purple-50/80 text-black whitespace-nowrap">
                <th className="p-3.5 border border-[#bd00ff]/30 font-bold text-[0.95rem] text-left">Device Name</th>
                <th className="p-3.5 border border-[#bd00ff]/30 font-bold text-[0.95rem] text-center w-36">Storage</th>
                <th className="p-3.5 border border-[#bd00ff]/30 font-bold text-[0.95rem] text-right w-36">Price</th>
                <th className="p-3.5 border border-[#bd00ff]/30 font-bold text-[0.95rem] text-center w-28">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center border border-[#bd00ff]/20">
                    <div className="flex flex-col justify-center items-center gap-3">
                      <Loader2 className="w-9 h-9 text-[#bd00ff] animate-spin" />
                      <span className="text-gray-500 font-semibold animate-pulse text-sm">Loading devices...</span>
                    </div>
                  </td>
                </tr>
              ) : flattenedItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500 font-semibold border border-[#bd00ff]/20">
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* --- MOBILE VIEW: Products Cards List (Hidden on Desktop) --- */}
        <div className="block md:hidden space-y-2.5">
          {isLoading ? (
            <div className="py-16 text-center border-2 border-dashed border-[#bd00ff]/20 rounded-2xl bg-purple-50/30">
              <div className="flex flex-col justify-center items-center gap-3">
                <Loader2 className="w-8 h-8 text-[#bd00ff] animate-spin" />
                <span className="text-gray-500 font-medium text-xs">Loading devices...</span>
              </div>
            </div>
          ) : flattenedItems.length === 0 ? (
            <div className="py-12 text-center text-gray-500 font-medium text-sm border-2 border-dashed border-gray-200 rounded-2xl">
              No products found.
            </div>
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
                <div
                  key={item.cartKey}
                  onClick={() => !isMaxedOut && addToCart(item)}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isMaxedOut
                      ? 'border-gray-200 bg-gray-50/70 opacity-60 cursor-not-allowed'
                      : 'border-purple-100 bg-white hover:border-[#bd00ff] active:scale-[0.99] shadow-xs cursor-pointer'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-gray-900 text-sm leading-snug break-words">{item.name}</h4>
                        {item.isPreOwned && (
                          <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                            Pre-Owned
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {item.storage !== '—' && (
                          <span className="text-[11px] font-bold bg-purple-50 text-[#bd00ff] px-2 py-0.5 rounded-md border border-purple-200/60">
                            {item.storage}
                          </span>
                        )}
                        <span className={`text-[11px] font-semibold ${isMaxedOut ? 'text-red-500' : 'text-emerald-600'}`}>
                          {isMaxedOut ? 'Out of stock' : `${remainingStock} available`}
                        </span>
                      </div>
                    </div>

                    {/* Price and Add Action */}
                    <div className="flex flex-col items-end shrink-0 gap-1.5">
                      {isDiscountActive ? (
                        <div className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <span className="text-sm font-black text-[#bd00ff]">
                              ₱{effectivePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[9px] font-extrabold bg-rose-100 text-rose-700 px-1 py-0.5 rounded">
                              -{item.discount}%
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400 line-through">
                            ₱{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm font-black text-gray-900">
                          ₱{productPriceFormatted(item.price)}
                        </span>
                      )}

                      <button
                        type="button"
                        disabled={isMaxedOut}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isMaxedOut) addToCart(item);
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                          isMaxedOut 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : currentQty > 0
                              ? 'bg-[#bd00ff] text-white shadow-xs'
                              : 'bg-purple-50 hover:bg-[#bd00ff] text-[#bd00ff] hover:text-white border border-[#bd00ff]/30 active:scale-95'
                        }`}
                      >
                        {currentQty > 0 ? (
                          <>
                            <span>Added</span>
                            <span className="bg-white text-[#bd00ff] text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                              {currentQty}
                            </span>
                          </>
                        ) : (
                          <>
                            <Plus size={13} strokeWidth={3} />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        {!isLoading && totalPages > 1 && (
          <div>
            {/* Desktop Pagination */}
            <div className="hidden sm:flex items-center justify-between mt-4 pt-4 border-t border-purple-100 gap-4">
              <span className="text-xs font-semibold text-gray-500">
                Showing {flattenedItems.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, flattenedItems.length)} of {flattenedItems.length} items
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#bd00ff] text-[#bd00ff] hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-xs cursor-pointer shadow-sm"
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
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-all border shadow-sm cursor-pointer ${
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
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#bd00ff] text-[#bd00ff] hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-xs cursor-pointer shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Mobile Pagination */}
            <div className="flex sm:hidden items-center justify-between pt-3 border-t border-purple-100">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-[#bd00ff] text-[#bd00ff] font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-[#bd00ff] text-[#bd00ff] font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* --- DESKTOP CART SIDEBAR (Hidden on Mobile) --- */}
      <aside className="hidden lg:flex w-[320px] shrink-0 border-2 border-[#bd00ff] rounded-2xl flex-col overflow-hidden bg-white min-h-[400px]">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-black flex items-center gap-2">
            <ShoppingCart size={18} className="text-[#bd00ff]" />
            Cart Items
          </h3>
          <span className="text-xs font-bold px-2 py-0.5 bg-purple-50 text-[#bd00ff] rounded-full">
            {totalCartCount}
          </span>
        </div>

        <div className="flex-1 p-0 overflow-y-auto max-h-[460px]">
          {cartItemsArray.length === 0 ? (
            <div className="p-8 text-gray-400 text-center h-full flex flex-col items-center justify-center gap-2 text-sm">
              <ShoppingCart size={32} className="text-gray-300" />
              <span>Cart is empty</span>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {cartItemsArray.map(item => (
                <div key={item.cartKey} className="flex justify-between items-center px-4 py-3 group hover:bg-purple-50/30 transition-colors">
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0 pr-2">
                    <strong className="text-sm text-black leading-tight truncate">{item.name}</strong>
                    <span className="text-xs text-gray-500">
                      ₱{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} x {item.cartQty}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                      onClick={() => removeFromCart(item.cartKey)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg cursor-pointer"
                      title="Decrease or remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col mt-auto shrink-0 bg-white">
          <div className="flex justify-between items-center p-4 font-bold text-base border-t border-b border-[#c084fc] text-black bg-gray-50/50">
            <span>Total:</span>
            <span className="text-lg text-[#bd00ff]">
              ₱{cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-4">
            <button 
              onClick={handleCheckout}
              className="w-full py-3 bg-gradient-to-r from-[#BF00FF] to-[#4B0082] text-white rounded-xl text-base font-bold hover:brightness-105 active:scale-98 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-none"
              disabled={cartItemsArray.length === 0}
            >
              Confirm & Pay
            </button>
          </div>
        </div>
      </aside>

      {/* --- MOBILE STICKY BOTTOM CART BAR (Visible only on Mobile) --- */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-[#bd00ff] shadow-[0_-4px_24px_rgba(189,0,255,0.15)] px-4 py-2.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsMobileCartOpen(true)}
          className="flex items-center gap-2.5 text-left bg-transparent border-none cursor-pointer"
        >
          <div className="relative p-2 rounded-xl bg-purple-50 text-[#bd00ff]">
            <ShoppingCart size={20} />
            {totalCartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-gradient-to-r from-[#bd00ff] to-[#9c00d6] text-white text-[10px] font-black rounded-full w-4.5 h-4.5 flex items-center justify-center shadow-xs">
                {totalCartCount}
              </span>
            )}
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Order Total</div>
            <div className="text-sm font-black text-gray-900 leading-tight">
              ₱{cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="px-3 py-2 text-xs font-bold text-[#bd00ff] bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 cursor-pointer"
          >
            Cart ({totalCartCount})
          </button>
          <button
            type="button"
            onClick={handleCheckout}
            disabled={cartItemsArray.length === 0}
            className="px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#bd00ff] to-[#9c00d6] hover:brightness-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-sm border-none cursor-pointer flex items-center gap-1"
          >
            <span>Confirm</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* --- MOBILE CART BOTTOM SHEET DRAWER --- */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileCartOpen(false)}
          />
          <div className="relative bg-white rounded-t-3xl shadow-2xl border-t-2 border-[#bd00ff] max-h-[82vh] flex flex-col z-50 animate-in slide-in-from-bottom duration-200">
            {/* Grab handle indicator */}
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-2.5" />
            
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart size={20} className="text-[#bd00ff]" />
                <h3 className="text-base font-bold text-gray-900">Current Order ({totalCartCount} items)</h3>
              </div>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 bg-gray-100 border-none cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto divide-y divide-gray-100">
              {cartItemsArray.length === 0 ? (
                <div className="py-12 text-center text-gray-400 font-medium text-sm">
                  Your cart is empty. Tap any device above to add.
                </div>
              ) : (
                cartItemsArray.map(item => (
                  <div key={item.cartKey} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        ₱{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} each
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => removeFromCart(item.cartKey)}
                        className="w-7 h-7 rounded-lg border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50 cursor-pointer"
                        title="Reduce"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-5 text-center font-bold text-sm text-gray-900">
                        {item.cartQty}
                      </span>
                      <button
                        onClick={() => {
                          const flatItem = flattenedItems.find(f => f.cartKey === item.cartKey);
                          if (flatItem) addToCart(flatItem);
                        }}
                        disabled={item.cartQty >= item.stock}
                        className="w-7 h-7 rounded-lg border border-[#bd00ff] bg-purple-50 text-[#bd00ff] flex items-center justify-center hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        title="Add"
                      >
                        <Plus size={13} />
                      </button>
                      <button
                        onClick={() => deleteItemFromCart(item.cartKey)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer ml-1"
                        title="Remove all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/70">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-gray-600">Total</span>
                <span className="text-xl font-black text-gray-900">
                  ₱{cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <button
                onClick={() => {
                  setIsMobileCartOpen(false);
                  handleCheckout();
                }}
                disabled={cartItemsArray.length === 0}
                className="w-full py-3.5 bg-gradient-to-r from-[#bd00ff] to-[#9c00d6] text-white rounded-xl text-base font-bold shadow-md hover:brightness-105 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-none"
              >
                Confirm & Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify In-Store Pickup Modal */}
      <CashierVerifyPickupModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
      />
    </div>
  );
}

const productPriceFormatted = (price: number): string => {
  return (price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
