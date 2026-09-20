"use client";

import { useState, useEffect, Suspense } from 'react';
import { 
  ChevronLeft, 
  Coins, 
  Smartphone, 
  MessageSquare, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Sparkles,
  ShoppingBag,
  ShieldCheck,
  Receipt,
  MapPin,
  X,
  ZoomIn
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import QRCodeDisplay from '../../components/Common/QRCodeDisplay';
import { getBranchCode, formatDisplayInvoiceId } from '../../lib/invoice';

interface BranchData {
  id: string;
  name: string;
  location?: string;
  gcashName?: string | null;
  gcashNumber?: string | null;
  gcashQrCode?: string | null;
  isActive?: boolean;
}

interface PurchasedItem {
  id: string;
  name: string;
  image: string | null;
  price: number;
  originalPrice: number;
  discount: number;
  quantity: number;
  variations?: any[];
}

function CustomerPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deviceId = searchParams.get('deviceId');
  const variationIds = searchParams.get('variationIds');
  const cartItemIdsParam = searchParams.get('cartItemIds');
  const branchParam = searchParams.get('branch');
  const quantityParam = searchParams.get('quantity') || searchParams.get('qty');
  const navigate = router.push;

  const [method, setMethod] = useState<'cash' | 'gcash'>('cash');
  const [items, setItems] = useState<PurchasedItem[]>([]);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [totalDiscount, setTotalDiscount] = useState<number>(0);
  const [finalTotal, setFinalTotal] = useState<number>(0);
  const [selectedVariationsStr, setSelectedVariationsStr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Branch Selection & GCash States
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>(
    branchParam ? (branchParam.includes('Branch') ? branchParam : `${branchParam} Branch`) : 'Tagoloan Branch'
  );
  const [customerProfile, setCustomerProfile] = useState<{ name: string; email: string; phone: string } | null>(null);

  // GCash States
  const [gcashRef, setGcashRef] = useState<string>('');
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [showGcashModal, setShowGcashModal] = useState(false);
  const [showEnlargedQr, setShowEnlargedQr] = useState(false);

  // General States
  const [staffMessage, setStaffMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showItemsList, setShowItemsList] = useState(false);

  useEffect(() => {
    fetch('/api/branches')
      .then(res => res.json())
      .then(data => {
        const branchList = Array.isArray(data) ? data : (Array.isArray(data?.branches) ? data.branches : []);
        if (branchList.length > 0) {
          const active = branchList.filter((b: any) => b.isActive !== false && b.status !== 'Inactive');
          setBranches(active.length > 0 ? active : branchList);
        }
      })
      .catch(err => console.error('Failed to load branches:', err));
  }, []);

  const cleanBranchName = (name: string) => name.replace(/\s*Branch$/i, '').trim();

  const currentBranchData = branches.find(
    b => cleanBranchName(b.name).toLowerCase() === cleanBranchName(selectedBranch).toLowerCase()
  );

  const activeGcashName = currentBranchData?.gcashName || 'GRAPHIX MANAGEMENT';
  const activeGcashNumber = currentBranchData?.gcashNumber || '0967 123 4567';
  const activeGcashQr = currentBranchData?.gcashQrCode || null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const cleanGcashDigits = activeGcashNumber.replace(/[^0-9]/g, '');
  const qrRedirectUrl = `${origin}/pay/gcash?branch=${encodeURIComponent(cleanBranchName(selectedBranch))}&name=${encodeURIComponent(activeGcashName)}&number=${encodeURIComponent(cleanGcashDigits)}&amount=${finalTotal}`;

  useEffect(() => {
    fetch('/api/profile')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          const phoneClean = (data.phone && !data.phone.includes('₱')) ? data.phone : '0917 123 4567';
          setCustomerProfile({
            name: data.name || 'Customer',
            email: data.email || 'customer@graphix.com',
            phone: phoneClean
          });
          if (!branchParam && data.branch) {
            setSelectedBranch(data.branch.includes('Branch') ? data.branch : `${data.branch} Branch`);
          }
        }
      })
      .catch(console.error);
  }, [branchParam]);

  useEffect(() => {
    const fetchCheckoutData = async () => {
      try {
        setLoading(true);
        const now = new Date();

        if (cartItemIdsParam) {
          const ids = cartItemIdsParam.split(',');
          const res = await fetch('/api/cart');
          if (res.ok) {
            const cartItems = await res.json();
            const selectedItems = cartItems.filter((item: any) => ids.includes(item.id));

            let calcSubtotal = 0;
            let calcDiscount = 0;

            const parsedItems: PurchasedItem[] = selectedItems.map((item: any) => {
              const vars = item.variations ? JSON.parse(item.variations) : [];
              const basePrice = vars.length > 0 
                ? vars.reduce((sum: number, v: any) => sum + (v.price || 0), 0) 
                : (item.device?.price || 0);

              const isDiscountActive = Boolean(
                item.device?.discount && 
                item.device.discount > 0 &&
                (!item.device.discountStartDate || new Date(item.device.discountStartDate) <= now) &&
                (!item.device.discountEndDate || new Date(item.device.discountEndDate) >= now)
              );

              const discountPercent = isDiscountActive ? item.device.discount : 0;
              const unitDiscount = discountPercent > 0 ? (basePrice * (discountPercent / 100)) : 0;
              const effectivePrice = basePrice - unitDiscount;

              calcSubtotal += basePrice * item.quantity;
              calcDiscount += unitDiscount * item.quantity;

              return {
                id: item.id,
                name: item.device?.name || 'Item',
                image: item.device?.images?.[0] || item.device?.image || null,
                price: effectivePrice,
                originalPrice: basePrice,
                discount: discountPercent,
                quantity: item.quantity,
                variations: vars
              };
            });

            setItems(parsedItems);
            setSubtotal(calcSubtotal);
            setTotalDiscount(calcDiscount);
            setFinalTotal(Math.max(0, calcSubtotal - calcDiscount));
          }
        } else if (deviceId) {
          const res = await fetch(`/api/devices/${deviceId}`);
          if (res.ok) {
            const device = await res.json();
            const isDiscountActive = Boolean(
              device.discount && 
              device.discount > 0 &&
              (!device.discountStartDate || new Date(device.discountStartDate) <= now) &&
              (!device.discountEndDate || new Date(device.discountEndDate) >= now)
            );
            const discountPercent = isDiscountActive ? device.discount : 0;

            let vars: any[] = [];
            if (variationIds && device.variations) {
              const selectedVarIds = variationIds.split(',');
              vars = device.variations.filter((v: any) => selectedVarIds.includes(v.id));
              setSelectedVariationsStr(vars.length > 0 ? JSON.stringify(vars) : null);
            } else {
              setSelectedVariationsStr(null);
            }

            const varTotal = vars.reduce((acc: number, v: any) => acc + (v.price || 0), 0);
            const basePrice = varTotal > 0 ? varTotal : (device.price || 0);
            const unitDiscount = discountPercent > 0 ? (basePrice * (discountPercent / 100)) : 0;
            const effectivePrice = basePrice - unitDiscount;
            const parsedQty = Math.max(1, parseInt(quantityParam || '1', 10) || 1);

            const singleItem: PurchasedItem = {
              id: device.id,
              name: device.name,
              image: device.images?.[0] || device.image || null,
              price: effectivePrice,
              originalPrice: basePrice,
              discount: discountPercent,
              quantity: parsedQty,
              variations: vars
            };

            setItems([singleItem]);
            setSubtotal(basePrice * parsedQty);
            setTotalDiscount(unitDiscount * parsedQty);
            setFinalTotal(effectivePrice * parsedQty);
          }
        } else {
          // Default checkout context matching "Secure Payment" standard (Vivo Y31d - ₱28,998.00)
          const defaultItem: PurchasedItem = {
            id: 'vivo-y31d',
            name: 'Vivo Y31d',
            image: null,
            price: 28998,
            originalPrice: 28998,
            discount: 0,
            quantity: 1
          };
          setItems([defaultItem]);
          setSubtotal(28998);
          setTotalDiscount(0);
          setFinalTotal(28998);
        }
      } catch (err) {
        console.error('Error fetching checkout data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCheckoutData();
  }, [deviceId, variationIds, cartItemIdsParam, quantityParam]);

  const handleCopyGcashNumber = () => {
    navigator.clipboard.writeText(cleanGcashDigits || activeGcashNumber);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const handlePlaceOrder = async () => {
    setSubmitting(true);

    const branchCode = getBranchCode(selectedBranch);
    const plannedTxId = `#GRPX-${branchCode}-A1`;
    let createdId = '';
    let formattedTxId = plannedTxId;

    try {
      const selectedVariationsStr = (items[0]?.variations && items[0].variations.length > 0)
        ? JSON.stringify(items[0].variations)
        : null;

      const fullStaffMessage = [
        staffMessage.trim() ? `Note: ${staffMessage.trim()}` : '',
        method === 'cash' ? 'Payment: Cash on Pickup' : '',
        method === 'gcash' && gcashRef.trim() ? `GCash Ref#: ${gcashRef.trim()}` : ''
      ].filter(Boolean).join(' | ');

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: deviceId || undefined,
          amount: finalTotal,
          quantity: items[0]?.quantity || 1,
          variations: selectedVariationsStr,
          cartItemIds: cartItemIdsParam ? cartItemIdsParam.split(',') : undefined,
          phoneNumber: customerProfile?.phone || undefined,
          staffMessage: fullStaffMessage || undefined,
          paymentMethod: method === 'cash' ? 'Cash' : 'GCash',
          paymentType: method === 'cash' ? 'Cash' : 'Full',
          source: 'Online',
          branch: selectedBranch.replace(/\s*Branch$/i, '').trim(),
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data) {
          createdId = data.id || '';
          if (data.referenceId) {
            formattedTxId = data.referenceId;
          } else if (data.id) {
            formattedTxId = formatDisplayInvoiceId(data.id, selectedBranch);
          }
        }
      }
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      console.error('Failed to record purchase:', err);
    } finally {
      setSubmitting(false);
    }

    const primaryItem = items[0] || { name: 'Vivo Y31d', quantity: 1, price: finalTotal || 28998 };
    const totalQty = items.reduce((acc, i) => acc + i.quantity, 0) || 1;

    const receiptPayload = {
      transactionId: formattedTxId,
      totalAmount: finalTotal || 28998,
      subtotal: subtotal || 28998,
      deviceName: items.length > 1 ? `${primaryItem.name} (+${items.length - 1} more)` : primaryItem.name,
      quantity: totalQty,
      items: items.map(i => {
        let variationLabel = '';
        if (i.variations && Array.isArray(i.variations) && i.variations.length > 0) {
          variationLabel = i.variations.map((v: any) => v.name || v.value || v).join(', ');
        }
        return {
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.price,
          total: i.price * i.quantity,
          variations: variationLabel || 'Standard'
        };
      }),
      branch: selectedBranch,
      customerName: customerProfile?.name || 'Customer',
      customerEmail: customerProfile?.email || 'customer@graphix.com',
      customerPhone: customerProfile?.phone || '0917 123 4567',
      paymentMethod: method === 'gcash' ? 'GCash' : 'Cash',
      tenderedCash: method === 'cash' ? finalTotal : null,
      change: 0,
      staffMessage: staffMessage.trim() || '',
      status: 'Purchase Confirmed',
      timestamp: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };

    try {
      sessionStorage.setItem('graphix_last_checkout', JSON.stringify(receiptPayload));
    } catch (e) {
      console.error(e);
    }

    const queryParams = new URLSearchParams({
      method: method === 'gcash' ? 'gcash' : 'cash',
      id: receiptPayload.transactionId.replace('#', ''),
      amount: String(receiptPayload.totalAmount),
      device: receiptPayload.deviceName,
      qty: String(receiptPayload.quantity),
      branch: receiptPayload.branch
    });
    if (method === 'cash') {
      queryParams.set('tendered', String(finalTotal));
      queryParams.set('change', '0');
    }
    if (receiptPayload.staffMessage) {
      queryParams.set('note', receiptPayload.staffMessage);
    }

    navigate(`/customer/purchase-confirmed?${queryParams.toString()}`);
  };

  return (
    <div 
      className="min-h-screen relative flex justify-center items-center p-3 sm:p-6 font-['Inter'] bg-cover bg-center bg-no-repeat overflow-y-auto"
      style={{ backgroundImage: "url('/Images/storefront-bg.jpg')" }}
    >
      {/* Sleek frosted backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[3px] z-0"></div>

      <div className="w-full max-w-5xl bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl border border-gray-100 flex flex-col gap-6 relative z-10 my-6 animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2.5 hover:bg-purple-50 rounded-2xl text-gray-500 hover:text-[#bd00ff] transition-all cursor-pointer border border-gray-100 shadow-xs"
              title="Go back"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2 m-0">
                Secure Checkout & Payment
                <ShieldCheck size={20} className="text-emerald-500" />
              </h2>
              <p className="text-xs text-gray-400 m-0 mt-0.5">Complete your transaction safely and pick up in store</p>
            </div>
          </div>

          <span className="text-xs font-bold px-3 py-1.5 bg-purple-50 text-[#bd00ff] rounded-full border border-purple-100 flex items-center gap-1.5 shadow-xs">
            <ShoppingBag size={14} />
            {items.reduce((acc, i) => acc + i.quantity, 0)} {items.reduce((acc, i) => acc + i.quantity, 0) === 1 ? 'Item' : 'Items'}
          </span>
        </div>

        {/* 2-Column Responsive Checkout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Configuration (Branch, Payment Method, GCash Details, Notes) */}
          <div className="lg:col-span-7 flex flex-col gap-6">

            {/* Section 0: Pickup Branch Location */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-gray-800 text-sm tracking-wide flex items-center gap-1.5">
                  <MapPin size={16} className="text-[#bd00ff]" />
                  Pickup Branch Location
                </label>
                <span className="text-[10px] text-gray-400 font-bold uppercase">Store Branch</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {(branches.length > 0
                  ? branches.map(b => ({
                      id: b.id,
                      displayName: cleanBranchName(b.name),
                      fullName: b.name.includes('Branch') ? b.name : `${b.name} Branch`
                    }))
                  : [
                      { id: 'tagoloan', displayName: 'Tagoloan', fullName: 'Tagoloan Branch' },
                      { id: 'villanueva', displayName: 'Villanueva', fullName: 'Villanueva Branch' },
                      { id: 'jasaan', displayName: 'Jasaan', fullName: 'Jasaan Branch' }
                    ]
                ).map((b) => (
                  <button
                    key={b.id || b.fullName}
                    type="button"
                    onClick={() => setSelectedBranch(b.fullName)}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold transition-all text-center cursor-pointer ${
                      cleanBranchName(selectedBranch).toLowerCase() === b.displayName.toLowerCase()
                        ? 'border-[#bd00ff] bg-purple-50 text-[#bd00ff] shadow-xs'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {b.displayName}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 1: Payment Method Selection */}
            <div className="flex flex-col gap-3">
              <label className="font-extrabold text-gray-800 text-sm tracking-wide">
                Select Payment Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Cash Card */}
                <button
                  type="button"
                  onClick={() => setMethod('cash')}
                  className={`relative flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    method === 'cash'
                      ? 'border-[#bd00ff] bg-purple-50/50 shadow-md shadow-purple-500/10'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {method === 'cash' && (
                    <div className="absolute top-2.5 right-2.5 text-[#bd00ff]">
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                  <div className={`p-3 rounded-full transition-colors ${
                    method === 'cash' ? 'bg-[#bd00ff] text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Coins size={22} />
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <span className="font-black text-xs text-gray-900">Cash Payment</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">Pay in cash upon pickup</span>
                  </div>
                </button>

                {/* GCash Card */}
                <button
                  type="button"
                  onClick={() => setMethod('gcash')}
                  className={`relative flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    method === 'gcash'
                      ? 'border-[#005ce6] bg-blue-50/50 shadow-md shadow-blue-500/10'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {method === 'gcash' && (
                    <div className="absolute top-2.5 right-2.5 text-[#005ce6]">
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                  <div className={`p-3 rounded-full transition-colors ${
                    method === 'gcash' ? 'bg-[#005ce6] text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Smartphone size={22} />
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <span className="font-black text-xs text-gray-900">GCash Payment</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">Instant online e-wallet</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Section 2: Dynamic Method-Specific Form (GCash Only) */}
            {method === 'gcash' && (
              <div className="bg-gradient-to-b from-blue-50/80 to-white border border-blue-200 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-[#005ce6] text-white rounded-lg flex items-center justify-center font-black text-sm shadow-xs">
                      G
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider m-0">GCash Transfer</h4>
                      <span className="text-[10px] text-blue-600 font-semibold">Official Verified Merchant</span>
                    </div>
                  </div>

                  <span className="text-[11px] font-black text-[#005ce6] bg-blue-100/70 px-2 py-0.5 rounded-full">
                    0% Transaction Fee
                  </span>
                </div>

                {/* Merchant Details */}
                <div className="bg-white rounded-xl p-3 border border-blue-100 flex flex-col gap-2 shadow-xs">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Account Name:</span>
                    <span className="font-bold text-gray-900">{activeGcashName}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Account Number:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#005ce6] text-sm">{activeGcashNumber}</span>
                      <button
                        type="button"
                        onClick={handleCopyGcashNumber}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                        title="Copy GCash number"
                      >
                        {copiedNumber ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* QR Code Trigger & Modal Preview */}
                <div className="flex items-center justify-between bg-blue-900/5 rounded-xl p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <QrCode size={18} className="text-[#005ce6]" />
                    <span className="font-semibold text-gray-700">Scan QR Code directly</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGcashModal(true)}
                    className="text-xs font-bold text-[#005ce6] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    View QR Code →
                  </button>
                </div>

                {/* Optional Reference Number Input */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-700">
                    GCash Reference No. (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="E.g., 901234567890"
                    value={gcashRef}
                    onChange={(e) => setGcashRef(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-mono outline-none focus:border-[#005ce6] focus:ring-1 focus:ring-blue-100"
                  />
                </div>
              </div>
            )}

            {/* Section 3: Optional Customer / Order Note */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-gray-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-gray-400" />
                  Message for Staff / Order Note
                </label>
                <span className="text-[10px] text-gray-400 font-medium">Optional</span>
              </div>
              <textarea
                placeholder="E.g., Preferred pickup schedule, branch instructions, notes for staff..."
                value={staffMessage}
                onChange={(e) => setStaffMessage(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs text-gray-800 focus:border-[#bd00ff] focus:bg-white focus:ring-1 focus:ring-[#bd00ff] transition-all resize-none"
              />
            </div>
          </div>

          {/* Right Column: Order Items, Summary & Confirmation */}
          <div className="lg:col-span-5 flex flex-col gap-5 lg:sticky lg:top-6">
            
            {/* Order Item Summary Preview */}
            {items.length > 0 && (
              <div className="bg-gray-50/80 border border-gray-200/80 rounded-2xl p-4 flex flex-col gap-2.5 shadow-xs">
                <div 
                  className="flex justify-between items-center cursor-pointer select-none"
                  onClick={() => setShowItemsList(!showItemsList)}
                >
                  <div className="flex items-center gap-2">
                    <Receipt size={16} className="text-purple-600" />
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Order Items ({items.length})
                    </span>
                  </div>
                  <span className="text-xs text-[#bd00ff] font-bold hover:underline">
                    {showItemsList ? 'Hide Details' : 'View Items'}
                  </span>
                </div>

                {showItemsList && (
                  <div className="flex flex-col gap-2.5 pt-3 border-t border-gray-200/60 mt-1 max-h-56 overflow-y-auto pr-1">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 text-xs bg-white p-2.5 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden p-0.5">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                            ) : (
                              <ShoppingBag size={16} className="text-gray-400" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-gray-900 truncate">{item.name}</span>
                            <span className="text-[10px] text-gray-400">
                              Qty: {item.quantity} {item.variations && item.variations.length > 0 && `• ${item.variations.map(v => v.name || v.value).join(', ')}`}
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className="font-black text-gray-900">
                            ₱{(item.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          {item.discount > 0 && (
                            <span className="block text-[10px] text-emerald-600 font-semibold line-through">
                              ₱{(item.originalPrice * item.quantity).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Section 4: Payment Details Breakdown */}
            <div className="bg-white border-2 border-purple-100 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider m-0">
                  Payment Details
                </h3>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  Free In-Store Pickup
                </span>
              </div>

              <div className="flex flex-col gap-2 text-xs">
                {/* 1. Product/Order Subtotal */}
                <div className="flex justify-between items-center text-gray-600 font-medium">
                  <span>Order Subtotal</span>
                  <span className="font-bold text-gray-900">
                    ₱{loading ? '...' : subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 2. Discount */}
                {totalDiscount > 0 && (
                  <div className="flex justify-between items-center text-emerald-600 font-bold animate-in fade-in">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={13} className="text-emerald-500" />
                      Promotional Discount
                    </span>
                    <span className="text-emerald-700 font-black">
                      -₱{totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    Final Total Payment
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Actual payable amount
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-[#bd00ff] tracking-tight">
                    ₱{loading ? '...' : finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  {totalDiscount > 0 && (
                    <span className="text-[10px] font-bold text-emerald-600 block mt-0.5">
                      Saved ₱{totalDiscount.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Section 5: Place Order / Confirm Payment Button */}
            <button
              type="button"
              disabled={loading || submitting}
              onClick={handlePlaceOrder}
              className="w-full py-4 bg-gradient-to-r from-[#bd00ff] to-[#4B0082] hover:opacity-95 text-white font-extrabold text-sm md:text-base rounded-2xl border-none cursor-pointer shadow-lg shadow-purple-500/25 active:scale-[0.99] transition-all uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Processing Order...</span>
                </>
              ) : (
                <>
                  <span>Place Order • ₱{finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </>
              )}
            </button>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-3 text-[11px] text-gray-400 font-medium">
              <span className="flex items-center gap-1">
                <ShieldCheck size={14} className="text-emerald-500" /> Secure Checkout
              </span>
              <span>•</span>
              <span>100% In-Store Pickup</span>
              <span>•</span>
              <span>Official Warranty</span>
            </div>

          </div>
        </div>

      </div>

      {/* GCash QR Modal */}
      {showGcashModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => {
            setShowGcashModal(false);
            setShowEnlargedQr(false);
          }}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl border border-gray-100 flex flex-col items-center gap-3.5 text-center relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button top-right */}
            <button
              type="button"
              onClick={() => {
                setShowGcashModal(false);
                setShowEnlargedQr(false);
              }}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer border-none bg-transparent"
              title="Close modal"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#005ce6] text-white rounded-lg flex items-center justify-center font-black text-sm shadow-xs">
                G
              </div>
              <h3 className="font-extrabold text-base text-gray-900 m-0">GCash Merchant QR</h3>
            </div>

            {/* Clickable QR Code to enlarge */}
            <button
              type="button"
              onClick={() => setShowEnlargedQr(true)}
              className="w-52 h-52 bg-white border-2 border-dashed border-blue-300 hover:border-[#005ce6] rounded-2xl flex items-center justify-center relative overflow-hidden shadow-xs p-2 cursor-pointer group transition-all"
              title="Click to view larger QR code"
            >
              <QRCodeDisplay
                value={qrRedirectUrl}
                uploadedImageUrl={activeGcashQr}
                size={190}
                alt={`${activeGcashName} GCash QR`}
              />
              <div className="absolute inset-0 bg-[#005ce6]/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                <span className="bg-white/95 text-[#005ce6] text-xs font-extrabold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 border border-blue-100">
                  <ZoomIn size={14} /> Click to Enlarge
                </span>
              </div>
            </button>
            <span className="text-[11px] text-[#005ce6] font-semibold -mt-1 flex items-center gap-1">
              <ZoomIn size={13} /> Click QR code to enlarge & scan
            </span>

            <div className="flex flex-col gap-1">
              <span className="font-black text-sm text-gray-900">{activeGcashName}</span>
              <span className="font-mono text-xs text-[#005ce6] font-bold">{activeGcashNumber}</span>
              <span className="text-[11px] text-gray-500 mt-1">
                Scan using phone camera or GCash app & transfer exact amount of <strong>₱{finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowGcashModal(false);
                setShowEnlargedQr(false);
              }}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 font-bold text-xs text-gray-700 rounded-xl transition-colors cursor-pointer border-none mt-1"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Enlarged QR Code Modal */}
      {showEnlargedQr && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowEnlargedQr(false)}
        >
          <div 
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm sm:max-w-md w-full shadow-2xl border border-gray-100 flex flex-col items-center gap-4 text-center relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button top-right */}
            <button
              type="button"
              onClick={() => setShowEnlargedQr(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer border-none bg-transparent"
              title="Close enlarged view"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#005ce6] text-white rounded-xl flex items-center justify-center font-black text-base shadow-xs">
                G
              </div>
              <h3 className="font-extrabold text-lg text-gray-900 m-0">GCash Merchant QR</h3>
            </div>

            {/* High-visibility clean large QR container */}
            <div className="w-full max-w-[280px] sm:max-w-[340px] aspect-square bg-white border-2 border-blue-200 rounded-2xl flex items-center justify-center p-3 sm:p-4 shadow-sm relative overflow-hidden">
              <QRCodeDisplay
                value={qrRedirectUrl}
                uploadedImageUrl={activeGcashQr}
                size={340}
                alt={`${activeGcashName} GCash QR`}
                className="w-full h-full"
              />
            </div>

            {/* Merchant Details */}
            <div className="flex flex-col gap-1 items-center">
              <span className="font-black text-base sm:text-lg text-gray-900">{activeGcashName}</span>
              <span className="font-mono text-sm sm:text-base text-[#005ce6] font-extrabold tracking-wide">{activeGcashNumber}</span>
              <p className="text-xs text-gray-500 m-0 mt-1 max-w-xs font-medium leading-relaxed">
                Scan using your GCash app scanner & transfer exact amount of <strong className="text-gray-900 font-bold">₱{finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowEnlargedQr(false)}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 font-bold text-xs text-gray-700 rounded-xl transition-colors cursor-pointer border-none"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerPayment() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen bg-[#f8fafc]">
        <div className="w-12 h-12 border-4 border-purple-100 border-t-[#bd00ff] rounded-full animate-spin"></div>
      </div>
    }>
      <CustomerPaymentContent />
    </Suspense>
  );
}
