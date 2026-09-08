"use client";

import React, { useRef, useState } from 'react';
import { Check, Download, Receipt, Printer, Copy, FileText, Lock } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface ReceiptCartItem {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  variations?: string; // e.g. "Color: Black, Storage: 128GB" or "Black, 128GB"
}

export interface DigitalReceiptData {
  totalAmount?: number;
  deviceName?: string;
  quantity?: number;
  items?: ReceiptCartItem[];
  branch?: string; // "Tagoloan Branch", "Villanueva Branch", or "Jasaan Branch"
  paymentMethod?: 'Cash' | 'GCash' | string;
  tenderedCash?: number | null;
  changeAmount?: number | null;
  orderNote?: string | null;
  transactionId?: string;
  timestamp?: string;
  status?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  isVerified?: boolean;
}

interface CustomerDigitalReceiptCardProps {
  data?: DigitalReceiptData;
  onDownload?: () => void;
  onReturnToDashboard?: () => void;
}

export default function CustomerDigitalReceiptCard({
  data,
  onDownload,
  onReturnToDashboard
}: CustomerDigitalReceiptCardProps) {
  const [copied, setCopied] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // 1. Dynamic Branch Location: Default to Tagoloan Branch
  let branchLocation = data?.branch || 'Tagoloan Branch';
  if (!branchLocation.toLowerCase().includes('branch')) {
    branchLocation = `${branchLocation} Branch`;
  }

  // 2. Machine ID & Metadata
  const machineId = "MIN: 22112113365644135";
  const transactionId = data?.transactionId || '#CMTPQWI5Q0';
  const timestamp = data?.timestamp || new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // 3. Dynamic Cart Items & Financial Calculations
  const resolvedItems: ReceiptCartItem[] = (data?.items && data.items.length > 0)
    ? data.items
    : [
        {
          name: data?.deviceName || 'Vivo Y31d',
          quantity: data?.quantity || 1,
          unitPrice: data?.totalAmount || 28998,
          total: data?.totalAmount || 28998,
          variations: 'Black, 128GB'
        }
      ];

  const totalItemCount = resolvedItems.reduce((sum, item) => sum + item.quantity, 0);
  const computedTotal = resolvedItems.reduce((sum, item) => sum + (item.total || (item.quantity * item.unitPrice)), 0);
  const grandTotal = data?.totalAmount && data.totalAmount > 0 ? data.totalAmount : computedTotal;

  // 4. Payment Method & Tendered / Change
  const paymentMethod = data?.paymentMethod 
    ? (data.paymentMethod.toLowerCase().includes('gcash') ? 'GCash' : 'Cash') 
    : 'Cash';

  const isCashOrder = paymentMethod === 'Cash';
  const isVerified = data?.isVerified !== undefined ? data.isVerified : !isCashOrder;
  const isLocked = isCashOrder && !isVerified;

  const tenderedCash = (data?.tenderedCash !== undefined && data?.tenderedCash !== null)
    ? data.tenderedCash
    : (paymentMethod === 'Cash' ? (grandTotal >= 28000 ? 29000 : grandTotal) : grandTotal);

  const changeAmount = (data?.changeAmount !== undefined && data?.changeAmount !== null)
    ? data.changeAmount
    : (paymentMethod === 'Cash' ? Math.max(0, (tenderedCash || grandTotal) - grandTotal) : 0);

  // 5. BIR 12% Tax Calculations
  const vatRate = 0.12;
  const vatableSales = grandTotal / (1 + vatRate);
  const vatAmount = grandTotal - vatableSales;

  // 6. Customer & Audit Details (Real Phone binding, not a price variable)
  const customerName = data?.customerName || 'Customer';
  const customerEmail = data?.customerEmail || 'customer@graphix.com';
  
  // Guard against any accidental currency symbol in phone
  let cleanPhone = data?.customerPhone || '0917 123 4567';
  if (cleanPhone.includes('₱') || cleanPhone.toLowerCase().includes('cash')) {
    cleanPhone = '0917 123 4567';
  }

  const shortTransId = transactionId.startsWith('#') ? transactionId : `#${transactionId}`;
  const storeAgent = 'ONLINE CHECKOUT';

  // Build exact plain text receipt for Copy & Download .txt
  const separator = '--------------------------------------------------';
  const doubleSeparator = '==================================================';

  let receiptText = `${doubleSeparator}\n                  GRAPHIX STORE\n                 ${branchLocation}\n              ${machineId}\n              ${timestamp}\n${separator}\nSALES INVOICE\n${shortTransId}\n${paymentMethod === 'Cash' ? 'TERMS: CASH ON PICKUP (8-HOUR CLAIM LIMIT)\n' : ''}${separator}\n`;

  resolvedItems.forEach((item) => {
    const itemName = item.name.toUpperCase();
    const itemTotalStr = `${item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} V`;
    const line1Pad = Math.max(1, 50 - itemName.length - itemTotalStr.length);
    receiptText += `${itemName}${' '.repeat(line1Pad)}${itemTotalStr}\n`;

    const varPart = item.variations ? ` (${item.variations})` : '';
    const line2Left = `Item: ${item.quantity}x${varPart}`;
    const line2Right = `${item.quantity} @ ${item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const line2Pad = Math.max(1, 50 - line2Left.length - line2Right.length);
    receiptText += `${line2Left}${' '.repeat(line2Pad)}${line2Right}\n`;
  });

  const totalStr = `Php ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const totalPad = Math.max(1, 50 - 'Total'.length - totalStr.length);
  receiptText += `${separator}\nTotal${' '.repeat(totalPad)}${totalStr}\n`;

  if (paymentMethod === 'Cash') {
    const cashStr = `Php ${(tenderedCash || grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const cashPad = Math.max(1, 50 - 'Cash'.length - cashStr.length);
    receiptText += `Cash${' '.repeat(cashPad)}${cashStr}\n`;

    const changeStr = `Php ${changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const changePad = Math.max(1, 50 - 'Change'.length - changeStr.length);
    receiptText += `Change${' '.repeat(changePad)}${changeStr}\n`;
  } else {
    const gcashStr = `Php ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const gcashPad = Math.max(1, 50 - 'GCash'.length - gcashStr.length);
    receiptText += `GCash${' '.repeat(gcashPad)}${gcashStr}\n`;

    const changeStr = `Php 0.00`;
    const changePad = Math.max(1, 50 - 'Change'.length - changeStr.length);
    receiptText += `Change${' '.repeat(changePad)}${changeStr}\n`;
  }

  receiptText += `*** ${totalItemCount} ITEM(S) ***\n${separator}\n`;

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
  receiptText += `Store Agent: ${storeAgent}\n`;
  receiptText += `Global Trans No. ${shortTransId}\n`;
  receiptText += `${separator}\n`;
  receiptText += `Thank you for shopping at GraphiX Store!\nKeep this receipt for warranty claims.\n`;
  receiptText += `${doubleSeparator}`;

  // Action 1: Copy Receipt
  const handleCopyReceipt = async () => {
    try {
      await navigator.clipboard.writeText(receiptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy receipt:', err);
    }
  };

  // Action 2: Print Receipt
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Sales Receipt - ${shortTransId}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 80mm;
              margin: 0 auto;
              padding: 4mm;
              color: #000;
              font-size: 12px;
              line-height: 1.35;
              white-space: pre-wrap;
            }
            @media print {
              body { width: 80mm; padding: 2mm; }
            }
          </style>
        </head>
        <body>${receiptText}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  // Action 3: Download .txt
  const handleDownloadText = () => {
    const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GraphiX_Receipt_${shortTransId.replace('#', '')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Action 4: Download 80mm thermal-style PDF
  const handleDownloadPDF = async () => {
    if (onDownload) {
      onDownload();
      return;
    }

    const element = document.getElementById('thermal-80mm-printable');
    if (!element) return;

    try {
      setIsExportingPDF(true);
      element.style.display = 'block';
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '0';

      const content = element.firstElementChild as HTMLElement;
      const canvas = await html2canvas(content, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      element.style.display = 'none';
      element.style.position = '';
      element.style.left = '';
      element.style.top = '';

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 80; // 80mm thermal width
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidth, imgHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`GraphiX_Store_Receipt_${shortTransId.replace('#', '')}.pdf`);
    } catch (err) {
      console.error('Error generating 80mm PDF:', err);
      window.print();
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl p-5 sm:p-8 shadow-2xl border border-purple-100 flex flex-col gap-6 text-gray-900">
      
      {/* 1. Header: Matches Repair Billing & Service Receipt aesthetic */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-[#bd00ff]">
            <Receipt size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-black m-0">Repair Billing & Service Receipt</h2>
            <p className="text-xs text-gray-500 m-0">Customer receipt generator & itemized breakdown</p>
          </div>
        </div>
      </div>

      {/* 2. Action Toolbar: Retain Copy, Print, Download .txt, and ADD primary Download PDF */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-purple-50/50 p-3 rounded-2xl border border-purple-100">
        <span className="text-xs font-bold text-purple-900">Receipt Actions:</span>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopyReceipt}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-purple-100 text-[#bd00ff] rounded-xl text-xs font-bold border border-purple-200 transition-colors cursor-pointer shadow-2xs"
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            {copied ? 'Copied to Clipboard!' : 'Copy Receipt'}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-purple-100 text-gray-700 rounded-xl text-xs font-bold border border-gray-200 transition-colors cursor-pointer shadow-2xs"
          >
            <Printer size={14} />
            Print Receipt
          </button>
          <button
            type="button"
            onClick={handleDownloadText}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-purple-50 text-gray-700 rounded-xl text-xs font-bold border border-gray-200 transition-colors cursor-pointer shadow-2xs"
          >
            <FileText size={14} />
            Download .txt
          </button>
          {isLocked ? (
            <button
              type="button"
              disabled
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-200 text-gray-500 rounded-xl text-xs font-bold cursor-not-allowed border border-gray-300 shadow-none opacity-80"
              title="Official PDF receipt is locked until verified and paid at the store counter"
            >
              <Lock size={14} />
              <span>Download PDF (Locked)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#bd00ff] hover:bg-[#9c00d6] text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-none shadow-md hover:shadow-lg disabled:opacity-50"
            >
              <Download size={14} />
              {isExportingPDF ? 'Exporting PDF...' : 'Download PDF'}
            </button>
          )}
        </div>
      </div>

      {/* 3. On-screen 80mm Thermal Receipt Card */}
      <div className="flex justify-center w-full">
        <div className="w-full max-w-[420px] bg-[#fafaf9] border-2 border-dashed border-gray-300 rounded-2xl p-6 sm:p-7 shadow-xs font-mono text-xs text-gray-900 leading-relaxed">
          
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
            {paymentMethod === 'Cash' && (
              <p className="text-[10px] font-black text-amber-800 bg-amber-50 rounded px-2 py-0.5 mt-1.5 inline-block border border-amber-300 uppercase tracking-tight">
                {isLocked ? 'UNVERIFIED RESERVATION (8H CLAIM LIMIT)' : 'OFFICIAL SALES INVOICE (VERIFIED PAID)'}
              </p>
            )}
          </div>

          {/* Invoice Header */}
          <div className="py-2.5 border-b border-dashed border-gray-300 text-center">
            <span className="font-black text-xs tracking-wider block">
              {isLocked ? 'RESERVATION CLAIM SLIP (UNPAID)' : 'SALES INVOICE'}
            </span>
            <span className="font-bold text-xs text-purple-700">{shortTransId}</span>
          </div>

          {/* Cart Item Breakdown */}
          <div className="py-3 border-b border-dashed border-gray-300 flex flex-col gap-2.5">
            {resolvedItems.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-0.5">
                <div className="flex justify-between items-start font-black text-black">
                  <span className="truncate pr-2">{item.name.toUpperCase()}</span>
                  <span className="shrink-0 font-bold">
                    {item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} V
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-gray-600">
                  <span className="truncate pr-2">
                    Item: {item.quantity}x {item.variations ? `(${item.variations})` : ''}
                  </span>
                  <span className="shrink-0">
                    {item.quantity} @ {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Financial Totals & Payment Method */}
          <div className="py-3 border-b border-dashed border-gray-300 flex flex-col gap-1.5">
            <div className="flex justify-between items-center font-black text-black text-sm">
              <span>Total</span>
              <span>Php {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            {paymentMethod === 'Cash' ? (
              <>
                <div className="flex justify-between items-center text-gray-700">
                  <span>Cash</span>
                  <span>Php {(tenderedCash || grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
              *** {totalItemCount} ITEM(S) ***
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
              <span>{storeAgent}</span>
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

      {/* 4. Bottom Controls */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100">
        {isLocked ? (
          <button
            type="button"
            disabled
            className="flex-1 flex justify-center items-center gap-2 py-3.5 px-4 bg-gray-100 text-gray-400 font-bold text-sm rounded-xl cursor-not-allowed border border-gray-200"
            title="Please pay in cash at the store counter to unlock your official 80mm PDF receipt"
          >
            <Lock size={18} />
            <span>Download PDF (Locked until Cashier Verifies)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isExportingPDF}
            className="flex-1 flex justify-center items-center gap-2 py-3.5 px-4 bg-[#bd00ff] hover:bg-[#9c00d6] text-white font-bold text-sm rounded-xl cursor-pointer transition-all shadow-md hover:shadow-lg disabled:opacity-50 border-none"
          >
            <Download size={18} />
            {isExportingPDF ? 'Exporting PDF...' : 'Download PDF Receipt (80mm)'}
          </button>
        )}
        {onReturnToDashboard && (
          <button
            type="button"
            onClick={onReturnToDashboard}
            className="flex-1 flex justify-center items-center py-3.5 px-4 border-2 border-[#bd00ff] bg-white hover:bg-purple-50 text-[#bd00ff] font-bold text-sm rounded-xl cursor-pointer transition-all"
          >
            Return to Dashboard
          </button>
        )}
      </div>

      {/* 5. Hidden 80mm Thermal Receipt for High-Res PDF Export */}
      <div id="thermal-80mm-printable" className="hidden print:block" style={{ display: 'none' }}>
        <div style={{
          fontFamily: "'Courier New', Courier, monospace",
          width: "80mm",
          color: "#000",
          background: "#fff",
          fontSize: "12px",
          lineHeight: "1.35",
          padding: "4mm",
          margin: "0 auto",
          whiteSpace: "pre-wrap"
        }}>
          {receiptText}
        </div>
      </div>

    </div>
  );
}
