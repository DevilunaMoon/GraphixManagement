"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash, Minus, Plus, ChevronLeft } from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    try {
      const res = await fetch('/api/cart');
      if (res.ok) {
        const data = await res.json();
        setCartItems(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch cart', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const updateQuantity = async (id: string, newQty: number) => {
    if (newQty < 1) return;
    try {
      // optimistic update
      setCartItems(prev => prev.map(item => item.id === id ? { ...item, quantity: newQty } : item));
      const res = await fetch(`/api/cart/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty })
      });
      if (res.ok) window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      console.error(err);
    }
  };

  const removeItem = async (id: string) => {
    try {
      setCartItems(prev => prev.filter(item => item.id !== id));
      setSelectedItemIds(prev => prev.filter(selectedId => selectedId !== id));
      const res = await fetch(`/api/cart/${id}`, { method: 'DELETE' });
      if (res.ok) window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItemIds.length === cartItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(cartItems.map(item => item.id));
    }
  };

  const selectedItems = cartItems.filter(item => selectedItemIds.includes(item.id));
  
  const subtotalOriginal = selectedItems.reduce((acc, item) => {
    const vars = item.variations ? JSON.parse(item.variations) : [];
    const price = vars.length > 0 ? vars.reduce((sum: number, v: any) => sum + (v.price || 0), 0) : item.device.price;
    return acc + (price * item.quantity);
  }, 0);

  const now = new Date();

  const totalDiscountSaved = selectedItems.reduce((acc, item) => {
    const vars = item.variations ? JSON.parse(item.variations) : [];
    const basePrice = vars.length > 0 ? vars.reduce((sum: number, v: any) => sum + (v.price || 0), 0) : item.device.price;
    const isDiscountActive = Boolean(
      item.device.discount && 
      item.device.discount > 0 &&
      (!item.device.discountStartDate || new Date(item.device.discountStartDate) <= now) &&
      (!item.device.discountEndDate || new Date(item.device.discountEndDate) >= now)
    );
    const discount = isDiscountActive ? item.device.discount : 0;
    const saved = discount > 0 ? (basePrice * (discount / 100)) * item.quantity : 0;
    return acc + saved;
  }, 0);

  const totalPrice = Math.max(0, subtotalOriginal - totalDiscountSaved);

  const handleCheckout = () => {
    if (selectedItemIds.length === 0) return;
    const ids = selectedItemIds.join(',');
    router.push(`/customer/payment?cartItemIds=${ids}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <div className="w-10 h-10 border-4 border-purple-200 border-t-[#8b00cc] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 font-['Inter'] max-w-7xl mx-auto flex flex-col gap-6 w-full">
      <div className="flex items-center gap-3.5">
        <button 
          onClick={() => router.back()} 
          className="w-10 h-10 rounded-2xl bg-white hover:bg-purple-50 border border-purple-100/80 hover:border-purple-300 text-gray-700 hover:text-[#8b00cc] transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
          title="Back"
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-[#8b00cc] tracking-widest uppercase">Shopping Bag</span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight m-0">My Cart</h2>
        </div>
      </div>

      {cartItems.length === 0 ? (
        <div className="bg-white p-12 sm:p-16 rounded-3xl shadow-sm border border-purple-100/90 flex flex-col items-center justify-center text-center gap-4 max-w-lg mx-auto w-full my-6">
          <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center text-[#8b00cc] mb-1">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h3 className="text-2xl font-black text-gray-950 tracking-tight m-0">Your cart is empty</h3>
          <p className="text-gray-500 font-medium text-xs sm:text-sm m-0 max-w-xs">Looks like you haven't added any devices or accessories to your cart yet.</p>
          <button 
            onClick={() => router.push('/customer/products')} 
            className="mt-2 px-8 py-3.5 bg-gradient-to-r from-[#8b00cc] via-[#9d00e6] to-[#bd00ff] hover:from-[#7a00b3] hover:to-[#a900e6] text-white rounded-2xl font-black text-sm shadow-md shadow-purple-500/25 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer border-none"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 w-full bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-purple-100/90 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-purple-100">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={selectedItemIds.length === cartItems.length && cartItems.length > 0} 
                  onChange={toggleSelectAll} 
                  className="w-4.5 h-4.5 accent-[#8b00cc] cursor-pointer rounded" 
                />
                <span className="font-bold text-gray-900 text-sm">Select All ({cartItems.length} items)</span>
              </label>
              {selectedItemIds.length > 0 && (
                <span className="text-xs font-bold text-[#8b00cc] bg-purple-50 px-2.5 py-1 rounded-full">
                  {selectedItemIds.length} Selected
                </span>
              )}
            </div>

            <div className="flex flex-col gap-3.5">
              {cartItems.map(item => {
                const vars = item.variations ? JSON.parse(item.variations) : [];
                const basePrice = vars.length > 0 ? vars.reduce((sum: number, v: any) => sum + (v.price || 0), 0) : item.device.price;
                const maxStock = vars.length > 0 
                  ? Math.min(...vars.map((v: any) => v.stock !== undefined ? v.stock : item.device.stock))
                  : item.device.stock;
                const isDiscountActive = Boolean(
                  item.device.discount && 
                  item.device.discount > 0 &&
                  (!item.device.discountStartDate || new Date(item.device.discountStartDate) <= now) &&
                  (!item.device.discountEndDate || new Date(item.device.discountEndDate) >= now)
                );
                const discountPercent = isDiscountActive ? item.device.discount : 0;
                const effectiveUnitPrice = discountPercent > 0 ? (basePrice * (1 - discountPercent / 100)) : basePrice;
                const img = item.device.images?.[0] || item.device.image;

                return (
                  <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border border-purple-100/80 rounded-2xl bg-[#faf8fd] hover:border-purple-300 transition-colors shadow-2xs">
                    <input 
                      type="checkbox" 
                      checked={selectedItemIds.includes(item.id)} 
                      onChange={() => toggleSelect(item.id)} 
                      className="w-4.5 h-4.5 accent-[#8b00cc] cursor-pointer shrink-0 mt-1 sm:mt-0 rounded" 
                    />
                    
                    <div className="w-20 h-20 bg-white rounded-xl overflow-hidden shrink-0 border border-purple-100 p-1.5 flex items-center justify-center relative">
                      {discountPercent > 0 && (
                        <span className="absolute top-1 left-1 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded shadow-2xs">
                          {discountPercent}% OFF
                        </span>
                      )}
                      {img ? <img src={img} alt={item.device.name} className="w-full h-full object-contain mix-blend-multiply" /> : <span className="text-[10px] text-gray-400 font-bold">No Image</span>}
                    </div>

                    <div className="flex-1 flex flex-col gap-0.5">
                      <h4 className="font-bold text-base text-gray-950 m-0 leading-snug">{item.device.name}</h4>
                      {vars.length > 0 && (
                        <span className="text-xs text-purple-700 font-semibold">
                          {vars.map((v: any) => v.name).join(', ')}
                        </span>
                      )}
                      <div className="flex items-baseline gap-2 flex-wrap mt-0.5">
                        <span className="text-[#8b00cc] font-black text-lg">₱ {(effectiveUnitPrice * item.quantity).toLocaleString()}</span>
                        {discountPercent > 0 && (
                          <span className="text-xs text-gray-400 line-through font-semibold">₱ {(basePrice * item.quantity).toLocaleString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="flex items-center border border-purple-200/80 rounded-xl bg-white overflow-hidden p-0.5">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 bg-transparent border-none text-gray-700 hover:bg-purple-50 hover:text-[#8b00cc] rounded-lg cursor-pointer disabled:opacity-30 flex items-center justify-center" disabled={item.quantity <= 1}><Minus size={13} strokeWidth={2.5} /></button>
                        <span className="w-7 text-center font-black text-xs text-gray-900">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 bg-transparent border-none text-gray-700 hover:bg-purple-50 hover:text-[#8b00cc] rounded-lg cursor-pointer disabled:opacity-30 flex items-center justify-center" disabled={item.quantity >= maxStock || maxStock <= 0}><Plus size={13} strokeWidth={2.5} /></button>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl cursor-pointer bg-transparent border-none transition-colors" title="Remove item">
                        <Trash size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Summary Sticky Card */}
          <div className="w-full lg:w-[340px] bg-white rounded-3xl p-6 shadow-sm border border-purple-100/90 flex flex-col gap-4 sticky top-24">
            <h3 className="font-black text-lg text-gray-950 m-0 border-b border-purple-100 pb-3">Order Summary</h3>
            <div className="flex justify-between items-center text-gray-600 font-semibold text-xs sm:text-sm">
              <span>Selected Items</span>
              <span className="font-bold text-gray-900">{selectedItems.length}</span>
            </div>
            {totalDiscountSaved > 0 && (
              <>
                <div className="flex justify-between items-center text-gray-500 font-medium text-xs sm:text-sm">
                  <span>Subtotal</span>
                  <span>₱ {subtotalOriginal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-rose-600 font-bold text-xs sm:text-sm">
                  <span>Discount Savings</span>
                  <span>- ₱ {totalDiscountSaved.toLocaleString()}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center text-gray-900 font-black text-lg pt-3 border-t border-purple-100">
              <span>Total</span>
              <span className="text-[#8b00cc]">₱ {totalPrice.toLocaleString()}</span>
            </div>
            <button 
              onClick={handleCheckout}
              disabled={selectedItemIds.length === 0}
              className="w-full py-3.5 mt-2 bg-gradient-to-r from-[#8b00cc] via-[#9d00e6] to-[#bd00ff] hover:from-[#7a00b3] hover:to-[#a900e6] text-white font-black text-sm rounded-xl border-none cursor-pointer shadow-md shadow-purple-500/25 hover:shadow-lg hover:-translate-y-0.5 transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Checkout ({selectedItems.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
