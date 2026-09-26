"use client";

import React, { useRef, useState } from 'react';
import { Check, Download, Receipt, Printer, Copy, FileText, Lock } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { formatDisplayInvoiceId, getBranchCode } from '../../lib/invoice';
import { isIPhoneProduct } from '../../lib/imei';

export interface ReceiptCartItem {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  variations?: string; // e.g. "Color: Black, Storage: 128GB" or "Black, 128GB"
  imei?: string | null;
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
  imei?: string | null;
}

interface CustomerDigitalReceiptCardProps {
  data?: DigitalReceiptData;
  title?: string;
  subtitle?: string;
  onDownload?: () => void;
  onReturnToDashboard?: () => void;
}

export default function CustomerDigitalReceiptCard({
  data,
  title = 'Official Sales & Purchase Receipt',
  subtitle = 'Customer receipt generator & itemized breakdown',
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
  const branchLetter = getBranchCode(branchLocation);
  const transactionId = data?.transactionId || `#GRPX-${branchLetter}-A1`;
  const timestamp = data?.timestamp || new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // 3. Dynamic Cart Items & Financial Calculations
  const sanitizeVarStr = (v: string | null | undefined): string => {
    if (!v) return '';
    try {
      const parsed = typeof v === 'string' ? JSON.parse(v) : v;
      if (Array.isArray(parsed)) {
        return parsed
          .map((x: any) => {
            if (typeof x === 'string') return x;
            if (x && typeof x === 'object') {
              if (x.type && x.name) {
                const displayVal = (x.type.toLowerCase() === 'storage' && !String(x.name).toLowerCase().includes('gb'))
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

  const rawItems: ReceiptCartItem[] = (data?.items && data.items.length > 0)
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

  const resolvedItems: ReceiptCartItem[] = rawItems.map(item => ({
    ...item,
    variations: sanitizeVarStr(item.variations)
  }));

  const totalItemCount = resolvedItems.reduce((sum, item) => sum + item.quantity, 0);
  const computedTotal = resolvedItems.reduce((sum, item) => sum + (item.total || (item.quantity * item.unitPrice)), 0);
  const grandTotal = data?.totalAmount && data.totalAmount > 0 ? data.totalAmount : computedTotal;

  // 4. Payment Method & Tendered / Change
  const paymentMethod = data?.paymentMethod 
    ? (data.paymentMethod.toLowerCase().includes('gcash') ? 'GCash' : 'Cash') 
    : 'Cash';

  const isCashOrder = paymentMethod === 'Cash';
  const isGcashOrder = paymentMethod === 'GCash';
  const isVerified = data?.isVerified !== undefined ? Boolean(data.isVerified) : false;
  const isLocked = !isVerified;

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

  const shortTransId = formatDisplayInvoiceId(transactionId, branchLocation);
  const storeAgent = 'ONLINE CHECKOUT';

  // Build exact plain text receipt for Copy, Download .txt, and PDF Export
  const LINE_WIDTH = 40;
  const separator = '-'.repeat(LINE_WIDTH);
  const doubleSeparator = '='.repeat(LINE_WIDTH);

  const centerText = (text: string, width = LINE_WIDTH): string => {
    const clean = text.trim();
    if (clean.length >= width) return clean;
    const leftPad = Math.floor((width - clean.length) / 2);
    return ' '.repeat(leftPad) + clean;
  };

  const padRow = (left: string, right: string, width = LINE_WIDTH): string => {
    const available = width - left.length - right.length;
    if (available <= 0) return `${left} ${right}`;
    return left + ' '.repeat(available) + right;
  };

  let receiptText = `${doubleSeparator}\n` +
    `${centerText('GRAPHIX STORE')}\n` +
    `${centerText(branchLocation)}\n` +
    `${centerText(machineId)}\n` +
    `${centerText(timestamp)}\n` +
    `${separator}\n` +
    `SALES INVOICE\n` +
    `${shortTransId}\n` +
    `${paymentMethod === 'Cash' ? 'TERMS: CASH ON PICKUP (8-HOUR CLAIM LIMIT)\n' : ''}` +
    `${separator}\n`;

  resolvedItems.forEach((item) => {
    const itemName = item.name.toUpperCase();
    const itemTotalStr = `${item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} V`;
    receiptText += `${padRow(itemName, itemTotalStr)}\n`;

    const varPart = item.variations ? ` (${item.variations})` : '';
    const line2Left = `Item: ${item.quantity}x${varPart}`;
    const line2Right = `${item.quantity} @ ${item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    receiptText += `${padRow(line2Left, line2Right)}\n`;

    if (item.imei || data?.imei) {
      receiptText += `IMEI: ${item.imei || data?.imei}\n`;
    } else if (isIPhoneProduct(item.name || data?.deviceName)) {
      receiptText += `IMEI: Pending Pickup (recorded during in-store pickup)\n`;
    }
  });

  const totalStr = `Php ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  receiptText += `${separator}\n${padRow('Total', totalStr)}\n`;

  if (paymentMethod === 'Cash') {
    const cashStr = `Php ${(tenderedCash || grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    receiptText += `${padRow('Cash', cashStr)}\n`;

    const changeStr = `Php ${changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    receiptText += `${padRow('Change', changeStr)}\n`;
  } else {
    const gcashStr = `Php ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    receiptText += `${padRow('GCash', gcashStr)}\n`;

    const changeStr = `Php 0.00`;
    receiptText += `${padRow('Change', changeStr)}\n`;
  }

  receiptText += `*** ${totalItemCount} ITEM(S) ***\n${separator}\n`;

  const vatableStr = vatableSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  receiptText += `${padRow('VATable Sales', vatableStr)}\n`;

  const vatAmtStr = vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  receiptText += `${padRow('VAT Amount', vatAmtStr)}\n`;

  receiptText += `${padRow('VAT Exempt Sales', '0.00')}\n`;
  receiptText += `${padRow('Zero Rated Sales', '0.00')}\n`;
  receiptText += `${separator}\n`;

  receiptText += `Sold To: ${customerName}\n`;
  receiptText += `Email: ${customerEmail}\n`;
  receiptText += `Phone: ${cleanPhone}\n`;
  receiptText += `Store Agent: ${storeAgent}\n`;
  receiptText += `Global Trans No. ${shortTransId}\n`;
  receiptText += `${separator}\n`;
  receiptText += `Thank you for shopping at GraphiX Store!\nKeep this receipt for warranty claims.\n`;
  receiptText += `${doubleSeparator}\n`;

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
  const receiptRef = useRef<HTMLDivElement>(null);

  // Action 4: Download 80mm styled native vector PDF matching the on-screen receipt exactly
  const handleDownloadPDF = async () => {
    if (onDownload) {
      onDownload();
      return;
    }

    try {
      setIsExportingPDF(true);

      const pageWidth = 80; // 80mm POS standard width
      const cardMarginX = 2; // 2mm card margin
      const cardMarginY = 2.5; // 2.5mm top/bottom margin
      const cardWidth = pageWidth - (cardMarginX * 2); // 76mm
      const leftPad = 5.5; // inner content left (mm)
      const rightPad = 74.5; // inner content right (mm)
      const centerX = 40; // center coordinate (mm)

      // Function to render content (dryRun to calculate exact height or live to draw)
      const renderContent = (doc: jsPDF | null, startY: number): number => {
        let y = startY;

        // Helper for drawing dashed divider
        const drawDivider = (divY: number) => {
          if (doc) {
            doc.setDrawColor(209, 213, 219);
            doc.setLineWidth(0.35);
            doc.setLineDashPattern([1, 1], 0);
            doc.line(leftPad, divY, rightPad, divY);
          }
        };

        // 1. Store Header
        if (doc) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10.5);
          doc.setTextColor(0, 0, 0);
          doc.text('GRAPHIX STORE', centerX, y, { align: 'center' });
        }
        y += 4.2;

        if (doc) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(31, 41, 55);
          doc.text(branchLocation, centerX, y, { align: 'center' });
        }
        y += 3.6;

        if (doc) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(107, 114, 128);
          doc.text(machineId, centerX, y, { align: 'center' });
        }
        y += 3.4;

        if (doc) {
          doc.setFontSize(7);
          doc.setTextColor(75, 85, 99);
          doc.text(timestamp, centerX, y, { align: 'center' });
        }
        y += 2.5;

        // Badge
        const badgeHeight = 4.2;
        const badgeY = y;
        if (doc) {
          doc.setLineWidth(0.25);
          doc.setLineDashPattern([], 0);

          if (isGcashOrder) {
            if (isLocked) {
              doc.setFillColor(239, 246, 255);
              doc.setDrawColor(147, 197, 253);
              const bw = 62;
              doc.roundedRect(centerX - (bw / 2), badgeY, bw, badgeHeight, 1, 1, 'FD');
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(5.8);
              doc.setTextColor(30, 64, 175);
              doc.text('GCASH PAYMENT (FOR CASHIER VERIFICATION)', centerX, badgeY + 3, { align: 'center' });
            } else {
              doc.setFillColor(236, 253, 245);
              doc.setDrawColor(110, 231, 183);
              const bw = 54;
              doc.roundedRect(centerX - (bw / 2), badgeY, bw, badgeHeight, 1, 1, 'FD');
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(6);
              doc.setTextColor(6, 95, 70);
              doc.text('OFFICIAL SALES INVOICE (VERIFIED PAID)', centerX, badgeY + 3, { align: 'center' });
            }
          } else if (isCashOrder) {
            if (isLocked) {
              doc.setFillColor(254, 243, 199);
              doc.setDrawColor(252, 211, 77);
              const bw = 56;
              doc.roundedRect(centerX - (bw / 2), badgeY, bw, badgeHeight, 1, 1, 'FD');
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(5.8);
              doc.setTextColor(146, 64, 14);
              doc.text('UNVERIFIED RESERVATION (8H CLAIM LIMIT)', centerX, badgeY + 3, { align: 'center' });
            } else {
              doc.setFillColor(254, 243, 199);
              doc.setDrawColor(252, 211, 77);
              const bw = 54;
              doc.roundedRect(centerX - (bw / 2), badgeY, bw, badgeHeight, 1, 1, 'FD');
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(6);
              doc.setTextColor(146, 64, 14);
              doc.text('OFFICIAL SALES INVOICE (VERIFIED PAID)', centerX, badgeY + 3, { align: 'center' });
            }
          }
        }
        y += badgeHeight + 3;

        // Divider
        drawDivider(y);
        y += 4.5;

        // 2. Invoice Title & ID
        if (doc) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(15, 23, 42);
          const invoiceTitle = isLocked
            ? (isGcashOrder ? 'GCASH PAYMENT PROOF (FOR VERIFICATION)' : 'RESERVATION CLAIM SLIP (UNPAID)')
            : 'SALES INVOICE';
          doc.text(invoiceTitle, centerX, y, { align: 'center' });
        }
        y += 3.8;

        if (doc) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(126, 34, 206);
          doc.text(shortTransId, centerX, y, { align: 'center' });
        }
        y += 3.5;

        // Divider
        drawDivider(y);
        y += 4.2;

        // 3. Cart Items Breakdown
        resolvedItems.forEach((item) => {
          if (doc) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(0, 0, 0);
            const nameText = item.name.toUpperCase();
            const safeName = doc.splitTextToSize(nameText, 44);
            doc.text(safeName[0] || nameText, leftPad, y);

            const itemTotalStr = `${item.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} V`;
            doc.text(itemTotalStr, rightPad, y, { align: 'right' });
          }
          y += 3.5;

          if (doc) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(75, 85, 99);
            const varStr = item.variations ? `(${item.variations})` : '';
            const itemQtyVar = `Item: ${item.quantity}x ${varStr}`.trim();
            const safeVar = doc.splitTextToSize(itemQtyVar, 44);
            doc.text(safeVar[0] || itemQtyVar, leftPad, y);

            const unitPriceStr = `${item.quantity} @ ${item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            doc.text(unitPriceStr, rightPad, y, { align: 'right' });
          }
          y += 3.5;

          if (item.imei || data?.imei) {
            if (doc) {
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(6.5);
              doc.setTextColor(31, 41, 55);
              doc.text(`IMEI: ${item.imei || data?.imei}`, leftPad, y);
            }
            y += 3.2;
          }
        });

        // Divider
        drawDivider(y);
        y += 4.2;

        // 4. Financial Totals & Payment Method
        if (doc) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(0, 0, 0);
          doc.text('Total', leftPad, y);
          doc.text(`Php ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightPad, y, { align: 'right' });
        }
        y += 3.8;

        if (paymentMethod === 'Cash') {
          if (doc) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(55, 65, 81);
            doc.text('Cash', leftPad, y);
            doc.text(`Php ${(tenderedCash || grandTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightPad, y, { align: 'right' });
          }
          y += 3.5;

          if (doc) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);
            doc.text('Change', leftPad, y);
            doc.text(`Php ${changeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightPad, y, { align: 'right' });
          }
          y += 4;
        } else {
          if (doc) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(55, 65, 81);
            doc.text('GCash', leftPad, y);
            doc.text(`Php ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightPad, y, { align: 'right' });
          }
          y += 3.5;

          if (doc) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);
            doc.text('Change', leftPad, y);
            doc.text('Php 0.00', rightPad, y, { align: 'right' });
          }
          y += 4;
        }

        if (doc) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(31, 41, 55);
          doc.text(`*** ${totalItemCount} ITEM(S) ***`, centerX, y, { align: 'center' });
        }
        y += 3.5;

        // Divider
        drawDivider(y);
        y += 4;

        // 5. BIR 12% Tax Breakdown
        if (doc) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(75, 85, 99);

          doc.text('VATable Sales', leftPad, y);
          doc.text(vatableSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rightPad, y, { align: 'right' });
        }
        y += 3.2;

        if (doc) {
          doc.text('VAT Amount', leftPad, y);
          doc.text(vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rightPad, y, { align: 'right' });
        }
        y += 3.2;

        if (doc) {
          doc.text('VAT Exempt Sales', leftPad, y);
          doc.text('0.00', rightPad, y, { align: 'right' });
        }
        y += 3.2;

        if (doc) {
          doc.text('Zero Rated Sales', leftPad, y);
          doc.text('0.00', rightPad, y, { align: 'right' });
        }
        y += 3.2;

        // Divider
        drawDivider(y);
        y += 4;

        // 6. Customer & Audit Details
        if (doc) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(55, 65, 81);
          doc.text('Sold To:', leftPad, y);
          doc.setTextColor(0, 0, 0);
          doc.text(customerName, rightPad, y, { align: 'right' });
        }
        y += 3.2;

        if (doc) {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(75, 85, 99);
          doc.text('Email:', leftPad, y);
          doc.setTextColor(31, 41, 55);
          doc.text(customerEmail, rightPad, y, { align: 'right' });
        }
        y += 3.2;

        if (doc) {
          doc.setTextColor(75, 85, 99);
          doc.text('Phone:', leftPad, y);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(cleanPhone, rightPad, y, { align: 'right' });
        }
        y += 3.2;

        if (doc) {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(75, 85, 99);
          doc.text('Store Agent:', leftPad, y);
          doc.setTextColor(31, 41, 55);
          doc.text(storeAgent, rightPad, y, { align: 'right' });
        }
        y += 3.2;

        if (doc) {
          doc.setTextColor(75, 85, 99);
          doc.text('Global Trans No.', leftPad, y);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(126, 34, 206);
          doc.text(shortTransId, rightPad, y, { align: 'right' });
        }
        y += 3.5;

        // Divider
        drawDivider(y);
        y += 4.5;

        // 7. Footer Note
        if (doc) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(107, 114, 128);
          doc.text('Thank you for shopping at GraphiX Store!', centerX, y, { align: 'center' });
        }
        y += 3.2;

        if (doc) {
          doc.setFontSize(6.5);
          doc.setTextColor(156, 163, 175);
          doc.text('Keep this receipt for warranty claims.', centerX, y, { align: 'center' });
        }
        y += 3.5;

        return y;
      };

      // 1. Dry run to calculate exact content height
      const startContentY = cardMarginY + 6;
      const endContentY = renderContent(null, startContentY);
      const cardHeight = (endContentY - cardMarginY) + 2; // Snug bottom border with exact padding
      const pageHeight = cardHeight + (cardMarginY * 2);

      // 2. Live document creation with exact dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pageWidth, pageHeight]
      });

      // Pure white page background
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Card Background with rounded dashed border
      pdf.setFillColor(250, 250, 249); // #fafaf9
      pdf.setDrawColor(209, 213, 219); // #d1d5db
      pdf.setLineWidth(0.4);
      pdf.setLineDashPattern([1.2, 1.2], 0);
      pdf.roundedRect(cardMarginX, cardMarginY, cardWidth, cardHeight, 3.5, 3.5, 'FD');

      // 3. Render content onto live document
      renderContent(pdf, startContentY);

      pdf.save(`GraphiX_Store_Receipt_${shortTransId.replace('#', '')}.pdf`);
    } catch (err) {
      console.error('Error generating 80mm vector PDF receipt:', err);
      handlePrint();
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
            <h2 className="text-xl font-bold text-black m-0">{title}</h2>
            <p className="text-xs text-gray-500 m-0">{subtitle}</p>
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
              {isExportingPDF ? 'Exporting PDF...' : 'Download PDF Receipt'}
            </button>
          )}
        </div>
      </div>

      {/* 3. On-screen 80mm Thermal Receipt Card */}
      <div className="flex justify-center w-full">
        <div 
          ref={receiptRef}
          id="onscreen-thermal-receipt" 
          className="w-full max-w-[420px] bg-[#fafaf9] border-2 border-dashed border-gray-300 rounded-2xl p-6 sm:p-7 shadow-xs font-sans text-xs text-gray-900 leading-relaxed"
        >
          
          {/* Header & Store Info */}
          <div className="text-center pb-3 border-b border-dashed border-gray-300">
            <h3 className="text-base font-black tracking-widest uppercase m-0 text-black">
              GRAPHIX STORE
            </h3>
            <p className="text-xs font-bold text-gray-800 m-0 mt-0.5">
              {branchLocation}
            </p>
            <p className="text-[11px] text-gray-500 m-0 mt-0.5">
              {machineId}
            </p>
            <p className="text-[11px] text-gray-600 m-0 mt-0.5">
              {timestamp}
            </p>
            {isGcashOrder ? (
              <p className={`text-[10px] font-black rounded px-2.5 py-0.5 mt-1.5 inline-block border uppercase tracking-tight ${
                isLocked 
                  ? 'text-blue-800 bg-blue-50 border-blue-300' 
                  : 'text-emerald-800 bg-emerald-50 border-emerald-300'
              }`}>
                {isLocked ? 'GCASH PAYMENT (FOR CASHIER VERIFICATION)' : 'OFFICIAL SALES INVOICE (VERIFIED PAID)'}
              </p>
            ) : isCashOrder ? (
              <p className="text-[10px] font-black text-amber-800 bg-amber-50 rounded px-2.5 py-0.5 mt-1.5 inline-block border border-amber-300 uppercase tracking-tight">
                {isLocked ? 'UNVERIFIED RESERVATION (8H CLAIM LIMIT)' : 'OFFICIAL SALES INVOICE (VERIFIED PAID)'}
              </p>
            ) : null}
          </div>

          {/* Invoice Header */}
          <div className="py-2.5 border-b border-dashed border-gray-300 text-center">
            <span className="font-extrabold text-xs tracking-wider block text-gray-900 uppercase">
              {isLocked 
                ? (isGcashOrder ? 'GCASH PAYMENT PROOF (FOR VERIFICATION)' : 'RESERVATION CLAIM SLIP (UNPAID)') 
                : 'SALES INVOICE'}
            </span>
            <span className="font-bold text-xs text-[#7e22ce] font-mono mt-0.5 block">{shortTransId}</span>
          </div>

          {/* Cart Item Breakdown */}
          <div className="py-3 border-b border-dashed border-gray-300 flex flex-col gap-2.5">
            {resolvedItems.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-0.5">
                <div className="flex justify-between items-start font-bold text-black text-xs">
                  <span className="truncate pr-2">{item.name.toUpperCase()}</span>
                  <span className="shrink-0 font-bold font-mono">
                    {item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} V
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-gray-600">
                  <span className="truncate pr-2">
                    Item: {item.quantity}x {item.variations ? `(${item.variations})` : ''}
                  </span>
                  <span className="shrink-0 font-mono">
                    {item.quantity} @ {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {(item.imei || data?.imei) ? (
                  <div className="font-mono font-bold text-[10px] text-gray-800 text-left">
                    IMEI: {item.imei || data?.imei}
                  </div>
                ) : isIPhoneProduct(item.name || data?.deviceName) ? (
                  <div className="font-sans font-semibold text-[10px] text-amber-700 text-left">
                    IMEI: Pending Pickup <span className="text-[9px] text-gray-400 font-normal block">IMEI will be recorded during pickup</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {/* Financial Totals & Payment Method */}
          <div className="py-3 border-b border-dashed border-gray-300 flex flex-col gap-1.5">
            <div className="flex justify-between items-center font-black text-black text-sm">
              <span>Total</span>
              <span className="font-mono">Php {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            {paymentMethod === 'Cash' ? (
              <>
                <div className="flex justify-between items-center text-gray-700">
                  <span>Cash</span>
                  <span className="font-mono">Php {(tenderedCash || grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-gray-900">
                  <span>Change</span>
                  <span className="font-mono">Php {changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center text-gray-700">
                  <span>GCash</span>
                  <span className="font-mono">Php {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-gray-900">
                  <span>Change</span>
                  <span className="font-mono">Php 0.00</span>
                </div>
              </>
            )}

            <div className="text-center font-bold py-1 tracking-wider text-[11px] text-gray-800 font-mono">
              *** {totalItemCount} ITEM(S) ***
            </div>
          </div>

          {/* BIR 12% Tax Breakdown */}
          <div className="py-3 border-b border-dashed border-gray-300 flex flex-col gap-1 text-[11px] text-gray-600">
            <div className="flex justify-between items-center">
              <span>VATable Sales</span>
              <span className="font-mono">{vatableSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>VAT Amount</span>
              <span className="font-mono">{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>VAT Exempt Sales</span>
              <span className="font-mono">0.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Zero Rated Sales</span>
              <span className="font-mono">0.00</span>
            </div>
          </div>

          {/* Customer & Audit Details */}
          <div className="py-3 border-b border-dashed border-gray-300 flex flex-col gap-1 text-[11px] text-gray-700">
            <div className="flex justify-between items-center">
              <span className="font-bold">Sold To:</span>
              <span className="font-semibold text-black">{customerName}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span>Email:</span>
              <span className="text-right text-gray-800 font-medium break-all">{customerEmail}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Phone:</span>
              <span className="font-semibold text-black font-mono">{cleanPhone}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Store Agent:</span>
              <span className="font-medium text-gray-800">{storeAgent}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Global Trans No.</span>
              <span className="font-bold text-[#7e22ce] font-mono">{shortTransId}</span>
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
            {isExportingPDF ? 'Exporting PDF...' : 'Download PDF Receipt'}
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

    </div>
  );
}
