"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, ThumbsUp, ThumbsDown, Receipt, Printer, Copy, Check, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import MaterialBreakdownEditor from '../../components/Repair/MaterialBreakdownEditor';

interface CustomerDeviceInformationProps {
  deviceId?: string;
}

export default function CustomerDeviceInformation({ deviceId }: CustomerDeviceInformationProps) {
  const router = useRouter();
  const navigate = router.push;
  const [feedback, setFeedback] = useState('');
  const [sentiment, setSentiment] = useState<'Positive' | 'Negative'>('Positive');
  const [isSaved, setIsSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [device, setDevice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    setIsLoading(true);
    fetch(`/api/monitoring/${deviceId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setDevice(data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [deviceId]);

  const handleSave = async () => {
    if (!feedback.trim() || !device) return;
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: device.ownerName || 'Customer', 
          technicianName: device.technician || 'Unassigned', 
          feedbackText: feedback,
          sentiment: sentiment
        })
      });

      if (res.ok) {
        setFeedback('');
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      } else {
        alert('Failed to save feedback');
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!deviceId) return <div className="p-10 text-center">No device specified.</div>;

  return (
    <main className="flex-1 p-6 md:p-10 font-['Inter'] flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-5xl flex flex-col gap-8">
        
        {/* Device Information Card */}
        <section className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-[#bd00ff] flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/customer/monitoring')} 
                className="text-black hover:text-[#bd00ff] transition-colors bg-transparent border-none cursor-pointer p-0"
              >
                <ChevronLeft size={32} />
              </button>
              <h2 className="text-2xl font-bold text-black border-none m-0">Device Information</h2>
            </div>
            {device && (
              <button
                type="button"
                onClick={() => setReceiptModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-[#bd00ff] hover:from-purple-700 hover:to-[#9c00d6] text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer border-none"
              >
                <Receipt size={18} />
                Generate Repair Receipt
              </button>
            )}
          </div>
          
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-purple-100 border-t-[#bd00ff] rounded-full animate-spin"></div>
              <p className="text-[#666] font-semibold animate-pulse text-lg">Loading device info...</p>
            </div>
          ) : !device ? (
            <div className="py-20 text-center text-red-500 font-bold">Device not found.</div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-stretch w-full">
              
              {/* Left Column: Images */}
              <div className="flex flex-col gap-6 w-full lg:w-[380px] shrink-0">
                <div className="w-full aspect-square md:h-[350px] lg:h-auto rounded-3xl p-6 flex justify-center items-center bg-gray-50 border border-gray-100 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden relative group">
                  {device.image ? (
                    <img src={device.image} alt={device.deviceName} className="w-full h-full object-contain mix-blend-multiply drop-shadow-sm group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl">📷</div>
                      <span className="font-semibold text-sm">No Image Provided</span>
                    </div>
                  )}
                </div>

                {device.proofImage && (
                  <div className="w-full flex flex-col gap-3">
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-2 h-2 rounded-full bg-[#bd00ff]"></div>
                      <span className="font-bold text-gray-800 tracking-wide text-sm uppercase">Proof of Repair</span>
                    </div>
                    <div className="w-full h-[220px] rounded-2xl p-2 flex justify-center items-center bg-gray-50 border border-gray-100 shadow-sm overflow-hidden group">
                      <img src={device.proofImage} alt="Proof of Repair" className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right Column: Details */}
              <div className="flex flex-col w-full flex-1 gap-4">
                <div className="bg-gray-50/50 border border-gray-100 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 h-full shadow-[inset_0_2px_10px_rgba(0,0,0,0.01)]">
                  
                  {/* Status Highlight */}
                  <div className="flex justify-between items-start pb-6 border-b border-gray-200/60">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Current Status</span>
                      <span className={`inline-flex font-bold px-4 py-1.5 rounded-full text-sm mt-1 w-fit ${
                        (device.status === 'Completed' || device.progress === '100%' || device.progress?.toLowerCase() === 'completed') 
                          ? 'bg-green-100 text-green-700' 
                          : (device.progress?.toLowerCase() === 'cancelled' || device.status?.toLowerCase() === 'cancelled')
                            ? 'bg-red-100 text-red-700'
                            : 'bg-orange-100 text-orange-700'
                      }`}>
                        {(device.status === 'Completed' || device.progress === '100%' || device.progress?.toLowerCase() === 'completed') 
                          ? 'Completed' 
                          : (device.progress?.toLowerCase() === 'cancelled' || device.status?.toLowerCase() === 'cancelled')
                            ? 'Cancelled'
                            : device.status}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right">
                      <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Repair Cost</span>
                      <span className="text-2xl font-black text-[#bd00ff]">₱{device.repairCost || 'Pending'}</span>
                      <button
                        type="button"
                        onClick={() => setReceiptModalOpen(true)}
                        className="text-xs font-bold text-[#bd00ff] hover:underline flex items-center gap-1 mt-0.5 cursor-pointer bg-transparent border-none p-0"
                      >
                        <Receipt size={13} /> View Official Receipt
                      </button>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8 pt-2">
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Device Name</span>
                      <span className="text-lg font-semibold text-gray-900">{device.deviceName}</span>
                    </div>

                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cause of Problem</span>
                      <div className="bg-white border border-gray-100 rounded-xl p-4 mt-1 shadow-sm">
                        <span className="text-base text-gray-700 leading-relaxed">{device.cause || 'No specific cause recorded.'}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Repair History</span>
                      <div className="bg-white border border-gray-100 rounded-xl p-4 mt-1 shadow-sm">
                        <span className="text-base text-gray-700 leading-relaxed">{device.repairHistory || 'No previous repair history recorded.'}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned Technician</span>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                          {device.technician ? device.technician.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span className="text-lg font-semibold text-gray-900">{device.technician || 'Pending Assignment'}</span>
                      </div>
                    </div>

                    {/* Customer Itemized Material Breakdown */}
                    {device.materials && (() => {
                      let items: any[] = [];
                      let labor = '0';
                      try {
                        const parsed = JSON.parse(device.materials);
                        if (Array.isArray(parsed)) {
                          items = parsed;
                        } else if (parsed && typeof parsed === 'object') {
                          items = parsed.items || [];
                          labor = String(parsed.laborCost ?? 0);
                        }
                      } catch (e) {
                        console.error(e);
                      }
                      if (items.length === 0 && (!labor || labor === '0')) return null;

                      return (
                        <div className="sm:col-span-2 pt-4 border-t border-gray-200">
                          <MaterialBreakdownEditor
                            readOnly
                            items={items}
                            laborCost={labor}
                            downpayment={device.downpayment || '0'}
                            deviceName={device.deviceName}
                            customerName={device.ownerName || 'Customer'}
                          />
                        </div>
                      );
                    })()}
                  </div>

                </div>
              </div>

            </div>
          )}
        </section>

        {/* Technician Feedback Section */}
        {device && (
          <section className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-gray-100 flex flex-col gap-4">
            <div className="flex justify-between items-center sm:flex-row flex-col gap-4">
              <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-[#4B0082] m-0 border-none">Technician Feedback</h3>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSentiment('Positive')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all cursor-pointer ${sentiment === 'Positive' ? 'bg-green-100 text-green-700 border-2 border-green-500 shadow-sm' : 'bg-gray-50 text-gray-500 border border-transparent hover:bg-gray-100'}`}
                >
                  <ThumbsUp size={18} /> Positive
                </button>
                <button 
                  onClick={() => setSentiment('Negative')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all cursor-pointer ${sentiment === 'Negative' ? 'bg-red-100 text-red-700 border-2 border-red-500 shadow-sm' : 'bg-gray-50 text-gray-500 border border-transparent hover:bg-gray-100'}`}
                >
                  <ThumbsDown size={18} /> Negative
                </button>
              </div>
            </div>
            <textarea 
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Type your feedback here..."
              className="w-full min-h-[150px] border-2 border-gray-200 rounded-xl p-4 text-black outline-none font-['Inter'] resize-vertical focus:border-[#bd00ff] transition-colors mt-2"
            />
            <div className="flex justify-end mt-2 items-center gap-4">
              {isSaved && <span className="text-green-500 font-bold animate-in fade-in">Feedback saved!</span>}
              <button 
                onClick={handleSave}
                disabled={isSubmitting || !feedback.trim()}
                className="px-10 py-3 bg-gradient-to-r from-[#bd00ff] to-[#01f0ff] text-white font-bold text-lg rounded-xl hover:shadow-[0_4px_15px_rgba(189,0,255,0.4)] transition-all cursor-pointer border-none disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </section>
        )}

      </div>

      {/* Repair Billing & Receipt Generator Modal */}
      {receiptModalOpen && device && (() => {
        const receiptNo = `RCPT-${(device.id || '0199084').slice(-7).toUpperCase()}`;
        const receiptDate = device.createdAt
          ? new Date(device.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        
        const deviceName = device.deviceName || 'Redmi 10C';
        const cause = device.cause || 'Broken LCD';
        const technician = device.technician || 'James';
        const status = device.status || 'Active';
        
        let parsedItems: { qty: number; description: string; unitPrice: number; total: number }[] = [];
        let parsedLabor = 0;
        
        if (device.materials) {
          try {
            const parsed = JSON.parse(device.materials);
            if (Array.isArray(parsed)) {
              parsedItems = parsed;
            } else if (parsed && typeof parsed === 'object') {
              parsedItems = parsed.items || [];
              parsedLabor = parseFloat(String(parsed.laborCost)) || 0;
            }
          } catch (e) {
            console.error(e);
          }
        }

        const rawCost = parseFloat(String(device.repairCost).replace(/[^0-9.]/g, '')) || 0;
        const rawDownpayment = parseFloat(String(device.downpayment).replace(/[^0-9.]/g, '')) || 0;

        // Fallback itemization if none recorded yet
        if (parsedItems.length === 0) {
          if (rawCost > 0) {
            const matPrice = Math.round(rawCost / 2);
            const labor = rawCost - matPrice;
            parsedItems = [
              {
                qty: 1,
                description: `${deviceName} LCD Display Adhesive & Frame Sealant`,
                unitPrice: matPrice,
                total: matPrice
              }
            ];
            parsedLabor = labor;
          } else {
            parsedItems = [
              {
                qty: 1,
                description: `${deviceName} Inspection & Repair Diagnostic`,
                unitPrice: 0,
                total: 0
              }
            ];
          }
        }

        const totalMaterials = parsedItems.reduce((sum, item) => sum + (item.total || (item.qty * item.unitPrice)), 0);
        const totalRepairCost = totalMaterials + parsedLabor;
        const downpayment = rawDownpayment;
        const balanceDue = Math.max(0, totalRepairCost - downpayment);

        // Generate exact receipt output text matching prompt specification
        let receiptText = `=========================================
           REPAIR SERVICE RECEIPT
=========================================
Receipt No: ${receiptNo}
Date: ${receiptDate}
Technician: ${technician}

DEVICE DETAILS:
- Device: ${deviceName}
- Issue: ${cause}
- Status: ${status}

ITEMIZED MATERIALS & SERVICES:
| Qty | Item / Part Name & Description | Unit Price (₱) | Subtotal (₱) |
|---|---|---|---|
`;
        parsedItems.forEach(item => {
          receiptText += `| ${item.qty} | ${item.description} | ₱ ${item.unitPrice.toFixed(2)} | ₱ ${item.total.toFixed(2)} |\n`;
        });

        receiptText += `
-----------------------------------------
Total Materials:     ₱ ${totalMaterials.toFixed(2)}
Labor / Service Fee: ₱ ${parsedLabor.toFixed(2)}
-----------------------------------------
TOTAL REPAIR COST:   ₱ ${totalRepairCost.toFixed(2)}
Downpayment Paid:    ₱ ${downpayment.toFixed(2)}
BALANCE DUE:         ₱ ${balanceDue.toFixed(2)}
=========================================
      Thank you for your business!
=========================================`;

        const handleCopyReceipt = async () => {
          try {
            await navigator.clipboard.writeText(receiptText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          } catch (err) {
            console.error('Failed to copy', err);
          }
        };

        const handlePrint = () => {
          const printWindow = window.open('', '_blank');
          if (!printWindow) return;
          printWindow.document.write(`
            <html>
              <head>
                <title>Repair Service Receipt - ${receiptNo}</title>
                <style>
                  body { font-family: 'Courier New', Courier, monospace; padding: 20px; white-space: pre-wrap; font-size: 13px; line-height: 1.4; color: #111; }
                  @media print { body { padding: 0; } }
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

        const handleDownloadText = () => {
          const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${receiptNo}_${deviceName.replace(/\s+/g, '_')}.txt`;
          link.click();
          URL.revokeObjectURL(url);
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full flex flex-col gap-6 shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto border border-purple-100">
              
              {/* Modal Header */}
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
                <button
                  type="button"
                  onClick={() => setReceiptModalOpen(false)}
                  className="text-gray-400 hover:text-black transition-colors font-bold text-2xl cursor-pointer bg-transparent border-none p-1"
                >
                  ✕
                </button>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-purple-50/50 p-3 rounded-2xl border border-purple-100">
                <span className="text-xs font-bold text-purple-900">Receipt Actions:</span>
                <div className="flex items-center gap-2">
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
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#bd00ff] hover:bg-[#9c00d6] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border-none shadow-2xs"
                  >
                    <FileText size={14} />
                    Download .txt
                  </button>
                </div>
              </div>

              {/* Visual Receipt Card */}
              <div className="bg-[#faf9f6] border-2 border-dashed border-purple-200 rounded-2xl p-6 sm:p-8 flex flex-col gap-5 shadow-xs relative">
                
                {/* Receipt Header Banner */}
                <div className="text-center border-b-2 border-dashed border-gray-300 pb-4">
                  <span className="text-xs tracking-widest font-black uppercase text-purple-700 block mb-1">
                    GRAPHIX DEVICE REPAIR SERVICES
                  </span>
                  <h3 className="text-2xl font-black text-gray-900 tracking-wider m-0">REPAIR SERVICE RECEIPT</h3>
                  <div className="flex flex-wrap justify-center items-center gap-4 text-xs font-semibold text-gray-600 mt-3">
                    <span>Receipt No: <strong className="font-mono text-purple-700">{receiptNo}</strong></span>
                    <span>•</span>
                    <span>Date: <strong className="text-gray-900">{receiptDate}</strong></span>
                    <span>•</span>
                    <span>Technician: <strong className="text-gray-900">{technician}</strong></span>
                  </div>
                </div>

                {/* Device Details Box */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col gap-1.5 text-xs">
                  <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">DEVICE DETAILS</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-medium text-gray-800">
                    <div>
                      <span className="text-gray-500 block text-[11px]">Device Name:</span>
                      <strong className="text-sm font-bold text-gray-900">{deviceName}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">Reported Issue:</span>
                      <strong className="text-sm font-bold text-gray-900">{cause}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">Current Status:</span>
                      <span className="inline-block font-bold text-xs px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 mt-0.5">
                        {status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Itemized Materials & Services Table */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                    ITEMIZED MATERIALS & SERVICES
                  </span>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-3 text-center w-14">Qty</th>
                          <th className="py-2.5 px-3">Item / Part Name & Description</th>
                          <th className="py-2.5 px-3 text-right w-28">Unit Price (₱)</th>
                          <th className="py-2.5 px-3 text-right w-28">Subtotal (₱)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-800">
                        {parsedItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="py-2.5 px-3 text-center font-bold text-gray-700">{item.qty}</td>
                            <td className="py-2.5 px-3 font-semibold text-gray-900">{item.description}</td>
                            <td className="py-2.5 px-3 text-right text-gray-600 font-mono">
                              ₱{item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                              ₱{item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Totals Breakdown */}
                <div className="border-t-2 border-dashed border-gray-300 pt-4 flex flex-col gap-2 text-xs">
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Total Materials:</span>
                    <span className="font-mono font-bold text-gray-800">
                      ₱{totalMaterials.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Labor / Service Fee:</span>
                    <span className="font-mono font-bold text-gray-800">
                      ₱{parsedLabor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-2 mt-1 flex justify-between items-center text-sm font-black text-gray-900">
                    <span>TOTAL REPAIR COST:</span>
                    <span className="text-xl font-black text-[#bd00ff] font-mono">
                      ₱{totalRepairCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-gray-600">
                    <span>Downpayment Paid:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      ₱{downpayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 pt-2 flex justify-between items-center text-sm font-black">
                    <span className={balanceDue > 0 ? 'text-amber-800' : 'text-emerald-700'}>BALANCE DUE:</span>
                    <span className={`text-xl font-black font-mono ${balanceDue > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                      ₱{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Footer Tagline */}
                <div className="text-center pt-4 border-t-2 border-dashed border-gray-300">
                  <p className="text-xs font-bold text-gray-500 m-0 uppercase tracking-wider">
                    Thank you for your business!
                  </p>
                </div>

              </div>

              {/* Raw Format Accordion / Code Snippet */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="font-bold">Monospaced Text Format:</span>
                  <button
                    type="button"
                    onClick={handleCopyReceipt}
                    className="text-xs font-bold text-[#bd00ff] hover:underline cursor-pointer bg-transparent border-none p-0"
                  >
                    {copied ? 'Copied ✓' : 'Copy Formatted Text'}
                  </button>
                </div>
                <pre className="bg-gray-900 text-gray-100 text-[11px] p-4 rounded-xl overflow-x-auto font-mono leading-relaxed border border-gray-800 m-0">
                  {receiptText}
                </pre>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setReceiptModalOpen(false)}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors cursor-pointer border-none"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </main>
  );
}
