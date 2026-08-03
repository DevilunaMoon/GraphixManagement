"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, CheckCircle2, AlertCircle, ShoppingBag, CreditCard, Receipt } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string | null;
  stock: number;
  cartQty: number;
  downpayment?: string | null;
}

export default function CashierPayment() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [paymentType, setPaymentType] = useState<'Full' | 'Downpayment'>('Full');
  const [downpaymentAmount, setDownpaymentAmount] = useState<number>(0);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    try {
      const storedCart = sessionStorage.getItem('pos_cart');
      if (storedCart) {
        const parsed = JSON.parse(storedCart);
        if (parsed.items && Array.isArray(parsed.items)) {
          setCartItems(parsed.items);
          const sum = parsed.total || parsed.items.reduce((acc: number, item: CartItem) => acc + (item.price * item.cartQty), 0);
          setTotalAmount(sum);

          // Default initial downpayment estimate (30% or suggested dp)
          const firstItem = parsed.items[0];
          const suggestedDp = firstItem?.downpayment ? parseFloat(firstItem.downpayment) * firstItem.cartQty : Math.round(sum * 0.3);
          setDownpaymentAmount(suggestedDp || Math.round(sum * 0.3));
        }
      }
    } catch (err) {
      console.error('Error parsing cart from sessionStorage:', err);
    }
  }, []);

  const remainingBalance = paymentType === 'Downpayment' ? Math.max(0, totalAmount - (downpaymentAmount || 0)) : 0;
  const isSettled = paymentType === 'Full' || remainingBalance === 0;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      setErrorMsg('No items in cart to process.');
      return;
    }

    if (paymentType === 'Downpayment' && (!downpaymentAmount || downpaymentAmount <= 0)) {
      setErrorMsg('Please enter a valid downpayment amount.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // Process each cart item as a purchase record
      for (const item of cartItems) {
        const itemTotal = item.price * item.cartQty;
        const itemDpAmount = paymentType === 'Downpayment' 
          ? Math.round((downpaymentAmount / totalAmount) * itemTotal)
          : itemTotal;
        const itemRemBal = paymentType === 'Downpayment' ? Math.max(0, itemTotal - itemDpAmount) : 0;

        const res = await fetch('/api/purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: item.id,
            amount: itemDpAmount,
            quantity: item.cartQty,
            paymentType: paymentType,
            source: 'POS',
            downpaymentAmount: paymentType === 'Downpayment' ? itemDpAmount : 0,
            remainingBalance: itemRemBal,
            isSettled: isSettled,
            phoneNumber: contactNumber,
            customerName: customerName
          })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to process POS purchase');
        }
      }

      // Clear session cart
      sessionStorage.removeItem('pos_cart');

      // Navigate to appropriate Order History section based on Payment Type
      if (paymentType === 'Downpayment') {
        router.push('/cashier/records/downpayments');
      } else {
        router.push('/cashier/records');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to complete transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 flex justify-center items-start p-4 md:p-8 mt-4">
      <div className="w-full max-w-[650px] border-2 border-[#bd00ff] rounded-2xl p-6 md:p-10 bg-white flex flex-col gap-6 shadow-lg">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-purple-100 pb-4">
          <button 
            type="button"
            onClick={() => router.back()} 
            className="text-black hover:text-[#bd00ff] transition-colors bg-transparent border-none cursor-pointer p-1 rounded-lg hover:bg-purple-50"
          >
            <ChevronLeft size={32} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-black m-0">Payment Information Section</h2>
            <p className="text-sm text-gray-500 m-0">Complete physical store checkout for walk-in customer</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold flex items-center gap-2">
            <AlertCircle size={20} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Selected Product Summary */}
        {cartItems.length > 0 && (
          <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-100 flex flex-col gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-purple-700">Selected Items ({cartItems.length})</span>
            <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
              {cartItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-8 h-8 rounded object-cover bg-white border" />
                    ) : (
                      <div className="w-8 h-8 bg-purple-200 rounded flex items-center justify-center text-purple-700 font-bold text-xs">P</div>
                    )}
                    <span className="font-semibold text-gray-800">{item.name} <strong className="text-purple-600">x{item.cartQty}</strong></span>
                  </div>
                  <span className="font-bold text-gray-900">₱{(item.price * item.cartQty).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleConfirm} className="flex flex-col gap-6">
          {/* Customer Name */}
          <div className="flex flex-col gap-2">
            <label className="text-base font-semibold text-black">Name</label>
            <input 
              type="text" 
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer full name..."
              className="w-full h-12 border-2 border-[#bd00ff] rounded-xl px-4 text-base outline-none focus:shadow-[0_0_5px_rgba(189,0,255,0.4)] transition-shadow text-black" 
              required
            />
          </div>

          {/* Contact Number */}
          <div className="flex flex-col gap-2">
            <label className="text-base font-semibold text-black">Contact Number</label>
            <input 
              type="text" 
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="e.g. 09171234567"
              className="w-full h-12 border-2 border-[#bd00ff] rounded-xl px-4 text-base outline-none focus:shadow-[0_0_5px_rgba(189,0,255,0.4)] transition-shadow text-black"
              required 
            />
          </div>

          {/* Payment Type Option Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-base font-semibold text-black">Payment Option</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentType('Full')}
                className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  paymentType === 'Full' 
                    ? 'border-[#bd00ff] bg-purple-50 text-purple-900 font-bold shadow-sm' 
                    : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard size={18} className={paymentType === 'Full' ? 'text-[#bd00ff]' : 'text-gray-400'} />
                  <span className="font-extrabold text-sm">Full Purchase</span>
                </div>
                <span className="text-xs text-gray-500 font-normal">Pay total amount upfront</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentType('Downpayment')}
                className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  paymentType === 'Downpayment' 
                    ? 'border-[#bd00ff] bg-purple-50 text-purple-900 font-bold shadow-sm' 
                    : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Receipt size={18} className={paymentType === 'Downpayment' ? 'text-[#bd00ff]' : 'text-gray-400'} />
                  <span className="font-extrabold text-sm">Downpayment</span>
                </div>
                <span className="text-xs text-gray-500 font-normal">Initial deposit & installment</span>
              </button>
            </div>
          </div>

          {/* Amount Field / Downpayment Input */}
          {paymentType === 'Full' ? (
            <div className="flex flex-col gap-2">
              <label className="text-base font-semibold text-black">Amount</label>
              <input 
                type="number" 
                value={totalAmount}
                readOnly
                className="w-full h-12 border-2 border-[#bd00ff] rounded-xl px-4 text-lg font-bold text-[#bd00ff] bg-gray-50 outline-none" 
                required
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-4 bg-purple-50/50 rounded-xl border border-purple-200">
              <div className="flex flex-col gap-1.5">
                <label className="text-base font-bold text-purple-900">Initial Downpayment Amount (₱)</label>
                <input 
                  type="number" 
                  min="1"
                  max={totalAmount}
                  value={downpaymentAmount}
                  onChange={(e) => setDownpaymentAmount(Number(e.target.value))}
                  className="w-full h-12 border-2 border-[#bd00ff] rounded-xl px-4 text-lg font-extrabold text-emerald-600 bg-white outline-none focus:ring-2 focus:ring-purple-400" 
                  required
                />
              </div>

              <div className="flex justify-between items-center text-sm font-semibold text-gray-700 pt-2 border-t border-purple-200">
                <span>Total Device Price:</span>
                <span className="font-bold text-gray-900">₱{totalAmount.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-sm font-bold text-gray-900">
                <span>Remaining Balance:</span>
                <span className="font-extrabold text-red-500 text-base">₱{remainingBalance.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-xs text-gray-500 pt-1">
                <span>Monthly Installment (12 mos):</span>
                <span className="font-extrabold text-blue-600">₱{(remainingBalance / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo</span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-center mt-2">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="bg-[#4b0082] hover:bg-[#34005b] text-white text-xl font-semibold rounded-xl py-3.5 w-full transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Confirm'
              )}
            </button>
          </div>
        </form>

      </div>
    </main>
  );
}
