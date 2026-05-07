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
  const totalPrice = selectedItems.reduce((acc, item) => {
    const vars = item.variations ? JSON.parse(item.variations) : [];
    const price = vars.length > 0 ? vars.reduce((sum: number, v: any) => sum + (v.price || 0), 0) : item.device.price;
    return acc + (price * item.quantity);
  }, 0);

  const handleCheckout = () => {
    if (selectedItemIds.length === 0) return;
    const ids = selectedItemIds.join(',');
    router.push(`/customer/payment?cartItemIds=${ids}`);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full"><div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="p-6 md:p-10 font-['Inter'] max-w-5xl mx-auto flex flex-col gap-8 h-full">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="bg-transparent border-none cursor-pointer text-gray-700 hover:text-[#bd00ff]"><ChevronLeft size={36} /></button>
        <h2 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#bd00ff] to-[#01f0ff] uppercase m-0">My Cart</h2>
      </div>

      {cartItems.length === 0 ? (
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center gap-4">
          <p className="text-gray-500 font-semibold text-lg m-0">Your cart is empty.</p>
          <button onClick={() => router.push('/customer/products')} className="px-6 py-3 bg-[#bd00ff] text-white rounded-xl font-bold cursor-pointer border-none shadow-md hover:bg-[#9c00d6]">Browse Products</button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 w-full bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col gap-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <input type="checkbox" checked={selectedItemIds.length === cartItems.length && cartItems.length > 0} onChange={toggleSelectAll} className="w-5 h-5 accent-[#bd00ff] cursor-pointer" />
              <span className="font-bold text-gray-700">Select All ({cartItems.length} items)</span>
            </div>

            <div className="flex flex-col gap-6">
              {cartItems.map(item => {
                const vars = item.variations ? JSON.parse(item.variations) : [];
                const itemPrice = vars.length > 0 ? vars.reduce((sum: number, v: any) => sum + (v.price || 0), 0) : item.device.price;
                const img = item.device.images?.[0] || item.device.image;

                return (
                  <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border border-gray-100 rounded-2xl bg-gray-50/50 hover:border-purple-200 transition-colors">
                    <input type="checkbox" checked={selectedItemIds.includes(item.id)} onChange={() => toggleSelect(item.id)} className="w-5 h-5 accent-[#bd00ff] cursor-pointer shrink-0 mt-2 sm:mt-0" />
                    
                    <div className="w-24 h-24 bg-white rounded-xl overflow-hidden shrink-0 border border-gray-100 p-2 flex items-center justify-center">
                      {img ? <img src={img} alt={item.device.name} className="w-full h-full object-contain mix-blend-multiply" /> : <span className="text-xs text-gray-400">No Image</span>}
                    </div>

                    <div className="flex-1 flex flex-col gap-1">
                      <h4 className="font-bold text-lg text-black m-0">{item.device.name}</h4>
                      {vars.length > 0 && (
                        <span className="text-sm text-gray-500 font-medium">
                          {vars.map((v: any) => v.name).join(', ')}
                        </span>
                      )}
                      <span className="text-[#bd00ff] font-bold text-xl mt-1">₱ {(itemPrice * item.quantity).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-6 mt-4 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="flex items-center border-2 border-gray-200 rounded-xl bg-white overflow-hidden">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-3 py-2 bg-transparent border-none text-gray-700 hover:bg-gray-100 cursor-pointer disabled:opacity-30" disabled={item.quantity <= 1}><Minus size={16} /></button>
                        <span className="w-8 text-center font-bold text-sm text-black">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-3 py-2 bg-transparent border-none text-gray-700 hover:bg-gray-100 cursor-pointer disabled:opacity-30" disabled={item.quantity >= item.device.stock}><Plus size={16} /></button>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer bg-transparent border-none transition-colors" title="Remove item">
                        <Trash size={20} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-full lg:w-[350px] bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col gap-6 sticky top-6">
            <h3 className="font-bold text-xl text-black m-0 border-b border-gray-100 pb-4">Order Summary</h3>
            <div className="flex justify-between items-center text-gray-600 font-medium">
              <span>Selected Items</span>
              <span>{selectedItems.length}</span>
            </div>
            <div className="flex justify-between items-center text-gray-900 font-bold text-xl pt-4 border-t border-gray-100">
              <span>Total</span>
              <span className="text-[#bd00ff]">₱ {totalPrice.toLocaleString()}</span>
            </div>
            <button 
              onClick={handleCheckout}
              disabled={selectedItemIds.length === 0}
              className="w-full py-4 mt-2 bg-gradient-to-r from-[#bd00ff] to-[#4B0082] text-white font-bold text-lg rounded-xl border-none cursor-pointer shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-1 transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Checkout ({selectedItems.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
