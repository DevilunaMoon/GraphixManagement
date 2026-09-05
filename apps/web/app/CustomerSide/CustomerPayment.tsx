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
  Receipt
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

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
  const navigate = router.push;

  const [method, setMethod] = useState<'cash' | 'gcash'>('cash');
  const [items, setItems] = useState<PurchasedItem[]>([]);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [totalDiscount, setTotalDiscount] = useState<number>(0);
  const [finalTotal, setFinalTotal] = useState<number>(0);
  const [selectedVariationsStr, setSelectedVariationsStr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Cash Payment States
  const [tenderedCash, setTenderedCash] = useState<string>('');
  const [cashError, setCashError] = useState<string | null>(null);

  // GCash States
  const [gcashRef, setGcashRef] = useState<string>('');
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [showGcashModal, setShowGcashModal] = useState(false);

  // General States
  const [staffMessage, setStaffMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showItemsList, setShowItemsList] = useState(false);

  const gcashNumber = "0967 123 4567";

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

            const singleItem: PurchasedItem = {
              id: device.id,
              name: device.name,
              image: device.images?.[0] || device.image || null,
              price: effectivePrice,
              originalPrice: basePrice,
              discount: discountPercent,
              quantity: 1,
              variations: vars
            };

            setItems([singleItem]);
            setSubtotal(basePrice);
            setTotalDiscount(unitDiscount);
            setFinalTotal(effectivePrice);
          }
        }
      } catch (err) {
        console.error('Error fetching checkout data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCheckoutData();
  }, [deviceId, variationIds, cartItemIdsParam]);

  // Numerical change calculation
  const tenderedNumeric = parseFloat(tenderedCash) || 0;
  const changeAmount = Math.max(0, tenderedNumeric - finalTotal);
  const isTenderedSufficient = tenderedNumeric >= finalTotal;

  const handleCopyGcashNumber = () => {
    navigator.clipboard.writeText("09671234567");
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const handlePlaceOrder = async () => {
    if (method === 'cash') {
      if (!tenderedCash || tenderedNumeric <= 0) {
        setCashError('Please enter the cash amount you will tender.');
        return;
      }
      if (tenderedNumeric < finalTotal) {
        setCashError(`Tendered cash must be at least ₱${finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`);
        return;
      }
    }
    setCashError(null);
    setSubmitting(true);

    let createdId = '';
    try {
      const fullStaffMessage = [
        staffMessage.trim() ? `Note: ${staffMessage.trim()}` : '',
        method === 'cash' ? `Tendered Cash: ₱${tenderedNumeric.toLocaleString()} (Change: ₱${changeAmount.toLocaleString()})` : '',
        method === 'gcash' && gcashRef.trim() ? `GCash Ref#: ${gcashRef.trim()}` : ''
      ].filter(Boolean).join(' | ');

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: deviceId || undefined,
          amount: finalTotal,
          variations: selectedVariationsStr,
          cartItemIds: cartItemIdsParam ? cartItemIdsParam.split(',') : undefined,
          phoneNumber: method === 'cash' ? `₱${tenderedNumeric.toLocaleString()}` : gcashRef || undefined,
          staffMessage: fullStaffMessage || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          createdId = data.id;
        }
      }
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      console.error('Failed to record purchase:', err);
    } finally {
      setSubmitting(false);
    }

    if (method === 'gcash') {
      navigate(`/customer/purchase-confirmed?method=gcash${createdId ? `&id=${createdId}` : ''}`);
    } else {
      navigate(`/customer/purchase-confirmed?method=cash${createdId ? `&id=${createdId}` : ''}`);
    }
  };

  return (
    <div 
      className="min-h-screen relative flex justify-center items-center p-3 sm:p-6 font-['Inter'] bg-cover bg-center bg-no-repeat overflow-y-auto"
      style={{ backgroundImage: "url('/Images/storefront-bg.jpg')" }}
    >
      {/* Sleek frosted backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[3px] z-0"></div>

      <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-8 shadow-2xl border border-gray-100 flex flex-col gap-6 relative z-10 my-6 animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 hover:bg-purple-50 rounded-full text-gray-500 hover:text-[#bd00ff] transition-all cursor-pointer"
              title="Go back"
            >
              <ChevronLeft size={22} />
            </button>
            <div>
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 m-0">
                Secure Payment
                <ShieldCheck size={18} className="text-emerald-500" />
              </h2>
              <p className="text-xs text-gray-400 m-0 mt-0.5">Complete your transaction safely</p>
            </div>
          </div>

          <span className="text-[11px] font-bold px-2.5 py-1 bg-purple-50 text-[#bd00ff] rounded-full border border-purple-100 flex items-center gap-1">
            <ShoppingBag size={12} />
            {items.reduce((acc, i) => acc + i.quantity, 0)} {items.reduce((acc, i) => acc + i.quantity, 0) === 1 ? 'Item' : 'Items'}
          </span>
        </div>

        {/* Order Item Summary Preview (Collapsible) */}
        {items.length > 0 && (
          <div className="bg-gray-50/70 border border-gray-200/70 rounded-2xl p-3.5 flex flex-col gap-2">
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
              <div className="flex flex-col gap-2.5 pt-3 border-t border-gray-200/60 mt-1 max-h-48 overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden p-0.5">
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

        {/* Section 2: Dynamic Method-Specific Form */}
        {method === 'cash' ? (
          <div className="bg-gray-50/80 border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="font-bold text-gray-800 text-xs uppercase tracking-wider">
                Tendered Cash (Amount you have) *
              </label>
              <span className="text-[10px] text-gray-400">Exact or higher</span>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 font-black text-base">
                ₱
              </div>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Enter cash amount"
                value={tenderedCash}
                onChange={(e) => {
                  setTenderedCash(e.target.value);
                  setCashError(null);
                }}
                className={`w-full pl-9 pr-4 py-3 bg-white border rounded-xl outline-none font-bold text-base text-gray-900 transition-all ${
                  cashError 
                    ? 'border-red-500 ring-2 ring-red-100' 
                    : 'border-gray-200 focus:border-[#bd00ff] focus:ring-2 focus:ring-purple-100'
                }`}
              />
            </div>

            {/* Quick Bill Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-gray-400 mr-1">Quick:</span>
              <button
                type="button"
                onClick={() => {
                  setTenderedCash(String(finalTotal));
                  setCashError(null);
                }}
                className="text-[11px] font-bold px-2.5 py-1 bg-white border border-gray-200 hover:border-purple-300 hover:text-[#bd00ff] rounded-lg transition-all cursor-pointer shadow-2xs"
              >
                Exact (₱{finalTotal.toLocaleString()})
              </button>
              {[100, 500, 1000].map(addVal => (
                <button
                  key={addVal}
                  type="button"
                  onClick={() => {
                    const current = parseFloat(tenderedCash) || finalTotal;
                    setTenderedCash(String(Math.ceil((current + addVal) / 100) * 100));
                    setCashError(null);
                  }}
                  className="text-[11px] font-bold px-2 py-1 bg-white border border-gray-200 hover:border-purple-300 hover:text-[#bd00ff] rounded-lg transition-all cursor-pointer shadow-2xs"
                >
                  +{addVal}
                </button>
              ))}
            </div>

            {/* Live Change Calculation Display */}
            {tenderedNumeric > 0 && (
              <div className={`mt-1 p-3 rounded-xl border flex items-center justify-between transition-all ${
                isTenderedSufficient 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center gap-2 text-xs font-bold">
                  {isTenderedSufficient ? (
                    <>
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>Change to Return:</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={16} className="text-amber-600" />
                      <span>Insufficient Cash:</span>
                    </>
                  )}
                </div>

                <div className="text-sm font-black">
                  {isTenderedSufficient ? (
                    <span className="text-emerald-700">
                      ₱{changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-amber-700">
                      Short by ₱{(finalTotal - tenderedNumeric).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>
            )}

            {cashError && (
              <span className="text-red-500 text-xs font-bold mt-0.5 flex items-center gap-1">
                <AlertCircle size={13} /> {cashError}
              </span>
            )}
          </div>
        ) : (
          /* GCash Payment Info Box */
          <div className="bg-gradient-to-b from-blue-50/80 to-white border border-blue-200 rounded-2xl p-4 flex flex-col gap-3.5">
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
            <div className="bg-white rounded-xl p-3 border border-blue-100 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Account Name:</span>
                <span className="font-bold text-gray-900">GRAPHIX MANAGEMENT</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Account Number:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#005ce6] text-sm">{gcashNumber}</span>
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
            <div className="flex items-center justify-between bg-blue-900/5 rounded-xl p-2.5 text-xs">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-[#005ce6]" />
                <span className="font-semibold text-gray-700">Scan QR Code directly</span>
              </div>
              <button
                type="button"
                onClick={() => setShowGcashModal(true)}
                className="text-xs font-bold text-[#005ce6] hover:underline cursor-pointer"
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
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono outline-none focus:border-[#005ce6] focus:ring-1 focus:ring-blue-100"
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

        {/* Section 4: Payment Details Breakdown (Inspired by Reference 2) */}
        <div className="bg-white border-2 border-purple-100 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider m-0">
              Payment Details
            </h3>
            <span className="text-[10px] text-gray-400 font-medium">
              No extra fees
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

            {/* 2. Discount (ONLY DISPLAYED IF DISCOUNT APPLIED) */}
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

            {/* Strict Notice: NO shipping fees, NO protection fees, NO e-commerce additions */}
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
          className="w-full py-4 bg-gradient-to-r from-[#bd00ff] to-[#4B0082] hover:opacity-95 text-white font-extrabold text-base rounded-2xl border-none cursor-pointer shadow-lg shadow-purple-500/25 active:scale-[0.99] transition-all uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

      </div>

      {/* GCash QR Modal */}
      {showGcashModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowGcashModal(false)}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl border border-gray-100 flex flex-col items-center gap-4 text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#005ce6] text-white rounded-lg flex items-center justify-center font-black text-sm">
                G
              </div>
              <h3 className="font-extrabold text-base text-gray-900 m-0">GCash Merchant QR</h3>
            </div>

            <div className="w-48 h-48 bg-gray-50 border-2 border-dashed border-blue-200 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-inner">
              <QrCode size={120} className="text-[#005ce6]" />
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-black text-sm text-gray-900">GRAPHIX MANAGEMENT</span>
              <span className="font-mono text-xs text-[#005ce6] font-bold">{gcashNumber}</span>
              <span className="text-[11px] text-gray-500 mt-1">
                Scan using the GCash app & transfer exact amount of <strong>₱{finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowGcashModal(false)}
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
