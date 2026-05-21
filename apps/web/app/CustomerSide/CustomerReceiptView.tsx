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
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4',
      });

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      doc.save(`Receipt_Order_${orderNum}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const parsedCash = parseFloat(cashAmount) || 0;
  const changeAmount = parsedCash >= purchase.amount ? parsedCash - purchase.amount : -1;

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex justify-center items-center p-6 font-['Inter'] py-12">
      <div 
        ref={receiptRef}
        className="w-full max-w-2xl bg-white rounded-[2.5rem] p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col gap-8"
      >
        
        {/* Header Options */}
        <div 
          className="flex items-center justify-between border-b-2 border-gray-100 pb-4 print:hidden"
          data-html2canvas-ignore="true"
        >
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-gray-500 hover:text-[#bd00ff] bg-transparent border-none cursor-pointer p-0 transition-colors font-semibold"
          >
            <ChevronLeft size={24} /> Back
          </button>
          <div className="flex gap-4">
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

        {/* Receipt Body */}
        <div className="flex flex-col gap-8 px-4 md:px-10 py-6">
          
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 bg-[#bd00ff] rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(189,0,255,0.3)]">
              <Receipt size={32} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 m-0">Order #{orderNum}</h2>
              <p className="text-gray-500 font-medium mt-1 mb-0">{dateFormatted} • {timeFormatted}</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 bg-green-50 text-green-600 rounded-full font-bold text-sm">
              <CheckCircle2 size={16} /> {purchase.status === 'Active' ? 'Completed' : purchase.status}
            </div>
          </div>

          <div className="w-full h-[2px] border-b-2 border-dashed border-gray-200 my-2"></div>

          {/* Itemized List */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between font-bold text-gray-500 pb-2 border-b border-gray-100">
              <span>Item</span>
              <span>Amount</span>
            </div>
            
            <div className="flex justify-between items-center text-gray-800 font-semibold text-lg">
              <div className="flex flex-col">
                <span className="font-bold text-black">{purchase.device?.name || "Product"}</span>
                <span className="text-sm font-medium text-gray-400">
                  {purchase.quantity || 1}x @ ₱{purchase.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  {isDownpayment && " (Downpayment)"}
                </span>
                {purchase.variations && (
                  <span className="text-xs text-purple-600 font-bold mt-1 bg-purple-50 px-2 py-0.5 rounded-full w-fit">
                    {formatVariations(purchase.variations)}
                  </span>
                )}
              </div>
              <span className="font-bold text-black">
                ₱{purchase.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="w-full h-[2px] border-b-2 border-dashed border-gray-200 my-2"></div>

          {/* Summary */}
          <div className="flex flex-col gap-3">
            {isDownpayment && (
              <div className="flex justify-between items-center text-gray-500 font-medium">
                <span>Original Device Price</span>
                <span className="font-bold text-gray-700">₱{devicePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-gray-500 font-medium">
              <span>VATable Sales</span>
              <span>₱{vatableSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center text-gray-500 font-medium">
              <span>VAT (12%)</span>
              <span>₱{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {isDownpayment && (
              <>
                <div className="flex justify-between items-center text-[#ff8000] font-semibold bg-orange-50/50 p-2.5 rounded-xl border border-orange-100/50 mt-1">
                  <span>Remaining Balance</span>
                  <span>₱{remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-[#00b0ff] font-semibold bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50">
                  <span>12-Month Installment</span>
                  <span>₱{monthlyInstallment.toLocaleString(undefined, { minimumFractionDigits: 2 })} /mo</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center text-gray-500 font-medium mt-1">
              <span>Payment Type</span>
              <span className="text-black font-semibold">
                {isDownpayment ? "Downpayment Installment" : "Buy Now (Full Payment)"}
              </span>
            </div>
            <div className="flex justify-between items-center text-gray-500 font-medium">
              <span>Source</span>
              <span className="text-black font-semibold capitalize">{purchase.source || 'Online'}</span>
            </div>
          </div>

          {/* Total and Cash/Change Container */}
          <div className="flex flex-col gap-4 bg-gray-50 p-6 rounded-2xl mt-4">
            <div className="flex justify-between items-center text-gray-500 font-medium">
              <span className="text-base font-bold text-gray-700">Device Price</span>
              <span className="font-extrabold text-black">
                ₱{purchase.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-gray-200/50">
              <span className="text-base font-bold text-gray-700 shrink-0">Cash Tendered</span>
              <div className="relative w-full sm:max-w-[200px] print:hidden">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-extrabold text-sm">₱</span>
                <input 
                  type="number" 
                  value={cashAmount} 
                  onChange={(e) => setCashAmount(e.target.value)} 
                  placeholder="Enter amount..." 
                  className="w-full pl-7 pr-3 py-2 bg-white border border-gray-200 rounded-xl font-semibold text-black outline-none focus:border-purple-400 transition-all text-right shadow-sm placeholder:text-gray-300"
                />
              </div>
              <span className="hidden print:inline font-extrabold text-black">
                {parsedCash > 0 ? `₱${parsedCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
              </span>
            </div>

            {parsedCash > 0 && (
              <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 mt-0.5">
                <span className="text-sm font-bold text-gray-500">Change</span>
                <span className={`text-base font-black ${changeAmount >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {changeAmount >= 0 ? `₱${changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Insufficient Cash'}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-gray-200/50 mt-1">
              <span className="text-xl font-bold text-gray-800 border-none m-0">
                {isDownpayment ? "Downpayment Paid" : "Total Paid"}
              </span>
              <span className="text-3xl font-black text-[#bd00ff]">
                ₱{purchase.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
