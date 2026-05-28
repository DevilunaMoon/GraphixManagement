"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Printer, Download, Receipt, CheckCircle2 } from 'lucide-react';
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
  createdAt: string;
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
  const [purchase, setPurchase] = useState<PurchaseDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cashAmount, setCashAmount] = useState<string>('');

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/purchases/latest?id=${orderId}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then(data => {
        setPurchase(data);
        if (data?.user?.phone) {
          const numericPhone = data.user.phone.replace(/[^0-9.]/g, '');
          setCashAmount(numericPhone);
        }
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-purple-100 border-t-[#bd00ff] rounded-full animate-spin"></div>
        <p className="text-[#666] font-semibold animate-pulse text-lg">Loading receipt...</p>
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

  const orderNum = purchase.id.slice(-6).toUpperCase();
  const dateFormatted = new Date(purchase.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const timeFormatted = new Date(purchase.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  
  const isDownpayment = purchase.paymentType === 'Downpayment';
  
  // Math formulas matching original receipts
  const devicePrice = purchase.device?.price || purchase.amount;
  const subtotal = purchase.amount;
  const vatableSales = subtotal / 1.12;
  const vatAmount = subtotal - vatableSales;

  const remainingBalance = Math.max(0, devicePrice - purchase.amount);
  const monthlyInstallment = remainingBalance / 12;

  const formatVariations = (variationsStr: string | null) => {
    if (!variationsStr) return '';
    try {
      const parsed = JSON.parse(variationsStr);
      if (Array.isArray(parsed)) {
        return parsed.map((v: any) => v.name).join(', ');
      }
      if (parsed && typeof parsed === 'object') {
        return Object.values(parsed).map((v: any) => v.name).join(', ');
      }
    } catch (e) {}
    return variationsStr;
  };

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
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 72; // 72mm thermal width
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidth, imgHeight]
      });

      doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      doc.save(`Receipt_Order_${orderNum}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const parsedCash = parseFloat(cashAmount.replace(/,/g, '')) || 0;
  const changeAmount = parsedCash >= purchase.amount ? parsedCash - purchase.amount : 0;

  const invoiceNo = purchase.id.slice(0, 12).toUpperCase();
  const globalTransNo = purchase.id.slice(0, 8).toUpperCase();
  const storeAgentLabel = purchase.source === 'In-Store' ? 'CASHIER DESK' : 'ONLINE CHECKOUT';

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex flex-col justify-center items-center p-6 font-['Inter'] py-12 gap-8">
      {/* Outer control card */}
      <div className="w-full max-w-md bg-white rounded-[2.5rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col gap-6">
        
        {/* Header Options */}
        <div 
          className="flex items-center justify-between border-b-2 border-gray-100 pb-4 print:hidden"
        >
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-gray-500 hover:text-[#bd00ff] bg-transparent border-none cursor-pointer p-0 transition-colors font-semibold"
          >
            <ChevronLeft size={24} /> Back
          </button>
          <div className="flex gap-3">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-[#bd00ff] rounded-xl font-bold border-none cursor-pointer hover:bg-purple-100 transition-colors"
            >
              <Printer size={18} /> Print
            </button>
            <button 
              onClick={handleSavePDF}
              disabled={isGeneratingPDF}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl font-bold border-none cursor-pointer hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} /> {isGeneratingPDF ? 'Saving...' : 'Save PDF'}
            </button>
          </div>
        </div>

        {/* Input Section */}
        <div className="flex flex-col gap-2.5 mt-2 print:hidden">
          <label className="text-base font-bold text-gray-700 m-0 tracking-tight">
            Input the amount of money you have (Cash)
          </label>
          <input 
            type="text" 
            inputMode="decimal"
            pattern="[0-9]*"
            value={cashAmount} 
            onChange={(e) => {
              const cleanVal = e.target.value.replace(/[^0-9.]/g, '');
              const dotCount = (cleanVal.match(/\./g) || []).length;
              if (dotCount > 1) return;
              setCashAmount(cleanVal);
            }} 
            placeholder="Enter the amount of money you have" 
            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 focus:border-[#bd00ff] focus:bg-white rounded-2xl font-bold text-black outline-none transition-all placeholder:text-gray-400 text-sm"
          />
        </div>

        {/* Interactive Virtual POS Thermal Slip */}
        <div className="flex justify-center bg-gray-100 p-4 rounded-3xl border border-gray-200/50 shadow-inner">
          <div 
            ref={receiptRef}
            style={{
              fontFamily: "'Courier New', Courier, monospace",
              width: "72mm",
              color: "black",
              background: "white",
              fontSize: "12px",
              lineHeight: "1.3",
              padding: "6mm 4mm",
              boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
              borderRadius: "4px",
              boxSizing: 'border-box'
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "12px" }}>
              <div style={{ fontWeight: "bold", fontSize: "14px", letterSpacing: "1px" }}>GRAPHIX STORE</div>
              <div style={{ fontSize: "10px", marginTop: "2px" }}>MIN: 22112113365644135</div>
              <div style={{ fontSize: "10px" }}>DATE: {dateFormatted}, {timeFormatted}</div>
              <div style={{ borderTop: "1px dashed black", borderBottom: "1px dashed black", padding: "6px 0", margin: "8px 0", fontWeight: "bold" }}>
                {isDownpayment ? "DOWNPAYMENT INVOICE" : "SALES INVOICE"}<br />
                #{invoiceNo}
              </div>
            </div>

            {/* Line Item details */}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
              <span style={{ maxWidth: "70%", display: "inline-block", lineHeight: "1.4", textAlign: 'left' }}>{(purchase.device?.name || "Product").toUpperCase()}</span>
              <span style={{ textAlign: 'right' }}>{purchase.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} V</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#333", fontSize: "11px", marginBottom: "8px" }}>
              <span style={{ textAlign: 'left' }}>Item: {purchase.quantity || 1}x {purchase.variations ? `(${formatVariations(purchase.variations)})` : ''}</span>
              <span style={{ textAlign: 'right' }}>{purchase.quantity || 1} @ {devicePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div style={{ borderTop: "1px dashed black", margin: "6px 0" }}></div>

            {/* Standard Pricing Breakdown */}
            {isDownpayment ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                  <span>Total Price</span>
                  <span>Php {((purchase.device?.price || purchase.amount) * (purchase.quantity || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                  <span>Downpayment Paid</span>
                  <span>Php {purchase.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                  <span>Remaining Balance</span>
                  <span>Php {remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                  <span>Installment (12m)</span>
                  <span>Php {monthlyInstallment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                  <span>Payment Method</span>
                  <span>Downpayment</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                  <span>Total</span>
                  <span>Php {purchase.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Cash</span>
                  <span>{parsedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Change</span>
                  <span>{changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </>
            )}

            <div style={{ textAlign: "center", margin: "8px 0", fontWeight: "bold" }}>
              *** {purchase.quantity || 1} ITEM(S) ***
            </div>

            <div style={{ borderTop: "1px dashed black", margin: "6px 0" }}></div>

            {/* VAT Matrix */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
              <span>VATable Sales</span>
              <span>{vatableSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
              <span>VAT Amount</span>
              <span>{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
              <span>VAT Exempt Sales</span>
              <span>0.00</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
              <span>Zero Rated Sales</span>
              <span>0.00</span>
            </div>

            <div style={{ borderTop: "1px dashed black", margin: "6px 0" }}></div>

            {/* Profile matrix */}
            <div style={{ fontSize: "11px", marginTop: "8px", textAlign: 'left' }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Sold To:</span>
                <span>{purchase.user.name || 'Anonymous Customer'}</span>
              </div>
              <div>Email: {purchase.user.email}</div>
              <div>Phone: {purchase.user.phone || 'N/A'}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                <span>Store Agent:</span>
                <span>{storeAgentLabel}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontWeight: "bold" }}>
                <span>Global Trans No.</span>
                <span>#{globalTransNo}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
