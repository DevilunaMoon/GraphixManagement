"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Calculator, Wrench, CheckCircle2, DollarSign, CreditCard, 
  Layers, Banknote, QrCode, Copy, Check, X, Smartphone, ExternalLink, AlertCircle
} from 'lucide-react';

export interface MaterialItem {
  id: string;
  qty: number;
  description: string;
  unitPrice: number;
  total: number;
}

export interface PaymentDetails {
  paymentMethod: 'Cash' | 'GCash' | 'Split';
  cashAmount: number;
  gcashAmount: number;
  totalPaid: number;
  change: number;
  balanceDue: number;
  isFullyPaid: boolean;
}

export interface BranchGcashInfo {
  name: string;
  gcashName: string;
  gcashNumber: string;
  gcashQrCode?: string | null;
}

export interface MaterialBreakdownProps {
  materials?: MaterialItem[];
  items?: MaterialItem[];
  onChange?: (materials: MaterialItem[]) => void;
  onItemsChange?: (materials: MaterialItem[]) => void;
  // Legacy prop compatibility
  laborCost?: string | number;
  onChangeLaborCost?: (cost: string) => void;
  onLaborCostChange?: (cost: string) => void;
  downpayment?: string | number;
  onChangeDownpayment?: (downpayment: string) => void;
  onDownpaymentChange?: (downpayment: string) => void;
  // Payment methods
  paymentMethod?: 'Cash' | 'GCash' | 'Split' | string;
  onPaymentMethodChange?: (method: 'Cash' | 'GCash' | 'Split') => void;
  cashAmount?: string | number;
  onCashAmountChange?: (cash: string) => void;
  gcashAmount?: string | number;
  onGcashAmountChange?: (gcash: string) => void;
  onPaymentDetailsChange?: (details: PaymentDetails) => void;
  readOnly?: boolean;
  onTotalChange?: (totalRepairCost: number, balanceDue: number) => void;
  onTotalCostCalculated?: (totalRepairCost: number, balanceDue: number, details?: PaymentDetails) => void;
  deviceName?: string;
  customerName?: string;
  branch?: string;
}

// Built-in default branch GCash accounts
const DEFAULT_BRANCH_GCASH: Record<string, BranchGcashInfo> = {
  tagoloan: {
    name: 'Tagoloan Branch',
    gcashName: 'GRAPHIX MANAGEMENT - TAGOLOAN',
    gcashNumber: '0967 123 4567',
    gcashQrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=09671234567%20GRAPHIX%20TAGOLOAN'
  },
  villanueva: {
    name: 'Villanueva Branch',
    gcashName: 'GRAPHIX MANAGEMENT - VILLANUEVA',
    gcashNumber: '0967 234 5678',
    gcashQrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=09672345678%20GRAPHIX%20VILLANUEVA'
  },
  jasaan: {
    name: 'Jasaan Branch',
    gcashName: 'GRAPHIX MANAGEMENT - JASAAN',
    gcashNumber: '0967 345 6789',
    gcashQrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=09673456789%20GRAPHIX%20JASAAN'
  }
};

