"use client";

import React, { useState, useEffect, useRef, Fragment } from 'react';
import { 
  Search, Filter, ChevronDown, ChevronUp, Trash2, ChevronLeft, ChevronRight, 
  X, Plus, Pencil, Upload, AlertCircle, Trash, CheckCircle2, FileText, 
  History, Smartphone, Building2, Package, Layers,
  Image as ImageIcon, Sparkles, Percent, Clock, Tag, Flame, ShoppingCart, ReceiptText
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../context/ThemeContext';
import { useBranch } from '../../context/BranchContext';
import imageCompression from 'browser-image-compression';
import CountdownTimer from '../../components/Common/CountdownTimer';
import { generateProductInventoryPDF } from '../../lib/inventory-pdf';

type VariantData = {
  id?: string;
  type: string;
  name: string;
  productId?: string;
  price: number | string;
  cost: number | string;
  stock: number;
  totalStock?: number;
  branchStocks?: Record<string, number>;
  tagoloanStock?: number;
  villanuevaStock?: number;
  jasaanStock?: number;
  isOutOfStock?: boolean;
  isLowStock?: boolean;
};

export default function CashierDevices() {
  const router = useRouter();
  const { styles } = useTheme();
  const { userBranch: contextBranch, userRole } = useBranch();
  const userBranch = contextBranch || 'Tagoloan';

  // Search, Filter & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>('all');
  const [selectedCondition, setSelectedCondition] = useState<'all' | 'new' | 'pre-owned'>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 8;

  // Products Data
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);

  // Categories / Brands
  const [categories, setCategories] = useState<{ id: string, name: string, logoUrl?: string }[]>([]);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatImage, setNewCatImage] = useState<File | null>(null);
  const [newCatImagePreview, setNewCatImagePreview] = useState<string | null>(null);
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [isDeleteCatMode, setIsDeleteCatMode] = useState(false);
  const [selectedCatsToDelete, setSelectedCatsToDelete] = useState<string[]>([]);
  const [isDeletingCats, setIsDeletingCats] = useState(false);

  // Modals & Feedback
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successModalContent, setSuccessModalContent] = useState({ title: '', message: '' });
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorModalContent, setErrorModalContent] = useState({ title: '', message: '' });

  // POS Sale Modal State
  const [posModalOpen, setPosModalOpen] = useState(false);
  const [posDevice, setPosDevice] = useState<any | null>(null);
  const [posVariant, setPosVariant] = useState<VariantData | null>(null);
  const [posPaymentType, setPosPaymentType] = useState<'Full' | 'Downpayment'>('Full');
  const [posQuantity, setPosQuantity] = useState(1);
  const [posDownpaymentAmt, setPosDownpaymentAmt] = useState<number>(0);
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posCustomerNotes, setPosCustomerNotes] = useState('');
  const [posSubmitting, setPosSubmitting] = useState(false);

  // Quick Stock Adjustment Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<{ device: any, variant?: VariantData } | null>(null);
  const [adjustStockVal, setAdjustStockVal] = useState('');
  const [adjustType, setAdjustType] = useState<'SET' | 'ADD'>('SET');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // History / Movements Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [movements, setMovements] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyTypeFilter, setHistoryTypeFilter] = useState('ALL');

  // Physical Units / IMEI Modal State
  const [unitsModalOpen, setUnitsModalOpen] = useState(false);
  const [deviceUnits, setDeviceUnits] = useState<any[]>([]);
  const [isUnitsLoading, setIsUnitsLoading] = useState(false);
  const [unitsSearch, setUnitsSearch] = useState('');
  const [unitsStatusFilter, setUnitsStatusFilter] = useState('ALL');
  const [newImeiInput, setNewImeiInput] = useState('');
  const [newImeiDeviceId, setNewImeiDeviceId] = useState('');
  const [newImeiVariantId, setNewImeiVariantId] = useState('');
  const [isRegisteringImei, setIsRegisteringImei] = useState(false);
  const [imeiError, setImeiError] = useState<string | null>(null);

  // Discount Product Feature States
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountDeviceId, setDiscountDeviceId] = useState('');
  const [discountVariantId, setDiscountVariantId] = useState('');
  const [discountBrandFilter, setDiscountBrandFilter] = useState('ALL');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [discountStartDate, setDiscountStartDate] = useState(getTodayDateString());
  const [discountStartTime, setDiscountStartTime] = useState('00:00');
  const [discountEndDate, setDiscountEndDate] = useState('');
  const [discountEndTime, setDiscountEndTime] = useState('23:59');
  const [isSavingDiscount, setIsSavingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Active / Expired Discounts Manager Modal State
  const [discountsListModalOpen, setDiscountsListModalOpen] = useState(false);
  const [discountsList, setDiscountsList] = useState<any[]>([]);
  const [isDiscountsLoading, setIsDiscountsLoading] = useState(false);
  const [discountFilterStatus, setDiscountFilterStatus] = useState<'ALL' | 'ACTIVE' | 'SCHEDULED' | 'EXPIRED'>('ALL');
  const [allEligibleProducts, setAllEligibleProducts] = useState<any[]>([]);

  // Add Product State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceCost, setNewDeviceCost] = useState('');
  const [newDevicePrice, setNewDevicePrice] = useState('');
  const [newDeviceDiscount, setNewDeviceDiscount] = useState('');
  const [newDeviceDiscountStartDate, setNewDeviceDiscountStartDate] = useState(getTodayDateString());
  const [newDeviceDiscountEndDate, setNewDeviceDiscountEndDate] = useState('');
  const [newDeviceStocks, setNewDeviceStocks] = useState('0');
  const [newDeviceCategory, setNewDeviceCategory] = useState('');
  const [newDeviceType, setNewDeviceType] = useState('Smartphone');
  const [newDeviceSpecs, setNewDeviceSpecs] = useState('');
  const [newDeviceAsLowAs, setNewDeviceAsLowAs] = useState('');
  const [newDeviceWarranty, setNewDeviceWarranty] = useState('');
  const [newDeviceDownpayment, setNewDeviceDownpayment] = useState('');
  const [newDeviceIsPreOwned, setNewDeviceIsPreOwned] = useState(false);
  const [newDeviceImages, setNewDeviceImages] = useState<File[]>([]);
  const [newDeviceImagePreviews, setNewDeviceImagePreviews] = useState<string[]>([]);
  const [newDeviceDownpaymentImage, setNewDeviceDownpaymentImage] = useState<File | null>(null);
  const [newDeviceDownpaymentImagePreview, setNewDeviceDownpaymentImagePreview] = useState<string | null>(null);

  function parseUnitDetails(prodName: string, v: any): {
    unitLabel: string;
    color: string;
    storage: string;
  } {
    if (!v) return { unitLabel: prodName, color: '—', storage: '—' };
    
    const rawName = String(v.name || '').trim();
    const rawType = String(v.type || '').trim().toLowerCase();
    
    const knownColors = [
      'red', 'blue', 'black', 'white', 'green', 'gold', 'silver', 'purple', 
      'yellow', 'pink', 'gray', 'grey', 'midnight', 'starlight', 'titanium', 
      'natural', 'orange', 'bronze', 'emerald', 'cyan', 'violet'
    ];
    
    let color = '—';
    let storage = '—';
    
    const isColorType = rawType === 'color' || knownColors.includes(rawName.toLowerCase());
    const storageMatch = rawName.match(/(\d+)\s*(GB|TB|gb|tb)?/i);
    
    if (isColorType) {
      color = rawName;
      if (storageMatch && !knownColors.includes(storageMatch[1] || '')) {
        const num = storageMatch[1];
        const unit = storageMatch[2] ? String(storageMatch[2]).toUpperCase() : 'GB';
        storage = `${num} ${unit}`;
      }
    } else if (rawType === 'storage' || storageMatch) {
      if (storageMatch) {
        const num = storageMatch[1];
        const unit = storageMatch[2] ? String(storageMatch[2]).toUpperCase() : 'GB';
        storage = `${num} ${unit}`;
      } else {
        storage = rawName;
      }
      for (const c of knownColors) {
        if (rawName.toLowerCase().includes(c)) {
          color = c.charAt(0).toUpperCase() + c.slice(1);
          break;
        }
      }
    } else {
      if (knownColors.includes(rawName.toLowerCase())) {
        color = rawName;
      } else if (storageMatch) {
        const num = storageMatch[1];
        const unit = storageMatch[2] ? String(storageMatch[2]).toUpperCase() : 'GB';
        storage = `${num} ${unit}`;
      }
    }
    
    const unitLabel = rawName ? `${prodName} – ${rawName}` : prodName;
    return { unitLabel, color, storage };
  }

  const [addVariants, setAddVariants] = useState<{
    type: string;
    name: string;
    color: string;
    storage: string;
    productId: string;
    price: string;
    cost: string;
    tagoloanStock: string;
    villanuevaStock: string;
    jasaanStock: string;
  }[]>([
    { type: 'Storage', name: '32 GB', color: '', storage: '32 GB', productId: '', price: '', cost: '', tagoloanStock: '0', villanuevaStock: '0', jasaanStock: '0' },
    { type: 'Storage', name: '64 GB', color: '', storage: '64 GB', productId: '', price: '', cost: '', tagoloanStock: '0', villanuevaStock: '0', jasaanStock: '0' },
    { type: 'Storage', name: '128 GB', color: '', storage: '128 GB', productId: '', price: '', cost: '', tagoloanStock: '0', villanuevaStock: '0', jasaanStock: '0' },
    { type: 'Storage', name: '256 GB', color: '', storage: '256 GB', productId: '', price: '', cost: '', tagoloanStock: '0', villanuevaStock: '0', jasaanStock: '0' }
  ]);

  // Edit Product State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDeviceName, setEditDeviceName] = useState('');
  const [editDeviceCost, setEditDeviceCost] = useState('');
  const [editDevicePrice, setEditDevicePrice] = useState('');
  const [editDeviceDiscount, setEditDeviceDiscount] = useState('0');
  const [editDeviceDiscountStartDate, setEditDeviceDiscountStartDate] = useState(getTodayDateString());
  const [editDeviceDiscountEndDate, setEditDeviceDiscountEndDate] = useState('');
  const [editDeviceCategory, setEditDeviceCategory] = useState('');
  const [editDeviceType, setEditDeviceType] = useState('Smartphone');
  const [editDeviceSpecs, setEditDeviceSpecs] = useState('');
  const [editDeviceIsPreOwned, setEditDeviceIsPreOwned] = useState(false);
  const [editDeviceAsLowAs, setEditDeviceAsLowAs] = useState('');
  const [editDeviceWarranty, setEditDeviceWarranty] = useState('');
  const [editDeviceDownpayment, setEditDeviceDownpayment] = useState('');
  const [editImages, setEditImages] = useState<{ id: string; type: 'existing' | 'new'; url: string; file?: File }[]>([]);
  const [editDeviceDownpaymentImage, setEditDeviceDownpaymentImage] = useState<File | null>(null);
  const [editDeviceDownpaymentImagePreview, setEditDeviceDownpaymentImagePreview] = useState<string | null>(null);
  const [editVariants, setEditVariants] = useState<any[]>([]);

  function getTodayDateString() {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function formatDateForInput(dateStr?: string | null) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function generateAutoProductId(modelName: string, variantName: string) {
    const cleanModel = (modelName || 'DEVICE')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const trimmedVariant = (variantName || 'STD').trim().toUpperCase();
    const storageNumMatch = trimmedVariant.match(/^(\d+)\s*(GB|TB)$/i);
    let cleanVar = '';
    if (storageNumMatch && storageNumMatch[1]) {
      cleanVar = storageNumMatch[1];
    } else {
      cleanVar = trimmedVariant
        .replace(/[^A-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }

    if (!cleanVar) cleanVar = 'STD';
    return `${cleanModel}-${cleanVar}`;
  }

  function getCurrentTimeString() {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function getDefaultEndDateTime() {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // Fetch Inventory
  const fetchProducts = () => {
    setIsLoading(true);
    const url = `/api/devices?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(searchQuery)}&categoryId=${selectedCategory}&type=${selectedDeviceType}&condition=${selectedCondition}&branch=${encodeURIComponent(userBranch)}&stockStatus=${stockStatusFilter}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.devices)) {
          setTotalPages(data.totalPages || 1);
          setProducts(data.devices);
        } else if (Array.isArray(data)) {
          setProducts(data);
        }
      })
      .catch(err => console.error("Error fetching cashier inventory:", err))
      .finally(() => setIsLoading(false));
  };

  const fetchCategories = () => {
    fetch('/api/categories?t=' + Date.now())
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(err => console.error("Error fetching categories:", err));
  };

  // Fetch Stock History
  const fetchHistory = () => {
    setIsHistoryLoading(true);
    fetch(`/api/inventory/history?branch=${encodeURIComponent(userBranch)}&type=${historyTypeFilter}`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.movements)) {
          setMovements(data.movements);
        }
      })
      .catch(err => console.error("Failed to load inventory history:", err))
      .finally(() => setIsHistoryLoading(false));
  };

  // Fetch Physical Units (IMEIs)
  const fetchUnits = () => {
    setIsUnitsLoading(true);
    fetch(`/api/inventory/units?branch=${encodeURIComponent(userBranch)}&status=${unitsStatusFilter}&search=${encodeURIComponent(unitsSearch)}`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.units)) {
          setDeviceUnits(data.units);
        }
      })
      .catch(err => console.error("Failed to load device units:", err))
      .finally(() => setIsUnitsLoading(false));
  };

  // Fetch Discounts
  const fetchDiscountsList = async () => {
    setIsDiscountsLoading(true);
    try {
      const res = await fetch(`/api/inventory/discount?branch=${encodeURIComponent(userBranch)}&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setDiscountsList(Array.isArray(data.discounts) ? data.discounts : []);
      }
    } catch (err) {
      console.error('Failed to load discounts list:', err);
    } finally {
      setIsDiscountsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [currentPage, searchQuery, selectedCategory, selectedDeviceType, selectedCondition, userBranch, stockStatusFilter]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (historyModalOpen) fetchHistory();
  }, [historyModalOpen, historyTypeFilter, userBranch]);

  useEffect(() => {
    if (unitsModalOpen) fetchUnits();
  }, [unitsModalOpen, unitsStatusFilter, unitsSearch, userBranch]);

  // POS Sale Handlers
  const openPosModal = (device: any, variant?: VariantData) => {
    setPosDevice(device);
    setPosVariant(variant || null);
    setPosPaymentType('Full');
    setPosQuantity(1);
    const basePrice = variant ? Number(variant.price || device.price) : Number(device.price || 0);
    const effectivePrice = device.discount && device.discount > 0 ? Math.round(basePrice * (1 - device.discount / 100)) : basePrice;
    const initialDp = device.downpayment ? parseFloat(device.downpayment) : Math.round(effectivePrice * 0.3);
    setPosDownpaymentAmt(initialDp || 0);
    setPosCustomerPhone('');
    setPosCustomerNotes('');
    setPosModalOpen(true);
  };

  const handlePosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posDevice) return;
    setPosSubmitting(true);
    try {
      const itemBasePrice = posVariant ? Number(posVariant.price || posDevice.price) : Number(posDevice.price || 0);
      const effectiveUnitPrice = posDevice.discount && posDevice.discount > 0 ? Math.round(itemBasePrice * (1 - posDevice.discount / 100)) : itemBasePrice;
      const totalPrice = effectiveUnitPrice * posQuantity;
      const dpAmount = posPaymentType === 'Downpayment' ? posDownpaymentAmt : totalPrice;
      const remBal = posPaymentType === 'Downpayment' ? Math.max(0, totalPrice - posDownpaymentAmt) : 0;
      const isSettled = posPaymentType === 'Full' || remBal === 0;

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: posDevice.id,
          variationId: posVariant?.id || undefined,
          amount: dpAmount,
          quantity: posQuantity,
          paymentType: posPaymentType,
          source: 'POS',
          branch: userBranch,
          downpaymentAmount: posPaymentType === 'Downpayment' ? dpAmount : 0,
          remainingBalance: remBal,
          isSettled: isSettled,
          phoneNumber: posCustomerPhone,
          notes: posCustomerNotes
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to complete POS sale');
      }

      setPosModalOpen(false);
      setSuccessModalContent({
        title: 'POS Checkout Complete!',
        message: posPaymentType === 'Downpayment'
          ? `In-Store Downpayment of ₱${dpAmount.toLocaleString()} recorded for "${posDevice.name}${posVariant ? ` (${posVariant.name})` : ''}". Remaining balance: ₱${remBal.toLocaleString()}.`
          : `Full payment sale of ₱${totalPrice.toLocaleString()} completed for "${posDevice.name}${posVariant ? ` (${posVariant.name})` : ''}".`
      });
      setSuccessModalOpen(true);
      fetchProducts();
    } catch (err: any) {
      setErrorModalContent({ title: 'POS Checkout Error', message: err.message || 'Transaction failed' });
      setErrorModalOpen(true);
    } finally {
      setPosSubmitting(false);
    }
  };

  // Discount Product Handlers
  const handleOpenAddDiscount = async (preselectedProduct?: any) => {
    setDiscountError(null);
    setDiscountType('PERCENTAGE');
    setDiscountValue('');
    setDiscountStartDate(getTodayDateString());
    setDiscountStartTime(getCurrentTimeString());
    setDiscountEndDate(getDefaultEndDateTime());
    setDiscountEndTime('23:59');
    setDiscountVariantId('');

    try {
      const res = await fetch(`/api/devices?limit=250&branch=${encodeURIComponent(userBranch)}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.devices) ? data.devices : (Array.isArray(data) ? data : []);
        setAllEligibleProducts(list);

        if (preselectedProduct) {
          setDiscountDeviceId(preselectedProduct.id);
          setDiscountBrandFilter(preselectedProduct.category?.id || preselectedProduct.categoryId || 'ALL');
          if (preselectedProduct.discount && preselectedProduct.discount > 0) {
            setDiscountValue(String(preselectedProduct.discount));
            if (preselectedProduct.discountStartDate) {
              setDiscountStartDate(formatDateForInput(preselectedProduct.discountStartDate));
            }
            if (preselectedProduct.discountEndDate) {
              setDiscountEndDate(formatDateForInput(preselectedProduct.discountEndDate));
            }
          }
        } else if (list.length > 0) {
          setDiscountDeviceId(list[0].id);
          setDiscountBrandFilter('ALL');
        }
      }
    } catch (e) {
      console.error('Failed to load eligible products for discount:', e);
      if (preselectedProduct) setDiscountDeviceId(preselectedProduct.id);
    }

    setDiscountModalOpen(true);
  };

  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDiscountError(null);

    if (!discountDeviceId) {
      setDiscountError('Please select a product to apply the discount.');
      return;
    }

    const numVal = parseFloat(discountValue);
    if (isNaN(numVal) || numVal <= 0) {
      setDiscountError('Please enter a valid positive discount value.');
      return;
    }

    if (discountType === 'FIXED' && numVal >= 2000) {
      setDiscountError('For fixed discounts, the discount amount must be LESS THAN ₱2,000.');
      return;
    }

    if (discountType === 'PERCENTAGE' && (numVal <= 0 || numVal >= 100)) {
      setDiscountError('Discount percentage must be between 1% and 99%.');
      return;
    }

    if (!discountStartDate || !discountEndDate) {
      setDiscountError('Please provide both start and end dates.');
      return;
    }

    const startIso = new Date(`${discountStartDate}T${discountStartTime || '00:00'}:00`);
    const endIso = new Date(`${discountEndDate}T${discountEndTime || '23:59'}:00`);

    if (isNaN(startIso.getTime()) || isNaN(endIso.getTime())) {
      setDiscountError('Invalid date or time entered.');
      return;
    }

    if (startIso >= endIso) {
      setDiscountError('Discount start date and time must be earlier than the end date and time.');
      return;
    }

    setIsSavingDiscount(true);
    try {
      const res = await fetch('/api/inventory/discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: discountDeviceId,
          variantId: discountVariantId || undefined,
          branch: userBranch,
          discountType,
          discountValue: numVal,
          discountStartDate: startIso.toISOString(),
          discountEndDate: endIso.toISOString()
        })
      });

      if (res.ok) {
        setDiscountModalOpen(false);
        setSuccessModalContent({
          title: 'Discount Applied!',
          message: `Product discount successfully configured and applied for ${userBranch} branch.`
        });
        setSuccessModalOpen(true);
        fetchProducts();
      } else {
        const data = await res.json().catch(() => ({}));
        setDiscountError(data.error || 'Failed to save discount settings.');
      }
    } catch (err: any) {
      setDiscountError(err.message || 'Error occurred while saving discount.');
    } finally {
      setIsSavingDiscount(false);
    }
  };

  const handleRemoveDiscount = async (discountId: string, deviceName: string) => {
    if (!confirm(`Are you sure you want to remove the active discount on "${deviceName}"?`)) return;
    try {
      const res = await fetch(`/api/inventory/discount?id=${encodeURIComponent(discountId)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchDiscountsList();
        fetchProducts();
        alert('Discount removed successfully.');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to remove discount.');
      }
    } catch (e) {
      console.error(e);
      alert('Error removing discount.');
    }
  };

  // Quick Stock Adjust / Restock
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem || !adjustStockVal) return;

    setIsAdjusting(true);
    setAdjustError(null);

    try {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: adjustItem.device.id,
          variationId: adjustItem.variant?.id,
          productId: adjustItem.variant?.productId,
          branch: userBranch,
          newStock: parseInt(adjustStockVal, 10),
          adjustmentType: adjustType,
          notes: adjustNotes
        })
      });

      if (res.ok) {
        setAdjustModalOpen(false);
        setAdjustStockVal('');
        setAdjustNotes('');
        setSuccessModalContent({
          title: 'Stock Updated!',
          message: `Stock for ${adjustItem.variant?.productId || adjustItem.device.name} in ${userBranch} has been successfully updated.`
        });
        setSuccessModalOpen(true);
        fetchProducts();
      } else {
        const errData = await res.json().catch(() => ({}));
        setAdjustError(errData.error || 'Failed to update stock');
      }
    } catch (err: any) {
      setAdjustError(err.message || 'Error occurred during stock update');
    } finally {
      setIsAdjusting(false);
    }
  };

  // Register New Physical IMEI Unit
  const handleRegisterImei = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImeiInput || !newImeiDeviceId) {
      setImeiError('Please provide a valid device and 15-digit IMEI.');
      return;
    }

    setIsRegisteringImei(true);
    setImeiError(null);

    try {
      const res = await fetch('/api/inventory/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imei: newImeiInput.trim(),
          deviceId: newImeiDeviceId,
          variationId: newImeiVariantId || undefined,
          branch: userBranch
        })
      });

      if (res.ok) {
        setNewImeiInput('');
        fetchUnits();
        alert('IMEI unit registered successfully!');
      } else {
        const data = await res.json().catch(() => ({}));
        setImeiError(data.error || 'Failed to register IMEI unit');
      }
    } catch (err: any) {
      setImeiError(err.message || 'Failed to register IMEI unit');
    } finally {
      setIsRegisteringImei(false);
    }
  };

  // Category / Brand Handlers
  const handleCatImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true });
        setNewCatImage(compressed);
        setNewCatImagePreview(URL.createObjectURL(compressed));
      } catch (err) {
        setNewCatImage(file);
        setNewCatImagePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleAddCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCatName.trim()) {
      alert('Please enter a brand name.');
      return;
    }
    setIsAddingCat(true);
    const formData = new FormData();
    formData.append('categoryName', newCatName.trim());
    if (newCatImage) formData.append('categoryImage', newCatImage);

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const createdCat = await res.json();
        setNewCatName('');
        setNewCatImage(null);
        setNewCatImagePreview(null);
        fetchCategories();
        if (isAddModalOpen) {
          setNewDeviceCategory(createdCat.id);
        }
        setSuccessModalContent({ title: 'Brand Added', message: `Brand "${createdCat.name}" was added successfully.` });
        setSuccessModalOpen(true);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to add brand');
      }
    } catch (err: any) {
      console.error(err);
      alert('Network error while adding brand');
    } finally {
      setIsAddingCat(false);
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!confirm(`Are you sure you want to delete brand "${catName}"?`)) return;
    setIsDeletingCats(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [catId] })
      });
      if (res.ok) {
        fetchCategories();
        if (selectedCategory === catId) setSelectedCategory('All');
        setSuccessModalContent({ title: 'Brand Deleted', message: `Brand "${catName}" has been removed.` });
        setSuccessModalOpen(true);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to delete brand. It may be assigned to existing products.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Network error while deleting brand');
    } finally {
      setIsDeletingCats(false);
    }
  };

  // Add Product Handlers
  const handleAddProductImages = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(f => {
      const isImg = f.type.startsWith('image/');
      const isValidSize = f.size <= 10 * 1024 * 1024;
      if (!isImg) alert(`${f.name} is not a valid image format (JPG, PNG, WEBP).`);
      else if (!isValidSize) alert(`${f.name} exceeds the 10MB limit.`);
      return isImg && isValidSize;
    });

    if (validFiles.length === 0) return;
    const remainingSlots = 5 - newDeviceImages.length;
    if (remainingSlots <= 0) {
      alert('You have already added the maximum limit of 5 product images.');
      return;
    }
    const filesToAdd = validFiles.slice(0, remainingSlots);
    const newPreviews = filesToAdd.map(f => URL.createObjectURL(f));
    setNewDeviceImages(prev => [...prev, ...filesToAdd]);
    setNewDeviceImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newDeviceName || !newDeviceCost || !newDevicePrice || !newDeviceCategory) {
      alert("Please fill in all required fields.");
      return;
    }
    if (newDeviceImages.length === 0) {
      alert("Please upload at least 1 product image (1 to 5 images required).");
      return;
    }

    setIsAdding(true);
    const formData = new FormData();
    formData.append('deviceName', newDeviceName);
    formData.append('deviceCost', newDeviceCost);
    formData.append('devicePrice', newDevicePrice);
    formData.append('deviceDiscount', newDeviceDiscount || '0');
    formData.append('discountStartDate', newDeviceDiscountStartDate ? new Date(`${newDeviceDiscountStartDate}T00:00:00`).toISOString() : '');
    formData.append('discountEndDate', newDeviceDiscountEndDate ? new Date(`${newDeviceDiscountEndDate}T23:59:59`).toISOString() : '');
    formData.append('deviceCategory', newDeviceCategory);
    formData.append('deviceType', newDeviceType);
    formData.append('isPreOwned', newDeviceIsPreOwned ? 'true' : 'false');
    formData.append('deviceSpecs', newDeviceSpecs);
    formData.append('deviceAsLowAs', newDeviceAsLowAs);
    formData.append('deviceWarranty', newDeviceWarranty);
    formData.append('deviceDownpayment', newDeviceDownpayment);
    formData.append('branch', userBranch);

    let totalComputedStock = 0;
    if (addVariants.length > 0) {
      const processedVariants = addVariants.map(v => {
        const resolvedName = v.name?.trim() || (v.color && v.storage ? `${v.color} - ${v.storage}` : (v.storage || v.color || 'Standard'));
        const autoProdId = v.productId?.trim() || generateAutoProductId(newDeviceName, resolvedName);
        const tagStock = userBranch === 'Tagoloan' ? parseInt(v.tagoloanStock || '0', 10) : 0;
        const vilStock = userBranch === 'Villanueva' ? parseInt(v.villanuevaStock || '0', 10) : 0;
        const jasStock = userBranch === 'Jasaan' ? parseInt(v.jasaanStock || '0', 10) : 0;
        const varTotal = parseInt(v.tagoloanStock || '0', 10) + parseInt(v.villanuevaStock || '0', 10) + parseInt(v.jasaanStock || '0', 10);
        totalComputedStock += varTotal;

        return {
          type: v.color && v.storage ? 'Unit' : (v.color ? 'Color' : 'Storage'),
          name: resolvedName,
          productId: autoProdId,
          price: v.price || newDevicePrice,
          cost: v.cost || newDeviceCost,
          stock: varTotal,
          tagoloanStock: parseInt(v.tagoloanStock || '0', 10),
          villanuevaStock: parseInt(v.villanuevaStock || '0', 10),
          jasaanStock: parseInt(v.jasaanStock || '0', 10)
        };
      });

      formData.append('variations', JSON.stringify(processedVariants));
      formData.append('deviceStocks', totalComputedStock.toString());
    } else {
      formData.append('deviceStocks', newDeviceStocks || '0');
    }

    newDeviceImages.forEach(img => formData.append('deviceImages', img));
    if (newDeviceDownpaymentImage) {
      formData.append('deviceDownpaymentImage', newDeviceDownpaymentImage);
    }

    try {
      const res = await fetch('/api/devices', { method: 'POST', body: formData });
      if (res.ok) {
        fetchProducts();
        setIsAddModalOpen(false);
        setNewDeviceName(''); setNewDeviceCost(''); setNewDevicePrice(''); setNewDeviceDiscount('');
        setNewDeviceDiscountStartDate(getTodayDateString()); setNewDeviceDiscountEndDate('');
        setNewDeviceCategory(''); setNewDeviceType('Smartphone'); setNewDeviceSpecs('');
        setNewDeviceIsPreOwned(false); setNewDeviceAsLowAs(''); setNewDeviceWarranty(''); setNewDeviceDownpayment('');
        setNewDeviceImages([]); setNewDeviceImagePreviews([]);
        setNewDeviceDownpaymentImage(null); setNewDeviceDownpaymentImagePreview(null);
        setAddVariants([
          { type: 'Storage', name: '32 GB', color: '', storage: '32 GB', productId: '', price: '', cost: '', tagoloanStock: '0', villanuevaStock: '0', jasaanStock: '0' },
          { type: 'Storage', name: '64 GB', color: '', storage: '64 GB', productId: '', price: '', cost: '', tagoloanStock: '0', villanuevaStock: '0', jasaanStock: '0' },
          { type: 'Storage', name: '128 GB', color: '', storage: '128 GB', productId: '', price: '', cost: '', tagoloanStock: '0', villanuevaStock: '0', jasaanStock: '0' },
          { type: 'Storage', name: '256 GB', color: '', storage: '256 GB', productId: '', price: '', cost: '', tagoloanStock: '0', villanuevaStock: '0', jasaanStock: '0' }
        ]);
        setSuccessModalContent({ title: 'Success!', message: `The product has been successfully added to ${userBranch} inventory.` });
        setSuccessModalOpen(true);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to add product');
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred while adding the product');
    } finally {
      setIsAdding(false);
    }
  };

  // Edit Product Handlers
  const handleEditClick = (prod: any) => {
    setProductToEdit(prod);
    setEditDeviceName(prod.name);
    setEditDeviceCost(prod.cost?.toString() || '');
    setEditDevicePrice(prod.price?.toString() || '');
    setEditDeviceDiscount(prod.discount !== undefined && prod.discount !== null ? String(prod.discount) : '0');
    setEditDeviceDiscountStartDate(formatDateForInput(prod.discountStartDate) || getTodayDateString());
    setEditDeviceDiscountEndDate(formatDateForInput(prod.discountEndDate));
    setEditDeviceCategory(prod.categoryId || '');
    setEditDeviceType(prod.type || 'Smartphone');
    setEditDeviceIsPreOwned(prod.isPreOwned || false);
    setEditDeviceSpecs(prod.specs || '');
    setEditDeviceAsLowAs(prod.asLowAs || '');
    setEditDeviceWarranty(prod.warranty || '');
    setEditDeviceDownpayment(prod.downpayment || '');

    const initialImages: { id: string; type: 'existing' | 'new'; url: string; file?: File }[] = [];
    if (Array.isArray(prod.images) && prod.images.length > 0) {
      prod.images.forEach((imgUrl: string, idx: number) => {
        if (imgUrl) initialImages.push({ id: `existing-${idx}-${Date.now()}`, type: 'existing', url: imgUrl });
      });
    } else if (prod.image) {
      initialImages.push({ id: `existing-0-${Date.now()}`, type: 'existing', url: prod.image });
    }
    setEditImages(initialImages);

    setEditDeviceDownpaymentImagePreview(prod.downpaymentImage);
    setEditDeviceDownpaymentImage(null);

    if (prod.variations && prod.variations.length > 0) {
      setEditVariants(prod.variations.map((v: any) => {
        const { color, storage } = parseUnitDetails(prod.name, v);
        return {
          id: v.id,
          type: v.type || 'Storage',
          name: v.name,
          color: color !== '—' ? color : '',
          storage: storage !== '—' ? storage : '',
          productId: v.productId || generateAutoProductId(prod.name, v.name),
          price: v.price?.toString() || prod.price?.toString() || '',
          cost: v.cost?.toString() || prod.cost?.toString() || '',
          tagoloanStock: (v.tagoloanStock ?? v.branchStocks?.Tagoloan ?? 0).toString(),
          villanuevaStock: (v.villanuevaStock ?? v.branchStocks?.Villanueva ?? 0).toString(),
          jasaanStock: (v.jasaanStock ?? v.branchStocks?.Jasaan ?? 0).toString()
        };
      }));
    } else {
      setEditVariants([]);
    }

    setIsEditModalOpen(true);
  };

  const handleEditProductSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!productToEdit) return;

    if (editImages.length === 0) {
      alert("Please keep or upload at least 1 image for the product (1 to 5 images required).");
      return;
    }

    setIsEditing(true);
    const formData = new FormData();
    formData.append('deviceName', editDeviceName);
    formData.append('deviceCost', editDeviceCost);
    formData.append('devicePrice', editDevicePrice);
    formData.append('deviceDiscount', editDeviceDiscount || '0');
    formData.append('discountStartDate', editDeviceDiscountStartDate ? new Date(`${editDeviceDiscountStartDate}T00:00:00`).toISOString() : '');
    formData.append('discountEndDate', editDeviceDiscountEndDate ? new Date(`${editDeviceDiscountEndDate}T23:59:59`).toISOString() : '');
    formData.append('deviceCategory', editDeviceCategory);
    formData.append('deviceType', editDeviceType);
    formData.append('isPreOwned', editDeviceIsPreOwned ? 'true' : 'false');
    formData.append('deviceSpecs', editDeviceSpecs);
    formData.append('deviceAsLowAs', editDeviceAsLowAs);
    formData.append('deviceWarranty', editDeviceWarranty);
    formData.append('deviceDownpayment', editDeviceDownpayment);

    const existingImageUrls = editImages.filter(img => img.type === 'existing').map(img => img.url);
    formData.append('existingImages', JSON.stringify(existingImageUrls));

    editImages.filter(img => img.type === 'new' && img.file).forEach(img => {
      formData.append('deviceImages', img.file!);
    });

    if (editDeviceDownpaymentImage) {
      formData.append('deviceDownpaymentImage', editDeviceDownpaymentImage);
    }

    let totalComputedStock = 0;
    if (editVariants.length > 0) {
      const processedVariants = editVariants.map(v => {
        const resolvedName = v.name?.trim() || (v.color && v.storage ? `${v.color} - ${v.storage}` : (v.storage || v.color || 'Standard'));
        const autoProdId = v.productId?.trim() || generateAutoProductId(editDeviceName, resolvedName);
        const tagStock = parseInt(v.tagoloanStock || '0', 10);
        const vilStock = parseInt(v.villanuevaStock || '0', 10);
        const jasStock = parseInt(v.jasaanStock || '0', 10);
        const varTotal = tagStock + vilStock + jasStock;
        totalComputedStock += varTotal;

        return {
          id: v.id,
          type: v.color && v.storage ? 'Unit' : (v.color ? 'Color' : 'Storage'),
          name: resolvedName,
          productId: autoProdId,
          price: v.price || editDevicePrice,
          cost: v.cost || editDeviceCost,
          stock: varTotal,
          tagoloanStock: tagStock,
          villanuevaStock: vilStock,
          jasaanStock: jasStock
        };
      });

      formData.append('variations', JSON.stringify(processedVariants));
      formData.append('deviceStocks', totalComputedStock.toString());
    }

    try {
      const res = await fetch(`/api/devices/${productToEdit.id}`, { method: 'PUT', body: formData });
      if (res.ok) {
        fetchProducts();
        setIsEditModalOpen(false);
        setSuccessModalContent({ title: 'Product Updated', message: `Product "${editDeviceName}" has been successfully updated.` });
        setSuccessModalOpen(true);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to update product');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while updating the product');
    } finally {
      setIsEditing(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/devices/${productToDelete}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteModalOpen(false);
        setProductToDelete(null);
        fetchProducts();
        setSuccessModalContent({ title: 'Product Deleted', message: 'The product and its associated variants have been removed.' });
        setSuccessModalOpen(true);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to delete product');
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting product');
    } finally {
      setIsDeleting(false);
    }
  };

  // PDF Export
  const downloadPDF = async () => {
    try {
      let url = `/api/devices?branch=${encodeURIComponent(userBranch)}&limit=1000`;
      if (selectedCondition !== 'all') {
        url += `&condition=${encodeURIComponent(selectedCondition)}`;
      }
      if (selectedCategory !== 'All' && selectedCategory !== 'All Categories') {
        url += `&categoryId=${encodeURIComponent(selectedCategory)}`;
      }
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      const allDevices = Array.isArray(data.devices) ? data.devices : (Array.isArray(data) ? data : []);

      await generateProductInventoryPDF({
        devices: allDevices,
        branch: userBranch,
        userRole: userRole || 'Cashier',
        conditionFilter: selectedCondition,
        searchQuery: searchQuery,
        categoryFilter: selectedCategory
      });
    } catch (e) {
      console.error("Failed to export Product Inventory PDF", e);
      alert("Failed to export Product Inventory PDF");
    }
  };

  // Excel / CSV Export
  const downloadExcel = async () => {
    try {
      const res = await fetch(`/api/devices?branch=${encodeURIComponent(userBranch)}&limit=1000`);
      const data = await res.json();
      const allDevices = Array.isArray(data.devices) ? data.devices : (Array.isArray(data) ? data : []);

      let csvContent = `Product Name,Brand,Type,Condition,Branch Stock,Base Price,Discount %,Cost\n`;

      allDevices.forEach((d: any) => {
        const name = `"${(d.name || '').replace(/"/g, '""')}"`;
        const brand = `"${(d.category?.name || '').replace(/"/g, '""')}"`;
        const type = `"${(d.type || 'Smartphone').replace(/"/g, '""')}"`;
        const condition = d.isPreOwned ? 'Pre-Owned' : 'New';
        const stock = d.stock || 0;
        const price = d.price || 0;
        const discount = d.discount || 0;
        const cost = d.cost || 0;
        csvContent += `${name},${brand},${type},${condition},${stock},${price},${discount},${cost}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Graphix_${userBranch}_Inventory_Report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("Failed to export CSV");
    }
  };

  return (
    <div className="flex flex-col gap-6 font-['Inter']">
      {/* Top Header & Assigned Branch Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white/95 backdrop-blur-md p-5 rounded-2xl border-2 border-purple-500/20 shadow-sm">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h2 className="text-[1.6rem] font-bold text-[#111] tracking-tight">Multi-Branch Inventory</h2>
            <span className="bg-blue-100 text-blue-700 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider border border-blue-200 flex items-center gap-1.5">
              <Building2 size={14} /> {userBranch.toUpperCase()} BRANCH CASHIER
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Organized by Product Name/Model with internal storage units and live stock tracking for {userBranch} branch.
          </p>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-100 border border-gray-300 rounded-xl px-4 py-2 text-sm font-bold text-gray-700">
            <Building2 size={18} className="text-blue-600" />
            <span>Assigned Branch: <strong className="text-blue-700">{userBranch}</strong></span>
          </div>

          {/* Stock Movement History Button */}
          <button
            onClick={() => setHistoryModalOpen(true)}
            className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3.5 py-2.5 rounded-xl font-bold transition-colors text-sm border border-gray-300 cursor-pointer"
            title="View stock movement history for assigned branch"
          >
            <History size={16} className="text-purple-600" />
            <span>Stock History</span>
          </button>
        </div>
      </div>

      {/* Filter & Action Controls Bar */}
      <div className="flex flex-wrap justify-between items-center gap-3 w-full">
        {/* Search */}
        <div className={`flex items-center bg-white border-2 ${styles.borderMain} rounded-full px-4 py-2.5 w-full sm:w-auto sm:min-w-[260px] shadow-sm`}>
          <Search className={`${styles.textActive} w-5 h-5 mr-2 shrink-0`} />
          <input 
            type="text" 
            placeholder="Search Model, Storage, Specs..." 
            value={searchQuery} 
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }} 
            className="border-none outline-none w-full text-[0.95rem] text-[#111] bg-transparent placeholder-gray-400 font-medium" 
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-black">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Stock Status Filter Pills */}
        <div className="flex items-center bg-white border border-gray-200 rounded-full p-1 shadow-sm gap-1">
          <button
            onClick={() => { setStockStatusFilter('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${stockStatusFilter === 'all' ? 'bg-[#5c0099] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            All Stock
          </button>
          <button
            onClick={() => { setStockStatusFilter('low'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${stockStatusFilter === 'low' ? 'bg-amber-500 text-white' : 'text-amber-700 hover:bg-amber-50'}`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span> Low Stock (&lt;5)
          </button>
          <button
            onClick={() => { setStockStatusFilter('out'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${stockStatusFilter === 'out' ? 'bg-rose-600 text-white' : 'text-rose-700 hover:bg-rose-50'}`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400"></span> Out of Stock (0)
          </button>
        </div>

        {/* Brand, Type, Condition Filters + Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Brand Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)} 
              className={`flex items-center gap-2 bg-white border-2 ${styles.borderMain} rounded-full px-4 py-2 font-semibold text-sm ${styles.textActive} hover:bg-gray-50 transition-colors shadow-sm cursor-pointer`}
            >
              <Filter size={16} />
              <span>{selectedCategory === 'All' ? 'All Brands' : (categories.find(c => c.id === selectedCategory)?.name || 'Brand')}</span>
              <ChevronDown size={16} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            {isFilterOpen && (
              <div className="absolute top-[115%] right-0 w-48 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 py-1 max-h-60 overflow-y-auto">
                <button 
                  onClick={() => { setSelectedCategory('All'); setIsFilterOpen(false); setCurrentPage(1); }} 
                  className={`w-full px-4 py-2 text-left text-sm font-medium hover:bg-gray-100 ${selectedCategory === 'All' ? 'text-[#5c0099] font-bold bg-purple-50' : 'text-gray-700'}`}
                >
                  All Brands
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat.id} 
                    onClick={() => { setSelectedCategory(cat.id); setIsFilterOpen(false); setCurrentPage(1); }} 
                    className={`w-full px-4 py-2 text-left text-sm font-medium hover:bg-gray-100 ${selectedCategory === cat.id ? 'text-[#5c0099] font-bold bg-purple-50' : 'text-gray-700'}`}
                  >
                    {cat.name}
                  </button>
                ))}
                <div className="border-t border-purple-100 mt-1 pt-1">
                  <button 
                    onClick={() => { setIsFilterOpen(false); setCategoriesModalOpen(true); }} 
                    className="w-full px-4 py-2 text-left text-xs font-bold text-[#5c0099] hover:bg-purple-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus size={14} /> + Add / Manage Brands
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Type Dropdown */}
          <select 
            value={selectedDeviceType} 
            onChange={(e) => { setSelectedDeviceType(e.target.value); setCurrentPage(1); }} 
            className={`bg-white border-2 ${styles.borderMain} rounded-full px-4 py-2 text-sm font-semibold ${styles.textActive} outline-none cursor-pointer shadow-sm`}
          >
            <option value="all">All Types</option>
            <option value="smartphone">Smartphones</option>
            <option value="laptop">Laptops</option>
            <option value="ipad">iPads/Tablets</option>
            <option value="tv">TVs</option>
            <option value="speaker">Speakers</option>
            <option value="phone accessories">Accessories</option>
          </select>

          {/* Condition Filter Dropdown */}
          <select
            value={selectedCondition}
            onChange={(e) => { setSelectedCondition(e.target.value as any); setCurrentPage(1); }}
            className={`bg-white border-2 ${styles.borderMain} rounded-full px-4 py-2 text-sm font-semibold ${styles.textActive} outline-none cursor-pointer shadow-sm`}
          >
            <option value="all">All Conditions</option>
            <option value="new">New</option>
            <option value="pre-owned">Pre-Owned</option>
          </select>

          {/* Export Buttons */}
          <button onClick={downloadPDF} className="flex items-center gap-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 px-3.5 py-2 rounded-full font-bold text-xs border border-rose-200 transition-colors shadow-sm cursor-pointer">
            <FileText size={14} /> PDF
          </button>
          <button onClick={downloadExcel} className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3.5 py-2 rounded-full font-bold text-xs border border-emerald-200 transition-colors shadow-sm cursor-pointer">
            <FileText size={14} /> Excel
          </button>

          {/* Add Brand Button */}
          <button 
            onClick={() => setCategoriesModalOpen(true)} 
            className="flex items-center gap-1.5 bg-purple-100 hover:bg-purple-200 text-[#5c0099] px-4 py-2 rounded-full font-bold text-xs shadow-xs transition-all cursor-pointer border border-purple-200"
            title="Add & Manage Brands"
          >
            <Plus size={16} />
            <span>Add Brand</span>
          </button>

          {/* Add Product Button */}
          <button 
            onClick={() => setIsAddModalOpen(true)} 
            className="flex items-center gap-2 bg-[#5c0099] hover:bg-[#470077] text-white px-5 py-2 rounded-full font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>Add Product</span>
          </button>

          {/* Add Discount Product Button - Directly Beside Add Product */}
          <button 
            onClick={() => handleOpenAddDiscount()} 
            className="flex items-center gap-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white px-5 py-2 rounded-full font-bold text-sm shadow-md transition-all cursor-pointer border border-purple-400/40"
            title="Apply discount to an existing product and variant"
          >
            <Percent size={17} className="text-amber-300" />
            <span>+ Add Discount Product</span>
          </button>
        </div>
      </div>

      {/* Main Model-Based Inventory Table with Expandable Storage Variants */}
      <div className={`bg-white/95 backdrop-blur-md border-2 ${styles.borderMain} rounded-2xl overflow-hidden shadow-sm flex flex-col`}>
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-[750px]">
            <thead>
              <tr className="bg-purple-50/70 text-gray-700 text-xs uppercase tracking-wider font-bold border-b border-purple-200/50">
                <th className="py-4 px-6">Product Model</th>
                <th className="py-4 px-4 text-center">Units Count</th>
                <th className="py-4 px-4 text-center">{userBranch} Stock</th>
                <th className="py-4 px-4 text-center">Active Branch Stock</th>
                <th className="py-4 px-4 text-center">Base Price</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 border-4 border-purple-200 border-t-[#5c0099] rounded-full animate-spin"></div>
                      <span className="text-gray-500 font-semibold animate-pulse">Loading cashier inventory...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length > 0 ? (
                products.map((prod) => {
                  const isExpanded = expandedModelId === prod.id;
                  const variants: VariantData[] = prod.variations || [];
                  const now = new Date();
                  const isDiscountActive = Boolean(
                    prod.discount && prod.discount > 0 &&
                    (!prod.discountStartDate || new Date(prod.discountStartDate) <= now) &&
                    (!prod.discountEndDate || new Date(prod.discountEndDate) >= now)
                  );
                  const isDiscountScheduled = Boolean(
                    prod.discount && prod.discount > 0 &&
                    prod.discountStartDate && new Date(prod.discountStartDate) > now
                  );
                  const isDiscountExpired = Boolean(
                    prod.discount && prod.discount > 0 &&
                    prod.discountEndDate && new Date(prod.discountEndDate) < now
                  );

                  const assignedStock = userBranch.toLowerCase() === 'villanueva'
                    ? (prod.villanuevaStock || 0)
                    : userBranch.toLowerCase() === 'jasaan'
                    ? (prod.jasaanStock || 0)
                    : (prod.tagoloanStock || 0);

                  return (
                    <React.Fragment key={prod.id}>
                      {/* Parent Model Row */}
                      <tr 
                        onClick={() => setExpandedModelId(isExpanded ? null : prod.id)}
                        className={`hover:bg-purple-50/40 transition-colors cursor-pointer ${isExpanded ? 'bg-purple-50/60 font-semibold' : ''}`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <button className="text-purple-700 hover:text-purple-900 transition-transform">
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                            <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                              {prod.image || (prod.images && prod.images[0]) ? (
                                <img src={prod.image || prod.images[0]} alt={prod.name} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon size={20} className="text-gray-400" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-900 text-sm md:text-base">{prod.name}</span>
                                {isDiscountActive && (
                                  <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-300 flex items-center gap-1 uppercase tracking-wider animate-pulse">
                                    <Percent size={11} /> DISCOUNT ({prod.discount}% OFF)
                                  </span>
                                )}
                                {isDiscountScheduled && (
                                  <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-300 uppercase tracking-wider">
                                    SCHEDULED DISCOUNT
                                  </span>
                                )}
                                {isDiscountExpired && (
                                  <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-300 uppercase tracking-wider">
                                    EXPIRED DISCOUNT
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-500">
                                  {prod.category?.name || prod.type || 'Smartphone'}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${prod.isPreOwned ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-emerald-700 bg-emerald-50 border border-emerald-200'}`}>
                                  {prod.isPreOwned ? 'Pre-Owned' : 'New'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-full border border-gray-200">
                            <Layers size={13} className="text-purple-600" />
                            {variants.length > 0 ? `${variants.length} Units` : 'Standard'}
                          </span>
                        </td>
                        {/* Assigned Branch Stock */}
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${assignedStock > 0 ? (assignedStock < 5 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800') : 'bg-rose-100 text-rose-700'}`}>
                            {assignedStock > 0 ? `${assignedStock} pcs` : 'Out of Stock'}
                          </span>
                        </td>
                        {/* Active Branch Stock */}
                        <td className="py-4 px-4 text-center font-bold">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${assignedStock > 0 ? (assignedStock < 5 ? 'bg-amber-500 text-white' : 'bg-purple-700 text-white') : 'bg-rose-600 text-white'}`}>
                            {assignedStock > 0 ? `${assignedStock} pcs` : 'Out of Stock'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-gray-900">
                          {isDiscountActive ? (
                            <div className="flex flex-col items-center">
                              <span className="text-[11px] text-gray-400 line-through">₱ {Number(prod.price || 0).toLocaleString()}</span>
                              <span className="text-[#bd00ff] font-black text-sm">
                                ₱ {Math.round(prod.price * (1 - prod.discount / 100)).toLocaleString()}
                              </span>
                              {prod.discountEndDate && (
                                <span className="text-[10px] text-rose-600 font-bold flex items-center gap-0.5">
                                  <Clock size={10} /> Ends {new Date(prod.discountEndDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span>₱ {Number(prod.price || 0).toLocaleString()}</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button 
                              onClick={() => handleOpenAddDiscount(prod)} 
                              className="text-rose-600 hover:text-rose-800 p-2 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Manage Discount"
                            >
                              <Percent size={17} />
                            </button>
                            <button 
                              onClick={() => handleEditClick(prod)} 
                              className="text-purple-600 hover:text-purple-800 p-2 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Model & Variants"
                            >
                              <Pencil size={17} />
                            </button>
                            <button 
                              onClick={() => { setProductToDelete(prod.id); setDeleteModalOpen(true); }} 
                              className="text-rose-500 hover:text-rose-700 p-2 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                              title="Delete Product"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Storage Variants Sub-Table */}
                      {isExpanded && (
                        <tr className="bg-purple-50/30 border-b-2 border-purple-200/40">
                          <td colSpan={6} className="p-4 sm:p-6">
                            <div className="bg-white rounded-xl border border-purple-200 p-4 shadow-sm flex flex-col gap-3">
                              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                <div className="flex items-center gap-2">
                                  <Package size={18} className="text-[#5c0099]" />
                                  <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wide flex items-center gap-2 flex-wrap">
                                    <span>{prod.name} – Units & {userBranch} Branch Inventory</span>
                                    {prod.isPreOwned && (
                                      <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-300 uppercase tracking-wider">
                                        PRE-OWNED
                                      </span>
                                    )}
                                  </h4>
                                </div>
                                <span className="text-xs text-gray-500">Quickly adjust stock or sell unit in POS</span>
                              </div>

                              {variants.length > 0 ? (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs text-left">
                                    <thead>
                                      <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                                        <th className="py-2.5 px-3">Unit</th>
                                        <th className="py-2.5 px-3">Color</th>
                                        <th className="py-2.5 px-3">Internal Storage</th>
                                        <th className="py-2.5 px-3 text-center">{userBranch} Stock</th>
                                        <th className="py-2.5 px-3 text-center">Active Branch Stock</th>
                                        <th className="py-2.5 px-3 text-right">Price</th>
                                        <th className="py-2.5 px-3 text-right">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 font-medium">
                                      {variants.map((v, vIdx) => {
                                        const vBranchStock = userBranch.toLowerCase() === 'villanueva'
                                          ? (v.villanuevaStock ?? (v.branchStocks?.Villanueva || 0))
                                          : userBranch.toLowerCase() === 'jasaan'
                                          ? (v.jasaanStock ?? (v.branchStocks?.Jasaan || 0))
                                          : (v.tagoloanStock ?? (v.branchStocks?.Tagoloan || 0));

                                        const { unitLabel, color, storage } = parseUnitDetails(prod.name, v);

                                        return (
                                          <tr key={v.id || vIdx} className="hover:bg-purple-50/50 transition-colors">
                                            <td className="py-3 px-3 font-bold text-gray-900">
                                              {unitLabel}
                                            </td>
                                            <td className="py-3 px-3">
                                              {color !== '—' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-800 border border-gray-200">
                                                  <span 
                                                    className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0" 
                                                    style={{ 
                                                      backgroundColor: color.toLowerCase() === 'black' ? '#111' 
                                                        : color.toLowerCase() === 'white' ? '#fff' 
                                                        : color.toLowerCase() === 'red' ? '#ef4444' 
                                                        : color.toLowerCase() === 'blue' ? '#3b82f6' 
                                                        : color.toLowerCase() === 'green' ? '#10b981' 
                                                        : color.toLowerCase() === 'gold' ? '#eab308' 
                                                        : color.toLowerCase() === 'silver' ? '#94a3b8' 
                                                        : color.toLowerCase() === 'purple' ? '#a855f7' 
                                                        : '#8b5cf6' 
                                                    }} 
                                                  />
                                                  {color}
                                                </span>
                                              ) : (
                                                <span className="text-gray-400 font-medium">—</span>
                                              )}
                                            </td>
                                            <td className="py-3 px-3">
                                              {storage !== '—' ? (
                                                <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded text-[11px] border border-purple-200">
                                                  {storage}
                                                </span>
                                              ) : (
                                                <span className="text-gray-400 font-medium">—</span>
                                              )}
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                              <span className={`px-2 py-0.5 rounded font-bold ${vBranchStock > 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                                {vBranchStock > 0 ? `${vBranchStock} pcs` : 'Out of Stock'}
                                              </span>
                                            </td>
                                            <td className="py-3 px-3 text-center font-bold text-gray-800">
                                              <span className={`px-2.5 py-0.5 rounded-full font-bold ${vBranchStock > 0 ? 'bg-purple-100 text-purple-800' : 'bg-rose-100 text-rose-700'}`}>
                                                {vBranchStock > 0 ? `${vBranchStock} pcs` : 'Out of Stock'}
                                              </span>
                                            </td>
                                            <td className="py-3 px-3 text-right font-bold text-[#5c0099]">
                                              ₱ {Number(v.price || prod.price).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                              <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                  onClick={() => {
                                                    setAdjustItem({ device: prod, variant: v });
                                                    setAdjustStockVal(String(vBranchStock));
                                                    setAdjustModalOpen(true);
                                                  }}
                                                  className="bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold px-2.5 py-1 rounded text-xs transition-colors cursor-pointer"
                                                  title="Quick Adjust Stock"
                                                >
                                                  Adjust Stock
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-gray-500 text-xs italic py-2">No individual units created. This item uses standard single inventory.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="text-gray-400 w-12 h-12" />
                      <span className="text-gray-600 font-bold text-base">No inventory products found</span>
                      <span className="text-gray-400 text-xs">Try adjusting your search or filters.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-wrap items-center justify-between p-4 bg-gray-50/80 border-t border-gray-100 gap-3">
          <span className="text-xs font-semibold text-gray-500">
            Showing Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-gray-700 px-2">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/* 1. POS IN-STORE SALE MODAL                                */}
      {/* ========================================================== */}
      {posModalOpen && posDevice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl border border-purple-100 animate-in zoom-in-95 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <ShoppingCart size={22} />
                <h3 className="font-bold text-lg">POS In-Store Sale</h3>
              </div>
              <button onClick={() => setPosModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handlePosSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-left">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-lg border border-emerald-200 flex items-center justify-center overflow-hidden shrink-0">
                  {posDevice.image || (posDevice.images && posDevice.images[0]) ? (
                    <img src={posDevice.image || posDevice.images[0]} alt={posDevice.name} className="w-full h-full object-cover" />
                  ) : (
                    <Smartphone size={20} className="text-emerald-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-sm">{posDevice.name}</h4>
                  {posVariant && <span className="text-xs text-emerald-800 font-semibold">{posVariant.name} ({posVariant.productId})</span>}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500 font-medium">Branch: <strong className="text-emerald-700">{userBranch}</strong></span>
                  </div>
                </div>
              </div>

              {/* Payment Type */}
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1.5">Payment Option *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPosPaymentType('Full')}
                    className={`py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${posPaymentType === 'Full' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                  >
                    Full Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosPaymentType('Downpayment')}
                    className={`py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${posPaymentType === 'Downpayment' ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                  >
                    Downpayment
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  max={posVariant ? ((posVariant as any)[`${userBranch.toLowerCase()}Stock`] || 99) : (posDevice.stock || 99)}
                  value={posQuantity}
                  onChange={(e) => setPosQuantity(Math.max(1, parseInt(e.target.value || '1', 10)))}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Downpayment Amount if selected */}
              {posPaymentType === 'Downpayment' && (
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Downpayment Amount (₱) *</label>
                  <input
                    type="number"
                    min="1"
                    value={posDownpaymentAmt}
                    onChange={(e) => setPosDownpaymentAmt(parseFloat(e.target.value) || 0)}
                    className="w-full border border-cyan-300 rounded-xl p-2.5 text-sm font-bold text-cyan-800 outline-none focus:ring-2 focus:ring-cyan-500"
                    required
                  />
                </div>
              )}

              {/* Customer Contact */}
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Customer Phone Number</label>
                <input
                  type="text"
                  placeholder="09123456789"
                  value={posCustomerPhone}
                  onChange={(e) => setPosCustomerPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Transaction Summary Box */}
              {(() => {
                const itemPrice = posVariant ? Number(posVariant.price || posDevice.price) : Number(posDevice.price || 0);
                const effectivePrice = posDevice.discount && posDevice.discount > 0 ? Math.round(itemPrice * (1 - posDevice.discount / 100)) : itemPrice;
                const total = effectivePrice * posQuantity;
                const balance = posPaymentType === 'Downpayment' ? Math.max(0, total - posDownpaymentAmt) : 0;

                return (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>Unit Price:</span>
                      <span className="font-semibold">₱{effectivePrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Total Price:</span>
                      <span className="font-bold text-gray-900">₱{total.toLocaleString()}</span>
                    </div>
                    {posPaymentType === 'Downpayment' && (
                      <>
                        <div className="flex justify-between text-cyan-700 font-bold">
                          <span>Amount Due Now:</span>
                          <span>₱{posDownpaymentAmt.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-rose-600 font-bold">
                          <span>Remaining Balance:</span>
                          <span>₱{balance.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPosModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={posSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {posSubmitting ? 'Processing...' : 'Confirm POS Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 2. ADD DISCOUNT PRODUCT MODAL                             */}
      {/* ========================================================== */}
      {discountModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border border-purple-100 animate-in zoom-in-95 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Percent size={20} className="text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Apply Product Discount</h3>
                  <p className="text-xs text-purple-200">Configure discounts for {userBranch} branch</p>
                </div>
              </div>
              <button onClick={() => setDiscountModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveDiscount} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 text-left">
              {discountError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{discountError}</span>
                </div>
              )}

              {/* Product Selection */}
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Select Product *</label>
                <select
                  value={discountDeviceId}
                  onChange={(e) => {
                    setDiscountDeviceId(e.target.value);
                    setDiscountVariantId('');
                  }}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  required
                >
                  {allEligibleProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category?.name || p.type || 'Device'}) — ₱{Number(p.price || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Storage Variant Target (Optional) */}
              {(() => {
                const selectedProd = allEligibleProducts.find(p => p.id === discountDeviceId);
                const vars = selectedProd?.variations || [];
                if (vars.length === 0) return null;
                return (
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Target Storage Variant (Optional)</label>
                    <select
                      value={discountVariantId}
                      onChange={(e) => setDiscountVariantId(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                    >
                      <option value="">All Storage Variants (Base Model)</option>
                      {vars.map((v: any) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.productId || 'Variant'}) — ₱{Number(v.price || selectedProd.price).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })()}

              {/* Discount Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Discount Type *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDiscountType('PERCENTAGE')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${discountType === 'PERCENTAGE' ? 'bg-[#5c0099] text-white border-[#5c0099] shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                    >
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('FIXED')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${discountType === 'FIXED' ? 'bg-[#5c0099] text-white border-[#5c0099] shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                    >
                      Fixed Amount (₱)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
                    {discountType === 'PERCENTAGE' ? 'Discount Percentage (%) *' : 'Discount Amount (₱ < 2,000) *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={discountType === 'PERCENTAGE' ? 99 : 1999}
                    step={discountType === 'PERCENTAGE' ? '1' : '0.01'}
                    placeholder={discountType === 'PERCENTAGE' ? 'e.g. 50' : 'e.g. 500'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-[#5c0099] outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Start Date & Time *</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={discountStartDate}
                      onChange={(e) => setDiscountStartDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                    <input
                      type="time"
                      value={discountStartTime}
                      onChange={(e) => setDiscountStartTime(e.target.value)}
                      className="border border-gray-300 rounded-xl p-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">End Date & Time *</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={discountEndDate}
                      onChange={(e) => setDiscountEndDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                    <input
                      type="time"
                      value={discountEndTime}
                      onChange={(e) => setDiscountEndTime(e.target.value)}
                      className="border border-gray-300 rounded-xl p-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Box */}
              {(() => {
                const selectedProd = allEligibleProducts.find(p => p.id === discountDeviceId);
                if (!selectedProd) return null;
                const basePrice = Number(selectedProd.price || 0);
                const numVal = parseFloat(discountValue) || 0;
                let discountedPrice = basePrice;
                if (discountType === 'PERCENTAGE' && numVal > 0) {
                  discountedPrice = Math.max(0, Math.round(basePrice * (1 - numVal / 100)));
                } else if (discountType === 'FIXED' && numVal > 0) {
                  discountedPrice = Math.max(0, Math.round(basePrice - numVal));
                }

                return (
                  <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 flex flex-col gap-2">
                    <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">Live Discount Preview</span>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-gray-500 line-through">₱ {basePrice.toLocaleString()}</span>
                        <div className="text-lg font-black text-[#5c0099]">
                          ₱ {discountedPrice.toLocaleString()}
                        </div>
                      </div>
                      <span className="bg-rose-100 text-rose-700 text-xs font-black px-3 py-1 rounded-full border border-rose-300">
                        {discountType === 'PERCENTAGE' ? `${numVal}% OFF` : `₱${numVal} OFF`}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setDiscountModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingDiscount}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingDiscount ? 'Applying...' : 'Save & Apply Discount'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 3. ACTIVE DISCOUNTS MANAGER MODAL                         */}
      {/* ========================================================== */}
      {discountsListModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-purple-100 animate-in zoom-in-95 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <Percent size={22} className="text-amber-300" />
                <div>
                  <h3 className="font-bold text-lg leading-tight">Branch Discounts</h3>
                  <p className="text-xs text-purple-200">Active, Scheduled, and Expired promotions for {userBranch}</p>
                </div>
              </div>
              <button onClick={() => setDiscountsListModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X size={22} />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-full p-1 shadow-sm">
                <button
                  onClick={() => setDiscountFilterStatus('ALL')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${discountFilterStatus === 'ALL' ? 'bg-[#5c0099] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  All ({discountsList.length})
                </button>
                <button
                  onClick={() => setDiscountFilterStatus('ACTIVE')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${discountFilterStatus === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'}`}
                >
                  Active
                </button>
                <button
                  onClick={() => setDiscountFilterStatus('SCHEDULED')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${discountFilterStatus === 'SCHEDULED' ? 'bg-blue-600 text-white' : 'text-blue-700 hover:bg-blue-50'}`}
                >
                  Scheduled
                </button>
                <button
                  onClick={() => setDiscountFilterStatus('EXPIRED')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${discountFilterStatus === 'EXPIRED' ? 'bg-gray-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Expired
                </button>
              </div>

              <button
                onClick={() => {
                  setDiscountsListModalOpen(false);
                  handleOpenAddDiscount();
                }}
                className="flex items-center gap-1.5 bg-[#5c0099] hover:bg-[#470077] text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
              >
                <Plus size={15} /> Add Discount
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {isDiscountsLoading ? (
                <div className="py-16 text-center text-gray-500 font-semibold">Loading discounts...</div>
              ) : discountsList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {discountsList
                    .filter(d => {
                      if (discountFilterStatus === 'ALL') return true;
                      return d.status === discountFilterStatus;
                    })
                    .map((item) => (
                      <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col justify-between gap-3 hover:border-purple-300 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center overflow-hidden shrink-0">
                              {item.device?.image ? (
                                <img src={item.device.image} alt={item.device?.name} className="w-full h-full object-cover" />
                              ) : (
                                <Smartphone size={20} className="text-purple-600" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 text-sm">{item.device?.name || 'Device'}</h4>
                              {item.variant && (
                                <span className="text-xs text-gray-500 font-medium">Variant: {item.variant.name} ({item.variant.productId})</span>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${item.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : item.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-gray-100 text-gray-600 border border-gray-300'}`}>
                                  {item.status}
                                </span>
                                <span className="bg-rose-100 text-rose-700 text-xs font-black px-2 py-0.5 rounded-md">
                                  {item.discountType === 'PERCENTAGE' ? `${item.discountValue}% OFF` : `₱${item.discountValue} OFF`}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemoveDiscount(item.id, item.device?.name || 'Device')}
                            className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove Discount"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="border-t border-gray-100 pt-2 flex flex-col gap-1 text-xs text-gray-600">
                          <div className="flex justify-between">
                            <span>Base Price:</span>
                            <span className="line-through text-gray-400">₱{Number(item.device?.price || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between font-bold text-gray-900">
                            <span>Discounted Price:</span>
                            <span className="text-[#5c0099]">
                              ₱{Math.round(item.device?.price * (1 - (item.discountValue || 0) / 100)).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                            <span>Duration:</span>
                            <span>{new Date(item.startDate).toLocaleDateString()} – {new Date(item.endDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="py-16 text-center text-gray-500 font-semibold">
                  No discounts found for {userBranch} branch.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 4. STOCK MOVEMENT HISTORY MODAL                           */}
      {/* ========================================================== */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-purple-100 animate-in zoom-in-95 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-purple-800 to-indigo-800 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <History size={22} />
                <h3 className="font-bold text-lg">Stock Movement History ({userBranch} Branch)</h3>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X size={22} />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-600">Type:</span>
                <select
                  value={historyTypeFilter}
                  onChange={(e) => setHistoryTypeFilter(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-800 outline-none cursor-pointer"
                >
                  <option value="ALL">All Movements</option>
                  <option value="TRANSFER_IN">Transfer In</option>
                  <option value="TRANSFER_OUT">Transfer Out</option>
                  <option value="ADJUSTMENT">Adjustments</option>
                  <option value="SALE">Sales / Deductions</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {isHistoryLoading ? (
                <div className="py-16 text-center text-gray-500 font-semibold">Loading stock history...</div>
              ) : movements.length > 0 ? (
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 uppercase">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">Product / Variant</th>
                      <th className="py-3 px-3 text-center">Change</th>
                      <th className="py-3 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {movements.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${m.type.includes('IN') || m.type === 'RESTOCK' ? 'bg-emerald-100 text-emerald-800' : m.type.includes('OUT') || m.type === 'SALE' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'}`}>
                            {m.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-gray-900">
                          {m.device?.name || 'Device'} {m.variation?.name ? `(${m.variation.name})` : ''}
                        </td>
                        <td className="py-3 px-3 text-center font-bold">
                          <span className={m.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-600">{m.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-16 text-center text-gray-500 font-semibold">No stock movements recorded.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 5. PHYSICAL UNITS / IMEI MODAL                            */}
      {/* ========================================================== */}
      {unitsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-purple-100 animate-in zoom-in-95 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-purple-800 to-indigo-800 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <Smartphone size={22} />
                <h3 className="font-bold text-lg">Unit IMEIs & Physical Records ({userBranch})</h3>
              </div>
              <button onClick={() => setUnitsModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X size={22} />
              </button>
            </div>

            {/* Register IMEI Form */}
            <form onSubmit={handleRegisterImei} className="p-4 bg-purple-50/70 border-b border-purple-200 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Enter 15-Digit IMEI Number..."
                  value={newImeiInput}
                  onChange={(e) => setNewImeiInput(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  required
                />
              </div>

              <select
                value={newImeiDeviceId}
                onChange={(e) => setNewImeiDeviceId(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500 bg-white cursor-pointer"
                required
              >
                <option value="">Select Product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <button
                type="submit"
                disabled={isRegisteringImei}
                className="bg-[#5c0099] hover:bg-[#470077] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {isRegisteringImei ? 'Registering...' : '+ Register IMEI'}
              </button>
            </form>

            <div className="flex-1 overflow-y-auto p-5">
              {isUnitsLoading ? (
                <div className="py-16 text-center text-gray-500 font-semibold">Loading IMEI records...</div>
              ) : deviceUnits.length > 0 ? (
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 uppercase">
                      <th className="py-3 px-3">IMEI</th>
                      <th className="py-3 px-3">Product Name</th>
                      <th className="py-3 px-3">Condition</th>
                      <th className="py-3 px-3">Internal Storage</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Date Added</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {deviceUnits.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="py-3 px-3 font-mono font-bold text-purple-700">{u.imei}</td>
                        <td className="py-3 px-3 font-bold text-gray-900">{u.device?.name || 'Device'}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.device?.isPreOwned ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {u.device?.isPreOwned ? 'Pre-Owned' : 'New'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-gray-800">{u.variation?.name || u.productId || '—'}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${u.status === 'Available' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-16 text-center text-gray-500 font-semibold">No IMEI records found for {userBranch} branch.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 6. QUICK STOCK ADJUSTMENT MODAL                           */}
      {/* ========================================================== */}
      {adjustModalOpen && adjustItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-purple-100 animate-in zoom-in-95 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-purple-800 to-indigo-800 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Adjust Branch Stock</h3>
              <button onClick={() => setAdjustModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-6 flex flex-col gap-4 text-left">
              <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 text-xs text-purple-900 font-medium">
                Adjusting stock for <strong>{adjustItem.device.name}</strong> {adjustItem.variant ? `(${adjustItem.variant.name})` : ''} at <strong>{userBranch} Branch</strong>.
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Adjustment Action *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('SET')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${adjustType === 'SET' ? 'bg-[#5c0099] text-white border-[#5c0099]' : 'bg-gray-50 text-gray-700 border-gray-300'}`}
                  >
                    Set Exact Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('ADD')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${adjustType === 'ADD' ? 'bg-[#5c0099] text-white border-[#5c0099]' : 'bg-gray-50 text-gray-700 border-gray-300'}`}
                  >
                    Add / Restock
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
                  {adjustType === 'SET' ? 'New Total Quantity' : 'Quantity to Add'} *
                </label>
                <input
                  type="number"
                  min="0"
                  value={adjustStockVal}
                  onChange={(e) => setAdjustStockVal(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Notes / Reason (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Stock shipment received"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjusting}
                  className="px-5 py-2 bg-[#5c0099] hover:bg-[#470077] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isAdjusting ? 'Saving...' : 'Save Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 7. ADD PRODUCT MODAL                                      */}
      {/* ========================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-purple-100 animate-in zoom-in-95 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-purple-800 to-indigo-800 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <Plus size={22} />
                <h3 className="font-bold text-lg">Add New Product & Storage Variants</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 text-left">
              {/* Basic Details */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Product Name / Model *</label>
                  <input
                    type="text"
                    placeholder="e.g. iPhone 13 Pro Max"
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Product Condition *</label>
                  <select
                    value={newDeviceIsPreOwned ? 'pre-owned' : 'new'}
                    onChange={(e) => setNewDeviceIsPreOwned(e.target.value === 'pre-owned')}
                    className="w-full border border-purple-300 bg-purple-50/50 rounded-xl p-2.5 text-sm font-bold text-[#5c0099] outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="new">New</option>
                    <option value="pre-owned">Pre-Owned</option>
                  </select>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block">Brand / Category *</label>
                    <button
                      type="button"
                      onClick={() => setCategoriesModalOpen(true)}
                      className="text-[11px] font-bold text-[#5c0099] hover:underline flex items-center gap-0.5 bg-transparent border-none cursor-pointer p-0"
                    >
                      <Plus size={12} /> Add Brand
                    </button>
                  </div>
                  <select
                    value={newDeviceCategory}
                    onChange={(e) => setNewDeviceCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                    required
                  >
                    <option value="">Select Brand...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Branch</label>
                  <div className="w-full bg-gray-100 border border-gray-200 rounded-xl p-2.5 text-sm font-bold text-gray-700">
                    {userBranch} Branch
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Base Cost (₱) *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="4500"
                    value={newDeviceCost}
                    onChange={(e) => setNewDeviceCost(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Base Price (₱) *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="5999"
                    value={newDevicePrice}
                    onChange={(e) => setNewDevicePrice(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-[#5c0099] outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Device Type</label>
                  <select
                    value={newDeviceType}
                    onChange={(e) => setNewDeviceType(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="Smartphone">Smartphone</option>
                    <option value="Laptop">Laptop</option>
                    <option value="iPad">iPad / Tablet</option>
                    <option value="TV">TV</option>
                    <option value="Speaker">Speaker</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>
              </div>

              {/* Units & Storage Variants Table */}
              <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers size={18} className="text-[#5c0099]" />
                    <h4 className="font-bold text-sm text-gray-900 uppercase tracking-wider">
                      Units, Color & Internal Storage
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAddVariants(prev => [
                        ...prev,
                        { type: 'Storage', name: '512 GB', color: '', storage: '512 GB', productId: '', price: '', cost: '', tagoloanStock: '0', villanuevaStock: '0', jasaanStock: '0' }
                      ]);
                    }}
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> Add Unit
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left bg-white rounded-xl border border-purple-100 overflow-hidden">
                    <thead>
                      <tr className="bg-purple-100/70 text-purple-900 font-bold border-b border-purple-200">
                        <th className="py-2.5 px-3">Unit</th>
                        <th className="py-2.5 px-3">Color</th>
                        <th className="py-2.5 px-3">Internal Storage</th>
                        <th className="py-2.5 px-3 text-center">{userBranch} Stock</th>
                        <th className="py-2.5 px-3 text-right">Price (₱)</th>
                        <th className="py-2.5 px-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {addVariants.map((v, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={v.name}
                              onChange={(e) => {
                                const updated = [...addVariants];
                                updated[idx]!.name = e.target.value;
                                setAddVariants(updated);
                              }}
                              className="border border-gray-300 rounded-lg p-1.5 text-xs font-bold w-24 outline-none"
                              placeholder="32 GB"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={v.color || ''}
                              onChange={(e) => {
                                const updated = [...addVariants];
                                updated[idx]!.color = e.target.value;
                                setAddVariants(updated);
                              }}
                              className="border border-gray-300 rounded-lg p-1.5 text-xs font-medium w-20 outline-none"
                              placeholder="Red"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={v.storage || ''}
                              onChange={(e) => {
                                const updated = [...addVariants];
                                updated[idx]!.storage = e.target.value;
                                setAddVariants(updated);
                              }}
                              className="border border-purple-200 bg-purple-50/50 rounded-lg p-1.5 text-xs font-bold text-purple-900 w-24 outline-none"
                              placeholder="32 GB"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={userBranch === 'Tagoloan' ? v.tagoloanStock : (userBranch === 'Villanueva' ? v.villanuevaStock : v.jasaanStock)}
                              onChange={(e) => {
                                const updated = [...addVariants];
                                if (userBranch === 'Tagoloan') updated[idx]!.tagoloanStock = e.target.value;
                                else if (userBranch === 'Villanueva') updated[idx]!.villanuevaStock = e.target.value;
                                else updated[idx]!.jasaanStock = e.target.value;
                                setAddVariants(updated);
                              }}
                              className="border border-gray-300 rounded-lg p-1.5 text-xs font-bold w-20 text-center outline-none"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              placeholder={newDevicePrice || "5999"}
                              value={v.price}
                              onChange={(e) => {
                                const updated = [...addVariants];
                                updated[idx]!.price = e.target.value;
                                setAddVariants(updated);
                              }}
                              className="border border-gray-300 rounded-lg p-1.5 text-xs font-bold text-[#5c0099] w-24 text-right outline-none"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => setAddVariants(prev => prev.filter((_, i) => i !== idx))}
                              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Product Photos Upload (1 to 5) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block">
                  Product Photos (1 to 5 Images) *
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {newDeviceImagePreviews.map((prevUrl, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl border-2 border-purple-200 overflow-hidden group">
                      <img src={prevUrl} alt="preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setNewDeviceImages(prev => prev.filter((_, i) => i !== idx));
                          setNewDeviceImagePreviews(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {newDeviceImages.length < 5 && (
                    <label className="w-20 h-20 rounded-xl border-2 border-dashed border-purple-300 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-purple-50 text-purple-600 transition-colors">
                      <Upload size={20} />
                      <span className="text-[10px] font-bold">Add Photo</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => e.target.files && handleAddProductImages(e.target.files)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Description / Specs */}
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Specs / Description</label>
                <textarea
                  rows={3}
                  placeholder="Technical specifications, included items, warranty notes..."
                  value={newDeviceSpecs}
                  onChange={(e) => setNewDeviceSpecs(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-6 py-2.5 bg-[#5c0099] hover:bg-[#470077] text-white rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isAdding ? 'Adding Product...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 8. EDIT PRODUCT MODAL                                     */}
      {/* ========================================================== */}
      {isEditModalOpen && productToEdit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-purple-100 animate-in zoom-in-95 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-purple-800 to-indigo-800 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <Pencil size={22} />
                <h3 className="font-bold text-lg">Edit Product: {productToEdit.name}</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleEditProductSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 text-left">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Product Name / Model *</label>
                  <input
                    type="text"
                    value={editDeviceName}
                    onChange={(e) => setEditDeviceName(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Product Condition *</label>
                  <select
                    value={editDeviceIsPreOwned ? 'pre-owned' : 'new'}
                    onChange={(e) => setEditDeviceIsPreOwned(e.target.value === 'pre-owned')}
                    className="w-full border border-purple-300 bg-purple-50/50 rounded-xl p-2.5 text-sm font-bold text-[#5c0099] outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="new">New</option>
                    <option value="pre-owned">Pre-Owned</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Brand / Category *</label>
                  <select
                    value={editDeviceCategory}
                    onChange={(e) => setEditDeviceCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                    required
                  >
                    <option value="">Select Brand...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Base Cost (₱) *</label>
                  <input
                    type="number"
                    min="0"
                    value={editDeviceCost}
                    onChange={(e) => setEditDeviceCost(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Base Price (₱) *</label>
                  <input
                    type="number"
                    min="0"
                    value={editDevicePrice}
                    onChange={(e) => setEditDevicePrice(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-[#5c0099] outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Device Type</label>
                  <select
                    value={editDeviceType}
                    onChange={(e) => setEditDeviceType(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="Smartphone">Smartphone</option>
                    <option value="Laptop">Laptop</option>
                    <option value="iPad">iPad / Tablet</option>
                    <option value="TV">TV</option>
                    <option value="Speaker">Speaker</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>
              </div>

              {/* Photos Edit */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block">
                  Product Photos (1 to 5 Images) *
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {editImages.map((item, idx) => (
                    <div key={item.id} className="relative w-20 h-20 rounded-xl border-2 border-purple-200 overflow-hidden group">
                      <img src={item.url} alt="product photo" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setEditImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {editImages.length < 5 && (
                    <label className="w-20 h-20 rounded-xl border-2 border-dashed border-purple-300 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-purple-50 text-purple-600 transition-colors">
                      <Upload size={20} />
                      <span className="text-[10px] font-bold">Add Photo</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files) {
                            const files = Array.from(e.target.files);
                            const remaining = 5 - editImages.length;
                            const toAdd = files.slice(0, remaining).map(file => ({
                              id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                              type: 'new' as const,
                              url: URL.createObjectURL(file),
                              file
                            }));
                            setEditImages(prev => [...prev, ...toAdd]);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Specs / Description</label>
                <textarea
                  rows={3}
                  value={editDeviceSpecs}
                  onChange={(e) => setEditDeviceSpecs(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Units & Internal Storage Section */}
              <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers size={18} className="text-[#5c0099]" />
                    <h4 className="font-bold text-sm text-gray-900 uppercase tracking-wider">
                      Units & Internal Storage
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditVariants(prev => [
                        ...prev,
                        {
                          type: 'Storage',
                          name: '128 GB',
                          color: '',
                          storage: '128 GB',
                          productId: '',
                          price: editDevicePrice || '',
                          cost: editDeviceCost || '',
                          tagoloanStock: '0',
                          villanuevaStock: '0',
                          jasaanStock: '0'
                        }
                      ]);
                    }}
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> Add Unit
                  </button>
                </div>

                {editVariants.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left bg-white rounded-xl border border-purple-100 overflow-hidden">
                      <thead>
                        <tr className="bg-purple-100/70 text-purple-900 font-bold border-b border-purple-200">
                          <th className="py-2.5 px-3">Unit</th>
                          <th className="py-2.5 px-3">Color</th>
                          <th className="py-2.5 px-3">Internal Storage</th>
                          <th className="py-2.5 px-3 text-right">Base Price (₱)</th>
                          <th className="py-2.5 px-3 text-center">Stock</th>
                          <th className="py-2.5 px-2 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {editVariants.map((v, idx) => (
                          <tr key={v.id || idx}>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={v.name}
                                onChange={(e) => {
                                  const updated = [...editVariants];
                                  updated[idx]!.name = e.target.value;
                                  setEditVariants(updated);
                                }}
                                className="border border-gray-300 rounded-lg p-1.5 text-xs font-bold w-28 outline-none"
                                placeholder="e.g. 32 GB, Red"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={v.color || ''}
                                onChange={(e) => {
                                  const updated = [...editVariants];
                                  updated[idx]!.color = e.target.value;
                                  setEditVariants(updated);
                                }}
                                className="border border-gray-300 rounded-lg p-1.5 text-xs font-medium w-20 outline-none"
                                placeholder="Red"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={v.storage || ''}
                                onChange={(e) => {
                                  const updated = [...editVariants];
                                  updated[idx]!.storage = e.target.value;
                                  setEditVariants(updated);
                                }}
                                className="border border-purple-200 bg-purple-50/50 rounded-lg p-1.5 text-xs font-bold text-purple-900 w-24 outline-none"
                                placeholder="32 GB"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                placeholder={editDevicePrice || "5999"}
                                value={v.price}
                                onChange={(e) => {
                                  const updated = [...editVariants];
                                  updated[idx]!.price = e.target.value;
                                  setEditVariants(updated);
                                }}
                                className="border border-gray-300 rounded-lg p-1.5 text-xs font-bold text-[#5c0099] w-24 text-right outline-none"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-700">
                                {(parseInt(v.tagoloanStock || '0') + parseInt(v.villanuevaStock || '0') + parseInt(v.jasaanStock || '0'))} pcs
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => setEditVariants(prev => prev.filter((_, i) => i !== idx))}
                                className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                title="Remove Unit"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-white rounded-xl border border-dashed border-gray-200">
                    <p className="text-xs text-gray-500 italic">No specific units configured. Standard single model inventory used.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="px-6 py-2.5 bg-[#5c0099] hover:bg-[#470077] text-white rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isEditing ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 9. MANAGE BRANDS MODAL                                    */}
      {/* ========================================================== */}
      {categoriesModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border border-purple-100 animate-in zoom-in-95 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-purple-800 to-indigo-800 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <Tag size={22} />
                <h3 className="font-bold text-lg">Manage Brands / Categories</h3>
              </div>
              <button onClick={() => setCategoriesModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X size={22} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6 overflow-y-auto flex-1">
              {/* Add New Brand */}
              <form onSubmit={handleAddCategory} className="bg-purple-50/70 p-4 rounded-xl border border-purple-200 flex flex-col gap-3">
                <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">Add New Brand</span>
                <div className="flex items-center gap-3">
                  <label className="w-12 h-12 rounded-xl border-2 border-dashed border-purple-300 flex items-center justify-center cursor-pointer hover:bg-purple-100 text-purple-600 shrink-0 overflow-hidden relative">
                    {newCatImagePreview ? (
                      <img src={newCatImagePreview} alt="Logo preview" className="w-full h-full object-cover" />
                    ) : (
                      <Upload size={18} />
                    )}
                    <input type="file" accept="image/*" onChange={handleCatImageChange} className="hidden" />
                  </label>
                  <input
                    type="text"
                    placeholder="Brand name (e.g. Apple, Samsung, Vivo)..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  />
                  <button
                    type="submit"
                    disabled={isAddingCat || !newCatName.trim()}
                    className="bg-[#5c0099] hover:bg-[#470077] text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isAddingCat ? 'Adding...' : '+ Add'}
                  </button>
                </div>
              </form>

              {/* Brands List */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Existing Brands ({categories.length})</span>
                <div className="grid grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-xl hover:border-purple-200 transition-colors">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                          {cat.logoUrl ? (
                            <img src={cat.logoUrl} alt={cat.name} className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-[10px] font-black text-gray-400">{cat.name.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-gray-800 truncate">{cat.name}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Delete Brand"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 10. DELETE CONFIRMATION MODAL                             */}
      {/* ========================================================== */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 flex flex-col items-center text-center shadow-2xl border border-rose-100 animate-in zoom-in-95">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
              <AlertCircle size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Product?</h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Are you sure you want to delete this product? All corresponding storage variants and stock tracking records will be permanently removed.
            </p>
            <div className="flex items-center justify-center gap-3 w-full">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 11. SUCCESS MODAL                                         */}
      {/* ========================================================== */}
      {successModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col items-center text-center shadow-2xl border border-emerald-100 animate-in zoom-in-95">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={30} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{successModalContent.title}</h3>
            <p className="text-xs text-gray-600 mb-6 leading-relaxed">
              {successModalContent.message}
            </p>
            <button
              onClick={() => setSuccessModalOpen(false)}
              className="w-full px-6 py-2.5 bg-[#5c0099] hover:bg-[#470077] text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 12. ERROR MODAL                                           */}
      {/* ========================================================== */}
      {errorModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col items-center text-center shadow-2xl border border-rose-100 animate-in zoom-in-95">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
              <AlertCircle size={30} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{errorModalContent.title}</h3>
            <p className="text-xs text-gray-600 mb-6 leading-relaxed">
              {errorModalContent.message}
            </p>
            <button
              onClick={() => setErrorModalOpen(false)}
              className="w-full px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
