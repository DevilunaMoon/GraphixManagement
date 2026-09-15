"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, CheckCircle2, AlertCircle, AlertTriangle, CreditCard, Receipt, X, User, Package, Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CashierImeiPromptModal from '../../components/CashierSide/CashierImeiPromptModal';
import { isIPhoneProduct } from '../../lib/imei';

interface CartItem {
  id: string;
  name: string;
  price: number;
  discount?: number;
  discountStartDate?: string | null;
  discountEndDate?: string | null;
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
  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  const [pendingImeiPurchases, setPendingImeiPurchases] = useState<{
    purchaseId: string;
    deviceName: string;
    referenceId?: string;
    customerName?: string;
  }[]>([]);
  const [currentImeiIndex, setCurrentImeiIndex] = useState(0);
  const [showImeiModal, setShowImeiModal] = useState(false);

  useEffect(() => {
    if (terminateModalOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      const scrollables = document.querySelectorAll('main, .overflow-y-auto');
      scrollables.forEach((el) => {
        if (!el.closest('.fixed.inset-0')) {
          (el as HTMLElement).style.overflow = 'hidden';
        }
      });
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      const scrollables = document.querySelectorAll('main, .overflow-y-auto');
      scrollables.forEach((el) => {
        (el as HTMLElement).style.overflow = '';
      });
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      const scrollables = document.querySelectorAll('main, .overflow-y-auto');
      scrollables.forEach((el) => {
        (el as HTMLElement).style.overflow = '';
      });
    };
  }, [terminateModalOpen]);

