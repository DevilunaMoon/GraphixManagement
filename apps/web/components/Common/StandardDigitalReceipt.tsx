"use client";

import React, { useRef, useState } from 'react';
import { ChevronLeft, Printer, Download, Copy, Check, ShieldCheck } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { formatDisplayInvoiceId } from '../../lib/invoice';

export interface StandardReceiptItem {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  variations?: string | null;
  imei?: string | null;
  discount?: number | null;
}

export interface StandardReceiptData {
  id: string;
  referenceId?: string | null;
  createdAt: string | Date;
  amount: number;
  quantity?: number;
  variations?: string | null;
  paymentType?: string;
  source?: string;
  status?: string;
  branch?: string;
  imei?: string | null;
  discount?: number | null;
  downpaymentAmount?: number | null;
  remainingBalance?: number | null;
  isSettled?: boolean;
  user?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  device?: {
    name?: string | null;
    price?: number | null;
    image?: string | null;
  };
  items?: StandardReceiptItem[];
  tenderedCash?: number | null;
  changeAmount?: number | null;
}

interface StandardDigitalReceiptProps {
  data: StandardReceiptData;
  onBack?: () => void;
  showToolbar?: boolean;
  className?: string;
  compact?: boolean;
}

export const sanitizeVariations = (v: string | null | undefined): string => {
  if (!v) return 'Standard';
  try {
    const parsed = typeof v === 'string' ? JSON.parse(v) : v;
    if (Array.isArray(parsed)) {
      return parsed
        .map((x: any) => {
          if (typeof x === 'string') return x;
          if (x && typeof x === 'object') {
            if (x.type && x.name) {
              const displayVal = (String(x.type).toLowerCase() === 'storage' && !String(x.name).toLowerCase().includes('gb'))
                ? `${x.name}GB`
                : x.name;
              return `${x.type}: ${displayVal}`;
            }
            return x.name || x.value || '';
          }
          return '';
        })
        .filter(Boolean)
        .join(', ');
    }
    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed)
        .map(([key, val]: [string, any]) => {
          if (typeof val === 'string') return `${key}: ${val}`;
          if (val && typeof val === 'object') return `${val.type || key}: ${val.name || val.value || ''}`;
          return String(val);
        })
        .filter(Boolean)
        .join(', ');
    }
  } catch (e) {}
  return String(v);
};

