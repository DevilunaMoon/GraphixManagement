"use client";

import React, { useEffect } from 'react';
import { Plus, Trash2, Calculator, Wrench, Receipt, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface MaterialItem {
  id: string;
  qty: number;
  description: string;
  unitPrice: number;
  total: number;
}

export interface MaterialBreakdownProps {
  materials?: MaterialItem[];
  items?: MaterialItem[];
  onChange?: (materials: MaterialItem[]) => void;
  onItemsChange?: (materials: MaterialItem[]) => void;
  laborCost?: string | number;
  onChangeLaborCost?: (cost: string) => void;
  onLaborCostChange?: (cost: string) => void;
  downpayment?: string | number;
  onChangeDownpayment?: (downpayment: string) => void;
  onDownpaymentChange?: (downpayment: string) => void;
  readOnly?: boolean;
  onTotalChange?: (totalRepairCost: number, balanceDue: number) => void;
  onTotalCostCalculated?: (totalRepairCost: number, balanceDue: number) => void;
  deviceName?: string;
  customerName?: string;
}

export default function MaterialBreakdownEditor({
  materials,
  items,
  onChange,
  onItemsChange,
  laborCost = '0',
  onChangeLaborCost,
  onLaborCostChange,
  downpayment = '0',
  onChangeDownpayment,
  onDownpaymentChange,
  readOnly = false,
  onTotalChange,
  onTotalCostCalculated,
  deviceName = 'Device',
  customerName = 'Customer'
}: MaterialBreakdownProps) {
  const activeMaterials = items || materials || [];
  const handleMaterialsChange = onItemsChange || onChange;
  const handleLaborCostChange = onLaborCostChange || onChangeLaborCost;
  const handleDownpaymentChange = onDownpaymentChange || onChangeDownpayment;
  const handleTotalChange = onTotalCostCalculated || onTotalChange;

  const parsedLabor = parseFloat(String(laborCost)) || 0;
  const parsedDownpayment = parseFloat(String(downpayment)) || 0;

  const partsSubtotal = activeMaterials.reduce((sum, item) => sum + (item.total || 0), 0);
  const totalRepairCost = partsSubtotal + parsedLabor;
  const balanceDue = Math.max(0, totalRepairCost - parsedDownpayment);

  useEffect(() => {
    if (handleTotalChange) {
      handleTotalChange(totalRepairCost, balanceDue);
    }
  }, [totalRepairCost, balanceDue, handleTotalChange]);

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

  // Read-only view
  if (readOnly) {
    return (
      <div className="flex flex-col gap-4 font-['Inter'] w-full">
        <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-purple-50/80 border-b border-purple-100 text-purple-950 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3 text-center w-14">Qty</th>
                <th className="py-2.5 px-3">Material / Part Description</th>
                <th className="py-2.5 px-3 text-right w-28">Unit Price (₱)</th>
                <th className="py-2.5 px-3 text-right w-28">Total (₱)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {activeMaterials.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-400 font-medium italic">
                    No itemized materials recorded (Standard repair service)
                  </td>
                </tr>
              ) : (
                activeMaterials.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="py-2 px-3 text-center font-bold text-gray-700">{item.qty}</td>
                    <td className="py-2 px-3 font-semibold text-gray-900">{item.description || 'Part item'}</td>
                    <td className="py-2 px-3 text-right text-gray-600 font-mono">₱{item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">₱{item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Read-Only Cost Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs">
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-semibold block">Parts Subtotal</span>
            <span className="font-bold text-gray-800 font-mono">₱{partsSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-semibold block">Labor / Service Fee</span>
            <span className="font-bold text-gray-800 font-mono">₱{parsedLabor.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-semibold block">Total Repair Cost</span>
            <span className="font-black text-[#bd00ff] font-mono">₱{totalRepairCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-semibold block">Balance Due</span>
            <span className={`font-black font-mono ${balanceDue > 0 ? 'text-amber-700' : 'text-green-600'}`}>
              ₱{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Editable view
  return (
    <div className="flex flex-col gap-3 font-['Inter'] w-full">
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
                  No parts added yet. Click <span className="text-[#bd00ff] font-bold">"+ Add Part / Material"</span> to itemize replacement parts (e.g. Motherboard, Flex cable, Adhesive).
                </td>
              </tr>
            ) : (
              activeMaterials.map((item, index) => (
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
                      placeholder="e.g. iPhone 11 Motherboard / Adhesive"
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

      {/* Financial Calculations Card */}
      <div className="bg-gradient-to-br from-purple-50/50 to-gray-50 p-4 sm:p-5 rounded-2xl border-2 border-purple-100 flex flex-col gap-3">
        <div className="flex items-center gap-2 pb-2 border-b border-purple-100/80">
          <Calculator size={16} className="text-[#bd00ff]" />
          <span className="text-xs font-black text-gray-800 uppercase tracking-wider">
            Repair Cost & Balance Calculation
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Labor Fee Input */}
          <div className="flex flex-col gap-1">
            <label className="font-bold text-gray-700">Labor / Service Fee (₱)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-xs">₱</span>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 500"
                value={laborCost}
                onChange={(e) => handleLaborCostChange && handleLaborCostChange(e.target.value)}
                className="w-full pl-7 pr-3 py-2 bg-white border border-gray-200 rounded-xl outline-none font-mono font-bold text-gray-900 focus:border-[#bd00ff]"
              />
            </div>
            <span className="text-[10px] text-gray-400">Parts Subtotal: ₱{partsSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          {/* Downpayment Received Input */}
          <div className="flex flex-col gap-1">
            <label className="font-bold text-gray-700">Downpayment Received (₱)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-xs">₱</span>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 500"
                value={downpayment}
                onChange={(e) => handleDownpaymentChange && handleDownpaymentChange(e.target.value)}
                className="w-full pl-7 pr-3 py-2 bg-white border border-gray-200 rounded-xl outline-none font-mono font-bold text-gray-900 focus:border-[#bd00ff]"
              />
            </div>
            <div className="flex gap-1 mt-0.5">
              <button
                type="button"
                onClick={() => handleDownpaymentChange && handleDownpaymentChange(String(totalRepairCost))}
                className="text-[9px] font-bold text-[#bd00ff] bg-purple-50 hover:bg-purple-100 px-1.5 py-0.5 rounded cursor-pointer border border-purple-100"
              >
                Full (₱{totalRepairCost.toLocaleString()})
              </button>
              <button
                type="button"
                onClick={() => handleDownpaymentChange && handleDownpaymentChange('0')}
                className="text-[9px] font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded cursor-pointer border border-gray-200"
              >
                ₱0
              </button>
            </div>
          </div>
        </div>

        {/* Calculated Totals Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-purple-100">
          <div className="bg-white p-3 rounded-xl border border-gray-200 flex flex-col">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Repair Cost (Parts + Labor)</span>
            <span className="text-xl font-black text-[#bd00ff] font-mono mt-0.5">
              ₱{totalRepairCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className={`p-3 rounded-xl border flex flex-col ${
            balanceDue > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-emerald-50/70 border-emerald-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700">
                Balance Due (Remaining)
              </span>
              {balanceDue === 0 && (
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <CheckCircle2 size={10} /> Fully Paid
                </span>
              )}
            </div>
            <span className={`text-xl font-black font-mono mt-0.5 ${
              balanceDue > 0 ? 'text-amber-800' : 'text-emerald-700'
            }`}>
              ₱{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
