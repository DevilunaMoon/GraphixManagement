"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Printer, Download, Copy, Check } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface PurchaseDetails {
  id: string;
  amount: number;
  quantity: number;
  variations: string | null;
  paymentType: string;
  source: string;
  status: string;
  branch?: string;
  createdAt: string;
  imei?: string | null;
  referenceId?: string | null;
  downpaymentAmount?: number | null;
  remainingBalance?: number | null;
  isSettled?: boolean;
  device: {
    name: string;
    price: number;
    image: string | null;
  };
  user: {
    name: string | null;
    email: string;
    phone: string | null;
  };
}

export default function CustomerReceiptView({ user: initialUser, orderId }: { user?: any; orderId: string }) {
  const router = useRouter();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [copied, setCopied] = useState(false);
  const [purchase, setPurchase] = useState<PurchaseDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/purchases/latest?id=${orderId}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then(data => {
        setPurchase(data);
      })
      .catch(err => {
        console.error('Error loading purchase receipt:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-purple-100 border-t-[#bd00ff] rounded-full animate-spin"></div>
        <p className="text-[#666] font-semibold animate-pulse text-lg">Loading digital receipt...</p>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] flex flex-col items-center justify-center gap-4">
        <p className="text-red-500 font-bold text-lg">Receipt not found.</p>
        <button 
          onClick={() => router.back()} 
          className="px-6 py-2.5 bg-[#bd00ff] text-white rounded-xl font-bold cursor-pointer border-none hover:bg-[#9c00d6] transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  // 1. Branch Location
  let branchLocation = purchase.branch || 'Tagoloan Branch';
  if (!branchLocation.toLowerCase().includes('branch')) {
    branchLocation = `${branchLocation} Branch`;
  }

  // 2. Machine ID & Metadata
  const machineId = "MIN: 22112113365644135";
  const timestamp = new Date(purchase.createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // 3. Transaction / Claim Code
  const rawTransId = purchase.referenceId || purchase.id;
  const shortTransId = rawTransId.startsWith('#') ? rawTransId : `#${rawTransId}`;
  const orderNum = purchase.referenceId ? purchase.referenceId.replace('#', '') : purchase.id.slice(-6).toUpperCase();

  // 4. Payment Method & Status Logic
  const paymentMethod = purchase.paymentType?.toLowerCase().includes('gcash') 
    ? 'GCash' 
    : (purchase.paymentType === 'Downpayment' ? 'Downpayment' : 'Cash');

  const isDownpayment = purchase.paymentType === 'Downpayment';
  const isCashOrder = paymentMethod === 'Cash';
  const isVerified = purchase.status === 'Active' || purchase.status === 'Completed' || purchase.status === 'Paid' || purchase.isSettled === true;
  const isLocked = isCashOrder && !isVerified;

  // 5. Cart Item & Variation Sanitization
  const sanitizeVarStr = (v: string | null | undefined): string => {
    if (!v) return 'Standard';
    try {
      const parsed = typeof v === 'string' ? JSON.parse(v) : v;
      if (Array.isArray(parsed)) {
        const res = parsed
          .map((x: any) => {
            if (typeof x === 'string') return x;
            if (x && typeof x === 'object') return x.name || x.value || '';
            return '';
          })
          .filter(Boolean)
          .join(', ');
        return res || 'Standard';
      }
      if (parsed && typeof parsed === 'object') {
        const res = Object.values(parsed)
          .map((x: any) => (typeof x === 'object' ? x.name || x.value : String(x)))
          .filter(Boolean)
          .join(', ');
        return res || 'Standard';
      }
    } catch (e) {}
    return String(v) || 'Standard';
  };

  const variationLabel = sanitizeVarStr(purchase.variations);
  const itemName = (purchase.device?.name || 'Device').toUpperCase();
  const quantity = purchase.quantity || 1;
  const grandTotal = purchase.amount;
  const unitPrice = grandTotal / quantity;

  // 6. Tendered Cash & Change
  const rawCash = purchase.user?.phone ? purchase.user.phone.replace(/[^0-9.]/g, '') : '';
  let parsedCash = parseFloat(rawCash) || 0;
  if (parsedCash <= 0 || parsedCash < grandTotal) {
    parsedCash = grandTotal;
  }
  const tenderedCash = parsedCash;
  const changeAmount = Math.max(0, tenderedCash - grandTotal);

  // Downpayment amounts
  const deviceFullPrice = (purchase.device?.price || purchase.amount) * quantity;
  const downpaymentPaid = purchase.downpaymentAmount && purchase.downpaymentAmount > 0 ? purchase.downpaymentAmount : purchase.amount;
  const remainingBalance = purchase.remainingBalance !== undefined && purchase.remainingBalance !== null 
    ? purchase.remainingBalance 
    : Math.max(0, deviceFullPrice - downpaymentPaid);
  const monthlyInstallment = remainingBalance / 12;

  // 7. BIR 12% Tax Calculations
  const vatRate = 0.12;
  const vatableSales = grandTotal / (1 + vatRate);
  const vatAmount = grandTotal - vatableSales;

  // 8. Customer & Audit Details
  const customerName = purchase.user?.name || initialUser?.name || 'Customer';
  const customerEmail = purchase.user?.email || 'customer@graphix.com';
  let cleanPhone = purchase.user?.phone || '0917 123 4567';
  if (cleanPhone.includes('₱') || cleanPhone.toLowerCase().includes('cash')) {
    cleanPhone = '0917 123 4567';
  }
  const storeAgentLabel = purchase.source === 'In-Store' ? 'CASHIER DESK' : 'ONLINE CHECKOUT';

  // Actions
  const handlePrint = () => {
    window.print();
  };

  const handleSavePDF = async () => {
    if (!receiptRef.current) return;
    
    try {
      setIsGeneratingPDF(true);
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#fafaf9'
      });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 80; // 80mm thermal width
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidth, imgHeight]
      });

      doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      doc.save(`GraphiX_Receipt_${orderNum}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleCopyReceipt = async () => {
    try {
      const separator = '--------------------------------------------------';
      const doubleSeparator = '==================================================';

      let receiptText = `${doubleSeparator}\n                  GRAPHIX STORE\n                 ${branchLocation}\n              ${machineId}\n              ${timestamp}\n${separator}\n${isLocked ? 'RESERVATION CLAIM SLIP (UNPAID)' : (isDownpayment ? 'DOWNPAYMENT INVOICE' : 'SALES INVOICE')}\n${shortTransId}\n${isLocked ? 'TERMS: CASH ON PICKUP (8-HOUR CLAIM LIMIT)\n' : ''}${separator}\n`;

      const itemTotalStr = `${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} V`;
      const line1Pad = Math.max(1, 50 - itemName.length - itemTotalStr.length);
      receiptText += `${itemName}${' '.repeat(line1Pad)}${itemTotalStr}\n`;

      const line2Left = `Item: ${quantity}x (${variationLabel})`;
      const line2Right = `${quantity} @ ${unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const line2Pad = Math.max(1, 50 - line2Left.length - line2Right.length);
      receiptText += `${line2Left}${' '.repeat(line2Pad)}${line2Right}\n`;

      if (purchase.imei) {
        receiptText += `IMEI: ${purchase.imei}\n`;
      }

      const totalStr = `Php ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const totalPad = Math.max(1, 50 - 'Total'.length - totalStr.length);
      receiptText += `${separator}\nTotal${' '.repeat(totalPad)}${totalStr}\n`;

      if (paymentMethod === 'Cash') {
        const cashStr = `Php ${tenderedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const cashPad = Math.max(1, 50 - 'Cash'.length - cashStr.length);
        receiptText += `Cash${' '.repeat(cashPad)}${cashStr}\n`;

        const changeStr = `Php ${changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const changePad = Math.max(1, 50 - 'Change'.length - changeStr.length);
        receiptText += `Change${' '.repeat(changePad)}${changeStr}\n`;
      } else {
        const methodStr = paymentMethod;
        const amtStr = `Php ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const pad = Math.max(1, 50 - methodStr.length - amtStr.length);
        receiptText += `${methodStr}${' '.repeat(pad)}${amtStr}\n`;

        const changeStr = `Php 0.00`;
        const changePad = Math.max(1, 50 - 'Change'.length - changeStr.length);
        receiptText += `Change${' '.repeat(changePad)}${changeStr}\n`;
      }

      receiptText += `*** ${quantity} ITEM(S) ***\n${separator}\n`;

      const vatableStr = vatableSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      receiptText += `VATable Sales${' '.repeat(Math.max(1, 50 - 'VATable Sales'.length - vatableStr.length))}${vatableStr}\n`;

      const vatAmtStr = vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      receiptText += `VAT Amount${' '.repeat(Math.max(1, 50 - 'VAT Amount'.length - vatAmtStr.length))}${vatAmtStr}\n`;

      receiptText += `VAT Exempt Sales${' '.repeat(Math.max(1, 50 - 'VAT Exempt Sales'.length - '0.00'.length))}0.00\n`;
      receiptText += `Zero Rated Sales${' '.repeat(Math.max(1, 50 - 'Zero Rated Sales'.length - '0.00'.length))}0.00\n`;
      receiptText += `${separator}\n`;

      receiptText += `Sold To: ${customerName}\n`;
      receiptText += `Email: ${customerEmail}\n`;
      receiptText += `Phone: ${cleanPhone}\n`;
      receiptText += `Store Agent: ${storeAgentLabel}\n`;
      receiptText += `Global Trans No. ${shortTransId}\n`;
      receiptText += `${separator}\n`;
      receiptText += `Thank you for shopping at GraphiX Store!\nKeep this receipt for warranty claims.\n`;
      receiptText += `${doubleSeparator}`;

      await navigator.clipboard.writeText(receiptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy receipt:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex flex-col justify-center items-center p-4 sm:p-6 font-['Inter'] py-8 sm:py-12">
      {/* Outer control card */}
      <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-gray-100 flex flex-col gap-6">
        
        {/* Header Options / Toolbar */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 print:hidden">
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-1.5 text-gray-600 hover:text-[#bd00ff] bg-transparent border-none cursor-pointer p-0 transition-colors font-bold text-sm"
          >
            <ChevronLeft size={20} /> Back
          </button>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={handleCopyReceipt}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-[#bd00ff] rounded-xl text-xs font-bold border border-purple-200 transition-colors cursor-pointer shadow-2xs"
            >
              {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button 
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 text-[#bd00ff] rounded-xl font-bold border border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors text-xs shadow-2xs"
            >
              <Printer size={16} /> Print
            </button>
            <button 
              type="button"
              onClick={handleSavePDF}
              disabled={isGeneratingPDF}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-xl font-bold border-none cursor-pointer hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs shadow-sm"
            >
              <Download size={16} /> {isGeneratingPDF ? 'Saving...' : 'Save PDF'}
            </button>
          </div>
        </div>

        {/* Refined Digital Receipt - Matching Purchase Confirmed Design */}
        <div className="flex justify-center w-full">
          <div 
            id="digital-receipt-printable"
            ref={receiptRef}
            className="w-full max-w-[420px] bg-[#fafaf9] border-2 border-dashed border-gray-300 rounded-2xl p-6 sm:p-7 shadow-xs font-mono text-xs text-gray-900 leading-relaxed"
          >
            {/* Header & Store Info */}
            <div className="text-center pb-3 border-b border-dashed border-gray-300">
              <h3 className="text-base font-black tracking-widest uppercase m-0 text-black">
                GRAPHIX STORE
              </h3>
              <p className="text-xs font-bold text-gray-800 m-0 mt-0.5">
                {branchLocation}
              </p>
              <p className="text-[11px] text-gray-500 m-0 mt-0.5 font-sans">
                {machineId}
              </p>
              <p className="text-[11px] text-gray-600 m-0 mt-0.5">
                {timestamp}
              </p>

              {/* Status Badge */}
              {isLocked ? (
                <p className="text-[10px] font-black text-amber-800 bg-amber-50 rounded px-2 py-0.5 mt-1.5 inline-block border border-amber-300 uppercase tracking-tight">
                  UNVERIFIED RESERVATION (8H CLAIM LIMIT)
                </p>
              ) : isDownpayment ? (
                <p className="text-[10px] font-black text-orange-800 bg-orange-50 rounded px-2 py-0.5 mt-1.5 inline-block border border-orange-300 uppercase tracking-tight">
                  DOWNPAYMENT INVOICE (INSTALLMENT)
                </p>
              ) : paymentMethod === 'GCash' ? (
                <p className="text-[10px] font-black text-blue-800 bg-blue-50 rounded px-2 py-0.5 mt-1.5 inline-block border border-blue-300 uppercase tracking-tight">
                  OFFICIAL SALES INVOICE (GCASH PAID)
                </p>
              ) : (
                <p className="text-[10px] font-black text-emerald-800 bg-emerald-50 rounded px-2 py-0.5 mt-1.5 inline-block border border-emerald-300 uppercase tracking-tight">
                  OFFICIAL SALES INVOICE (VERIFIED PAID)
                </p>
              )}
            </div>

            {/* Invoice Header */}
            <div className="py-2.5 border-b border-dashed border-gray-300 text-center">
              <span className="font-black text-xs tracking-wider block">
                {isLocked ? 'RESERVATION CLAIM SLIP (UNPAID)' : (isDownpayment ? 'DOWNPAYMENT INVOICE' : 'SALES INVOICE')}
              </span>
              <span className="font-bold text-xs text-purple-700">{shortTransId}</span>
            </div>

            {/* Cart Item Breakdown */}
            <div className="py-3 border-b border-dashed border-gray-300 flex flex-col gap-2.5">
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between items-start font-black text-black">
                  <span className="truncate pr-2">{itemName}</span>
                  <span className="shrink-0 font-bold">
                    {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} V
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-gray-600">
                  <span className="truncate pr-2">
                    Item: {quantity}x ({variationLabel})
                  </span>
                  <span className="shrink-0">
                    {quantity} @ {unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {purchase.imei && (
                  <div className="font-mono font-bold text-[10px] text-gray-800 text-left mt-0.5">
                    IMEI: {purchase.imei}
                  </div>
                )}
              </div>
            </div>

            {/* Financial Totals & Payment Method */}
            <div className="py-3 border-b border-dashed border-gray-300 flex flex-col gap-1.5">
              <div className="flex justify-between items-center font-black text-black text-sm">
                <span>Total</span>
                <span>Php {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              {isDownpayment ? (
                <>
                  <div className="flex justify-between items-center text-gray-700">
                    <span>Downpayment Paid</span>
                    <span>Php {downpaymentPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-gray-900">
                    <span>Remaining Balance</span>
                    <span>Php {remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-gray-600">
                    <span>Installment (12m)</span>
                    <span>Php {monthlyInstallment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo</span>
                  </div>
                </>
              ) : paymentMethod === 'Cash' ? (
                <>
                  <div className="flex justify-between items-center text-gray-700">
                    <span>Cash</span>
                    <span>Php {tenderedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-gray-900">
                    <span>Change</span>
                    <span>Php {changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center text-gray-700">
                    <span>GCash</span>
                    <span>Php {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-gray-900">
                    <span>Change</span>
                    <span>Php 0.00</span>
                  </div>
                </>
              )}

              <div className="text-center font-black py-1 tracking-wider text-[11px] text-gray-800">
                *** {quantity} ITEM(S) ***
              </div>
            </div>

            {/* BIR 12% Tax Breakdown */}
            <div className="py-3 border-b border-dashed border-gray-300 flex flex-col gap-1 text-[11px] text-gray-600">
              <div className="flex justify-between items-center">
                <span>VATable Sales</span>
                <span>{vatableSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>VAT Amount</span>
                <span>{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>VAT Exempt Sales</span>
                <span>0.00</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Zero Rated Sales</span>
                <span>0.00</span>
              </div>
            </div>

            {/* Customer & Audit Details */}
            <div className="py-3 border-b border-dashed border-gray-300 flex flex-col gap-1 text-[11px] text-gray-700">
              <div className="flex justify-between items-center">
                <span className="font-bold">Sold To:</span>
                <span className="font-semibold text-black">{customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Email:</span>
                <span className="truncate max-w-[200px]">{customerEmail}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Phone:</span>
                <span className="font-semibold text-black">{cleanPhone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Store Agent:</span>
                <span>{storeAgentLabel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Global Trans No.</span>
                <span className="font-bold text-purple-700">{shortTransId}</span>
              </div>
            </div>

            {/* Footer Note */}
            <div className="text-center pt-3 text-[11px] text-gray-500 font-sans leading-normal">
              <p className="m-0 font-medium">Thank you for shopping at GraphiX Store!</p>
              <p className="m-0 text-[10px] text-gray-400 mt-0.5">Keep this receipt for warranty claims.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Global print styles to cleanly isolate and print the receipt */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #digital-receipt-printable,
          #digital-receipt-printable * {
            visibility: visible;
          }
          #digital-receipt-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto;
            border: 2px dashed #bbb !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
