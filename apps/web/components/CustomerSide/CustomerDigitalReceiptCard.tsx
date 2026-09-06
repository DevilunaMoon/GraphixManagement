"use client";

import React, { useRef } from 'react';
import { Check, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface DigitalReceiptData {
  totalAmount?: number;
  deviceName?: string;
  quantity?: number;
  paymentMethod?: 'Cash' | 'GCash' | string;
  tenderedCash?: number | null;
  changeAmount?: number | null;
  orderNote?: string | null;
  transactionId?: string;
  timestamp?: string;
  status?: string;
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
  const receiptRef = useRef<HTMLDivElement>(null);

  // 1. Total Amount / Item Price: Default to ₱28,998.00
  const totalAmount = data?.totalAmount !== undefined && data.totalAmount > 0 
    ? data.totalAmount 
    : 28998.00;

  // 2. Item Details: Default to Vivo Y31d, Quantity 1
  const deviceName = data?.deviceName || 'Vivo Y31d';
  const quantity = data?.quantity && data.quantity > 0 ? data.quantity : 1;

  // 3. Payment Method: 'Cash' or 'GCash'
  const paymentMethod = data?.paymentMethod 
    ? (data.paymentMethod.toLowerCase().includes('gcash') ? 'GCash' : 'Cash') 
    : 'Cash';

  // 4. Tendered Amount & Change Calculation
  const tenderedCash = data?.tenderedCash !== undefined && data.tenderedCash !== null
    ? data.tenderedCash
    : (paymentMethod === 'Cash' ? totalAmount : null);

  const changeAmount = data?.changeAmount !== undefined && data.changeAmount !== null
    ? data.changeAmount
    : (paymentMethod === 'Cash' && tenderedCash !== null ? Math.max(0, tenderedCash - totalAmount) : 0);

  // 5. Notes / Instructions
  const orderNote = data?.orderNote || null;

  // 6. Transaction Metadata
  const status = data?.status || 'Purchase Confirmed';
  const transactionId = data?.transactionId || '#CMTPQWI5Q0';
  const timestamp = data?.timestamp || new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // VAT calculations for PDF thermal receipt
  const vatRate = 0.12;
  const vatableSales = totalAmount / (1 + vatRate);
  const vatAmount = totalAmount - vatableSales;

  const handleDownloadPDF = async () => {
    if (onDownload) {
      onDownload();
      return;
    }

    const element = document.getElementById('thermal-receipt-printable');
    if (!element) return;

    try {
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
      const imgWidth = 72; // mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidth, imgHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Graphix_Receipt_${transactionId.replace('#', '')}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      window.print();
    }
  };

  return (
    <>
      {/* On-screen Visual Receipt Card matching exact provided design */}
      <div 
        ref={receiptRef}
        className="w-full max-w-[500px] bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-gray-100 flex flex-col items-center relative overflow-hidden text-gray-900"
      >
        {/* Top Decorative Arc / Rainbow Gradient Line */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-[#bd00ff] via-[#7928ca] to-[#01f0ff]"></div>

        {/* Green Checkmark Confirmation Badge */}
        <div className="w-24 h-24 bg-[#dcfce7] rounded-full flex justify-center items-center mt-2 mb-1 shadow-xs">
          <Check size={48} className="text-[#22c55e]" strokeWidth={3.5} />
        </div>

        {/* Header Title & Subtitle */}
        <div className="text-center flex flex-col gap-1.5">
          <h2 className="text-3xl sm:text-[32px] font-black text-[#6d1cb0] m-0 border-none tracking-tight">
            Purchase Confirmed
          </h2>
          <p className="text-gray-500 font-semibold text-base sm:text-lg m-0">
            Thank you for your purchase!
          </p>
        </div>

        {/* Item & Price Row */}
        <div className="w-full flex justify-between items-center py-5 border-b-2 border-dashed border-gray-200 mt-4 mb-2">
          <span className="font-semibold text-gray-700 text-base">
            Device Name: <strong className="text-black font-black ml-1">{deviceName}</strong>
            {quantity > 1 && (
              <span className="text-xs text-gray-500 font-bold ml-1.5">({quantity}x)</span>
            )}
          </span>
          <div className="flex items-center text-[#bd00ff] font-black text-2xl tracking-tight">
            <span className="text-xl mr-1">₱</span>
            <span>{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Transaction Metadata Key-Value List */}
        <div className="w-full flex flex-col py-2 gap-3.5 mb-2 text-left text-sm">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-500">Transaction ID:</span>
            <span className="font-black text-gray-900 font-mono tracking-wider">{transactionId}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-500">Date:</span>
            <span className="font-bold text-gray-900">{timestamp}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-500">Payment Method:</span>
            <span className="font-bold text-gray-900">{paymentMethod}</span>
          </div>

          {/* Tendered Cash & Change (For Cash Payments) */}
          {paymentMethod === 'Cash' && tenderedCash !== null && (
            <>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-500">Tendered Cash:</span>
                <span className="font-bold text-gray-900 font-mono">
                  ₱{tenderedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-500">Change:</span>
                <span className="font-black text-emerald-600 font-mono">
                  ₱{changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </>
          )}

          {/* Optional Order Note / Instructions */}
          {orderNote && (
            <div className="flex flex-col gap-1 pt-2 border-t border-gray-100">
              <span className="font-semibold text-gray-500 text-xs uppercase tracking-wider">
                Message for Staff / Order Note:
              </span>
              <p className="text-xs text-gray-800 bg-gray-50 rounded-xl p-2.5 border border-gray-200/70 m-0 italic leading-relaxed">
                "{orderNote}"
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row gap-3.5 no-print mt-3">
          <button 
            type="button"
            onClick={handleDownloadPDF}
            className="flex-1 flex justify-center items-center gap-2 py-4 px-4 border-none bg-[#bd00ff] hover:bg-[#9c00d6] text-white font-black text-base rounded-2xl cursor-pointer transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            <Download size={20} />
            Download Receipt
          </button>
          <button 
            type="button"
            onClick={onReturnToDashboard}
            className="flex-1 flex justify-center items-center py-4 px-4 border-2 border-[#bd00ff] bg-white hover:bg-purple-50 text-[#bd00ff] font-black text-base rounded-2xl cursor-pointer transition-all active:scale-[0.98]"
          >
            Return to Dashboard
          </button>
        </div>
      </div>

      {/* Hidden Thermal Receipt for High-Resolution PDF Rendering & Printing */}
      <div id="thermal-receipt-printable" className="hidden print:block" style={{ display: 'none' }}>
        <div style={{
          fontFamily: "'Courier New', Courier, monospace",
          width: "72mm",
          color: "black",
          background: "white",
          fontSize: "12px",
          lineHeight: "1.3",
          padding: "4mm",
          margin: "0 auto"
        }}>
          <div style={{ textAlign: "center", marginBottom: "12px" }}>
            <div style={{ fontWeight: "bold", fontSize: "14px", letterSpacing: "1px" }}>GRAPHIX STORE</div>
            <div style={{ fontSize: "10px", marginTop: "2px" }}>MIN: 22112113365644135</div>
            <div style={{ fontSize: "10px" }}>DATE: {timestamp}</div>
            <div style={{ borderTop: "1px dashed black", borderBottom: "1px dashed black", padding: "6px 0", margin: "8px 0", fontWeight: "bold" }}>
              OFFICIAL SALES RECEIPT<br />
              {transactionId}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
            <span style={{ maxWidth: "70%", display: "inline-block", lineHeight: "1.4" }}>{deviceName.toUpperCase()}</span>
            <span>₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#333", fontSize: "11px", marginBottom: "8px" }}>
            <span>Qty: {quantity}x</span>
            <span>@ ₱{(totalAmount / quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div style={{ borderTop: "1px dashed black", margin: "6px 0" }}></div>

          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
            <span>FINAL TOTAL PAYMENT</span>
            <span>Php {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Payment Method</span>
            <span>{paymentMethod}</span>
          </div>
          {paymentMethod === 'Cash' && tenderedCash !== null && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Tendered Cash</span>
                <span>Php {tenderedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                <span>Change</span>
                <span>Php {changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </>
          )}

          {orderNote && (
            <div style={{ marginTop: "6px", fontSize: "10px", borderTop: "1px dashed #ccc", paddingTop: "4px" }}>
              <strong>Note:</strong> {orderNote}
            </div>
          )}

          <div style={{ textAlign: "center", margin: "8px 0", fontWeight: "bold" }}>
            *** {quantity} ITEM(S) • PAYMENT SUCCESSFUL ***
          </div>

          <div style={{ borderTop: "1px dashed black", margin: "6px 0" }}></div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
            <span>VATable Sales (12%)</span>
            <span>₱{vatableSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
            <span>VAT Amount</span>
            <span>₱{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div style={{ borderTop: "1px dashed black", margin: "6px 0" }}></div>

          <div style={{ textAlign: "center", fontSize: "10px", marginTop: "8px" }}>
            THANK YOU FOR YOUR PURCHASE!
          </div>
        </div>
      </div>
    </>
  );
}