  useEffect(() => {
    try {
      const storedCart = sessionStorage.getItem('pos_cart');
      if (storedCart) {
        const parsed = JSON.parse(storedCart);
        if (parsed.items && Array.isArray(parsed.items)) {
          setCartItems(parsed.items);
          const now = new Date();
          const sum = parsed.total || parsed.items.reduce((acc: number, item: CartItem) => {
            const isDiscountActive = Boolean(
              item.discount && 
              item.discount > 0 &&
              (!item.discountStartDate || new Date(item.discountStartDate) <= now) &&
              (!item.discountEndDate || new Date(item.discountEndDate) >= now)
            );
            const discount = (isDiscountActive ? item.discount : 0) || 0;
            const effectivePrice = discount > 0 ? (item.price * (1 - discount / 100)) : item.price;
            return acc + (effectivePrice * item.cartQty);
          }, 0);
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

  const handleTerminate = () => {
    sessionStorage.removeItem('pos_cart');
    router.push('/cashier/dashboard');
  };

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
      const createdIphonePurchases: {
        purchaseId: string;
        deviceName: string;
        referenceId?: string;
        customerName?: string;
      }[] = [];

      // Process each cart item as a purchase record
      for (const item of cartItems) {
        const itemTotal = item.price * item.cartQty;
        const itemDpAmount = paymentType === 'Downpayment' 
          ? Math.round((downpaymentAmount / totalAmount) * itemTotal)
          : itemTotal;
        const itemRemBal = paymentType === 'Downpayment' ? Math.max(0, itemTotal - itemDpAmount) : 0;
        const isIPhone = isIPhoneProduct(item.name);

        // If iPhone with quantity > 1, create individual unit records for unique IMEI assignment
        const unitsToProcess = isIPhone ? item.cartQty : 1;
        const perUnitAmount = isIPhone ? Math.round(itemDpAmount / item.cartQty) : itemDpAmount;
        const perUnitRemBal = isIPhone ? Math.round(itemRemBal / item.cartQty) : itemRemBal;
        const perUnitQuantity = isIPhone ? 1 : item.cartQty;

        for (let u = 0; u < unitsToProcess; u++) {
          const res = await fetch('/api/purchases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deviceId: item.id,
              amount: perUnitAmount,
              quantity: perUnitQuantity,
              paymentType: paymentType,
              source: 'POS',
              downpaymentAmount: paymentType === 'Downpayment' ? perUnitAmount : 0,
              remainingBalance: perUnitRemBal,
              isSettled: isSettled,
              phoneNumber: contactNumber,
              customerName: customerName
            })
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to process POS purchase');
          }

          const createdData = await res.json();
          if (isIPhone && createdData?.id) {
            createdIphonePurchases.push({
              purchaseId: createdData.id,
              deviceName: item.name,
              referenceId: createdData.referenceId || null,
              customerName: customerName || 'Walk-in Customer'
            });
          }
        }
      }

      // Clear session cart
      sessionStorage.removeItem('pos_cart');

      // If iPhone(s) were purchased, prompt cashier for 15-digit IMEI
      if (createdIphonePurchases.length > 0) {
        setPendingImeiPurchases(createdIphonePurchases);
        setCurrentImeiIndex(0);
        setShowImeiModal(true);
      } else {
        // Navigate to appropriate Order History section based on Payment Type
        if (paymentType === 'Downpayment') {
          router.push('/cashier/records/downpayments');
        } else {
          router.push('/cashier/records');
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to complete transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImeiSaved = () => {
    if (currentImeiIndex + 1 < pendingImeiPurchases.length) {
      setCurrentImeiIndex(prev => prev + 1);
    } else {
      setShowImeiModal(false);
      if (paymentType === 'Downpayment') {
        router.push('/cashier/records/downpayments');
      } else {
        router.push('/cashier/records');
      }
    }
  };

  const handleImeiClose = () => {
    setShowImeiModal(false);
    if (paymentType === 'Downpayment') {
      router.push('/cashier/records/downpayments');
    } else {
      router.push('/cashier/records');
    }
  };

  return (
    <main className="flex-1 flex justify-center items-start p-2 sm:p-4 md:p-6 w-full animate-in fade-in duration-300">
      <div className="w-full max-w-6xl border-2 border-[#bd00ff] rounded-3xl p-6 md:p-8 lg:p-10 bg-white flex flex-col gap-6 md:gap-8 shadow-sm relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-100 pb-5 gap-4">
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => setTerminateModalOpen(true)} 
              className="text-black hover:text-[#bd00ff] transition-colors bg-purple-50 hover:bg-purple-100 border-none cursor-pointer p-2.5 rounded-xl shrink-0"
              title="Back / Cancel Transaction"
            >
              <ChevronLeft size={28} />
            </button>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-black m-0">Payment Information Section</h2>
              <p className="text-xs sm:text-sm text-gray-500 m-0 mt-0.5">Complete physical store checkout for walk-in customer</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#bd00ff] animate-pulse"></span>
            <span>POS Walk-In Terminal</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold flex items-center gap-2 shadow-xs">
            <AlertCircle size={20} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleConfirm} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column (7 cols): Customer Information & Payment Configuration */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Customer Details Card */}
            <div className="bg-gray-50/70 border border-gray-200 rounded-2xl p-5 md:p-6 flex flex-col gap-4 shadow-2xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-gray-200">
                <span className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
                  <User size={16} className="text-[#bd00ff]" />
                  Customer Information
                </span>
                <span className="text-[11px] font-semibold text-gray-400">Required for receipt & records</span>
              </div>

              {/* Customer Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Customer Name *</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer full name..."
                  className="w-full h-12 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-4 text-sm font-semibold outline-none focus:shadow-[0_0_5px_rgba(189,0,255,0.3)] transition-all text-black" 
                  required
                />
              </div>

              {/* Contact Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Contact Number *</label>
                <input 
                  type="text" 
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="e.g. 09171234567"
                  className="w-full h-12 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-4 text-sm font-mono font-semibold outline-none focus:shadow-[0_0_5px_rgba(189,0,255,0.3)] transition-all text-black"
                  required 
                />
              </div>
            </div>

            {/* Payment Option Selector Card */}
            <div className="bg-gray-50/70 border border-gray-200 rounded-2xl p-5 md:p-6 flex flex-col gap-4 shadow-2xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-gray-200">
                <span className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
                  <CreditCard size={16} className="text-[#bd00ff]" />
                  Payment Option
                </span>
                <span className="text-[11px] font-bold text-purple-700 bg-purple-100/70 px-2.5 py-0.5 rounded-full">
                  {paymentType === 'Full' ? 'Full Payment' : 'Installment Plan'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() => setPaymentType('Full')}
                  className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                    paymentType === 'Full' 
                      ? 'border-[#bd00ff] bg-purple-50/90 text-purple-900 font-bold shadow-xs' 
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
                  className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                    paymentType === 'Downpayment' 
                      ? 'border-[#bd00ff] bg-purple-50/90 text-purple-900 font-bold shadow-xs' 
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

              {/* Amount Display or Downpayment Input */}
              {paymentType === 'Full' ? (
                <div className="flex flex-col gap-1.5 pt-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Payable Full Amount</label>
                  <div className="w-full h-12 border-2 border-purple-200 bg-purple-50/50 rounded-xl px-4 flex items-center justify-between text-base md:text-lg font-black text-[#bd00ff]">
                    <span>Total Due Now:</span>
                    <span>₱{totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 pt-2 p-4 bg-purple-50/60 rounded-xl border border-purple-200">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-purple-900 uppercase tracking-wider">
                      Initial Downpayment Amount (₱) *
                    </label>
                    <input 
                      type="number" 
                      min="1"
                      max={totalAmount}
                      value={downpaymentAmount}
                      onChange={(e) => setDownpaymentAmount(Number(e.target.value))}
                      className="w-full h-12 border-2 border-[#bd00ff] rounded-xl px-4 text-base md:text-lg font-black text-emerald-600 bg-white outline-none focus:ring-2 focus:ring-purple-400 shadow-2xs" 
                      required
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs font-semibold text-gray-700 pt-2 border-t border-purple-200">
                    <span>Total Device Price:</span>
                    <span className="font-bold text-gray-900">₱{totalAmount.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs font-bold text-gray-900">
                    <span>Remaining Balance:</span>
                    <span className="font-extrabold text-red-500 text-sm">₱{remainingBalance.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-gray-500 pt-1">
                    <span>Est. Monthly Installment (12 mos):</span>
                    <span className="font-extrabold text-blue-600">₱{(remainingBalance / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo</span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right Column (5 cols): Selected Items & Final Checkout Action */}
          <div className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-6">
            
            {/* Selected Items Card */}
            <div className="bg-white border-2 border-purple-100 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="text-xs font-extrabold uppercase tracking-wider text-purple-700 flex items-center gap-2">
                  <Package size={16} />
                  Selected Items ({cartItems.length})
                </span>
                <span className="text-xs font-bold text-gray-500">
                  {cartItems.reduce((sum, item) => sum + item.cartQty, 0)} units total
                </span>
              </div>

              {/* Items List */}
              <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
                {cartItems.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400">No items selected</div>
                ) : (
                  cartItems.map((item, idx) => {
                    const now = new Date();
                    const isDiscountActive = Boolean(
                      item.discount && 
                      item.discount > 0 &&
                      (!item.discountStartDate || new Date(item.discountStartDate) <= now) &&
                      (!item.discountEndDate || new Date(item.discountEndDate) >= now)
                    );
                    const discount = (isDiscountActive ? item.discount : 0) || 0;
                    const effectivePrice = discount > 0 ? (item.price * (1 - discount / 100)) : item.price;
                    const itemTotal = effectivePrice * item.cartQty;

                    return (
                      <div key={idx} className="flex justify-between items-center p-2 rounded-xl bg-gray-50/70 border border-gray-100 text-sm">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-9 h-9 rounded-lg object-cover bg-white border border-gray-200 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center text-[#bd00ff] font-bold text-xs shrink-0">P</div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-gray-900 text-xs truncate">
                              {item.name} <strong className="text-[#bd00ff]">x{item.cartQty}</strong>
                            </span>
                            {discount > 0 ? (
                              <span className="text-[10px] text-rose-600 font-bold">
                                {discount}% OFF (₱{Number(item.price).toLocaleString()})
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400 font-mono">
                                ₱{Number(item.price).toLocaleString()} each
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 pl-2">
                          <span className="font-extrabold text-gray-900 text-xs">₱{itemTotal.toLocaleString()}</span>
                          {discount > 0 && (
                            <span className="text-[10px] text-gray-400 line-through">₱{(item.price * item.cartQty).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Price Summary Breakdown */}
              <div className="flex flex-col gap-2 pt-3 border-t border-gray-100 text-xs">
                <div className="flex justify-between items-center text-gray-600 font-medium">
                  <span>Subtotal:</span>
                  <span className="font-bold text-gray-800">₱{totalAmount.toLocaleString()}</span>
                </div>
                {paymentType === 'Downpayment' && (
                  <>
                    <div className="flex justify-between items-center text-emerald-600 font-bold">
                      <span>Initial Downpayment:</span>
                      <span>- ₱{downpaymentAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-rose-600 font-bold">
                      <span>Remaining Balance:</span>
                      <span>₱{remainingBalance.toLocaleString()}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center text-sm font-black text-gray-900 pt-2 border-t border-gray-200">
                  <span>Payable Amount Now:</span>
                  <span className="text-lg font-black text-[#bd00ff]">
                    ₱{(paymentType === 'Downpayment' ? downpaymentAmount : totalAmount).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Confirm CTA Button */}
              <button 
                type="submit"
                disabled={isSubmitting}
                className="bg-[#4b0082] hover:bg-[#34005b] text-white text-base font-bold rounded-xl py-3.5 w-full transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-1 border-none"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <CheckCircle2 size={19} />
                    Confirm & Complete Checkout
                  </>
                )}
              </button>

              <div className="text-center">
                <span className="text-[11px] text-gray-400 font-medium flex items-center justify-center gap-1">
                  <Store size={12} className="text-[#bd00ff]" />
                  Official In-Store Walk-In Transaction
                </span>
              </div>
            </div>

          </div>

        </form>

      </div>

      {/* Terminate Transaction Reminder Modal */}
      {terminateModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overscroll-contain"
          onWheel={(e) => e.stopPropagation()}
          onClick={() => setTerminateModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 flex flex-col items-center text-center gap-5 border border-purple-100 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center shadow-inner">
              <AlertTriangle size={36} />
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-2xl font-black text-gray-900 m-0">Terminate Transaction?</h3>
              <p className="text-sm text-gray-600 leading-relaxed m-0">
                Are you sure you want to terminate this transaction? Any entered details will be discarded and the transaction will be cancelled completely.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
              <button
                type="button"
                onClick={() => setTerminateModalOpen(false)}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold rounded-xl transition-all border-none cursor-pointer text-sm"
              >
                No, Continue
              </button>
              <button
                type="button"
                onClick={handleTerminate}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl transition-all shadow-md border-none cursor-pointer text-sm"
              >
                Yes, Terminate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iPhone IMEI Prompt Modal */}
      {showImeiModal && pendingImeiPurchases[currentImeiIndex] && (
        <CashierImeiPromptModal
          isOpen={showImeiModal}
          onClose={handleImeiClose}
          purchaseId={pendingImeiPurchases[currentImeiIndex].purchaseId}
          deviceName={pendingImeiPurchases[currentImeiIndex].deviceName}
          referenceId={pendingImeiPurchases[currentImeiIndex].referenceId}
          customerName={pendingImeiPurchases[currentImeiIndex].customerName}
          unitIndex={currentImeiIndex + 1}
          totalUnits={pendingImeiPurchases.length}
          onSaved={handleImeiSaved}
        />
      )}
    </main>
  );
}
