"use client";

import { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  CreditCard, 
  Receipt, 
  X, 
  User, 
  Package, 
  Store,
  Banknote,
  QrCode,
  Smartphone,
  Layers,
  Copy,
  Check,
  Info
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import CashierImeiPromptModal from '../../components/CashierSide/CashierImeiPromptModal';
import { isIPhoneProduct } from '../../lib/imei';

interface CartItem {
  id: string;
  variantId?: string;
  productId?: string;
  name: string;
  baseName?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  discountStartDate?: string | null;
  discountEndDate?: string | null;
  image?: string | null;
  stock: number;
  cartQty: number;
  storage?: string;
  isPreOwned?: boolean;
  downpayment?: string | null;
}

interface BranchInfo {
  name: string;
  address?: string | null;
  phone?: string | null;
  gcashName?: string | null;
  gcashNumber?: string | null;
  gcashQrCode?: string | null;
}

export default function CashierPayment() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [paymentType, setPaymentType] = useState<'Cash' | 'GCash' | 'Split'>('Cash');
  
  // Payment specifics
  const [cashTendered, setCashTendered] = useState<string>('');
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [gcashAmount, setGcashAmount] = useState<number>(0);
  const [gcashRefNumber, setGcashRefNumber] = useState<string>('');
  
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);
  const [copiedGcash, setCopiedGcash] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

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

  // Load cart items from sessionStorage
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
          setCashAmount(Math.round(sum / 2));
          setGcashAmount(sum - Math.round(sum / 2));
        }
      }
    } catch (err) {
      console.error('Error parsing cart from sessionStorage:', err);
    }
  }, []);

  // Fetch branch details for in-store GCash recipient
  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const [profileRes, branchesRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/branches')
        ]);
        
        let cashierBranchName = 'Tagoloan';
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData?.branch) {
            cashierBranchName = profileData.branch;
          }
        }

        if (branchesRes.ok) {
          const branchesData = await branchesRes.json();
          const branchList = Array.isArray(branchesData.branches) ? branchesData.branches : (Array.isArray(branchesData) ? branchesData : []);
          const matched = branchList.find((b: any) => 
            b.name.toLowerCase().replace(/\s*branch$/i, '').trim() === 
            cashierBranchName.toLowerCase().replace(/\s*branch$/i, '').trim()
          );
          if (matched) {
            setBranchInfo(matched);
          }
        }
      } catch (err) {
        console.error('Failed to load branch details:', err);
      }
    };
    fetchBranch();
  }, []);

  const handleCopyGcash = () => {
    const num = (branchInfo?.gcashNumber || '0967 123 4567').replace(/[^0-9]/g, '');
    navigator.clipboard.writeText(num);
    setCopiedGcash(true);
    setTimeout(() => setCopiedGcash(false), 2000);
  };

  const handleTerminate = () => {
    sessionStorage.removeItem('pos_cart');
    router.push('/cashier/dashboard');
  };

  // Change computation for Cash & Split
  const parsedCashTendered = parseFloat(cashTendered) || 0;
  const targetCashPayable = paymentType === 'Cash' ? totalAmount : (paymentType === 'Split' ? cashAmount : 0);
  const changeAmount = parsedCashTendered >= targetCashPayable ? parsedCashTendered - targetCashPayable : 0;
  const isCashSufficient = parsedCashTendered >= targetCashPayable;

  // Split calculations
  const splitTotal = (cashAmount || 0) + (gcashAmount || 0);
  const isSplitBalanced = splitTotal === totalAmount;

  const handleSplitCashChange = (val: number) => {
    const cleanVal = Math.max(0, val);
    setCashAmount(cleanVal);
    setGcashAmount(Math.max(0, totalAmount - cleanVal));
  };

  const handleSplitGcashChange = (val: number) => {
    const cleanVal = Math.max(0, val);
    setGcashAmount(cleanVal);
    setCashAmount(Math.max(0, totalAmount - cleanVal));
  };

  const handleEvenSplit = () => {
    const half = Math.round(totalAmount / 2);
    setCashAmount(half);
    setGcashAmount(totalAmount - half);
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      setErrorMsg('No items in cart to process.');
      return;
    }

    if (!customerName.trim()) {
      setErrorMsg('Please enter customer full name.');
      return;
    }

    if (paymentType === 'Split' && !isSplitBalanced) {
      setErrorMsg(`Split payment must total exactly ₱${totalAmount.toLocaleString()}. Current total: ₱${splitTotal.toLocaleString()}`);
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
        const isIPhone = isIPhoneProduct(item.name) || isIPhoneProduct(item.baseName || '');

        // If iPhone with quantity > 1, create individual unit records for unique IMEI assignment
        const unitsToProcess = isIPhone ? item.cartQty : 1;
        const perUnitAmount = isIPhone ? Math.round(itemTotal / item.cartQty) : itemTotal;
        const perUnitQuantity = isIPhone ? 1 : item.cartQty;

        const variationPayload = item.variantId ? [{
          id: item.variantId,
          name: item.storage && item.storage !== '—' ? item.storage : (item.name || 'Standard'),
          productId: item.productId,
          price: item.originalPrice || item.price
        }] : undefined;

        for (let u = 0; u < unitsToProcess; u++) {
          const res = await fetch('/api/purchases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deviceId: item.id,
              variationId: item.variantId || undefined,
              variations: variationPayload,
              amount: perUnitAmount,
              quantity: perUnitQuantity,
              paymentType: paymentType, // 'Cash' | 'GCash' | 'Split'
              source: 'POS',
              branch: branchInfo?.name || undefined,
              downpaymentAmount: 0,
              remainingBalance: 0,
              isSettled: true,
              phoneNumber: contactNumber || (parsedCashTendered > 0 ? `Tendered: ₱${parsedCashTendered}` : undefined),
              customerName: customerName,
              referenceId: gcashRefNumber.trim() || undefined
            })
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to process in-store POS purchase');
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
        router.push('/cashier/records');
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
      router.push('/cashier/records');
    }
  };

  const handleImeiClose = () => {
    setShowImeiModal(false);
    router.push('/cashier/records');
  };

  return (
    <main className="flex-1 flex justify-center items-start p-2 sm:p-4 md:p-6 w-full animate-in fade-in duration-300 font-['Inter']">
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
              <p className="text-xs sm:text-sm text-gray-500 m-0 mt-0.5">
                Complete physical in-store checkout for walk-in customer
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#bd00ff] animate-pulse"></span>
            <span>POS In-Store Physical Checkout</span>
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
                <span className="text-[11px] font-semibold text-gray-400">Required for official receipt</span>
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
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Contact Number (Optional / Walk-In)</label>
                <input 
                  type="text" 
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="e.g. 09171234567"
                  className="w-full h-12 border-2 border-gray-200 focus:border-[#bd00ff] bg-white rounded-xl px-4 text-sm font-mono font-semibold outline-none focus:shadow-[0_0_5px_rgba(189,0,255,0.3)] transition-all text-black"
                />
              </div>
            </div>

            {/* Payment Option Selector Card: Cash, GCash, Split */}
            <div className="bg-gray-50/70 border border-gray-200 rounded-2xl p-5 md:p-6 flex flex-col gap-4 shadow-2xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-gray-200">
                <span className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
                  <CreditCard size={16} className="text-[#bd00ff]" />
                  Payment Option
                </span>
                <span className="text-[11px] font-bold text-purple-700 bg-purple-100/70 px-2.5 py-0.5 rounded-full">
                  {paymentType === 'Cash' ? 'Cash Tender' : paymentType === 'GCash' ? 'GCash Digital' : 'Cash + GCash Split'}
                </span>
              </div>

              {/* 3 Payment Buttons: Cash, GCash, Split */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* Button 1: Cash Payment */}
                <button
                  type="button"
                  onClick={() => setPaymentType('Cash')}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                    paymentType === 'Cash' 
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold shadow-xs' 
                      : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Banknote size={18} className={paymentType === 'Cash' ? 'text-emerald-600' : 'text-gray-400'} />
                    <span className="font-extrabold text-sm">Cash Payment</span>
                  </div>
                  <span className="text-[11px] text-gray-500 font-normal">Paid in cash at counter</span>
                </button>

                {/* Button 2: GCash Payment */}
                <button
                  type="button"
                  onClick={() => setPaymentType('GCash')}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                    paymentType === 'GCash' 
                      ? 'border-[#005ce6] bg-blue-50 text-blue-950 font-bold shadow-xs' 
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <QrCode size={18} className={paymentType === 'GCash' ? 'text-[#005ce6]' : 'text-gray-400'} />
                    <span className="font-extrabold text-sm">GCash Payment</span>
                  </div>
                  <span className="text-[11px] text-gray-500 font-normal">Direct store QR transfer</span>
                </button>

                {/* Button 3: Split Payment */}
                <button
                  type="button"
                  onClick={() => setPaymentType('Split')}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                    paymentType === 'Split' 
                      ? 'border-[#bd00ff] bg-purple-50 text-purple-950 font-bold shadow-xs' 
                      : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers size={18} className={paymentType === 'Split' ? 'text-[#bd00ff]' : 'text-gray-400'} />
                    <span className="font-extrabold text-sm">Split Payment</span>
                  </div>
                  <span className="text-[11px] text-gray-500 font-normal">Both Cash & GCash</span>
                </button>

              </div>

              {/* ----------------- Option 1: Cash Payment Details ----------------- */}
              {paymentType === 'Cash' && (
                <div className="flex flex-col gap-4 pt-2 animate-in fade-in duration-200">
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Payable Cash</span>
                      <span className="text-xl font-black text-emerald-700">₱{totalAmount.toLocaleString()}</span>
                    </div>

                    <div className="flex flex-col gap-1.5 pt-2 border-t border-emerald-200/70">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Cash Tendered (₱)
                      </label>
                      <input 
                        type="number"
                        min="0"
                        step="1"
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        placeholder={`e.g. ${totalAmount}`}
                        className="w-full h-11 border-2 border-emerald-300 bg-white rounded-xl px-4 text-base font-bold text-gray-900 outline-none focus:border-emerald-600 shadow-2xs font-mono"
                      />
                    </div>

                    {/* Change Display */}
                    {parsedCashTendered > 0 && (
                      <div className="flex justify-between items-center p-3 rounded-lg bg-white border border-emerald-200 text-xs">
                        <span className="font-bold text-gray-600">Customer Change:</span>
                        <span className={`text-base font-black ${isCashSufficient ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isCashSufficient 
                            ? `₱${changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                            : `Short by ₱${(targetCashPayable - parsedCashTendered).toLocaleString()}`
                          }
                        </span>
                      </div>
                    )}

                    {/* Quick Cash Shortcuts */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button 
                        type="button" 
                        onClick={() => setCashTendered(totalAmount.toString())}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      >
                        Exact (₱{totalAmount.toLocaleString()})
                      </button>
                      {totalAmount % 500 !== 0 && (
                        <button 
                          type="button" 
                          onClick={() => setCashTendered((Math.ceil(totalAmount / 500) * 500).toString())}
                          className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                        >
                          ₱{(Math.ceil(totalAmount / 500) * 500).toLocaleString()}
                        </button>
                      )}
                      {totalAmount % 1000 !== 0 && (
                        <button 
                          type="button" 
                          onClick={() => setCashTendered((Math.ceil(totalAmount / 1000) * 1000).toString())}
                          className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                        >
                          ₱{(Math.ceil(totalAmount / 1000) * 1000).toLocaleString()}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------- Option 2: GCash Payment Details ----------------- */}
              {paymentType === 'GCash' && (
                <div className="flex flex-col gap-4 pt-2 animate-in fade-in duration-200">
                  <div className="p-4 bg-gradient-to-br from-blue-50/90 to-indigo-50/50 border border-blue-200 rounded-2xl flex flex-col gap-3.5">
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#005ce6] uppercase tracking-wider flex items-center gap-1.5">
                        <Smartphone size={16} />
                        In-Store GCash Recipient Details
                      </span>
                      <span className="text-[10px] font-bold bg-blue-100 text-[#005ce6] px-2.5 py-0.5 rounded-full">
                        {branchInfo?.name || 'Store Terminal'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-white border border-blue-100 rounded-xl gap-3">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Account Name</span>
                        <span className="text-xs font-extrabold text-gray-900 truncate">
                          {branchInfo?.gcashName || 'GRAPHIX MANAGEMENT'}
                        </span>
                        <span className="text-xs font-mono font-bold text-[#005ce6] mt-0.5">
                          {branchInfo?.gcashNumber || '0967 123 4567'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleCopyGcash}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#005ce6] rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors border border-blue-200"
                          title="Copy GCash Number"
                        >
                          {copiedGcash ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          <span>{copiedGcash ? 'Copied' : 'Copy'}</span>
                        </button>

                        {branchInfo?.gcashQrCode && (
                          <button
                            type="button"
                            onClick={() => setShowQrModal(true)}
                            className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors cursor-pointer border-none shadow-xs"
                            title="Show Full QR Code to Customer"
                          >
                            <QrCode size={18} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Total Amount via GCash */}
                    <div className="flex justify-between items-center text-xs font-bold px-1">
                      <span className="text-gray-600">Total Due via GCash:</span>
                      <span className="text-lg font-black text-[#005ce6]">₱{totalAmount.toLocaleString()}</span>
                    </div>

                    {/* GCash Reference ID Input */}
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-blue-200/60">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                        <span>GCash Reference No.</span>
                        <span className="text-[10px] text-gray-400 lowercase">from customer receipt</span>
                      </label>
                      <input 
                        type="text"
                        value={gcashRefNumber}
                        onChange={(e) => setGcashRefNumber(e.target.value)}
                        placeholder="e.g. 1002348572911"
                        className="w-full h-11 border-2 border-blue-200 focus:border-[#005ce6] bg-white rounded-xl px-4 text-xs font-mono font-bold text-gray-900 outline-none shadow-2xs"
                      />
                    </div>

                  </div>
                </div>
              )}

              {/* ----------------- Option 3: Split Payment (Cash + GCash) ----------------- */}
              {paymentType === 'Split' && (
                <div className="flex flex-col gap-4 pt-2 animate-in fade-in duration-200">
                  <div className="p-4 bg-purple-50/70 border-2 border-purple-200 rounded-2xl flex flex-col gap-4">
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers size={16} className="text-[#bd00ff]" />
                        Split Payment Breakdown
                      </span>
                      <button
                        type="button"
                        onClick={handleEvenSplit}
                        className="text-[11px] font-bold text-[#bd00ff] bg-white px-2.5 py-1 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer"
                      >
                        50 / 50 Split
                      </button>
                    </div>

                    {/* 2 Split Inputs: Cash Amount and GCash Amount */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      
                      {/* Cash Portion */}
                      <div className="bg-white p-3.5 rounded-xl border border-emerald-200 flex flex-col gap-1.5 shadow-2xs">
                        <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                          <Banknote size={14} className="text-emerald-600" />
                          Cash Portion (₱) *
                        </label>
                        <input 
                          type="number"
                          min="0"
                          max={totalAmount}
                          value={cashAmount || ''}
                          onChange={(e) => handleSplitCashChange(Number(e.target.value))}
                          placeholder="0"
                          className="w-full h-11 border border-emerald-300 focus:border-emerald-600 bg-emerald-50/30 rounded-lg px-3 text-base font-black text-emerald-700 outline-none font-mono"
                          required
                        />
                      </div>

                      {/* GCash Portion */}
                      <div className="bg-white p-3.5 rounded-xl border border-blue-200 flex flex-col gap-1.5 shadow-2xs">
                        <label className="text-xs font-bold text-[#005ce6] uppercase tracking-wider flex items-center gap-1">
                          <Smartphone size={14} className="text-[#005ce6]" />
                          GCash Portion (₱) *
                        </label>
                        <input 
                          type="number"
                          min="0"
                          max={totalAmount}
                          value={gcashAmount || ''}
                          onChange={(e) => handleSplitGcashChange(Number(e.target.value))}
                          placeholder="0"
                          className="w-full h-11 border border-blue-300 focus:border-[#005ce6] bg-blue-50/30 rounded-lg px-3 text-base font-black text-[#005ce6] outline-none font-mono"
                          required
                        />
                      </div>

                    </div>

                    {/* Balance Status Pill */}
                    <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between border ${
                      isSplitBalanced 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        {isSplitBalanced ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertTriangle size={16} className="text-amber-600" />}
                        <span>{isSplitBalanced ? 'Split balanced perfectly' : `Remaining: ₱${Math.abs(totalAmount - splitTotal).toLocaleString()}`}</span>
                      </div>
                      <span className="font-mono font-black">
                        ₱{splitTotal.toLocaleString()} / ₱{totalAmount.toLocaleString()}
                      </span>
                    </div>

                    {/* Store GCash Preview for Split */}
                    <div className="p-3 bg-white border border-blue-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">GCash Account</span>
                        <span className="font-bold text-gray-900 truncate">{branchInfo?.gcashName || 'GRAPHIX MANAGEMENT'}</span>
                        <span className="font-mono text-[#005ce6]">{branchInfo?.gcashNumber || '0967 123 4567'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyGcash}
                        className="px-2 py-1 bg-blue-50 text-[#005ce6] rounded-md text-[11px] font-bold border border-blue-200 cursor-pointer"
                      >
                        {copiedGcash ? 'Copied' : 'Copy'}
                      </button>
                    </div>

                    {/* Optional GCash Reference */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                        GCash Reference No.
                      </label>
                      <input 
                        type="text"
                        value={gcashRefNumber}
                        onChange={(e) => setGcashRefNumber(e.target.value)}
                        placeholder="e.g. 1002348572911"
                        className="w-full h-10 border border-purple-200 bg-white rounded-xl px-3 text-xs font-mono font-bold text-gray-900 outline-none"
                      />
                    </div>

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
                      <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl bg-gray-50/70 border border-gray-100 text-sm">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-9 h-9 rounded-lg object-cover bg-white border border-gray-200 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center text-[#bd00ff] font-bold text-xs shrink-0">P</div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-gray-900 text-xs truncate">
                                {item.name} <strong className="text-[#bd00ff]">x{item.cartQty}</strong>
                              </span>
                              {item.storage && item.storage !== '—' && (
                                <span className="bg-purple-100 text-[#9c00d6] text-[10px] font-bold px-1.5 py-0.2 rounded border border-purple-200">
                                  {item.storage}
                                </span>
                              )}
                              {item.isPreOwned && (
                                <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.2 rounded border border-amber-200 uppercase">
                                  Pre-Owned
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                              {item.productId && (
                                <span className="font-mono text-gray-400 font-bold">{item.productId}</span>
                              )}
                              {discount > 0 ? (
                                <span className="text-rose-600 font-bold">
                                  {discount}% OFF (₱{Number(item.price).toLocaleString()})
                                </span>
                              ) : (
                                <span className="text-gray-400 font-mono">
                                  ₱{Number(item.price).toLocaleString()} each
                                </span>
                              )}
                            </div>
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

              {/* Financial Breakdown */}
              <div className="flex flex-col gap-2 pt-3 border-t border-gray-100 text-xs">
                <div className="flex justify-between items-center text-gray-600 font-medium">
                  <span>Subtotal:</span>
                  <span className="font-bold text-gray-800">₱{totalAmount.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center text-gray-600 font-medium">
                  <span>Payment Mode:</span>
                  <span className="font-bold text-purple-700">
                    {paymentType === 'Cash' && '💵 Full Cash Payment'}
                    {paymentType === 'GCash' && '📱 Full GCash Payment'}
                    {paymentType === 'Split' && `💳 Split (Cash ₱${cashAmount.toLocaleString()} + GCash ₱${gcashAmount.toLocaleString()})`}
                  </span>
                </div>

                {paymentType === 'Cash' && parsedCashTendered > 0 && (
                  <>
                    <div className="flex justify-between items-center text-emerald-700 font-semibold">
                      <span>Cash Tendered:</span>
                      <span className="font-mono font-bold">₱{parsedCashTendered.toLocaleString()}</span>
                    </div>
                    {isCashSufficient && (
                      <div className="flex justify-between items-center text-emerald-700 font-semibold">
                        <span>Change Due:</span>
                        <span className="font-mono font-bold">₱{changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between items-center text-sm font-black text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total Due Now:</span>
                  <span className="text-xl font-black text-[#bd00ff]">
                    ₱{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Confirm CTA Button */}
              <button 
                type="submit"
                disabled={isSubmitting || (paymentType === 'Split' && !isSplitBalanced)}
                className="bg-[#4b0082] hover:bg-[#34005b] text-white text-base font-bold rounded-xl py-3.5 w-full transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-1 border-none"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <CheckCircle2 size={19} />
                    Confirm & Complete In-Store Checkout
                  </>
                )}
              </button>

              <div className="text-center">
                <span className="text-[11px] text-gray-400 font-medium flex items-center justify-center gap-1">
                  <Store size={12} className="text-[#bd00ff]" />
                  Official Physical In-Store Sale
                </span>
              </div>
            </div>

          </div>

        </form>

      </div>

      {/* QR Code Modal for In-Store Display to Customer */}
      {showQrModal && branchInfo?.gcashQrCode && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowQrModal(false)}
        >
          <div 
            className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full flex flex-col items-center text-center gap-4 border border-blue-200 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center w-full pb-2 border-b border-gray-100">
              <span className="font-extrabold text-sm text-[#005ce6] flex items-center gap-1.5">
                <QrCode size={18} /> Official GCash QR
              </span>
              <button 
                onClick={() => setShowQrModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 border-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="w-64 h-64 bg-white border-2 border-dashed border-blue-300 rounded-2xl p-2 flex items-center justify-center overflow-hidden">
              <img src={branchInfo.gcashQrCode} alt="Branch GCash QR" className="w-full h-full object-contain" />
            </div>

            <div className="flex flex-col">
              <span className="font-extrabold text-gray-900 text-sm">{branchInfo.gcashName}</span>
              <span className="font-mono font-bold text-[#005ce6] text-xs mt-0.5">{branchInfo.gcashNumber}</span>
              <span className="text-xs text-gray-500 mt-2">Scan with customer's GCash App</span>
            </div>
          </div>
        </div>
      )}

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
