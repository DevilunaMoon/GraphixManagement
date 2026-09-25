"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
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
  ZoomIn,
  Upload,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  Eye,
  FileUp,
  Loader2,
  HelpCircle,
  Camera,
  ArrowDown,
  Info
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import imageCompression from 'browser-image-compression';
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

  // Branch Inventory Availability States
  const [branchAvailability, setBranchAvailability] = useState<any[]>([]);
  const [hasAnyAvailableBranch, setHasAnyAvailableBranch] = useState(true);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // GCash States
  const [gcashRef, setGcashRef] = useState<string>('');
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [showGcashModal, setShowGcashModal] = useState(false);
  const [showEnlargedQr, setShowEnlargedQr] = useState(false);

  // GCash Receipt Upload States
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [isCompressingReceipt, setIsCompressingReceipt] = useState(false);
  const [originalFileSize, setOriginalFileSize] = useState<number | null>(null);
  const [showReceiptPreviewModal, setShowReceiptPreviewModal] = useState(false);
  const [showGcashGuideModal, setShowGcashGuideModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAreaRef = useRef<HTMLDivElement>(null);

  // General States
  const [staffMessage, setStaffMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showItemsList, setShowItemsList] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);

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
            await checkBranchAvailability(parsedItems, null, null, cartItemIdsParam);
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
            await checkBranchAvailability([singleItem], device.id, variationIds, null);
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
          await checkBranchAvailability([defaultItem]);
        }
      } catch (err) {
        console.error('Error fetching checkout data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCheckoutData();
  }, [deviceId, variationIds, cartItemIdsParam, quantityParam]);

  const checkBranchAvailability = async (
    checkoutItems: PurchasedItem[],
    explicitDeviceId?: string | null,
    explicitVarIds?: string | null,
    explicitCartItemIds?: string | null
  ) => {
    try {
      setCheckingAvailability(true);
      const payload: any = {};
      if (explicitCartItemIds || cartItemIdsParam) {
        payload.cartItemIds = (explicitCartItemIds || cartItemIdsParam)?.split(',').filter(Boolean);
      } else if (explicitDeviceId || deviceId) {
        const itemQty = checkoutItems[0]?.quantity || parseInt(quantityParam || '1', 10) || 1;
        const vIds = explicitVarIds || variationIds;
        payload.items = [{
          deviceId: explicitDeviceId || deviceId,
          quantity: itemQty,
          variationIds: vIds ? vIds.split(',').filter(Boolean) : undefined,
          variations: checkoutItems[0]?.variations || undefined
        }];
      } else if (checkoutItems && checkoutItems.length > 0) {
        payload.items = checkoutItems.map(i => ({
          deviceId: i.id,
          quantity: i.quantity,
          variations: i.variations
        }));
      }

      const res = await fetch('/api/branches/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.branches)) {
          setBranchAvailability(data.branches);
          setHasAnyAvailableBranch(Boolean(data.hasAvailableBranch));

          // If current selected branch is not available, switch to first available branch
          const currentClean = cleanBranchName(selectedBranch).toLowerCase();
          const currentAvail = data.branches.find((b: any) => cleanBranchName(b.displayName || b.branchName).toLowerCase() === currentClean);

          if (!currentAvail || !currentAvail.isAvailable) {
            if (data.firstAvailableBranch) {
              setSelectedBranch(data.firstAvailableBranch);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to check branch availability:', err);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleCopyGcashNumber = () => {
    navigator.clipboard.writeText(cleanGcashDigits || activeGcashNumber);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const handleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const extMatch = file.name.match(/\.(jpg|jpeg|png|webp)$/i);
    if (!validTypes.includes(file.type.toLowerCase()) && !extMatch) {
      setReceiptError('Please upload a valid receipt image (JPG, JPEG, or PNG).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setReceiptError('Receipt image must be smaller than 25MB.');
      return;
    }

    setReceiptError(null);
    setOriginalFileSize(file.size);
    setIsCompressingReceipt(true);

    try {
      // Compress image client-side before preview and submission to optimize size while keeping crisp clarity
      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1800,
        useWebWorker: true,
        fileType: file.type.includes('png') ? 'image/png' : 'image/jpeg',
        initialQuality: 0.85
      };

      let finalFile: File = file;
      try {
        const compressedBlob = await imageCompression(file, options);
        finalFile = new File([compressedBlob], file.name, {
          type: compressedBlob.type || file.type,
          lastModified: Date.now()
        });
      } catch (compressionErr) {
        console.warn('Compression fallback to original file:', compressionErr);
        finalFile = file;
      }

      setReceiptFile(finalFile);
      if (receiptPreview) {
        URL.revokeObjectURL(receiptPreview);
      }
      const objectUrl = URL.createObjectURL(finalFile);
      setReceiptPreview(objectUrl);
    } catch (err: any) {
      console.error('Failed to process receipt image:', err);
      setReceiptError('Failed to process image. Please try again.');
    } finally {
      setIsCompressingReceipt(false);
    }
  };

  const handleRemoveReceipt = () => {
    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview);
    }
    setReceiptFile(null);
    setReceiptPreview(null);
    setReceiptError(null);
    setOriginalFileSize(null);
    setShowReceiptPreviewModal(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePlaceOrder = async () => {
    // 0. Verify branch availability before submission
    const currentClean = cleanBranchName(selectedBranch).toLowerCase();
    const currentAvail = branchAvailability.find(
      ba => cleanBranchName(ba.displayName || ba.branchName).toLowerCase() === currentClean
    );

    if (currentAvail && !currentAvail.isAvailable) {
      setReceiptError(currentAvail.reason || `The selected pickup branch (${cleanBranchName(selectedBranch)}) cannot fulfill your current order. Please select an available branch.`);
      await checkBranchAvailability(items, deviceId, variationIds, cartItemIdsParam);
      return;
    }

    if (method === 'gcash' && !receiptFile) {
      setReceiptError('Please upload your GCash payment receipt to submit for verification.');
      uploadAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      fileInputRef.current?.click();
      return;
    }

    setSubmitting(true);
    setReceiptError(null);

    const branchCode = getBranchCode(selectedBranch);
    const plannedTxId = `#GRPX-${branchCode}-A1`;
    let createdId = '';
    let formattedTxId = plannedTxId;
    let uploadedReceiptUrl: string | null = null;

    try {
      // 1. If paying with GCash, upload receipt image proof first
      if (method === 'gcash' && receiptFile) {
        const formData = new FormData();
        formData.append('file', receiptFile);
        formData.append('folder', 'gcash_receipts');
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.url) {
          throw new Error(uploadData.error || 'Failed to upload GCash receipt. Please try again.');
        }
        uploadedReceiptUrl = uploadData.url;
      }

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
          paymentType: method === 'cash' ? 'Cash' : 'GCash',
          status: method === 'gcash' ? 'For Verification' : (method === 'cash' ? 'Pending Pickup' : 'Active'),
          isSettled: false,
          receiptUrl: uploadedReceiptUrl || undefined,
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
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to record purchase.');
      }
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err: any) {
      console.error('Failed to record purchase:', err);
      setReceiptError(err.message || 'Failed to process order. Please try again.');
      setSubmitting(false);
      return;
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
      receiptUrl: uploadedReceiptUrl || null,
      status: method === 'gcash' ? 'For Verification' : 'Purchase Confirmed',
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
    if (method === 'gcash') {
      queryParams.set('status', 'For Verification');
      if (uploadedReceiptUrl) {
        queryParams.set('receiptUrl', uploadedReceiptUrl);
      }
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
            <div className="flex flex-col gap-2.5">
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
                ).map((b) => {
                  const availInfo = branchAvailability.find(
                    ba => cleanBranchName(ba.displayName || ba.branchName).toLowerCase() === b.displayName.toLowerCase()
                  );
                  const isAvailable = availInfo ? availInfo.isAvailable : true;
                  const isSelected = cleanBranchName(selectedBranch).toLowerCase() === b.displayName.toLowerCase();

                  return (
                    <button
                      key={b.id || b.fullName}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => {
                        if (isAvailable) {
                          setSelectedBranch(b.fullName);
                        }
                      }}
                      className={`py-3 px-2.5 rounded-2xl border text-xs font-bold transition-all text-center relative flex flex-col items-center justify-center gap-0.5 ${
                        !isAvailable
                          ? 'border-gray-200 bg-gray-50/70 text-gray-400 opacity-60 cursor-not-allowed shadow-none'
                          : isSelected
                            ? 'border-[#bd00ff] bg-purple-50 text-[#bd00ff] shadow-xs cursor-pointer'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 cursor-pointer'
                      }`}
                      title={!isAvailable ? (availInfo?.reason || `${b.displayName} is unavailable for this order`) : `Select ${b.displayName} Branch`}
                    >
                      <span className="truncate w-full">{b.displayName}</span>
                      {!isAvailable && (
                        <span className="text-[9px] font-extrabold text-amber-600 uppercase tracking-tight">
                          Unavailable
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Reasons for unavailable branches */}
              {branchAvailability.some(ba => !ba.isAvailable && ba.reason) && (
                <div className="flex flex-col gap-1.5 mt-0.5">
                  {branchAvailability
                    .filter(ba => !ba.isAvailable && ba.reason)
                    .map((ba) => (
                      <div
                        key={ba.branchId || ba.displayName}
                        className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200/70 rounded-xl px-3 py-2 leading-relaxed animate-in fade-in"
                      >
                        <AlertCircle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          <strong className="font-bold text-amber-950">{ba.displayName}:</strong> {ba.reason}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              {/* Prominent warning if NO branches can fulfill the order */}
              {!hasAnyAvailableBranch && !checkingAvailability && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 text-xs shadow-xs animate-in fade-in mt-1">
                  <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="font-bold text-sm text-rose-950 m-0">No Pickup Branch Available</p>
                    <p className="mt-1 text-rose-800 m-0 leading-relaxed">
                      One or more items in your order are currently unavailable in all branches. Please adjust your order quantity or remove the unavailable item before continuing.
                    </p>
                  </div>
                </div>
              )}
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
                    GCash Reference No.
                  </label>
                  <input
                    type="text"
                    placeholder="E.g., 901234567890"
                    value={gcashRef}
                    onChange={(e) => setGcashRef(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-mono outline-none focus:border-[#005ce6] focus:ring-1 focus:ring-blue-100"
                  />
                </div>

                {/* Section 2.1: GCash Payment Receipt Upload */}
                <div ref={uploadAreaRef} className="flex flex-col gap-2 pt-2 border-t border-blue-100">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                      <FileUp size={15} className="text-[#005ce6]" />
                      Upload GCash Payment Receipt
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowGcashGuideModal(true)}
                        className="text-[11px] font-extrabold text-[#bd00ff] hover:text-[#9c00d6] bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs hover:shadow-xs"
                        title="View step-by-step GCash guide"
                      >
                        <HelpCircle size={13} className="text-[#bd00ff]" />
                        <span>How to Upload GCash Receipt?</span>
                      </button>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-full">
                        Required
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 m-0">
                    Upload your completed GCash payment screenshot for Cashier verification before store pickup.
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    onChange={handleReceiptFileChange}
                    className="hidden"
                  />

                  {/* Compressing State Indicator */}
                  {isCompressingReceipt && (
                    <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-center justify-center gap-2.5 text-xs text-[#005ce6] font-bold animate-pulse shadow-2xs">
                      <Loader2 size={16} className="animate-spin text-[#005ce6]" />
                      <span>Compressing & optimizing receipt image...</span>
                    </div>
                  )}

                  {!receiptPreview && !isCompressingReceipt ? (
                    /* Dropzone when no file selected */
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          const dt = new DataTransfer();
                          dt.items.add(file);
                          if (fileInputRef.current) {
                            fileInputRef.current.files = dt.files;
                            handleReceiptFileChange({ target: fileInputRef.current } as any);
                          }
                        }
                      }}
                      className="border-2 border-dashed border-blue-300 hover:border-[#005ce6] hover:bg-blue-50/60 bg-blue-50/30 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer transition-all group"
                    >
                      <div className="w-11 h-11 rounded-full bg-blue-100 text-[#005ce6] flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                        <Upload size={20} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-gray-800">
                          Click to browse or drag & drop receipt
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          Auto-compressed • Accepted: JPG, JPEG, PNG (Max 25MB)
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-[#005ce6] bg-white px-3 py-1 rounded-xl border border-blue-200 shadow-2xs">
                        Select Receipt Image
                      </span>
                    </div>
                  ) : receiptPreview && !isCompressingReceipt ? (
                    /* Preview Card when file is uploaded */
                    <div className="bg-white border-2 border-blue-300 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm animate-in fade-in zoom-in-95">
                      <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                        <div 
                          onClick={() => setShowReceiptPreviewModal(true)}
                          className="w-16 h-16 rounded-xl bg-gray-100 border border-blue-200 overflow-hidden relative cursor-pointer group shrink-0"
                          title="Click to view full receipt"
                        >
                          <img
                            src={receiptPreview}
                            alt="Receipt Preview"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <ZoomIn size={16} />
                          </div>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-gray-900 truncate">
                            {receiptFile?.name || 'GCash_Receipt.png'}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium">
                            {receiptFile ? (
                              <>
                                <span className="font-bold text-blue-600">{(receiptFile.size / 1024).toFixed(1)} KB</span>
                                {originalFileSize && originalFileSize > receiptFile.size && (
                                  <span className="text-emerald-600 font-semibold ml-1">
                                    (Compressed from {(originalFileSize / 1024).toFixed(0)} KB)
                                  </span>
                                )}
                              </>
                            ) : 'Image ready'} • Ready for verification
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                            <CheckCircle2 size={11} /> Proof Attached
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => setShowReceiptPreviewModal(true)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#005ce6] text-xs font-extrabold rounded-xl border border-blue-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                          title="Click to view full size receipt"
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Replace receipt image"
                        >
                          <RefreshCw size={13} />
                          <span>Replace</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveReceipt}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200 cursor-pointer transition-colors"
                          title="Remove receipt"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Receipt Error Alert */}
                  {receiptError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-semibold animate-in fade-in">
                      <AlertCircle size={15} className="shrink-0 text-rose-600" />
                      <span>{receiptError}</span>
                    </div>
                  )}

                  {/* Verification Notice */}
                  <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-2.5 text-[11px] text-blue-900/80 leading-relaxed">
                    ℹ️ <strong>Note:</strong> Uploading your receipt submits it for <strong>Cashier verification</strong>. The official Graphix Store receipt and pickup release are issued after cashier approval.
                  </div>
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

            {/* Section 5: Terms & Action Submission Button */}
            <div className="flex flex-col gap-3">
              {/* Terms Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-600 select-none">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-[#bd00ff] focus:ring-[#bd00ff] cursor-pointer"
                />
                <span>
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowTermsModal(true);
                    }}
                    className="text-[#bd00ff] font-bold hover:underline bg-transparent border-none p-0 cursor-pointer text-xs inline"
                  >
                    Terms & Conditions
                  </button>{' '}
                  and understand that in-store pickup reservations and payments are subject to staff verification.
                </span>
              </label>

              {/* Submit / Place Order Button */}
              {(() => {
                const currentClean = cleanBranchName(selectedBranch).toLowerCase();
                const currentAvail = branchAvailability.find(
                  ba => cleanBranchName(ba.displayName || ba.branchName).toLowerCase() === currentClean
                );
                const isCurrentBranchValid = currentAvail ? currentAvail.isAvailable : true;
                const isBlocked = submitting || !agreedTerms || loading || !hasAnyAvailableBranch || checkingAvailability || !isCurrentBranchValid;

                return (
                  <button
                    type="button"
                    disabled={isBlocked}
                    onClick={handlePlaceOrder}
                    className={`w-full py-4 px-6 rounded-2xl font-black text-sm tracking-wide text-white transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed ${
                      !hasAnyAvailableBranch || !isCurrentBranchValid
                        ? 'bg-gray-400 cursor-not-allowed shadow-none'
                        : method === 'gcash'
                          ? (!receiptFile ? 'bg-[#005ce6] hover:bg-[#0047b3] shadow-blue-500/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20')
                          : 'bg-[#bd00ff] hover:bg-[#9c00d6] shadow-purple-500/25'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Processing Order...</span>
                      </>
                    ) : checkingAvailability ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Checking Stock Availability...</span>
                      </>
                    ) : !hasAnyAvailableBranch ? (
                      <>
                        <AlertCircle size={18} />
                        <span>No Pickup Branch Available</span>
                      </>
                    ) : !isCurrentBranchValid ? (
                      <>
                        <AlertCircle size={18} />
                        <span>Selected Branch Unavailable</span>
                      </>
                    ) : method === 'gcash' ? (
                      !receiptFile ? (
                        <>
                          <UploadCloud size={18} />
                          <span>Upload GCash Receipt</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={18} />
                          <span>Submit Payment for Verification</span>
                        </>
                      )
                    ) : (
                      <>
                        <ShoppingBag size={18} />
                        <span>Place Order (Cash on Pickup)</span>
                      </>
                    )}
                  </button>
                );
              })()}

              <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 font-medium pt-1">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>100% Authentic Products • Official Graphix Warranty</span>
              </div>
            </div>

          </div>
          {/* End Right Column */}

        </div>
        {/* End 2-Column Grid */}

      </div>
      {/* End Main Container */}

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

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowTermsModal(false)}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-gray-100 flex flex-col gap-4 relative animate-in zoom-in-95 duration-200 max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 text-[#bd00ff] rounded-xl">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="font-extrabold text-base text-gray-900 m-0">Terms & Conditions</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer border-none bg-transparent"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto pr-1 text-xs text-gray-600 leading-relaxed flex flex-col gap-3">
              <p>
                <strong>1. Reservation & Verification:</strong> All checkout reservations placed through Graphix Store are subject to staff verification at the designated pickup branch.
              </p>
              <p>
                <strong>2. GCash Payment Proof:</strong> Customers selecting GCash must upload a valid, clear screenshot of their transaction receipt. The submitted proof will be verified by the branch cashier before the official store receipt is issued and the order is marked ready for pickup.
              </p>
              <p>
                <strong>3. Cash on Pickup:</strong> Cash reservations must be claimed and settled at the selected branch within the 8-hour reservation limit.
              </p>
              <p>
                <strong>4. Warranty & Official Receipt:</strong> The official Graphix Store PDF sales receipt is generated and released only after verified payment. All devices come with the standard Graphix warranty.
              </p>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="px-5 py-2.5 bg-[#bd00ff] hover:bg-[#9c00d6] text-white font-bold text-xs rounded-xl border-none cursor-pointer transition-colors shadow-xs"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step-by-Step GCash Payment Guide Modal */}
      {showGcashGuideModal && (
        <div 
          className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowGcashGuideModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-gray-100 flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 via-blue-50/50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#005ce6] text-white flex items-center justify-center font-black text-lg shadow-md shrink-0">
                  G
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 m-0">
                    How to Upload Your GCash Receipt
                  </h3>
                  <p className="text-xs text-gray-500 m-0 mt-0.5">
                    Follow these steps after completing your GCash payment to submit your payment for verification.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGcashGuideModal(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer border-none bg-transparent shrink-0"
                title="Close guide"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-gray-700 text-xs">
              
              {/* Sequential Steps (1 to 4) */}
              <div className="flex flex-col gap-3.5">
                
                {/* Step 1 */}
                <div className="bg-gray-50/80 border border-gray-200/80 rounded-2xl p-4 flex gap-3.5 items-start">
                  <div className="w-7 h-7 rounded-xl bg-[#005ce6] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                    1
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-gray-900">
                        ① Pay with GCash
                      </span>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                        GCash App
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 m-0 leading-relaxed">
                      Open your GCash app and complete the payment using the provided GCash payment details or QR code.
                    </p>
                    <div className="bg-white rounded-xl p-2.5 border border-blue-100 flex items-center justify-between text-[11px] font-mono mt-1">
                      <span className="text-gray-500">Merchant: <strong className="text-gray-800">{activeGcashName}</strong></span>
                      <span className="text-[#005ce6] font-bold">{activeGcashNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-gray-50/80 border border-gray-200/80 rounded-2xl p-4 flex gap-3.5 items-start">
                  <div className="w-7 h-7 rounded-xl bg-[#005ce6] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                    2
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-gray-900">
                        ② Screenshot Your GCash Transaction Receipt
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Camera size={11} /> Screenshot
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 m-0 leading-relaxed">
                      After your payment is successful, open the GCash transaction receipt or confirmation screen and take a screenshot.
                    </p>
                    <div className="bg-white rounded-xl p-3 border border-emerald-100 flex flex-col gap-1.5 mt-1">
                      <span className="text-[11px] font-bold text-gray-800">Your screenshot should clearly show:</span>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                          <span>Amount paid (₱{finalTotal.toLocaleString()})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                          <span>Transaction / Ref No.</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                          <span>Date and time</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                          <span>Recipient / Merchant info</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-2 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium">
                      ⚠️ <strong>Reminder:</strong> Please upload the <strong>successful transaction receipt</strong>, not the GCash QR code or payment screen before completing the transaction.
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-gray-50/80 border border-gray-200/80 rounded-2xl p-4 flex gap-3.5 items-start">
                  <div className="w-7 h-7 rounded-xl bg-[#bd00ff] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                    3
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-gray-900">
                        ③ Upload Your GCash Receipt
                      </span>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                        JPG, PNG, JPEG
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 m-0 leading-relaxed">
                      Return to Graphix and upload the screenshot of your successful GCash transaction receipt using the <strong>Upload GCash Receipt</strong> dropzone.
                    </p>
                    <p className="text-[11px] text-gray-500 m-0">
                      After selecting your file, you can preview the image, zoom in, or replace/remove it anytime before submitting.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="bg-gray-50/80 border border-gray-200/80 rounded-2xl p-4 flex gap-3.5 items-start">
                  <div className="w-7 h-7 rounded-xl bg-[#bd00ff] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                    4
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-gray-900">
                        ④ Submit Your Receipt
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Verification Queue
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 m-0 leading-relaxed">
                      After selecting your receipt image, review the uploaded image and click <strong className="text-gray-900 font-extrabold">Submit Payment for Verification</strong>.
                    </p>
                    <p className="text-[11px] text-gray-500 m-0">
                      Your uploaded GCash receipt will be reviewed by a Graphix Cashier. Uploading the receipt does not automatically confirm your payment.
                    </p>
                  </div>
                </div>

              </div>

              {/* What Happens After Submission Section (Steps 5 to 7) */}
              <div className="bg-gradient-to-b from-purple-50/50 to-white border border-purple-100 rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 text-[#bd00ff] rounded-lg">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider m-0">
                      What Happens After Submission?
                    </h4>
                    <span className="text-[11px] text-gray-500">
                      Here is the complete process after you submit your receipt:
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* Step 5 */}
                  <div className="bg-white rounded-xl p-3 border border-purple-100 shadow-2xs flex flex-col gap-1.5 text-center items-center">
                    <div className="w-6 h-6 rounded-full bg-purple-100 text-[#bd00ff] font-extrabold text-xs flex items-center justify-center">
                      5
                    </div>
                    <span className="font-extrabold text-xs text-gray-900">
                      ⑤ Cashier Verifies Payment
                    </span>
                    <span className="text-[10px] text-gray-500 leading-tight">
                      Branch staff reviews the uploaded receipt against the order amount.
                    </span>
                  </div>

                  {/* Step 6 */}
                  <div className="bg-white rounded-xl p-3 border border-purple-100 shadow-2xs flex flex-col gap-1.5 text-center items-center">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-[#005ce6] font-extrabold text-xs flex items-center justify-center">
                      6
                    </div>
                    <span className="font-extrabold text-xs text-gray-900">
                      ⑥ Graphix Store Receipt Generated
                    </span>
                    <span className="text-[10px] text-gray-500 leading-tight">
                      Official Sales Invoice PDF is issued & unlocked in your account.
                    </span>
                  </div>

                  {/* Step 7 */}
                  <div className="bg-white rounded-xl p-3 border border-emerald-100 shadow-2xs flex flex-col gap-1.5 text-center items-center">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 font-extrabold text-xs flex items-center justify-center">
                      7
                    </div>
                    <span className="font-extrabold text-xs text-gray-900">
                      ⑦ Ready for Pickup
                    </span>
                    <span className="text-[10px] text-gray-500 leading-tight">
                      You receive a notification and can claim your item at the store branch.
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-600 m-0 bg-white/70 p-2.5 rounded-xl border border-purple-100/60 leading-relaxed">
                  Once the Cashier successfully verifies your GCash payment, your official Graphix Store receipt will be generated and your order will be marked <strong>Ready for Pickup</strong>.
                </p>
              </div>

              {/* Important Notice Box */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200/80 rounded-2xl p-4 flex gap-3 items-start shadow-xs">
                <div className="p-2 bg-white text-[#005ce6] rounded-xl shadow-2xs shrink-0 mt-0.5 border border-blue-100">
                  <Info size={18} />
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  <span className="font-black text-gray-900 uppercase tracking-wide text-[11px]">
                    Important Notice
                  </span>
                  <p className="text-gray-700 m-0 leading-relaxed text-[11px]">
                    <strong>Important:</strong> Uploading your GCash receipt does not automatically confirm your payment. Your payment must first be verified by a Graphix Cashier. After successful verification, you will receive your official Graphix Store receipt and your order will become <strong>Ready for Pickup</strong>.
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 sm:px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
              <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">
                Need help? Ask branch staff upon pickup.
              </span>
              <button
                type="button"
                onClick={() => setShowGcashGuideModal(false)}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#bd00ff] hover:bg-[#9c00d6] text-white font-extrabold text-xs rounded-xl border-none cursor-pointer transition-colors shadow-xs"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-Resolution Receipt Preview Modal */}
      {showReceiptPreviewModal && receiptPreview && (
        <div 
          className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowReceiptPreviewModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 flex flex-col overflow-hidden max-h-[92vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-[#005ce6] rounded-xl">
                  <Receipt size={18} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900 m-0">
                    Uploaded GCash Receipt
                  </h4>
                  <p className="text-[11px] text-gray-500 m-0">
                    {receiptFile?.name || 'GCash_Receipt.png'} • {receiptFile ? `${(receiptFile.size / 1024).toFixed(1)} KB` : 'Proof of Payment'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptPreviewModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer border-none bg-transparent"
                title="Close viewer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Receipt Image Display */}
            <div className="p-4 sm:p-5 overflow-y-auto flex items-center justify-center bg-gray-900/5 min-h-[300px]">
              <div className="max-w-full rounded-2xl overflow-hidden shadow-md border border-gray-200 bg-white">
                <img
                  src={receiptPreview}
                  alt="GCash Receipt Proof"
                  className="w-full h-auto max-h-[65vh] object-contain block select-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-bold">
                <CheckCircle2 size={13} />
                <span>Ready for Cashier Verification</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowReceiptPreviewModal(false);
                    fileInputRef.current?.click();
                  }}
                  className="px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <RefreshCw size={13} />
                  <span>Replace</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReceiptPreviewModal(false)}
                  className="px-5 py-2 bg-[#bd00ff] hover:bg-[#9c00d6] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border-none shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
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