export default function StandardDigitalReceipt({
  data,
  onBack,
  showToolbar = true,
  className = "",
  compact = false
}: StandardDigitalReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // 1. Branch Location
  let branchLocation = data.branch || 'Tagoloan Branch';
  if (!branchLocation.toLowerCase().includes('branch')) {
    branchLocation = `${branchLocation} Branch`;
  }

  // 2. Machine ID & Metadata
  const machineId = "MIN: 22112113365644135";
  const timestamp = new Date(data.createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // 3. Transaction / Claim Code (GRPX-T-A1, GRPX-V-A1, GRPX-J-A1 format)
  const rawTransId = data.referenceId || data.id;
  const shortTransId = formatDisplayInvoiceId(rawTransId, branchLocation);

  // 4. Payment Method & Status Logic
  const paymentMethod = data.paymentType?.toLowerCase().includes('gcash')
    ? 'GCash'
    : (data.paymentType === 'Downpayment' ? 'Downpayment' : 'Cash');

  const isDownpayment = data.paymentType === 'Downpayment';
  const isCashOrder = paymentMethod === 'Cash';

  // 5. Items Resolution
  const rawItems: StandardReceiptItem[] = (data.items && data.items.length > 0)
    ? data.items
    : [
        {
          name: data.device?.name || 'Product',
          quantity: data.quantity || 1,
          unitPrice: data.device?.price || (data.amount / (data.quantity || 1)),
          total: data.amount > 0 ? data.amount : ((data.device?.price || 0) * (data.quantity || 1)),
          variations: data.variations || 'Standard',
          imei: data.imei
        }
      ];

  const resolvedItems = rawItems.map(item => ({
    ...item,
    variations: sanitizeVariations(item.variations)
  }));

  const totalQuantity = resolvedItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const computedTotal = resolvedItems.reduce((sum, item) => sum + (item.total || (item.quantity * item.unitPrice)), 0);
  const grandTotal = data.amount > 0 ? data.amount : computedTotal;

  // Downpayment & Financials
  const totalDevicePrice = ((data.device?.price || grandTotal) * totalQuantity);
  const downpaymentPaid = grandTotal;
  const remainingBalance = data.remainingBalance !== undefined && data.remainingBalance !== null
    ? data.remainingBalance
    : (isDownpayment ? Math.max(0, totalDevicePrice - downpaymentPaid) : 0);
  const monthlyInstallment = remainingBalance > 0 ? (remainingBalance / 12) : 0;

  // Cash tendered & change calculation
  let cleanPhone = data.user?.phone || '0917 123 4567';
  if (cleanPhone.includes('₱') || cleanPhone.toLowerCase().includes('cash')) {
    cleanPhone = '0917 123 4567';
  }

  let tenderedCash = (data.tenderedCash !== undefined && data.tenderedCash !== null)
    ? data.tenderedCash
    : (isCashOrder ? grandTotal : grandTotal);

  let changeAmount = (data.changeAmount !== undefined && data.changeAmount !== null)
    ? data.changeAmount
    : (isCashOrder ? Math.max(0, tenderedCash - grandTotal) : 0);

  // 6. BIR 12% Tax Calculations
  const vatRate = 0.12;
  const vatableSales = grandTotal / (1 + vatRate);
  const vatAmount = grandTotal - vatableSales;

  // 7. Customer & Audit Details
  const customerName = data.user?.name || 'Walk-in Customer';
  const customerEmail = data.user?.email || 'walkin@graphix.com';
  const storeAgentLabel = data.source === 'In-Store' ? 'CASHIER DESK' : 'ONLINE CHECKOUT';

  // 8. Plain Text Format for Copying
  const buildPlainText = () => {
    const separator = '--------------------------------------------------';
    const doubleSeparator = '==================================================';

    let text = `${doubleSeparator}\n                  GRAPHIX STORE\n                 ${branchLocation}\n              ${machineId}\n              ${timestamp}\n${separator}\n`;
    text += isDownpayment ? `DOWNPAYMENT INVOICE\n` : `SALES INVOICE\n`;
    text += `${shortTransId}\n${separator}\n`;

    resolvedItems.forEach((item) => {
      const itemName = item.name.toUpperCase();
      const itemTotalStr = `${item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} V`;
      const line1Pad = Math.max(1, 50 - itemName.length - itemTotalStr.length);
      text += `${itemName}${' '.repeat(line1Pad)}${itemTotalStr}\n`;

      const varPart = item.variations ? ` (${item.variations})` : '';
      const line2Left = `Item: ${item.quantity}x${varPart}`;
      const line2Right = `${item.quantity} @ ${item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const line2Pad = Math.max(1, 50 - line2Left.length - line2Right.length);
      text += `${line2Left}${' '.repeat(line2Pad)}${line2Right}\n`;

      const isIphone = (item.name || data.device?.name || '').toLowerCase().includes('iphone');
      if (item.imei || data.imei) {
        text += `IMEI: ${item.imei || data.imei}\n`;
      } else if (isIphone) {
        text += `IMEI: Pending Pickup (recorded during pickup)\n`;
      }
    });

    text += `${separator}\n`;
    if (data.discount && data.discount > 0) {
      const discStr = `-Php ${data.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      text += `Discount${' '.repeat(Math.max(1, 50 - 'Discount'.length - discStr.length))}${discStr}\n`;
    }
    const totalStr = `Php ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    text += `Total${' '.repeat(Math.max(1, 50 - 'Total'.length - totalStr.length))}${totalStr}\n`;

    if (isDownpayment) {
      const dpStr = `Php ${downpaymentPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      text += `Downpayment Paid${' '.repeat(Math.max(1, 50 - 'Downpayment Paid'.length - dpStr.length))}${dpStr}\n`;
      const remStr = `Php ${remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      text += `Remaining Balance${' '.repeat(Math.max(1, 50 - 'Remaining Balance'.length - remStr.length))}${remStr}\n`;
    } else if (isCashOrder) {
      const cashStr = `Php ${tenderedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      text += `Cash${' '.repeat(Math.max(1, 50 - 'Cash'.length - cashStr.length))}${cashStr}\n`;
      const changeStr = `Php ${changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      text += `Change${' '.repeat(Math.max(1, 50 - 'Change'.length - changeStr.length))}${changeStr}\n`;
    } else {
      const gcashStr = `Php ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      text += `GCash${' '.repeat(Math.max(1, 50 - 'GCash'.length - gcashStr.length))}${gcashStr}\n`;
      text += `Change${' '.repeat(Math.max(1, 50 - 'Change'.length - 'Php 0.00'.length))}Php 0.00\n`;
    }

    text += `*** ${totalQuantity} ITEM(S) ***\n${separator}\n`;

    const vatableStr = vatableSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    text += `VATable Sales${' '.repeat(Math.max(1, 50 - 'VATable Sales'.length - vatableStr.length))}${vatableStr}\n`;

    const vatAmtStr = vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    text += `VAT Amount${' '.repeat(Math.max(1, 50 - 'VAT Amount'.length - vatAmtStr.length))}${vatAmtStr}\n`;

    text += `VAT Exempt Sales${' '.repeat(Math.max(1, 50 - 'VAT Exempt Sales'.length - '0.00'.length))}0.00\n`;
    text += `Zero Rated Sales${' '.repeat(Math.max(1, 50 - 'Zero Rated Sales'.length - '0.00'.length))}0.00\n`;
    text += `${separator}\n`;

    text += `Sold To: ${customerName}\n`;
    text += `Email: ${customerEmail}\n`;
    text += `Phone: ${cleanPhone}\n`;
    text += `Store Agent: ${storeAgentLabel}\n`;
    text += `Global Trans No. ${shortTransId}\n`;
    text += `${separator}\n`;
    text += `Thank you for shopping at GraphiX Store!\nKeep this receipt for warranty claims.\n${doubleSeparator}`;

    return text;
  };

  // Actions
  const handleCopyReceipt = async () => {
    try {
      await navigator.clipboard.writeText(buildPlainText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy receipt:', err);
    }
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Sales Invoice - ${shortTransId}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 80mm;
              margin: 0 auto;
              padding: 4mm;
              color: #000;
              font-size: 11px;
              line-height: 1.4;
              background: #fff;
            }
            .dashed-border {
              border: 1px dashed #999;
              border-radius: 12px;
              padding: 16px;
            }
            .divider {
              border-top: 1px dashed #999;
              margin: 8px 0;
            }
            .center { text-align: center; }
            .flex-between { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
            .purple { color: #5c0099; }
            @media print {
              body { width: 80mm; padding: 0; margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="dashed-border">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 350);
  };

  const handleSavePDF = async () => {
    if (!receiptRef.current) return;
    try {
      setIsGeneratingPDF(true);
      const element = receiptRef.current;

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#fafaf9',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 80; // Standard 80mm POS receipt width
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidth, imgHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`GraphiX_Invoice_${shortTransId.replace('#', '')}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      handlePrint();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Top Action Toolbar (Matches SECOND IMAGE) */}
      {showToolbar && (
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 print:hidden">
          {onBack ? (
            <button
              onClick={onBack}
              type="button"
              className="flex items-center gap-1.5 text-gray-600 hover:text-[#bd00ff] bg-transparent border-none cursor-pointer p-0 transition-colors font-bold text-sm"
            >
              <ChevronLeft size={20} /> Back
            </button>
          ) : (
            <div />
          )}

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
      )}

      {/* Main Standardized Digital Thermal Receipt (Matches SECOND IMAGE Exactly) */}
      <div className="flex justify-center w-full">
        <div
          ref={receiptRef}
          className="w-full max-w-[420px] bg-[#fafaf9] border-2 border-dashed border-gray-300 rounded-2xl p-6 sm:p-7 shadow-xs font-mono text-xs text-gray-900 leading-relaxed mx-auto"
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
          </div>

          {/* Invoice Header (Sales Invoice & Purple Transaction ID) */}
          <div className="py-2.5 border-b border-dashed border-gray-300 text-center">
            <span className="font-black text-xs tracking-wider uppercase block text-gray-900">
              {isDownpayment ? 'DOWNPAYMENT INVOICE' : 'SALES INVOICE'}
            </span>
            <span className="font-bold text-xs text-[#5c0099] block mt-0.5">
              {shortTransId}
            </span>
          </div>

          {/* Cart Item Breakdown */}
          <div className="py-3 border-b border-dashed border-gray-300 flex flex-col gap-2.5">
            {resolvedItems.map((item, idx) => {
              const isIphone = (item.name || data.device?.name || '').toLowerCase().includes('iphone');
              return (
                <div key={idx} className="flex flex-col gap-0.5">
                  <div className="flex justify-between items-start font-black text-black">
                    <span className="truncate pr-2 flex items-center gap-1">
                    <span>{item.name.toUpperCase()}</span>
                    {((item as any).isPreOwned || (data.device as any)?.isPreOwned || (item.name || '').toLowerCase().includes('pre-owned') || (item.name || '').toLowerCase().includes('pre owned')) && (
                      <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-1.5 py-0.2 rounded border border-amber-300">
                        PRE-OWNED
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-bold">
                    {item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} V
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-gray-600">
                  <span className="truncate pr-2">
                    Item: {item.quantity}x ({item.variations})
                  </span>
                  <span className="shrink-0">
                    {item.quantity} @ {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {(item.imei || data.imei) ? (
                  <div className="font-mono font-bold text-[10px] text-gray-800 text-left mt-0.5">
                    IMEI: {item.imei || data.imei}
                  </div>
                ) : isIphone ? (
                  <div className="font-mono font-bold text-[10px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 border border-amber-200 inline-block text-left mt-0.5">
                    IMEI: Pending Pickup <span className="text-[9px] text-gray-400 font-normal block">IMEI will be recorded during pickup</span>
                  </div>
                ) : null}
              </div>
            );
          })}
          </div>

          {/* Financial Totals & Payment Method */}
          <div className="py-3 border-b border-dashed border-gray-300 flex flex-col gap-1.5">
            {data.discount && data.discount > 0 && (
              <div className="flex justify-between items-center text-red-600 text-xs font-bold">
                <span>Discount</span>
                <span>-Php {data.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
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
                {monthlyInstallment > 0 && (
                  <div className="flex justify-between items-center text-[11px] text-gray-600">
                    <span>Installment (12m)</span>
                    <span>Php {monthlyInstallment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo</span>
                  </div>
                )}
              </>
            ) : isCashOrder ? (
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
              *** {totalQuantity} ITEM(S) ***
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
              <span className="font-bold text-[#5c0099]">{shortTransId}</span>
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
  );
}
