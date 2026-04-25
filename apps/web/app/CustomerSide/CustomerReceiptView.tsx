"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Printer, Download, Receipt, CheckCircle2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
}

export default function CustomerReceiptView({ user, orderId }: { user?: any; orderId: string }) {
  const router = useRouter();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Mock receipt data based on the ID passed
  const orderDetails = {
    orderNum: orderId,
    date: 'February 1, 2026',
    time: '02:45 PM',
    status: 'Completed',
    paymentMethod: 'G-Cash',
    items: [
      { name: 'Custom T-Shirt Print', qty: 2, price: 500 },
      { name: 'Business Cards (100pcs)', qty: 1, price: 850 },
      { name: 'Mug Design', qty: 3, price: 250 },
    ] as ReceiptItem[],
  };

  const subtotal = orderDetails.items.reduce((acc, item) => acc + (item.qty * item.price), 0);
  const tax = subtotal * 0.12; // 12% mock tax
  const total = subtotal + tax;

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
      doc.save(`Receipt_Order_${orderDetails.orderNum}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex justify-center items-center p-6 font-['Signika'] py-12">
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
              <h2 className="text-3xl font-extrabold text-gray-900 m-0">Order #{orderDetails.orderNum}</h2>
              <p className="text-gray-500 font-medium mt-1 mb-0">{orderDetails.date} • {orderDetails.time}</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 bg-green-50 text-green-600 rounded-full font-bold text-sm">
              <CheckCircle2 size={16} /> {orderDetails.status}
            </div>
          </div>

          <div className="w-full h-[2px] border-b-2 border-dashed border-gray-200 my-2"></div>

          {/* Itemized List */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between font-bold text-gray-500 pb-2 border-b border-gray-100">
              <span>Item</span>
              <span>Amount</span>
            </div>
            
            {orderDetails.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center text-gray-800 font-semibold text-lg">
                <div className="flex flex-col">
                  <span>{item.name}</span>
                  <span className="text-sm font-medium text-gray-400">{item.qty}x @ ₱{item.price.toFixed(2)}</span>
                </div>
                <span>₱{(item.qty * item.price).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="w-full h-[2px] border-b-2 border-dashed border-gray-200 my-2"></div>

          {/* Summary */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center text-gray-500 font-medium">
              <span>Subtotal</span>
              <span>₱{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-gray-500 font-medium">
              <span>Tax (12%)</span>
              <span>₱{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-gray-500 font-medium">
              <span>Payment Method</span>
              <span className="text-black font-semibold capitalize">{orderDetails.paymentMethod}</span>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center bg-gray-50 p-6 rounded-2xl mt-4">
            <span className="text-xl font-bold text-gray-800 border-none m-0">Total Paid</span>
            <span className="text-3xl font-extrabold text-[#bd00ff]">₱{total.toFixed(2)}</span>
          </div>

        </div>

      </div>
    </div>
  );
}
