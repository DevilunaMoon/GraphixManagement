"use client";

import React, { useRef, useState } from 'react';
import { ChevronLeft, Printer, Download, Check, Copy } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface RepairItemPart {
  qty: number;
  description: string;
  unitPrice: number;
  total: number;
}

export interface RepairServiceReceiptData {
  id?: string;
  trackingNumber?: string;
  deviceName?: string;
  cause?: string;
  technician?: string;
  status?: string;
  repairCost?: string | number;
  downpayment?: string | number;
  materials?: string; // JSON string or text breakdown
  branch?: string;
  createdAt?: string | Date;
  ownerName?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  user?: {
    name?: string;
    email?: string;
    phone?: string;
    branch?: string;
  } | null;
}

interface RepairServiceReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: RepairServiceReceiptData | null;
  userProfile?: {
    name?: string;
    email?: string;
    phone?: string;
    branch?: string;
  } | null;
}

export default function RepairServiceReceiptModal({
  isOpen,
  onClose,
  device,
  userProfile
}: RepairServiceReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !device) return null;

  // 1. Dynamic Branch Location
  let branchName = device.branch || userProfile?.branch || 'Tagoloan Branch';
  if (!branchName.toLowerCase().includes('branch')) {
    branchName = `${branchName} Branch`;
  }

  // 2. Machine ID & Metadata
  const machineId = "MIN: 22112113365644135";
  
  const rawDate = device.createdAt ? new Date(device.createdAt) : new Date();
  const formattedDate = rawDate.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // 3. Tracking / Job Order / Receipt No.
  const rawId = device.id || 'N275YAG';
  const receiptNo = device.trackingNumber || `RCPT-${rawId.slice(-7).toUpperCase()}`;
  const formattedReceiptNo = receiptNo.startsWith('#') ? receiptNo : `#${receiptNo}`;

  // 4. Device Details
  const deviceModel = (device.deviceName || 'Redmi 10C').toUpperCase();
  const issueDescription = device.cause || 'Broken LCD';
  const status = device.status || 'Active';
  const technician = device.technician || 'James';

  // 5. Itemized Materials & Services Parsing
  let parsedItems: RepairItemPart[] = [];
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
      // Fallback: If materials was stored as raw markdown text (e.g. | 1 | LCD | P 100.00 | P 100.00 |)
      const lines = String(device.materials).split('\n');
      for (const line of lines) {
        if (
          line.includes('|') &&
          !line.includes('---') &&
          !line.toLowerCase().includes('unit price') &&
          !line.toLowerCase().includes('subtotal')
        ) {
          const cells = line.split('|').map(c => c.trim()).filter(Boolean);
          if (cells.length >= 4) {
            const qty = parseInt(cells[0] || '1') || 1;
            const desc = cells[1] || 'Part';
            const unitPrice = parseFloat((cells[2] || '0').replace(/[^0-9.]/g, '')) || 0;
            const total = parseFloat((cells[3] || '0').replace(/[^0-9.]/g, '')) || qty * unitPrice;
            parsedItems.push({ qty, description: desc, unitPrice, total });
          } else if (cells.length >= 3) {
            const qty = parseInt(cells[0] || '1') || 1;
            const desc = cells[1] || 'Part';
            const total = parseFloat((cells[2] || '0').replace(/[^0-9.]/g, '')) || 0;
            parsedItems.push({ qty, description: desc, unitPrice: total / qty, total });
          }
        }
      }
    }
  }

  const rawCost = parseFloat(String(device.repairCost || '0').replace(/[^0-9.]/g, '')) || 0;
  const rawDownpayment = parseFloat(String(device.downpayment || '0').replace(/[^0-9.]/g, '')) || 0;

  // Fallback itemization if none recorded yet
  if (parsedItems.length === 0) {
    if (rawCost > 0) {
      const partsCost = Math.round(rawCost / 2);
      const laborCost = rawCost - partsCost;
      parsedItems = [
        {
          qty: 1,
          description: `${device.deviceName || 'Device'} Replacement Parts`,
          unitPrice: partsCost,
          total: partsCost
        }
      ];
      parsedLabor = laborCost;
    } else {
      parsedItems = [];
      parsedLabor = 0;
    }
  }

  // Financial Totals
  const totalMaterials = parsedItems.reduce(
    (sum, item) => sum + (item.total || item.qty * item.unitPrice),
    0
  );
  const totalRepairCost = rawCost > 0 ? rawCost : totalMaterials + parsedLabor;
  const downpayment = rawDownpayment;
  const balanceDue = Math.max(0, totalRepairCost - downpayment);

  // Total Item Count: sum of parts quantities, or 1 if empty
  const totalItemCount = parsedItems.reduce((acc, i) => acc + (i.qty || 1), 0) || 1;

  // Customer & Audit Information
  const customerName =
    device.ownerName ||
    device.customerName ||
    device.user?.name ||
    userProfile?.name ||
    'Customer';

  const customerEmail =
    device.customerEmail ||
    device.user?.email ||
    userProfile?.email ||
    'customer@graphix.com';

  // Strictly sanitize mobile phone against currency/price strings
  let rawPhone =
    device.customerPhone ||
    device.user?.phone ||
    userProfile?.phone ||
    '0917 123 4567';

  if (rawPhone.includes('₱') || rawPhone.toLowerCase().includes('cash') || rawPhone.toLowerCase().includes('php')) {
    rawPhone = userProfile?.phone || '0917 123 4567';
  }
  if (rawPhone.includes('₱') || rawPhone.toLowerCase().includes('cash')) {
    rawPhone = '0917 123 4567';
  }
  const cleanPhone = rawPhone;

  // Exact 40-character single-dashed divider
  const dashedDivider = "----------------------------------------";

  const formatMoney = (val: number) =>
    val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Handlers
  const handlePrint = () => {
    window.print();
  };

  const handleSavePDF = async () => {
    if (!receiptRef.current) return;
    setIsExporting(true);
    try {
      const element = receiptRef.current;
      const canvas = await html2canvas(element, {
        scale: 3, // High-res 300 DPI equivalent for crisp monospace rendering
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const slip = clonedDoc.getElementById('repair-pos-thermal-slip');
          if (slip) {
            slip.style.overflow = 'visible';
            slip.style.lineHeight = '1.5';
            slip.querySelectorAll('*').forEach((el: any) => {
              if (el.style) {
                el.style.overflow = 'visible';
              }
            });
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 80; // Standard 80mm thermal receipt
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidth, imgHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      const safeFilename = `GraphiX_Repair_Receipt_${receiptNo.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`;
      pdf.save(safeFilename);
    } catch (err) {
      console.error('PDF export failed:', err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
    try {
      const padRow = (left: string, right: string, width = 40) => {
        const space = Math.max(1, width - left.length - right.length);
        return `${left}${' '.repeat(space)}${right}`;
      };

      const centerText = (text: string, width = 40) => {
        const pad = Math.max(0, Math.floor((width - text.length) / 2));
        return `${' '.repeat(pad)}${text}`;
      };

      const lines: string[] = [
        centerText("GRAPHIX STORE"),
        centerText(`BRANCH: ${branchName}`),
        centerText(machineId),
        centerText(`DATE: ${formattedDate}`),
        dashedDivider,
        centerText("REPAIR SERVICE RECEIPT"),
        centerText(formattedReceiptNo),
        dashedDivider,
        padRow(deviceModel, `${formatMoney(totalRepairCost)} V`),
        padRow(`Item: 1x (Issue: ${issueDescription})`, `Status: ${status}`),
        dashedDivider,
      ];

      // Itemized materials
      parsedItems.forEach(item => {
        lines.push(padRow(item.description, formatMoney(item.total)));
        lines.push(`Item: ${item.qty}x @ ${formatMoney(item.unitPrice)}`);
        lines.push("");
      });

      lines.push(dashedDivider);
      lines.push(padRow("Total Materials", `Php ${formatMoney(totalMaterials)}`));
      lines.push(padRow("Labor / Service Fee", formatMoney(parsedLabor)));
      lines.push(padRow("TOTAL REPAIR COST", `Php ${formatMoney(totalRepairCost)}`));
      lines.push(padRow("Downpayment Paid", formatMoney(downpayment)));
      lines.push(padRow("BALANCE DUE", `Php ${formatMoney(balanceDue)}`));
      lines.push("");
      lines.push(centerText(`*** ${totalItemCount} ITEM(S) ***`));
      lines.push("");
      lines.push(dashedDivider);
      lines.push(padRow("Customer:", customerName));
      lines.push(padRow("Email:", customerEmail));
      lines.push(padRow("Phone:", cleanPhone));
      lines.push(padRow("Technician:", technician));
      lines.push(padRow("Job Order No.", formattedReceiptNo));
      lines.push(dashedDivider);
      lines.push(centerText("Thank you for your business!"));

      const textToCopy = lines.join('\n');
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  return (
    <>
      {/* Print-specific style isolation */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #repair-pos-thermal-slip,
          #repair-pos-thermal-slip * {
            visibility: visible !important;
          }
          #repair-pos-thermal-slip {
            position: absolute !important;
            left: 0 !important;
            right: 0 !important;
            top: 0 !important;
            margin: 0 auto !important;
            width: 80mm !important;
            max-width: 80mm !important;
            padding: 4mm !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            line-height: 1.5 !important;
          }
          .no-print,
          .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>

      {/* Modal Overlay */}
      <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
        <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-[420px] w-full flex flex-col gap-4 shadow-2xl animate-in zoom-in-95 max-h-[96vh] overflow-y-auto border border-gray-200">
          
          {/* Navigation & Actions Bar */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100 no-print">
            {/* < Back Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-700 hover:text-black bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>

            {/* Action Buttons: Print (Purple outlined), Save PDF (Solid dark/black), Copy */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                title="Copy Receipt Text"
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-purple-700 bg-white hover:bg-purple-50 rounded-xl border border-gray-200 transition-colors cursor-pointer"
              >
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border-2 border-[#bd00ff] text-[#bd00ff] hover:bg-purple-50 bg-white rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                <Printer size={14} />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={handleSavePDF}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-black hover:bg-gray-800 text-white rounded-xl transition-colors cursor-pointer border-none shadow-xs disabled:opacity-50"
              >
                <Download size={14} />
                <span>{isExporting ? 'Saving...' : 'Save PDF'}</span>
              </button>
            </div>
          </div>

          {/* 80mm POS Thermal Receipt Slip Container */}
          <div className="flex justify-center w-full py-1">
            <div
              id="repair-pos-thermal-slip"
              ref={receiptRef}
              style={{
                fontFamily: "'Courier New', Courier, monospace",
                lineHeight: "1.5",
                color: "#000000",
                backgroundColor: "#ffffff",
                letterSpacing: "0.01em"
              }}
              className="w-[320px] max-w-[320px] bg-white text-black p-5 sm:p-6 shadow-md border border-gray-300 rounded-sm font-mono text-[11px] select-text"
            >

              {/* [HEADER] (Centered) */}
              <div className="text-center font-mono">
                <div className="font-bold text-[13px] tracking-wider uppercase leading-normal">GRAPHIX STORE</div>
                <div className="text-[11px] uppercase leading-normal">BRANCH: {branchName}</div>
                <div className="text-[10px] leading-normal">{machineId}</div>
                <div className="text-[10px] leading-normal">DATE: {formattedDate}</div>
              </div>

              {/* Divider */}
              <div className="text-center select-none my-1.5 text-[11px] leading-normal text-black tracking-tight font-mono">
                {dashedDivider}
              </div>

              {/* [DOCUMENT TITLE] (Centered) */}
              <div className="text-center font-mono py-0.5">
                <div className="font-bold text-xs uppercase tracking-wide leading-normal">REPAIR SERVICE RECEIPT</div>
                <div className="font-bold text-xs leading-normal">{formattedReceiptNo}</div>
              </div>

              {/* Divider */}
              <div className="text-center select-none my-1.5 text-[11px] leading-normal text-black tracking-tight font-mono">
                {dashedDivider}
              </div>

              {/* [DEVICE DETAILS] (Two-Column Justified) */}
              <div className="flex flex-col gap-1 font-mono">
                <div className="flex justify-between items-baseline gap-2 font-bold leading-normal">
                  <span className="uppercase break-words">{deviceModel}</span>
                  <span className="shrink-0 text-right whitespace-nowrap">
                    {formatMoney(totalRepairCost)} V
                  </span>
                </div>
                <div className="flex justify-between items-baseline gap-2 text-[10px] text-gray-800 leading-normal">
                  <span className="break-words">Item: 1x (Issue: {issueDescription})</span>
                  <span className="shrink-0 text-right whitespace-nowrap">
                    Status: {status}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="text-center select-none my-1.5 text-[11px] leading-normal text-black tracking-tight font-mono">
                {dashedDivider}
              </div>

              {/* [ITEMIZED MATERIALS & SERVICES] (Thermal List Format) */}
              <div className="flex flex-col gap-2 font-mono">
                {parsedItems.map((item, idx) => (
                  <div key={idx} className="flex flex-col leading-normal">
                    <div className="flex justify-between items-baseline gap-2 font-medium">
                      <span className="break-words">{item.description}</span>
                      <span className="shrink-0 text-right whitespace-nowrap font-mono">
                        {formatMoney(item.total)}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-800 leading-normal">
                      Item: {item.qty}x @ {formatMoney(item.unitPrice)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="text-center select-none my-1.5 text-[11px] leading-normal text-black tracking-tight font-mono">
                {dashedDivider}
              </div>

              {/* [FINANCIAL BREAKDOWN & BALANCE DUE] (Two-Column Justified) */}
              <div className="flex flex-col gap-0.5 font-mono leading-normal">
                <div className="flex justify-between items-baseline gap-2">
                  <span>Total Materials</span>
                  <span className="shrink-0 text-right font-mono">Php {formatMoney(totalMaterials)}</span>
                </div>
                <div className="flex justify-between items-baseline gap-2">
                  <span>Labor / Service Fee</span>
                  <span className="shrink-0 text-right font-mono">{formatMoney(parsedLabor)}</span>
                </div>
                <div className="flex justify-between items-baseline gap-2 font-bold text-xs pt-1">
                  <span>TOTAL REPAIR COST</span>
                  <span className="shrink-0 text-right font-mono">Php {formatMoney(totalRepairCost)}</span>
                </div>
                <div className="flex justify-between items-baseline gap-2">
                  <span>Downpayment Paid</span>
                  <span className="shrink-0 text-right font-mono">{formatMoney(downpayment)}</span>
                </div>
                <div className="flex justify-between items-baseline gap-2 font-bold text-xs pt-1">
                  <span>BALANCE DUE</span>
                  <span className="shrink-0 text-right font-mono">Php {formatMoney(balanceDue)}</span>
                </div>

                <div className="text-center font-bold text-[10px] py-2 tracking-wider uppercase leading-normal">
                  *** {totalItemCount} ITEM(S) ***
                </div>
              </div>

              {/* Divider */}
              <div className="text-center select-none my-1.5 text-[11px] leading-normal text-black tracking-tight font-mono">
                {dashedDivider}
              </div>

              {/* [CUSTOMER & AUDIT FOOTER] (Two-Column Justified) */}
              <div className="flex flex-col gap-1 font-mono text-[10px] leading-normal">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="shrink-0 font-medium">Customer:</span>
                  <span className="font-bold text-right break-words">{customerName}</span>
                </div>
                <div className="flex justify-between items-baseline gap-2">
                  <span className="shrink-0 font-medium">Email:</span>
                  <span className="text-right break-all">{customerEmail}</span>
                </div>
                <div className="flex justify-between items-baseline gap-2">
                  <span className="shrink-0 font-medium">Phone:</span>
                  <span className="font-bold text-right whitespace-nowrap">{cleanPhone}</span>
                </div>
                <div className="flex justify-between items-baseline gap-2">
                  <span className="shrink-0 font-medium">Technician:</span>
                  <span className="text-right break-words">{technician}</span>
                </div>
                <div className="flex justify-between items-baseline gap-2">
                  <span className="shrink-0 font-medium">Job Order No.</span>
                  <span className="font-bold text-right whitespace-nowrap">{formattedReceiptNo}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="text-center select-none my-1.5 text-[11px] leading-normal text-black tracking-tight font-mono">
                {dashedDivider}
              </div>

              {/* [FOOTER NOTE] (Centered) */}
              <div className="text-center font-mono py-1.5">
                <p className="m-0 text-[10px] font-bold leading-normal">Thank you for your business!</p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </>
  );
}
