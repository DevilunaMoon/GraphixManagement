"use client";

import { useRef, useState, useEffect, Suspense } from 'react';
import { Check, Download } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface PurchaseDetails {
  id: string;
  createdAt: string;
  amount: number;
  quantity: number;
  variations: string | null;
  paymentType: string;
  user: {
    name: string | null;
    email: string;
    phone: string | null;
  };
  device: {
    name: string;
    price: number;
    image: string | null;
  };
}

function CustomerPurchaseConfirmedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const navigate = router.push;
  const receiptRef = useRef<HTMLDivElement>(null);
  
  const method = searchParams.get('method') || 'Cash';
  const purchaseId = searchParams.get('id');

  const [purchase, setPurchase] = useState<PurchaseDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestPurchase = async () => {
      try {
        const url = purchaseId 
          ? `/api/purchases/latest?id=${purchaseId}` 
          : '/api/purchases/latest';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setPurchase(data);
        }
      } catch (error) {
        console.error('Failed to fetch purchase details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestPurchase();
  }, [purchaseId]);

  const handleDownload = async () => {
    const element = document.getElementById('thermal-receipt-container');
    if (!element) return;

    try {
      // Temporarily display off-screen to allow html2canvas to render
      element.style.display = 'block';
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '0';

      const content = element.firstElementChild as HTMLElement;
      const canvas = await html2canvas(content, {
        scale: 3, // High quality scale
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      // Restore styling
      element.style.display = 'none';
      element.style.position = '';
      element.style.left = '';
      element.style.top = '';

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 72; // Standard thermal receipt width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidth, imgHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Graphix_Receipt_${purchase?.id.substring(0, 8) || 'SI'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to standard print dialog
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] flex flex-col justify-center items-center p-6 font-['Inter'] gap-3">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-[#bd00ff] rounded-full animate-spin"></div>
        <p className="text-gray-500 font-semibold">Generating invoice details...</p>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] flex flex-col justify-center items-center p-6 font-['Inter'] gap-4">
        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl text-center max-w-md shadow-sm">
          <h3 className="text-red-700 font-bold text-lg m-0 mb-1">Invoice Generation Failed</h3>
          <p className="text-gray-600 text-sm m-0">No active purchase records could be loaded for this session.</p>
        </div>
        <button 
          onClick={() => navigate('/customer/dashboard')}
          className="px-6 py-3 bg-[#bd00ff] text-white font-bold rounded-xl cursor-pointer hover:bg-[#9c00d6] transition-colors border-none shadow-sm"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Invoice calculations
  const totalAmount = purchase.amount > 0 ? purchase.amount : (purchase.device.price * purchase.quantity);
  const vatRate = 0.12;
  const vatableSales = totalAmount / (1 + vatRate);
  const vatAmount = totalAmount - vatableSales;
  const paymentMethodLabel = method.toLowerCase() === 'gcash' ? 'GCash' : 'Cash';

  const rawCash = (purchase?.user?.phone || '').replace(/[^0-9.]/g, '');
  let parsedCash = parseFloat(rawCash) || 0;

  // If the parsed cash looks like a phone number (too large) or is 0,
  // dynamically calculate a realistic cash tender rounded to the next standard bill denomination.
  if (parsedCash <= 0 || parsedCash > totalAmount * 3) {
    const next500 = Math.ceil(totalAmount / 500) * 500;
    const next1000 = Math.ceil(totalAmount / 1000) * 1000;
    parsedCash = next500 >= totalAmount ? next500 : next1000;
  }

  const changeVal = method.toLowerCase() === 'gcash' ? 0 : (parsedCash >= totalAmount ? parsedCash - totalAmount : 0);
  const cashPaid = method.toLowerCase() === 'gcash' ? totalAmount : parsedCash;

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

  const formattedDate = new Date(purchase.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

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
            left: 50% !important;
            transform: translateX(-50%) !important;
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
          <span className="font-semibold text-gray-700">Device Name: <span className="text-black font-bold ml-1">{purchase.device.name}</span></span>
          <div className="flex items-center text-[#bd00ff] font-bold text-2xl">
            <span className="text-xl mr-1 tracking-tighter">₱</span>
            <span>{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="w-full flex flex-col py-2 gap-4 mb-2 text-left">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-500">Transaction ID:</span>
            <span className="font-bold text-gray-800">#{purchase.id.substring(0, 10).toUpperCase()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-500">Date:</span>
            <span className="font-bold text-gray-800">{formattedDate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-500">Payment Method:</span>
            <span className="font-bold text-gray-800">{paymentMethodLabel}</span>
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
            Return to Dashboard
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
          padding: "4mm",
          margin: "0 auto"
        }}>
          <div style={{ textAlign: "center", marginBottom: "12px" }}>
            <div style={{ fontWeight: "bold", fontSize: "14px", letterSpacing: "1px" }}>GRAPHIX STORE</div>
            <div style={{ fontSize: "10px", marginTop: "2px" }}>MIN: 22112113365644135</div>
            <div style={{ fontSize: "10px" }}>DATE: {new Date(purchase.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            <div style={{ borderTop: "1px dashed black", borderBottom: "1px dashed black", padding: "6px 0", margin: "8px 0", fontWeight: "bold" }}>
              SALES INVOICE<br />
              #{purchase.id.substring(0, 12).toUpperCase()}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
            <span style={{ maxWidth: "70%", display: "inline-block", lineHeight: "1.4" }}>{purchase.device.name.toUpperCase()}</span>
            <span>{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} V</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#333", fontSize: "11px", marginBottom: "8px" }}>
            <span>Item: {purchase.quantity}x {purchase.variations ? `(${formatVariations(purchase.variations)})` : ''}</span>
            <span>{purchase.quantity} @ {(totalAmount / purchase.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div style={{ borderTop: "1px dashed black", margin: "6px 0" }}></div>

          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
            <span>Total</span>
            <span>Php {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{paymentMethodLabel}</span>
            <span>{cashPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Change</span>
            <span>{changeVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div style={{ textAlign: "center", margin: "8px 0", fontWeight: "bold" }}>
            *** {purchase.quantity} ITEM(S) ***
          </div>

          <div style={{ borderTop: "1px dashed black", margin: "6px 0" }}></div>

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

          <div style={{ fontSize: "11px", marginTop: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Sold To:</span>
              <span>{purchase.user.name || 'Anonymous Customer'}</span>
            </div>
            <div>Email: {purchase.user.email}</div>
            <div>Phone: {purchase.user.phone || 'N/A'}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
              <span>Store Agent:</span>
              <span>ONLINE CHECKOUT</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontWeight: "bold" }}>
              <span>Global Trans No.</span>
              <span>#{purchase.id.substring(0, 8).toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default function CustomerPurchaseConfirmed() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f4f5f7] flex justify-center items-center p-6 font-['Inter']">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-[#bd00ff] rounded-full animate-spin"></div>
      </div>
    }>
      <CustomerPurchaseConfirmedContent />
    </Suspense>
  );
}
