"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Calculator, Wrench, CheckCircle2, DollarSign, CreditCard, 
  Layers, Banknote, QrCode, Copy, Check, X, Smartphone, ExternalLink, AlertCircle,
  Package, Search, ChevronDown, Sparkles, Box
} from 'lucide-react';

export interface MaterialItem {
  id: string;
  qty: number;
  description: string;
  unitPrice: number;
  total: number;
  sparePartId?: string;
}

export interface SparePartItem {
  id: string;
  name: string;
  compatibleDevice?: string;
  category?: string;
  branch: string;
  stock: number;
  cost?: number;
  price: number;
  sku?: string;
  status: string;
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
const DEFAULT_BRANCH_GCASH: Record<'tagoloan' | 'villanueva' | 'jasaan', BranchGcashInfo> = {
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
  laborCost,
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

  // Spare Parts Inventory State & Autocomplete
  const [spareParts, setSpareParts] = useState<SparePartItem[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState<boolean>(false);
  const [showInventoryPicker, setShowInventoryPicker] = useState<boolean>(false);
  const [inventorySearch, setInventorySearch] = useState<string>('');
  const [inventoryCategory, setInventoryCategory] = useState<string>('All');
  const [activeDropdownRowId, setActiveDropdownRowId] = useState<string | null>(null);

  // Fetch spare parts for the active branch
  useEffect(() => {
    let isMounted = true;
    setIsLoadingParts(true);
    const targetBranch = branch || 'Tagoloan';
    fetch(`/api/technician/spare-parts?branch=${encodeURIComponent(targetBranch)}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          if (Array.isArray(data)) {
            setSpareParts(data);
          } else {
            setSpareParts([]);
          }
        }
      })
      .catch(err => {
        console.warn('Could not load branch spare parts:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingParts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [branch]);

  // Click outside to close row autocomplete dropdown
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.parts-autocomplete-anchor')) {
        setActiveDropdownRowId(null);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  // 1. Payment Method state (Cash, GCash, Split)
  const [internalMethod, setInternalMethod] = useState<'Cash' | 'GCash' | 'Split'>(() => {
    if (initialPaymentMethod === 'GCash' || initialPaymentMethod === 'Split') return initialPaymentMethod;
    return 'Cash';
  });
  const currentMethod = (initialPaymentMethod as 'Cash' | 'GCash' | 'Split') || internalMethod;

  // 2. Cash and GCash amount states
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

  // 3. Calculate Total Repair Cost safely from Parts / Materials + Labor/Service fee
  const materialsSubtotal = activeMaterials.reduce((sum, item) => {
    const qty = Math.max(1, parseInt(String(item.qty || 1), 10) || 1);
    const price = Math.max(0, parseFloat(String(item.unitPrice ?? (item as any).price ?? (item as any).cost ?? 0)) || 0);
    const lineTotal = parseFloat(String(item.total).replace(/[^0-9.]/g, ''));
    const resolvedTotal = !isNaN(lineTotal) && lineTotal > 0 ? lineTotal : (qty * price);
    return sum + (isNaN(resolvedTotal) ? 0 : resolvedTotal);
  }, 0);

  const rawLabor = parseFloat(String(laborCost || 0).replace(/[^0-9.]/g, '')) || 0;
  const baseCost = rawLabor > 0 ? rawLabor : (materialsSubtotal === 0 && (parsedCash > 0 || parsedGcash > 0) ? Math.max(parsedCash, parsedGcash) : 0);
  const totalRepairCost = materialsSubtotal > 0 ? materialsSubtotal + rawLabor : baseCost;

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

  // Dedicated Settlement / Pay in Full state and handlers
  const [settlementCash, setSettlementCash] = useState<string>('');
  const [settlementFeedback, setSettlementFeedback] = useState<{ type: 'success' | 'warning' | 'error'; message: string; change?: number } | null>(null);

  const handlePayFullRemaining = () => {
    if (totalRepairCost <= 0) {
      setSettlementFeedback({ type: 'warning', message: 'No repair cost calculated yet. Please add parts or labor first.' });
      return;
    }
    if (currentMethod === 'GCash') {
      handleGcashChange(String(totalRepairCost));
    } else {
      handleCashChange(String(totalRepairCost));
    }
    setSettlementCash('');
    setSettlementFeedback({ type: 'success', message: 'Balance settled in full! Device is now marked Paid in Full.' });
  };

  const handleSettlementInputChange = (val: string) => {
    setSettlementCash(val);
    setSettlementFeedback(null);

    const clean = val.replace(/[^0-9.]/g, '');
    if (clean === '') {
      return;
    }

    const additionalNum = parseFloat(clean);
    if (isNaN(additionalNum) || additionalNum < 0) {
      setSettlementFeedback({ type: 'error', message: 'Please enter a valid positive cash amount.' });
      return;
    }

    if (totalRepairCost <= 0) {
      setSettlementFeedback({ type: 'warning', message: 'Total repair cost is ₱0.00. Add materials or labor first.' });
      return;
    }

    const currentPaid = currentMethod === 'GCash' ? parsedGcash : parsedCash;
    const currentRemaining = Math.max(0, totalRepairCost - currentPaid);

    if (additionalNum >= currentRemaining) {
      const calculatedChange = additionalNum - currentRemaining;
      const targetTotal = totalRepairCost;
      if (currentMethod === 'GCash') {
        handleGcashChange(String(targetTotal));
      } else {
        handleCashChange(String(targetTotal));
      }
      setSettlementFeedback({
        type: 'success',
        message: 'Full payment received! Device marked Paid in Full.',
        change: calculatedChange
      });
    } else {
      const newTotal = currentPaid + additionalNum;
      const newRemaining = Math.max(0, totalRepairCost - newTotal);
      if (currentMethod === 'GCash') {
        handleGcashChange(String(newTotal));
      } else {
        handleCashChange(String(newTotal));
      }
      setSettlementFeedback({
        type: 'warning',
        message: `Partial payment applied. Remaining balance: ₱${newRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      });
    }
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

  const handleSelectSparePart = (rowId: string, part: SparePartItem) => {
    if (readOnly || !handleMaterialsChange) return;
    const unitPrice = Math.max(0, parseFloat(String(part.price)) || 0);
    const updated = activeMaterials.map(item => {
      if (item.id === rowId) {
        return {
          ...item,
          description: part.name,
          unitPrice,
          total: item.qty * unitPrice,
          sparePartId: part.id
        };
      }
      return item;
    });
    handleMaterialsChange(updated);
    setActiveDropdownRowId(null);
  };

  const handleAddFromInventoryPicker = (part: SparePartItem) => {
    if (readOnly || !handleMaterialsChange) return;
    const unitPrice = Math.max(0, parseFloat(String(part.price)) || 0);
    const newItem: MaterialItem = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now() + Math.random()),
      qty: 1,
      description: part.name,
      unitPrice,
      total: unitPrice,
      sparePartId: part.id
    };
    handleMaterialsChange([...activeMaterials, newItem]);
  };

  const getFilteredParts = (textQuery: string) => {
    const q = (textQuery || '').toLowerCase().trim();
    const list = spareParts.filter(p => {
      if (!q) return true;
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.compatibleDevice || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    });

    return list.sort((a, b) => {
      if (deviceName) {
        const d = deviceName.toLowerCase();
        const aCompat = (a.compatibleDevice || '').toLowerCase().includes(d) || (a.name || '').toLowerCase().includes(d);
        const bCompat = (b.compatibleDevice || '').toLowerCase().includes(d) || (b.name || '').toLowerCase().includes(d);
        if (aCompat && !bCompat) return -1;
        if (!aCompat && bCompat) return 1;
      }
      if (a.stock > 0 && b.stock <= 0) return -1;
      if (a.stock <= 0 && b.stock > 0) return 1;
      return 0;
    });
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
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse min-w-[340px]">
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

            {/* Mobile View: No Side-Scrolling */}
            <div className="block md:hidden space-y-2">
              {activeMaterials.map((item, idx) => (
                <div key={item.id || idx} className="p-2.5 bg-white rounded-xl border border-gray-200 text-xs flex justify-between items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 truncate m-0">{item.description}</p>
                    <p className="text-[11px] text-gray-500 m-0">₱{(item.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} × {item.qty}</p>
                  </div>
                  <span className="font-mono font-bold text-gray-900 shrink-0">
                    ₱{(item.total || (item.qty * item.unitPrice) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-3 bg-gray-50 rounded-xl text-center text-xs text-gray-400">
            No itemized replacement parts recorded.
          </div>
        )}

        {/* Read-Only Cost & Payment Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-gradient-to-r from-purple-50/60 to-gray-50 p-3 sm:p-3.5 rounded-xl border border-purple-100/80">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase font-semibold block">Total Repair Cost</span>
            <span className="font-black text-sm sm:text-base text-[#bd00ff] font-mono mt-0.5">₱{totalRepairCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase font-semibold block">Payment Method</span>
            <span className="font-bold text-gray-900 text-xs mt-0.5 truncate">
              {currentMethod === 'Split' ? 'Split (Cash+GCash)' : `${currentMethod} Payment`}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase font-semibold block">Downpayment / Paid</span>
            <span className="font-bold text-gray-900 font-mono text-xs mt-0.5">
              ₱{totalAmountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase font-semibold block">Balance Due</span>
            <span className={`font-black text-sm sm:text-base font-mono mt-0.5 ${balanceDue > 0 ? 'text-amber-700' : 'text-green-600'}`}>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Wrench size={16} className="text-[#bd00ff] shrink-0" />
          <div className="flex flex-col">
            <label className="font-bold text-sm text-black">Itemized Replacement Parts & Materials</label>
            <span className="text-[11px] text-gray-500">Step C: Type or select spare parts from inventory to auto-fill price</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowInventoryPicker(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
            title="Browse all parts in branch inventory"
          >
            <Package size={14} />
            <span>Pick from Inventory ({spareParts.length})</span>
          </button>
          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 text-[#bd00ff] hover:bg-[#bd00ff] hover:text-white border border-[#bd00ff]/40 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
            title="Add custom line item (labor or unlisted part)"
          >
            <Plus size={14} />
            <span>Add Custom Item</span>
          </button>
        </div>
      </div>

      {/* --- DESKTOP VIEW: Materials Table (Hidden on Mobile) --- */}
      <div className="hidden md:block border-2 border-gray-200 rounded-2xl bg-white shadow-xs relative">
        <table className="w-full text-left text-xs border-collapse min-w-[500px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
              <th className="py-2.5 px-3 text-center w-16">Qty</th>
              <th className="py-2.5 px-3">Material / Part Description (Type or select from inventory)</th>
              <th className="py-2.5 px-3 w-36">Unit Price (₱)</th>
              <th className="py-2.5 px-3 w-32 text-right">Total (₱)</th>
              <th className="py-2.5 px-2 text-center w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activeMaterials.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-400 font-medium">
                  <div className="flex flex-col items-center gap-2">
                    <Package size={24} className="text-purple-300" />
                    <p className="m-0 text-xs">
                      No parts added yet. Click <button type="button" onClick={() => setShowInventoryPicker(true)} className="text-[#bd00ff] font-bold underline cursor-pointer bg-transparent border-none p-0 inline">&quot;Pick from Inventory&quot;</button> or <button type="button" onClick={handleAddRow} className="text-[#bd00ff] font-bold underline cursor-pointer bg-transparent border-none p-0 inline">&quot;Add Custom Item&quot;</button> to begin quoting.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              activeMaterials.map((item) => (
                <tr key={item.id} className="hover:bg-purple-50/20 transition-colors">
                  {/* Qty */}
                  <td className="py-2.5 px-2 text-center align-top">
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => handleUpdateRow(item.id, 'qty', e.target.value)}
                      className="w-12 text-center py-1.5 bg-gray-50 border border-gray-200 rounded-lg outline-none text-xs font-bold text-gray-800 focus:border-[#bd00ff] focus:bg-white"
                    />
                  </td>

                  {/* Description with Autocomplete */}
                  <td className="py-2.5 px-2 relative parts-autocomplete-anchor align-top">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Type to search inventory (e.g. LCD Screen) or custom labor..."
                        value={item.description}
                        onFocus={() => setActiveDropdownRowId(item.id)}
                        onChange={(e) => {
                          handleUpdateRow(item.id, 'description', e.target.value);
                          setActiveDropdownRowId(item.id);
                        }}
                        className="w-full pl-3 pr-8 py-1.5 bg-gray-50 border border-gray-200 rounded-lg outline-none text-xs font-medium text-gray-900 focus:border-[#bd00ff] focus:bg-white transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setActiveDropdownRowId(activeDropdownRowId === item.id ? null : item.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#bd00ff] p-0.5 cursor-pointer border-none bg-transparent"
                        title="Toggle inventory suggestions"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    {/* Autocomplete Dropdown */}
                    {activeDropdownRowId === item.id && (
                      <div className="absolute left-2 right-2 top-full mt-1.5 bg-white border-2 border-purple-200 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-64 flex flex-col animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="px-3 py-2 bg-gradient-to-r from-purple-50 to-indigo-50/60 border-b border-purple-100 flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Package size={13} className="text-[#bd00ff]" />
                            {branch || 'Tagoloan'} Branch Inventory
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveDropdownRowId(null)}
                            className="text-gray-400 hover:text-gray-600 p-0.5 border-none bg-transparent cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        </div>

                        <div className="overflow-y-auto divide-y divide-gray-100 max-h-48">
                          {(() => {
                            const matched = getFilteredParts(item.description);
                            if (matched.length === 0) {
                              return (
                                <div className="p-3 text-center text-xs text-gray-400">
                                  No exact inventory match. You can keep typing custom labor or material.
                                </div>
                              );
                            }
                            return matched.slice(0, 8).map(part => (
                              <div
                                key={part.id}
                                onClick={() => handleSelectSparePart(item.id, part)}
                                className="p-2.5 hover:bg-purple-50/70 cursor-pointer transition-colors flex items-center justify-between gap-2 group"
                              >
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-xs text-gray-900 group-hover:text-[#bd00ff] truncate">
                                    {part.name}
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-500">
                                    {part.compatibleDevice && (
                                      <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium truncate max-w-[140px]">
                                        {part.compatibleDevice}
                                      </span>
                                    )}
                                    {part.sku && <span className="font-mono text-gray-400">{part.sku}</span>}
                                    <span className={`px-1.5 py-0.5 rounded font-bold ${
                                      part.stock > 0 
                                        ? (part.stock < 5 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
                                        : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      {part.stock > 0 ? `Stock: ${part.stock}` : 'Out of Stock'}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-mono font-bold text-xs text-[#bd00ff] block">
                                    ₱{Number(part.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                  <span className="text-[9px] text-emerald-600 font-bold uppercase">Click to fill</span>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>

                        <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-500 flex items-center justify-between">
                          <span>Selecting auto-fills description & unit price</span>
                          <span className="text-[#bd00ff] font-semibold">Custom text allowed</span>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Unit Price */}
                  <td className="py-2.5 px-2 align-top">
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
                  <td className="py-2.5 px-3 text-right font-mono font-black text-gray-900 align-top pt-3">
                    ₱{item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Delete Row */}
                  <td className="py-2.5 px-2 text-center align-top pt-2.5">
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

      {/* --- MOBILE VIEW: Material Item Cards (Hidden on Desktop, Zero Side-Scrolling) --- */}
      <div className="block md:hidden">
        {activeMaterials.length === 0 ? (
          <div className="p-5 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/60 text-center flex flex-col items-center gap-2">
            <Package size={24} className="text-purple-300" />
            <p className="text-xs text-gray-500 font-medium leading-relaxed m-0">
              No parts added yet. Use <button type="button" onClick={() => setShowInventoryPicker(true)} className="text-[#bd00ff] font-bold underline cursor-pointer bg-transparent border-none p-0 inline">&quot;Pick from Inventory&quot;</button> or <button type="button" onClick={handleAddRow} className="text-[#bd00ff] font-bold underline cursor-pointer bg-transparent border-none p-0 inline">&quot;Add Custom Item&quot;</button> to quote parts.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeMaterials.map((item, idx) => (
              <div key={item.id} className="p-3.5 bg-white rounded-2xl border-2 border-gray-200 shadow-2xs flex flex-col gap-3 relative">
                {/* Item Top: Counter Badge + Description Input + Delete */}
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-[#bd00ff] text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0 relative parts-autocomplete-anchor">
                    <input
                      type="text"
                      placeholder="Type inventory part or labor..."
                      value={item.description}
                      onFocus={() => setActiveDropdownRowId(item.id)}
                      onChange={(e) => {
                        handleUpdateRow(item.id, 'description', e.target.value);
                        setActiveDropdownRowId(item.id);
                      }}
                      className="w-full pl-3 pr-7 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-medium text-gray-900 focus:border-[#bd00ff] focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setActiveDropdownRowId(activeDropdownRowId === item.id ? null : item.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#bd00ff] p-0.5 cursor-pointer border-none bg-transparent"
                    >
                      <ChevronDown size={14} />
                    </button>

                    {/* Mobile Autocomplete Dropdown */}
                    {activeDropdownRowId === item.id && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border-2 border-purple-200 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-56 flex flex-col">
                        <div className="px-2.5 py-1.5 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-purple-900 uppercase">
                            Inventory ({branch || 'Tagoloan'})
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveDropdownRowId(null)}
                            className="text-gray-400 hover:text-gray-600 p-0.5 border-none bg-transparent cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <div className="overflow-y-auto divide-y divide-gray-100 max-h-40">
                          {(() => {
                            const matched = getFilteredParts(item.description);
                            if (matched.length === 0) {
                              return (
                                <div className="p-2.5 text-center text-xs text-gray-400">
                                  No exact match. Keep typing custom text.
                                </div>
                              );
                            }
                            return matched.slice(0, 6).map(part => (
                              <div
                                key={part.id}
                                onClick={() => handleSelectSparePart(item.id, part)}
                                className="p-2 hover:bg-purple-50 cursor-pointer flex items-center justify-between gap-1.5"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-xs text-gray-900 truncate m-0">{part.name}</p>
                                  <p className="text-[10px] text-gray-500 m-0 truncate">
                                    {part.compatibleDevice || 'Universal'} • Stock: {part.stock}
                                  </p>
                                </div>
                                <span className="font-mono font-bold text-xs text-[#bd00ff] shrink-0">
                                  ₱{Number(part.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(item.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border-none bg-transparent shrink-0"
                    title="Remove part"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Item Bottom: Qty + Unit Price + Line Total */}
                <div className="grid grid-cols-3 gap-2 items-center pt-2 border-t border-gray-100">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => handleUpdateRow(item.id, 'qty', e.target.value)}
                      className="w-full text-center py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-bold text-gray-800 focus:border-[#bd00ff] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Unit Price</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₱</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        value={item.unitPrice || ''}
                        onChange={(e) => handleUpdateRow(item.id, 'unitPrice', e.target.value)}
                        className="w-full pl-6 pr-1.5 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-mono font-bold text-gray-900 focus:border-[#bd00ff] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Total</span>
                    <span className="font-mono font-black text-gray-900 text-xs truncate block py-2">
                      ₱{item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment & Cost Calculation Section */}
      <div className="bg-gradient-to-br from-purple-50/50 to-gray-50 p-3.5 sm:p-5 rounded-2xl border-2 border-purple-100 flex flex-col gap-4">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-purple-100/80">
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-[#bd00ff]" />
            <span className="text-xs font-black text-gray-800 uppercase tracking-wider">
              Repair Cost & Payment Method
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-xl border border-purple-100 shadow-2xs self-start sm:self-auto">
            <span className="text-[11px] font-bold text-gray-500">Total Cost:</span>
            <span className="text-sm font-black text-[#bd00ff] font-mono">
              ₱{totalRepairCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* 1. Payment Method Tabs (Responsive Grid) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700">Select Payment Method</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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

        {/* 6. Dedicated Pay in Full / Settle Remaining Balance Section */}
        {!readOnly && balanceDue > 0 && totalRepairCost > 0 && (
          <div className="p-4 bg-gradient-to-r from-purple-50 via-fuchsia-50/40 to-indigo-50 border-2 border-purple-200/90 rounded-2xl flex flex-col gap-3 shadow-2xs animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 pb-2.5 border-b border-purple-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#bd00ff] text-white flex items-center justify-center font-black text-xs shadow-xs">
                  ₱
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-900 tracking-tight flex items-center gap-1.5">
                    <span>Pay Remaining Balance to Settle in Full</span>
                  </h4>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    Deposit received: <strong className="text-purple-700 font-mono">₱{totalAmountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> • Outstanding balance: <strong className="text-amber-700 font-mono">₱{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 text-[#bd00ff] px-2.5 py-1 rounded-full border border-purple-200 shrink-0">
                Downpayment Mode
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                  <span>Cash / Payment to Pay in Full (₱)</span>
                  <span className="text-[10px] text-gray-400 font-normal">Remaining needed: ₱{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-xs">₱</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder={`Enter cash amount to settle ₱${balanceDue.toLocaleString()}...`}
                    value={settlementCash}
                    onChange={(e) => handleSettlementInputChange(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 bg-white border border-purple-200 rounded-xl outline-none font-mono font-bold text-gray-900 focus:border-[#bd00ff] text-sm shadow-2xs transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-4">
                <button
                  type="button"
                  onClick={handlePayFullRemaining}
                  className="px-4 py-2.5 bg-[#bd00ff] hover:bg-[#9c00d6] active:scale-[0.98] text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-purple-200 transition-all border-none"
                  title="Click to instantly mark the remaining balance as paid in full"
                >
                  <CheckCircle2 size={14} />
                  <span>Pay Full Balance (₱{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                </button>
                {settlementCash && (
                  <button
                    type="button"
                    onClick={() => {
                      setSettlementCash('');
                      setSettlementFeedback(null);
                    }}
                    className="px-3 py-2.5 bg-white hover:bg-gray-100 text-gray-600 text-xs font-bold rounded-xl border border-gray-200 transition-colors cursor-pointer"
                    title="Clear payment input"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Real-time Settlement & Error Feedback */}
            {settlementFeedback && (
              <div className={`text-xs font-semibold px-3 py-2 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-1 animate-in fade-in duration-150 ${
                settlementFeedback.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                  : settlementFeedback.type === 'warning' 
                    ? 'bg-amber-50 text-amber-900 border-amber-200' 
                    : 'bg-red-50 text-red-900 border-red-200'
              }`}>
                <span className="flex items-center gap-1.5">
                  {settlementFeedback.type === 'success' ? (
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle size={14} className="text-amber-600 shrink-0" />
                  )}
                  {settlementFeedback.message}
                </span>
                {settlementFeedback.change !== undefined && settlementFeedback.change > 0 && (
                  <span className="font-mono font-black text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-lg text-xs self-start sm:self-auto">
                    Customer Change: ₱{settlementFeedback.change.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            )}
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

      {/* 8. Inventory Parts Picker Modal */}
      {showInventoryPicker && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowInventoryPicker(false)}
        >
          <div 
            className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-purple-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#bd00ff] text-white flex items-center justify-center shadow-sm">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 m-0">
                    Spare Parts & Materials Inventory
                  </h3>
                  <p className="text-xs text-gray-500 m-0 mt-0.5">
                    {branch || 'Tagoloan'} Branch • Click &quot;+ Add to Quote&quot; to auto-fill description and price
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInventoryPicker(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 border-none cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Search & Category Filter */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder={`Search parts for ${deviceName || 'device'} (e.g. LCD, Battery, Screen, Charging Port)...`}
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-medium text-gray-900 focus:border-[#bd00ff] shadow-2xs"
                />
                {inventorySearch && (
                  <button
                    type="button"
                    onClick={() => setInventorySearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Categories */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                {['All', 'Screens', 'Batteries', 'Charging Ports', 'Camera Modules', 'Back Housing', 'Other'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setInventoryCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                      inventoryCategory === cat
                        ? 'bg-[#bd00ff] text-white border-[#bd00ff] shadow-xs'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-purple-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Parts List */}
            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                const q = inventorySearch.toLowerCase().trim();
                let filtered = spareParts.filter(p => {
                  if (inventoryCategory !== 'All') {
                    if (inventoryCategory === 'Screens' && !(p.category || '').toLowerCase().includes('screen') && !(p.name || '').toLowerCase().includes('lcd') && !(p.name || '').toLowerCase().includes('screen')) return false;
                    if (inventoryCategory === 'Batteries' && !(p.category || '').toLowerCase().includes('batter') && !(p.name || '').toLowerCase().includes('batter')) return false;
                    if (inventoryCategory === 'Charging Ports' && !(p.category || '').toLowerCase().includes('charge') && !(p.category || '').toLowerCase().includes('port') && !(p.name || '').toLowerCase().includes('port') && !(p.name || '').toLowerCase().includes('flex')) return false;
                    if (inventoryCategory === 'Camera Modules' && !(p.category || '').toLowerCase().includes('camera') && !(p.name || '').toLowerCase().includes('camera')) return false;
                    if (inventoryCategory === 'Back Housing' && !(p.category || '').toLowerCase().includes('hous') && !(p.category || '').toLowerCase().includes('back') && !(p.name || '').toLowerCase().includes('housing')) return false;
                  }
                  if (!q) return true;
                  return (
                    (p.name || '').toLowerCase().includes(q) ||
                    (p.compatibleDevice || '').toLowerCase().includes(q) ||
                    (p.sku || '').toLowerCase().includes(q) ||
                    (p.category || '').toLowerCase().includes(q)
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
                      <Package size={32} className="text-gray-300" />
                      <p className="text-sm font-bold text-gray-700 m-0">No matching spare parts found</p>
                      <p className="text-xs text-gray-400 m-0 max-w-sm">
                        You can close this picker and use &quot;+ Add Custom Item&quot; to quote custom labor or non-inventory parts.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filtered.map(part => {
                      const alreadyAddedCount = activeMaterials.filter(m => m.description === part.name || (m as any).sparePartId === part.id).length;
                      return (
                        <div
                          key={part.id}
                          className="p-3 bg-white rounded-2xl border border-gray-200 hover:border-purple-300 transition-all flex flex-col justify-between gap-2 shadow-2xs hover:shadow-xs group"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1.5">
                              <h5 className="font-bold text-xs text-gray-900 group-hover:text-[#bd00ff] m-0 line-clamp-2">
                                {part.name}
                              </h5>
                              <span className="font-mono font-black text-xs text-purple-700 shrink-0">
                                ₱{Number(part.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {part.compatibleDevice && (
                                <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-semibold truncate max-w-[150px]">
                                  {part.compatibleDevice}
                                </span>
                              )}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                part.stock > 0 
                                  ? (part.stock < 5 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {part.stock > 0 ? `In Stock: ${part.stock}` : 'Out of Stock'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <span className="font-mono text-[10px] text-gray-400">
                              {part.sku || 'Part'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                handleAddFromInventoryPicker(part);
                              }}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-[#bd00ff] text-[#bd00ff] hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer border border-purple-200 hover:border-[#bd00ff] flex items-center gap-1 active:scale-95"
                            >
                              <Plus size={12} />
                              <span>{alreadyAddedCount > 0 ? `Add Another (${alreadyAddedCount})` : 'Add to Quote'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">
                {activeMaterials.length} item(s) in current quote
              </span>
              <button
                type="button"
                onClick={() => setShowInventoryPicker(false)}
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer border-none transition-colors"
              >
                Done / Review Quote
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
