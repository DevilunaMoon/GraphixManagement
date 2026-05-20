"use client";

import { useRef } from 'react';
import { Check, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CustomerPurchaseConfirmed() {
  const router = useRouter();
  const navigate = router.push;
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    // Basic implementation using browser's print to PDF functionality
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex justify-center items-center p-6 font-['Inter']">
      
      {/* Thermal Receipt Print Styles */}
      <style>{`
        @media print {
          /* Hide all surrounding elements on the page */
          body * {
            visibility: hidden !important;
            background: none !important;
            box-shadow: none !important;
          }
          /* Show ONLY the thermal receipt content */
          #thermal-receipt-container, #thermal-receipt-container * {
            visibility: visible !important;
            display: block !important;
          }
          #thermal-receipt-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 72mm !important;
            margin: 0 !important;
            padding: 2mm !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* On-screen visual Card */}
      <div 
        id="receipt-content"
        ref={receiptRef}
        className="w-full max-w-[530px] bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-gray-100 flex flex-col items-center gap-8 relative overflow-hidden print:hidden"
      >
        
        {/* Top Decorative Arc */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-r from-[#bd00ff] to-[#01f0ff]"></div>

        <div className="w-24 h-24 bg-green-100 rounded-full flex justify-center items-center mt-4">
          <Check size={48} className="text-green-500" strokeWidth={3} />
        </div>

        <div className="text-center flex flex-col gap-2">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#bd00ff] to-[#4B0082] m-0 border-none">Purchase Confirmed</h2>
          <p className="text-gray-500 font-semibold text-lg m-0">Thank you for your purchase!</p>
        </div>

        <div className="w-full flex justify-between items-center py-6 border-b-2 border-dashed border-gray-200 mb-2">
          <span className="font-semibold text-gray-700">Device Name: <span className="text-black font-bold ml-1">Techno Pova Pro 5g</span></span>
          <div className="flex items-center text-[#bd00ff] font-bold text-2xl">
            <span className="text-xl mr-1 tracking-tighter">₱</span>
            <span>10,000.00</span>
          </div>
        </div>

        <div className="w-full flex flex-col py-2 gap-4 mb-2">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-500">Date:</span>
            <span className="font-bold text-gray-800">01:24 PM Jul. 4 2026</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-500">Payment Method:</span>
            <span className="font-bold text-gray-800">Gcash</span>
          </div>
        </div>

        <div className="w-full flex flex-col sm:flex-row gap-4 no-print mt-4">
          <button 
            onClick={handleDownload}
            className="flex-1 flex justify-center items-center gap-2 py-4 border-none bg-[#bd00ff] text-white font-bold text-lg rounded-xl cursor-pointer hover:bg-[#9c00d6] transition-colors"
          >
            <Download size={22} />
            Download Receipt
          </button>
          <button 
            onClick={() => navigate('/customer/dashboard')}
            className="flex-1 flex justify-center items-center py-4 border-2 border-[#bd00ff] bg-white text-[#bd00ff] font-bold text-lg rounded-xl cursor-pointer hover:bg-purple-50 transition-colors"
          >
            Return Home
          </button>
        </div>

      </div>

      {/* Thermal Receipt (Only rendered/visible in print preview/saved PDF) */}
      <div id="thermal-receipt-container" className="hidden print:block" style={{ display: 'none' }}>
        <div style={{
          fontFamily: "'Courier New', Courier, monospace",
          width: "72mm",
          color: "black",
          background: "white",
          fontSize: "12px",
          lineHeight: "1.3",
          padding: "2mm",
          margin: "0 auto"
        }}>
          <div style={{ textAlign: "center", marginBottom: "12px" }}>
            <div style={{ fontWeight: "bold", fontSize: "14px", letterSpacing: "1px" }}>GRAPHIX STORE</div>
            <div style={{ fontSize: "10px", marginTop: "2px" }}>MIN: 22112113365644135</div>
            <div style={{ fontSize: "10px" }}>DATE: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
            <div style={{ borderTop: "1px dashed black", borderBottom: "1px dashed black", padding: "6px 0", margin: "8px 0", fontWeight: "bold" }}>
              SALES INVOICE<br />
              #0000000000205045
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
            <span>TECHNO POVA PRO 5G</span>
            <span>10,000.00 V</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#333", fontSize: "11px", marginBottom: "8px" }}>
            <span>4800194</span>
            <span>1 @ 10,000.00</span>
          </div>

          <div style={{ borderTop: "1px dashed black", margin: "6px 0" }}></div>

          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
            <span>Total</span>
            <span>Php 10,000.00</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Cash</span>
            <span>10,000.00</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Change</span>
            <span>0.00</span>
          </div>

          <div style={{ textAlign: "center", margin: "8px 0", fontWeight: "bold" }}>
            *** 1 ITEM ***
          </div>

          <div style={{ borderTop: "1px dashed black", margin: "6px 0" }}></div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
            <span>VATable Sales</span>
            <span>8,928.57</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
            <span>VAT Amount</span>
            <span>1,071.43</span>
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

          <div style={{ fontSize: "11px", marginTop: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Sold To:</span>
              <span>Walk in Customer</span>
            </div>
            <div>Address: </div>
            <div>TIN: </div>
            <div>Bus Style: </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
              <span>Cashier:</span>
              <span>DEN-DEN</span>
            </div>
            <div>Sales Rep: </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontWeight: "bold" }}>
              <span>Global Trans No.</span>
              <span>235176</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