export default function MaterialBreakdownEditor({
  materials,
  items,
  onChange,
  onItemsChange,
  downpayment,
  onChangeDownpayment,
  onDownpaymentChange,
  paymentMethod: initialPaymentMethod,
  onPaymentMethodChange,
  cashAmount: initialCashAmount,
  onCashAmountChange,
  gcashAmount: initialGcashAmount,
  onGcashAmountChange,
  onPaymentDetailsChange,
  readOnly = false,
  onTotalChange,
  onTotalCostCalculated,
  deviceName = 'Device',
  customerName = 'Customer',
  branch = 'Tagoloan'
}: MaterialBreakdownProps) {
  const activeMaterials = items || materials || [];
  const handleMaterialsChange = onItemsChange || onChange;
  const handleDownpaymentChange = onDownpaymentChange || onChangeDownpayment;
  const handleTotalChange = onTotalCostCalculated || onTotalChange;

  // Branch GCash details state
  const [branchGcash, setBranchGcash] = useState<BranchGcashInfo>(() => {
    const key = (branch || 'Tagoloan').toLowerCase();
    if (key.includes('vil')) return DEFAULT_BRANCH_GCASH.villanueva;
    if (key.includes('jas')) return DEFAULT_BRANCH_GCASH.jasaan;
    return DEFAULT_BRANCH_GCASH.tagoloan;
  });

  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedGcash, setCopiedGcash] = useState(false);

  // Fetch updated branch GCash data from backend if available
  useEffect(() => {
    const normalizedBranch = (branch || 'Tagoloan').toLowerCase();
    let defaultInfo = DEFAULT_BRANCH_GCASH.tagoloan;
    if (normalizedBranch.includes('vil')) defaultInfo = DEFAULT_BRANCH_GCASH.villanueva;
    else if (normalizedBranch.includes('jas')) defaultInfo = DEFAULT_BRANCH_GCASH.jasaan;

    fetch('/api/branches')
      .then(res => res.json())
      .then(data => {
        const branchList = Array.isArray(data) ? data : (Array.isArray(data?.branches) ? data.branches : []);
        if (branchList.length > 0) {
          const match = branchList.find((b: any) => {
            const bName = (b.name || '').toLowerCase();
            return bName.includes(normalizedBranch) || normalizedBranch.includes(bName.replace('branch', '').trim());
          });
          if (match) {
            setBranchGcash({
              name: match.name || defaultInfo.name,
              gcashName: match.gcashName || defaultInfo.gcashName,
              gcashNumber: match.gcashNumber || defaultInfo.gcashNumber,
              gcashQrCode: match.gcashQrCode || defaultInfo.gcashQrCode
            });
            return;
          }
        }
        setBranchGcash(defaultInfo);
      })
      .catch(() => {
        setBranchGcash(defaultInfo);
      });
  }, [branch]);

  // 1. Calculate Total Repair Cost strictly from Parts / Materials (Parts Subtotal = Total Repair Cost)
  const totalRepairCost = activeMaterials.reduce((sum, item) => sum + (item.total || item.qty * item.unitPrice || 0), 0);

  // 2. Payment Method state (Cash, GCash, Split)
  const [internalMethod, setInternalMethod] = useState<'Cash' | 'GCash' | 'Split'>(() => {
    if (initialPaymentMethod === 'GCash' || initialPaymentMethod === 'Split') return initialPaymentMethod;
    return 'Cash';
  });
  const currentMethod = (initialPaymentMethod as 'Cash' | 'GCash' | 'Split') || internalMethod;

  // 3. Cash and GCash amount states
  const [internalCash, setInternalCash] = useState<string>(() => {
    if (initialCashAmount !== undefined && initialCashAmount !== null) return String(initialCashAmount);
    if (downpayment !== undefined && downpayment !== null && currentMethod === 'Cash') return String(downpayment);
    return '';
  });

  const [internalGcash, setInternalGcash] = useState<string>(() => {
    if (initialGcashAmount !== undefined && initialGcashAmount !== null) return String(initialGcashAmount);
    if (downpayment !== undefined && downpayment !== null && currentMethod === 'GCash') return String(downpayment);
    return '';
  });

  const activeCashStr = initialCashAmount !== undefined ? String(initialCashAmount) : internalCash;
  const activeGcashStr = initialGcashAmount !== undefined ? String(initialGcashAmount) : internalGcash;

  const parsedCash = parseFloat(activeCashStr) || 0;
  const parsedGcash = parseFloat(activeGcashStr) || 0;

  // 4. Financial Calculations based on selected method
  let totalAmountPaid = 0;
  let change = 0;
  let balanceDue = totalRepairCost;

  if (currentMethod === 'Cash') {
    change = Math.max(0, parsedCash - totalRepairCost);
    balanceDue = Math.max(0, totalRepairCost - parsedCash);
    totalAmountPaid = Math.min(parsedCash, totalRepairCost);
  } else if (currentMethod === 'GCash') {
    change = 0;
    balanceDue = Math.max(0, totalRepairCost - parsedGcash);
    totalAmountPaid = Math.min(parsedGcash, totalRepairCost);
  } else if (currentMethod === 'Split') {
    change = Math.max(0, (parsedCash + parsedGcash) - totalRepairCost);
    totalAmountPaid = parsedCash + parsedGcash;
    balanceDue = Math.max(0, totalRepairCost - totalAmountPaid);
  }

  const isFullyPaid = balanceDue === 0 && totalRepairCost > 0;
  const isDownpayment = totalAmountPaid > 0 && balanceDue > 0;

  // 5. Propagate changes upstream
  useEffect(() => {
    const details: PaymentDetails = {
      paymentMethod: currentMethod,
      cashAmount: parsedCash,
      gcashAmount: parsedGcash,
      totalPaid: currentMethod === 'Cash' ? parsedCash : (currentMethod === 'GCash' ? parsedGcash : totalAmountPaid),
      change,
      balanceDue,
      isFullyPaid
    };

    if (handleTotalChange) {
      handleTotalChange(totalRepairCost, balanceDue, details);
    }
    if (handleDownpaymentChange) {
      handleDownpaymentChange(String(details.totalPaid));
    }
    if (onPaymentDetailsChange) {
      onPaymentDetailsChange(details);
    }
  }, [totalRepairCost, currentMethod, parsedCash, parsedGcash, change, balanceDue, totalAmountPaid, isFullyPaid]);

  const handleSelectMethod = (method: 'Cash' | 'GCash' | 'Split') => {
    setInternalMethod(method);
    if (onPaymentMethodChange) onPaymentMethodChange(method);
  };

  const handleCashChange = (val: string) => {
    setInternalCash(val);
    if (onCashAmountChange) onCashAmountChange(val);
  };

  const handleGcashChange = (val: string) => {
    setInternalGcash(val);
    if (onGcashAmountChange) onGcashAmountChange(val);
  };

  const handleCopyGcash = () => {
    if (branchGcash?.gcashNumber) {
      navigator.clipboard.writeText(branchGcash.gcashNumber.replace(/\s+/g, ''));
      setCopiedGcash(true);
      setTimeout(() => setCopiedGcash(false), 2000);
    }
  };

  const handleAddRow = () => {
    if (readOnly || !handleMaterialsChange) return;
    const newItem: MaterialItem = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now() + Math.random()),
      qty: 1,
      description: '',
      unitPrice: 0,
      total: 0
    };
    handleMaterialsChange([...activeMaterials, newItem]);
  };

  const handleUpdateRow = (id: string, field: 'qty' | 'description' | 'unitPrice', val: any) => {
    if (readOnly || !handleMaterialsChange) return;
    const updated = activeMaterials.map(item => {
      if (item.id === id) {
        let newQty = item.qty;
        let newDesc = item.description;
        let newPrice = item.unitPrice;

        if (field === 'qty') {
          newQty = Math.max(1, parseInt(val, 10) || 1);
        } else if (field === 'description') {
          newDesc = val;
        } else if (field === 'unitPrice') {
          newPrice = Math.max(0, parseFloat(val) || 0);
        }

        return {
          ...item,
          qty: newQty,
          description: newDesc,
          unitPrice: newPrice,
          total: newQty * newPrice
        };
      }
      return item;
    });
    handleMaterialsChange(updated);
  };

  const handleRemoveRow = (id: string) => {
    if (readOnly || !handleMaterialsChange) return;
    handleMaterialsChange(activeMaterials.filter(item => item.id !== id));
  };

  // Helper for quick downpayment buttons
  const halfCost = Math.round((totalRepairCost / 2) * 100) / 100;

  // READ-ONLY Summary View
  if (readOnly) {
    return (
      <div className="flex flex-col gap-3 font-['Inter'] w-full">
        <div className="flex items-center justify-between pb-1 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Wrench size={16} className="text-[#bd00ff]" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700 m-0">Itemized Replacement Parts & Materials</h4>
          </div>
          <span className="text-[11px] font-semibold text-gray-500">
            {activeMaterials.length} item(s)
          </span>
        </div>

        {activeMaterials.length > 0 ? (
          <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[10px]">
                  <th className="py-2 px-3 text-center w-12">Qty</th>
                  <th className="py-2 px-3">Part / Material</th>
                  <th className="py-2 px-3 text-right w-24">Unit Price</th>
                  <th className="py-2 px-3 text-right w-24">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeMaterials.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-purple-50/20">
                    <td className="py-2 px-3 text-center font-bold text-gray-700">{item.qty}x</td>
                    <td className="py-2 px-3 font-medium text-gray-900">{item.description}</td>
                    <td className="py-2 px-3 text-right font-mono text-gray-600">
                      ₱{(item.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                      ₱{(item.total || (item.qty * item.unitPrice) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-3 bg-gray-50 rounded-xl text-center text-xs text-gray-400">
            No itemized replacement parts recorded.
          </div>
        )}

        {/* Read-Only Cost & Payment Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gradient-to-r from-purple-50/60 to-gray-50 p-3 rounded-xl border border-purple-100/80">
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-semibold block">Total Repair Cost</span>
            <span className="font-black text-base text-[#bd00ff] font-mono">₱{totalRepairCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-semibold block">Payment Method</span>
            <span className="font-bold text-gray-900 text-xs">
              {currentMethod === 'Split' ? 'Split (Cash + GCash)' : `${currentMethod} Payment`}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-semibold block">Amount / Downpayment</span>
            <span className="font-bold text-gray-900 font-mono text-xs">
              ₱{totalAmountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-semibold block">Balance Due</span>
            <span className={`font-black text-base font-mono ${balanceDue > 0 ? 'text-amber-700' : 'text-green-600'}`}>
              ₱{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Editable view
  return (
    <div className="flex flex-col gap-4 font-['Inter'] w-full">
      
      {/* Title & Action */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Wrench size={16} className="text-[#bd00ff]" />
          <label className="font-bold text-sm text-black">Itemized Replacement Parts / Materials</label>
        </div>
        <button
          type="button"
          onClick={handleAddRow}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-[#bd00ff] hover:bg-[#bd00ff] hover:text-white border border-[#bd00ff]/40 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
        >
          <Plus size={14} />
          Add Part / Material
        </button>
      </div>

      {/* Materials Table */}
      <div className="overflow-x-auto border-2 border-gray-200 rounded-2xl bg-white shadow-xs">
        <table className="w-full text-left text-xs border-collapse min-w-[500px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
              <th className="py-2.5 px-3 text-center w-16">Qty</th>
              <th className="py-2.5 px-3">Material / Part Description</th>
              <th className="py-2.5 px-3 w-32">Unit Price (₱)</th>
              <th className="py-2.5 px-3 w-32 text-right">Total (₱)</th>
              <th className="py-2.5 px-2 text-center w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activeMaterials.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-5 text-center text-gray-400 font-medium">
                  No parts added yet. Click <span className="text-[#bd00ff] font-bold">&quot;+ Add Part / Material&quot;</span> to itemize replacement parts (e.g. LCD, Battery, Flex cable).
                </td>
              </tr>
            ) : (
              activeMaterials.map((item) => (
                <tr key={item.id} className="hover:bg-purple-50/30 transition-colors">
                  {/* Qty */}
                  <td className="py-2 px-2 text-center">
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => handleUpdateRow(item.id, 'qty', e.target.value)}
                      className="w-12 text-center py-1.5 bg-gray-50 border border-gray-200 rounded-lg outline-none text-xs font-bold text-gray-800 focus:border-[#bd00ff] focus:bg-white"
                    />
                  </td>

                  {/* Description */}
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      placeholder="e.g. LCD Screen / Battery Replacement"
                      value={item.description}
                      onChange={(e) => handleUpdateRow(item.id, 'description', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg outline-none text-xs font-medium text-gray-800 focus:border-[#bd00ff] focus:bg-white"
                    />
                  </td>

                  {/* Unit Price */}
                  <td className="py-2 px-2">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[11px]">₱</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        value={item.unitPrice || ''}
                        onChange={(e) => handleUpdateRow(item.id, 'unitPrice', e.target.value)}
                        className="w-full pl-6 pr-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg outline-none text-xs font-mono font-bold text-gray-900 focus:border-[#bd00ff] focus:bg-white"
                      />
                    </div>
                  </td>

                  {/* Total */}
                  <td className="py-2 px-3 text-right font-mono font-black text-gray-900">
                    ₱{item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Delete Row */}
                  <td className="py-2 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(item.id)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded-md transition-colors cursor-pointer border-none bg-transparent"
                      title="Remove part"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payment & Cost Calculation Section */}
      <div className="bg-gradient-to-br from-purple-50/50 to-gray-50 p-4 sm:p-5 rounded-2xl border-2 border-purple-100 flex flex-col gap-4">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-purple-100/80">
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-[#bd00ff]" />
            <span className="text-xs font-black text-gray-800 uppercase tracking-wider">
              Repair Cost & Payment Method
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-xl border border-purple-100 shadow-2xs">
            <span className="text-[11px] font-bold text-gray-500">Total Cost:</span>
            <span className="text-sm font-black text-[#bd00ff] font-mono">
              ₱{totalRepairCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* 1. Payment Method Tabs */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700">Select Payment Method</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleSelectMethod('Cash')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer border-2 ${
                currentMethod === 'Cash'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
              }`}
            >
              <Banknote size={15} />
              <span>Cash Payment</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectMethod('GCash')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer border-2 ${
                currentMethod === 'GCash'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
              }`}
            >
              <CreditCard size={15} />
              <span>GCash Payment</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectMethod('Split')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer border-2 ${
                currentMethod === 'Split'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white border-transparent shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
              }`}
            >
              <Layers size={15} />
              <span>Split (Cash + GCash)</span>
            </button>
          </div>
        </div>

        {/* 2. Branch-Specific GCash Card (Displayed when GCash or Split is active) */}
        {(currentMethod === 'GCash' || currentMethod === 'Split') && (
          <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200 rounded-2xl flex flex-col gap-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#005ce6] uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone size={15} />
                {branchGcash.name} GCash Account
              </span>
              <span className="text-[10px] font-extrabold bg-blue-100 text-[#005ce6] px-2.5 py-0.5 rounded-full">
                Verified Branch Terminal
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 bg-white border border-blue-100 rounded-xl gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                {/* QR Thumbnail */}
                {branchGcash.gcashQrCode && (
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="w-14 h-14 rounded-xl border-2 border-blue-200 bg-white flex items-center justify-center p-1 shrink-0 hover:scale-105 transition-transform cursor-pointer overflow-hidden shadow-2xs group relative"
                    title="Click to view full QR code"
                  >
                    <img src={branchGcash.gcashQrCode} alt="GCash QR" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-blue-600/10 group-hover:bg-blue-600/20 flex items-center justify-center">
                      <QrCode size={14} className="text-blue-600 opacity-80" />
                    </div>
                  </button>
                )}

                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Account Name</span>
                  <span className="text-xs font-extrabold text-gray-900 truncate">
                    {branchGcash.gcashName}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-mono font-bold text-[#005ce6]">
                      {branchGcash.gcashNumber}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={handleCopyGcash}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#005ce6] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors border border-blue-200 shadow-2xs"
                  title="Copy GCash Number"
                >
                  {copiedGcash ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedGcash ? 'Copied' : 'Copy Number'}</span>
                </button>

                {branchGcash.gcashQrCode && (
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="px-3 py-1.5 bg-[#005ce6] hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors border-none shadow-xs"
                    title="Enlarge QR Code"
                  >
                    <QrCode size={14} />
                    <span>View QR Code</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. Cash Payment Inputs */}
        {currentMethod === 'Cash' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-gray-200">
            {/* Downpayment / Cash Received */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-xs text-gray-700">
                Downpayment / Cash Received (₱)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-xs">₱</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={activeCashStr}
                  onChange={(e) => handleCashChange(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-gray-50 focus:bg-white border border-gray-200 rounded-xl outline-none font-mono font-bold text-gray-900 focus:border-[#bd00ff] text-sm transition-all"
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => handleCashChange(String(totalRepairCost))}
                  className="text-[10px] font-bold text-[#bd00ff] bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded cursor-pointer border border-purple-100 transition-colors"
                >
                  Full (₱{totalRepairCost.toLocaleString()})
                </button>
                {totalRepairCost > 0 && (
                  <button
                    type="button"
                    onClick={() => handleCashChange(String(halfCost))}
                    className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded cursor-pointer border border-amber-100 transition-colors"
                  >
                    50% (₱{halfCost.toLocaleString()})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleCashChange('0')}
                  className="text-[10px] font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded cursor-pointer border border-gray-200 transition-colors"
                >
                  ₱0
                </button>
              </div>
            </div>

            {/* Change */}
            <div className="flex flex-col justify-center p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Change (₱)</span>
              <span className="text-base font-black font-mono text-gray-900 mt-0.5">
                ₱{change.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Balance Due */}
            <div className={`flex flex-col justify-center p-3 rounded-xl border ${
              balanceDue > 0 ? (isDownpayment ? 'bg-purple-50 border-purple-200' : 'bg-amber-50 border-amber-200') : 'bg-emerald-50 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700">Balance Due (₱)</span>
                {isFullyPaid ? (
                  <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <CheckCircle2 size={10} /> Fully Paid
                  </span>
                ) : isDownpayment ? (
                  <span className="text-[9px] font-black text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    Downpayment Paid
                  </span>
                ) : null}
              </div>
              <span className={`text-base font-black font-mono mt-0.5 ${balanceDue > 0 ? (isDownpayment ? 'text-purple-900' : 'text-amber-800') : 'text-emerald-700'}`}>
                ₱{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* 4. GCash Payment Inputs */}
        {currentMethod === 'GCash' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-gray-200">
            {/* GCash Amount / Downpayment Paid */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-xs text-gray-700">
                Downpayment / GCash Amount Paid (₱)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-blue-500 text-xs">₱</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={activeGcashStr}
                  onChange={(e) => handleGcashChange(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-gray-50 focus:bg-white border border-gray-200 rounded-xl outline-none font-mono font-bold text-gray-900 focus:border-blue-500 text-sm transition-all"
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => handleGcashChange(String(totalRepairCost))}
                  className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded cursor-pointer border border-blue-100 transition-colors"
                >
                  Full (₱{totalRepairCost.toLocaleString()})
                </button>
                {totalRepairCost > 0 && (
                  <button
                    type="button"
                    onClick={() => handleGcashChange(String(halfCost))}
                    className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded cursor-pointer border border-amber-100 transition-colors"
                  >
                    50% (₱{halfCost.toLocaleString()})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleGcashChange('0')}
                  className="text-[10px] font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded cursor-pointer border border-gray-200 transition-colors"
                >
                  ₱0
                </button>
              </div>
            </div>

            {/* Balance Due */}
            <div className={`flex flex-col justify-center p-3 rounded-xl border ${
              balanceDue > 0 ? (isDownpayment ? 'bg-purple-50 border-purple-200' : 'bg-amber-50 border-amber-200') : 'bg-emerald-50 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700">Balance Due (₱)</span>
                {isFullyPaid ? (
                  <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <CheckCircle2 size={10} /> Fully Paid
                  </span>
                ) : isDownpayment ? (
                  <span className="text-[9px] font-black text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    Downpayment Paid
                  </span>
                ) : null}
              </div>
              <span className={`text-base font-black font-mono mt-0.5 ${balanceDue > 0 ? (isDownpayment ? 'text-purple-900' : 'text-amber-800') : 'text-emerald-700'}`}>
                ₱{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* 5. Split Payment Inputs */}
        {currentMethod === 'Split' && (
          <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Cash Component */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-xs text-gray-700">
                  Cash Downpayment / Payment (₱)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-purple-500 text-xs">₱</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={activeCashStr}
                    onChange={(e) => handleCashChange(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-gray-50 focus:bg-white border border-gray-200 rounded-xl outline-none font-mono font-bold text-gray-900 focus:border-[#bd00ff] text-sm transition-all"
                  />
                </div>
                <div className="flex gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() => handleCashChange(String(halfCost))}
                    className="text-[10px] font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded cursor-pointer border border-purple-100"
                  >
                    50% (₱{halfCost.toLocaleString()})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCashChange('0')}
                    className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded cursor-pointer border border-gray-200"
                  >
                    ₱0
                  </button>
                </div>
              </div>

              {/* GCash Component */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-xs text-gray-700">
                  GCash Downpayment / Payment (₱)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-blue-500 text-xs">₱</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={activeGcashStr}
                    onChange={(e) => handleGcashChange(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-gray-50 focus:bg-white border border-gray-200 rounded-xl outline-none font-mono font-bold text-gray-900 focus:border-blue-500 text-sm transition-all"
                  />
                </div>
                <div className="flex gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() => handleGcashChange(String(halfCost))}
                    className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded cursor-pointer border border-blue-100"
                  >
                    50% (₱{halfCost.toLocaleString()})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGcashChange('0')}
                    className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded cursor-pointer border border-gray-200"
                  >
                    ₱0
                  </button>
                </div>
              </div>
            </div>

            {/* Split Totals Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
              <div className="flex flex-col justify-center p-2.5 bg-purple-50/60 rounded-xl border border-purple-100">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Amount Paid (₱)</span>
                <span className="text-base font-black font-mono text-[#bd00ff] mt-0.5">
                  ₱{totalAmountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className={`flex flex-col justify-center p-2.5 rounded-xl border ${
                balanceDue > 0 ? (isDownpayment ? 'bg-purple-50 border-purple-200' : 'bg-amber-50 border-amber-200') : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700">Balance Due (₱)</span>
                  {isFullyPaid ? (
                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <CheckCircle2 size={10} /> Fully Paid
                    </span>
                  ) : isDownpayment ? (
                    <span className="text-[9px] font-black text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      Downpayment Paid
                    </span>
                  ) : null}
                </div>
                <span className={`text-base font-black font-mono mt-0.5 ${balanceDue > 0 ? (isDownpayment ? 'text-purple-900' : 'text-amber-800') : 'text-emerald-700'}`}>
                  ₱{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Enlarged QR Code Modal for Customer / Cashier Scanning */}
      {showQrModal && branchGcash?.gcashQrCode && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowQrModal(false)}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-sm w-full flex flex-col items-center text-center gap-4 shadow-2xl border border-blue-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#005ce6] text-white flex items-center justify-center font-black text-sm">
                  G
                </div>
                <span className="font-extrabold text-xs uppercase tracking-wider text-gray-900">
                  {branchGcash.name} GCash QR
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 border-none cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="w-64 h-64 bg-white border-2 border-dashed border-blue-300 rounded-2xl p-2 flex items-center justify-center overflow-hidden shadow-inner">
              <img src={branchGcash.gcashQrCode} alt="Branch GCash QR" className="w-full h-full object-contain" />
            </div>

            <div className="flex flex-col items-center gap-1 w-full bg-blue-50/70 p-3 rounded-2xl border border-blue-100">
              <span className="font-extrabold text-gray-900 text-xs truncate max-w-full">{branchGcash.gcashName}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[#005ce6] text-sm">{branchGcash.gcashNumber}</span>
                <button
                  type="button"
                  onClick={handleCopyGcash}
                  className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                  title="Copy Number"
                >
                  {copiedGcash ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
              <span className="text-[10px] text-gray-500 mt-1">Scan using customer GCash App to transfer payment</span>
            </div>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer border-none"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
