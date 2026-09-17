"use client";

import React, { useState, useEffect, useRef, Fragment } from 'react';
import { 
  Search, Filter, ChevronDown, ChevronUp, Trash2, ChevronLeft, ChevronRight, 
  X, Plus, Pencil, Upload, AlertCircle, Trash, CheckCircle2, FileText, 
  ArrowRightLeft, History, Smartphone, Building2, Package, Layers, ShieldCheck,
  Image as ImageIcon, Sparkles
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useBranch } from '../../context/BranchContext';
import imageCompression from 'browser-image-compression';

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

export default function AdminInventory() {
  const { styles } = useTheme();
  const { selectedBranch, setSelectedBranch, branches, isSuperAdmin, userBranch, userRole } = useBranch();

  // Search, Filter & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 8;

  // Products Data
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);

  // Categories
  const [categories, setCategories] = useState<{ id: string, name: string, logoUrl?: string }[]>([]);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatImage, setNewCatImage] = useState<File | null>(null);
  const [newCatImagePreview, setNewCatImagePreview] = useState<string | null>(null);
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [isDeleteCatMode, setIsDeleteCatMode] = useState(false);
  const [selectedCatsToDelete, setSelectedCatsToDelete] = useState<string[]>([]);
  const [isDeletingCats, setIsDeletingCats] = useState(false);

  // Modals
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successModalContent, setSuccessModalContent] = useState({ title: '', message: '' });
  const [viewMoreProduct, setViewMoreProduct] = useState<any | null>(null);
  const [selectedMobileProduct, setSelectedMobileProduct] = useState<any | null>(null);

  // Transfer Modal State (Super Admin & Authorized)
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferDeviceId, setTransferDeviceId] = useState('');
  const [transferVariationId, setTransferVariationId] = useState('');
  const [transferFromBranch, setTransferFromBranch] = useState('Tagoloan');
  const [transferToBranch, setTransferToBranch] = useState('Villanueva');
  const [transferQuantity, setTransferQuantity] = useState('1');
  const [transferNotes, setTransferNotes] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Quick Stock Adjustment Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<{ device: any, variant?: VariantData } | null>(null);
  const [adjustBranch, setAdjustBranch] = useState('Tagoloan');
  const [adjustStockVal, setAdjustStockVal] = useState('');
  const [adjustType, setAdjustType] = useState<'SET' | 'ADD'>('SET');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // History / Movements Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [movements, setMovements] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyBranchFilter, setHistoryBranchFilter] = useState('all');
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
  const [newImeiBranch, setNewImeiBranch] = useState('Tagoloan');
  const [isRegisteringImei, setIsRegisteringImei] = useState(false);
  const [imeiError, setImeiError] = useState<string | null>(null);

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

  // Helpers for Add Product Images (1 to 5)
  const handleAddProductImages = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(f => {
      const isImg = f.type.startsWith('image/');
      const isValidSize = f.size <= 10 * 1024 * 1024;
      if (!isImg) alert(`${f.name} is not a valid image format (JPG, PNG, WEBP).`);
      else if (!isValidSize) alert(`${f.name} exceeds the 10MB file size limit.`);
      return isImg && isValidSize;
    });

    if (validFiles.length === 0) return;

    const remainingSlots = 5 - newDeviceImages.length;
    if (remainingSlots <= 0) {
      alert('You have already added the maximum limit of 5 product images.');
      return;
    }

    const filesToAdd = validFiles.slice(0, remainingSlots);
    if (validFiles.length > remainingSlots) {
      alert(`Only ${remainingSlots} more image(s) could be added. Maximum 5 images allowed per product.`);
    }

    const newPreviews = filesToAdd.map(f => URL.createObjectURL(f));
    setNewDeviceImages(prev => [...prev, ...filesToAdd]);
    setNewDeviceImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const handleRemoveAddProductImage = (idx: number) => {
    setNewDeviceImages(prev => prev.filter((_, i) => i !== idx));
    setNewDeviceImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleMoveAddProductImage = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= newDeviceImages.length) return;
    setNewDeviceImages(prev => {
      const updated = [...prev];
      const [item] = updated.splice(fromIdx, 1);
      if (item) updated.splice(toIdx, 0, item);
      return updated;
    });
    setNewDeviceImagePreviews(prev => {
      const updated = [...prev];
      const [item] = updated.splice(fromIdx, 1);
      if (item) updated.splice(toIdx, 0, item);
      return updated;
    });
  };

  // Dynamic Variants for Add Product (Storage Variants with Product IDs & Branch Stocks)
  const [newDeviceBranch, setNewDeviceBranch] = useState<string>('Tagoloan');
  const [addVariants, setAddVariants] = useState<{
    type: string;
    name: string;
    productId: string;
    price: string;
    cost: string;
    tagoloanStock: string;
    villanuevaStock: string;
    jasaanStock: string;
  }[]>([
    { type: 'Storage', name: '32 GB', productId: '', price: '', cost: '', tagoloanStock: '0', villanuevaStock: '0', jasaanStock: '0' },
    { type: 'Storage', name: '64 GB', productId: '', price: '', cost: '', tagoloanStock: '0', villanuevaStock: '0', jasaanStock: '0' },
    { type: 'Storage', name: '128 GB', productId: '', price: '', cost: '', tagoloanStock: '0', villanuevaStock: '0', jasaanStock: '0' },
    { type: 'Storage', name: '256 GB', productId: '', price: '', cost: '', tagoloanStock: '0', villanuevaStock: '0', jasaanStock: '0' }
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
  
  // Unified Edit Product Images (1 to 5)
  const [editImages, setEditImages] = useState<{ id: string; type: 'existing' | 'new'; url: string; file?: File }[]>([]);

  const handleAddEditImages = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(f => {
      const isImg = f.type.startsWith('image/');
      const isValidSize = f.size <= 10 * 1024 * 1024;
      if (!isImg) alert(`${f.name} is not a valid image format (JPG, PNG, WEBP).`);
      else if (!isValidSize) alert(`${f.name} exceeds 10MB.`);
      return isImg && isValidSize;
    });

    if (validFiles.length === 0) return;

    const remainingSlots = 5 - editImages.length;
    if (remainingSlots <= 0) {
      alert('You have already added the maximum limit of 5 product images.');
      return;
    }

    const filesToAdd = validFiles.slice(0, remainingSlots);
    if (validFiles.length > remainingSlots) {
      alert(`Only ${remainingSlots} more image(s) could be added. Maximum 5 images allowed.`);
    }

    const newItems = filesToAdd.map(file => ({
      id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'new' as const,
      url: URL.createObjectURL(file),
      file
    }));

    setEditImages(prev => [...prev, ...newItems]);
  };

  const handleRemoveEditImage = (idx: number) => {
    setEditImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleMoveEditImage = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= editImages.length) return;
    setEditImages(prev => {
      const updated = [...prev];
      const [item] = updated.splice(fromIdx, 1);
      if (item) updated.splice(toIdx, 0, item);
      return updated;
    });
  };

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
    const cleanVar = (variantName || 'STD')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return `${cleanModel}-${cleanVar}`;
  }

  // Fetch Products
  const fetchProducts = () => {
    setIsLoading(true);
    const activeBranchParam = isSuperAdmin ? selectedBranch : userBranch;
    const url = `/api/devices?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(searchQuery)}&categoryId=${selectedCategory}&type=${selectedDeviceType}&branch=${encodeURIComponent(activeBranchParam)}&stockStatus=${stockStatusFilter}`;

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
      .catch(err => console.error("Error fetching inventory:", err))
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

  const [brandSearchTerm, setBrandSearchTerm] = useState('');

  const handleCatImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true });
        setNewCatImage(compressed);
        setNewCatImagePreview(URL.createObjectURL(compressed));
      } catch (err) {
        console.error("Compression error:", err);
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
        const data = await res.json();
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
        if (selectedCategory === catId) {
          setSelectedCategory('All');
        }
        setSuccessModalContent({ title: 'Brand Deleted', message: `Brand "${catName}" has been removed.` });
        setSuccessModalOpen(true);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete brand. It may be assigned to existing products.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Network error while deleting brand');
    } finally {
      setIsDeletingCats(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchQuery, selectedCategory, selectedDeviceType, selectedBranch, stockStatusFilter]);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch Stock Movements History
  const fetchHistory = () => {
    setIsHistoryLoading(true);
    const branchQuery = isSuperAdmin ? historyBranchFilter : userBranch;
    fetch(`/api/inventory/history?branch=${encodeURIComponent(branchQuery)}&type=${historyTypeFilter}`)
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
    const branchQuery = isSuperAdmin ? selectedBranch : userBranch;
    fetch(`/api/inventory/units?branch=${encodeURIComponent(branchQuery)}&status=${unitsStatusFilter}&search=${encodeURIComponent(unitsSearch)}`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.units)) {
          setDeviceUnits(data.units);
        }
      })
      .catch(err => console.error("Failed to load device units:", err))
      .finally(() => setIsUnitsLoading(false));
  };

  useEffect(() => {
    if (historyModalOpen) fetchHistory();
  }, [historyModalOpen, historyBranchFilter, historyTypeFilter]);

  useEffect(() => {
    if (unitsModalOpen) fetchUnits();
  }, [unitsModalOpen, unitsStatusFilter, unitsSearch, selectedBranch]);

  // Handle Inter-Branch Transfer
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferDeviceId || !transferFromBranch || !transferToBranch || !transferQuantity) {
      setTransferError('Please fill in all required transfer fields.');
      return;
    }

    setIsTransferring(true);
    setTransferError(null);

    try {
      const res = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: transferDeviceId,
          variationId: transferVariationId || undefined,
          fromBranch: transferFromBranch,
          toBranch: transferToBranch,
          quantity: parseInt(transferQuantity, 10),
          notes: transferNotes
        })
      });

      if (res.ok) {
        setTransferModalOpen(false);
        setTransferQuantity('1');
        setTransferNotes('');
        setSuccessModalContent({
          title: 'Transfer Completed!',
          message: `Successfully transferred ${transferQuantity} unit(s) from ${transferFromBranch} to ${transferToBranch}.`
        });
        setSuccessModalOpen(true);
        fetchProducts();
      } else {
        const errData = await res.json().catch(() => ({}));
        setTransferError(errData.error || 'Failed to complete stock transfer');
      }
    } catch (err: any) {
      setTransferError(err.message || 'Error occurred during transfer');
    } finally {
      setIsTransferring(false);
    }
  };

  // Handle Quick Stock Adjust / Restock
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
          branch: adjustBranch,
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
          message: `Stock for ${adjustItem.variant?.productId || adjustItem.device.name} in ${adjustBranch} has been successfully updated.`
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
          branch: newImeiBranch
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

  // Add Product Handlers
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
    const targetBranch = isSuperAdmin
      ? (newDeviceBranch && newDeviceBranch !== 'all' ? newDeviceBranch : (selectedBranch !== 'all' ? selectedBranch : 'Tagoloan'))
      : (userBranch || 'Tagoloan');
    formData.append('branch', targetBranch);

    // Calculate total stocks
    let totalComputedStock = 0;
    if (addVariants.length > 0) {
      const processedVariants = addVariants.map(v => {
        const autoProdId = v.productId?.trim() || generateAutoProductId(newDeviceName, v.name);
        const tagStock = parseInt(v.tagoloanStock || '0', 10);
        const vilStock = parseInt(v.villanuevaStock || '0', 10);
        const jasStock = parseInt(v.jasaanStock || '0', 10);
        const varTotal = tagStock + vilStock + jasStock;
        totalComputedStock += varTotal;

        return {
          type: v.type || 'Storage',
          name: v.name,
          productId: autoProdId,
          price: v.price || newDevicePrice,
          cost: v.cost || newDeviceCost,
          stock: varTotal,
          tagoloanStock: tagStock,
          villanuevaStock: vilStock,
          jasaanStock: jasStock
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
          { type: 'Storage', name: '32 GB', productId: '', price: '', cost: '', tagoloanStock: '0', villanuevaStock: '0', jasaanStock: '0' },
          { type: 'Storage', name: '64 GB', productId: '', price: '', cost: '', tagoloanStock: '0', villanuevaStock: '0', jasaanStock: '0' },
          { type: 'Storage', name: '128 GB', productId: '', price: '', cost: '', tagoloanStock: '0', villanuevaStock: '0', jasaanStock: '0' },
          { type: 'Storage', name: '256 GB', productId: '', price: '', cost: '', tagoloanStock: '0', villanuevaStock: '0', jasaanStock: '0' }
        ]);
        setSuccessModalContent({ title: 'Success!', message: `The product and its variants have been successfully added under ${targetBranch} branch.` });
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

  // Open Edit Product Modal
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

    // Initialize edit images (1 to 5)
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

    // Format existing variants for editing
    if (prod.variations && prod.variations.length > 0) {
      setEditVariants(prod.variations.map((v: any) => ({
        id: v.id,
        type: v.type || 'Storage',
        name: v.name,
        productId: v.productId || generateAutoProductId(prod.name, v.name),
        price: v.price?.toString() || prod.price?.toString() || '',
        cost: v.cost?.toString() || prod.cost?.toString() || '',
        tagoloanStock: (v.tagoloanStock ?? v.branchStocks?.Tagoloan ?? 0).toString(),
        villanuevaStock: (v.villanuevaStock ?? v.branchStocks?.Villanueva ?? 0).toString(),
        jasaanStock: (v.jasaanStock ?? v.branchStocks?.Jasaan ?? 0).toString()
      })));
    } else {
      setEditVariants([]);
    }

    setIsEditModalOpen(true);
  };

  // Submit Edit Product
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!productToEdit) return;

    if (editImages.length === 0) {
      alert("Product must have at least 1 image (maximum 5). Please upload an image before saving.");
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

    // Existing preserved images & new images (max 5)
    const existingUrls = editImages.filter(item => item.type === 'existing').map(item => item.url);
    formData.append('existingImages', JSON.stringify(existingUrls));

    const newImageFiles = editImages.filter(item => item.type === 'new' && item.file).map(item => item.file!);
    newImageFiles.forEach(img => formData.append('deviceImages', img));

    let totalStock = 0;
    if (editVariants.length > 0) {
      const processed = editVariants.map(v => {
        const autoProdId = v.productId?.trim() || generateAutoProductId(editDeviceName, v.name);
        const tagStock = parseInt(v.tagoloanStock || '0', 10);
        const vilStock = parseInt(v.villanuevaStock || '0', 10);
        const jasStock = parseInt(v.jasaanStock || '0', 10);
        const varTotal = tagStock + vilStock + jasStock;
        totalStock += varTotal;

        return {
          id: v.id,
          type: v.type || 'Storage',
          name: v.name,
          productId: autoProdId,
          price: v.price || editDevicePrice,
          cost: v.cost || editDeviceCost,
          stock: varTotal,
          tagoloanStock: tagStock,
          villanuevaStock: vilStock,
          jasaanStock: jasStock
        };
      });

      formData.append('variations', JSON.stringify(processed));
      formData.append('deviceStocks', totalStock.toString());
    }

    if (editDeviceDownpaymentImage) {
      formData.append('deviceDownpaymentImage', editDeviceDownpaymentImage);
    }

    try {
      const res = await fetch(`/api/devices/${productToEdit.id}`, { method: 'PUT', body: formData });
      if (res.ok) {
        fetchProducts();
        setIsEditModalOpen(false);
        setProductToEdit(null);
        setSuccessModalContent({ title: 'Success!', message: 'The product and its variant details have been successfully updated.' });
        setSuccessModalOpen(true);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Failed to edit product');
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred while editing the product');
    } finally {
      setIsEditing(false);
    }
  };

  // Delete Product
  const confirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    setDeleteError(undefined);
    try {
      const res = await fetch(`/api/devices/${productToDelete}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProducts();
        setDeleteModalOpen(false);
        setProductToDelete(null);
        setSuccessModalContent({ title: 'Deleted Successfully', message: 'The device has been removed from inventory.' });
        setSuccessModalOpen(true);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setDeleteError(errorData.error || 'Failed to delete product');
      }
    } catch (err) {
      console.error(err);
      setDeleteError('An error occurred while deleting the product');
    } finally {
      setIsDeleting(false);
    }
  };

  // Export PDF & Excel
  const downloadPDF = async () => {
    try {
      const res = await fetch('/api/devices?limit=500');
      const allDevices: any[] = await res.json();
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("GRAPHIX MANAGEMENT - MULTI-BRANCH INVENTORY REPORT", 14, 18);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${new Date().toLocaleString()} | Branch Filter: ${selectedBranch.toUpperCase()}`, 14, 24);

      let y = 35;
      doc.setFillColor(92, 0, 153);
      doc.rect(14, y - 5, 182, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("Product Model", 16, y);
      doc.text("Variant (Product ID)", 70, y);
      doc.text("Tagoloan", 125, y);
      doc.text("Villanueva", 145, y);
      doc.text("Jasaan", 168, y);

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      y += 8;

      (Array.isArray(allDevices) ? allDevices : []).forEach((d) => {
        if (y > 275) { doc.addPage(); y = 20; }
        const variants = d.variations && d.variations.length > 0 ? d.variations : [{ name: 'Standard', productId: `${d.name}-STD`, tagoloanStock: d.tagoloanStock, villanuevaStock: d.villanuevaStock, jasaanStock: d.jasaanStock }];

        variants.forEach((v: any, vIdx: number) => {
          if (vIdx === 0) {
            doc.setFont("helvetica", "bold");
            doc.text(String(d.name || '').substring(0, 25), 16, y);
            doc.setFont("helvetica", "normal");
          }
          doc.text(`${v.name} (${v.productId || ''})`.substring(0, 28), 70, y);
          doc.text(String(v.tagoloanStock ?? v.branchStocks?.Tagoloan ?? 0), 128, y);
          doc.text(String(v.villanuevaStock ?? v.branchStocks?.Villanueva ?? 0), 150, y);
          doc.text(String(v.jasaanStock ?? v.branchStocks?.Jasaan ?? 0), 172, y);
          y += 6;
        });
        y += 2;
      });

      doc.save(`Graphix_Inventory_Report_${selectedBranch}.pdf`);
    } catch (e) {
      console.error("Failed to generate PDF", e);
      alert("Failed to export PDF file");
    }
  };

  const downloadExcel = async () => {
    try {
      const res = await fetch('/api/devices?limit=500');
      const allDevices: any[] = await res.json();
      let csvContent = "Model Name,Variant Capacity,Product ID,Tagoloan Stock,Villanueva Stock,Jasaan Stock,Total Stock,Price,Cost\n";

      (Array.isArray(allDevices) ? allDevices : []).forEach(d => {
        const variants = d.variations && d.variations.length > 0 ? d.variations : [{ name: 'Standard', productId: `${d.name}-STD`, tagoloanStock: d.tagoloanStock, villanuevaStock: d.villanuevaStock, jasaanStock: d.jasaanStock, price: d.price, cost: d.cost }];
        variants.forEach((v: any) => {
          const tStock = v.tagoloanStock ?? v.branchStocks?.Tagoloan ?? 0;
          const vStock = v.villanuevaStock ?? v.branchStocks?.Villanueva ?? 0;
          const jStock = v.jasaanStock ?? v.branchStocks?.Jasaan ?? 0;
          const tot = tStock + vStock + jStock;
          csvContent += `"${d.name}","${v.name}","${v.productId || ''}",${tStock},${vStock},${jStock},${tot},${v.price || d.price},${v.cost || d.cost}\n`;
        });
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Inventory_Report_${selectedBranch}.csv`);
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
      {/* Top Header & Multi-Branch Selector Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white/95 backdrop-blur-md p-5 rounded-2xl border-2 border-purple-500/20 shadow-sm">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h2 className="text-[1.6rem] font-bold text-[#111] tracking-tight">Multi-Branch Inventory</h2>
            {isSuperAdmin ? (
              <span className="bg-purple-100 text-[#5c0099] text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider border border-purple-200 flex items-center gap-1.5">
                <ShieldCheck size={14} /> Super Admin (All Branches)
              </span>
            ) : (
              <span className="bg-blue-100 text-blue-700 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider border border-blue-200 flex items-center gap-1.5">
                <Building2 size={14} /> {userBranch} Branch Admin
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Organized by Product Name/Model with variant Product IDs and live stock tracking across Tagoloan, Villanueva, and Jasaan.
          </p>
        </div>

        {/* Branch Selector (Super Admin) or Locked Badge (Branch Admin) */}
        <div className="flex flex-wrap items-center gap-3">
          {isSuperAdmin ? (
            <div className="flex items-center gap-2 bg-purple-50 border-2 border-[#5c0099]/30 rounded-xl px-3 py-1.5">
              <Building2 size={18} className="text-[#5c0099]" />
              <span className="text-xs font-bold text-[#5c0099] uppercase tracking-wider">Branch View:</span>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-white border border-purple-300 rounded-lg px-2.5 py-1 text-sm font-bold text-gray-800 outline-none cursor-pointer focus:ring-2 focus:ring-[#5c0099]"
              >
                <option value="all">🌐 All Branches (Global)</option>
                <option value="Tagoloan">📍 Tagoloan Branch</option>
                <option value="Villanueva">📍 Villanueva Branch</option>
                <option value="Jasaan">📍 Jasaan Branch</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-gray-100 border border-gray-300 rounded-xl px-4 py-2 text-sm font-bold text-gray-700">
              <Building2 size={18} className="text-blue-600" />
              <span>Assigned Branch: <strong className="text-blue-700">{userBranch}</strong></span>
            </div>
          )}

          {/* Super Admin Quick Actions */}
          {isSuperAdmin && (
            <button
              onClick={() => {
                setTransferDeviceId(products[0]?.id || '');
                setTransferModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:brightness-110 transition-all shadow-sm cursor-pointer text-sm"
              title="Transfer stock between branches"
            >
              <ArrowRightLeft size={16} />
              <span>Transfer Stock</span>
            </button>
          )}

          {/* Audit History Button */}
          <button
            onClick={() => setHistoryModalOpen(true)}
            className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3.5 py-2.5 rounded-xl font-bold transition-colors text-sm border border-gray-300 cursor-pointer"
            title="View stock movement history"
          >
            <History size={16} className="text-purple-600" />
            <span>Stock History</span>
          </button>

          {/* Physical Units / IMEI Button */}
          <button
            onClick={() => setUnitsModalOpen(true)}
            className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3.5 py-2.5 rounded-xl font-bold transition-colors text-sm border border-gray-300 cursor-pointer"
            title="View physical IMEI unit records"
          >
            <Smartphone size={16} className="text-purple-600" />
            <span>Unit IMEIs</span>
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
            placeholder="Search Model, Product ID, Specs..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="border-none outline-none w-full text-[0.95rem] text-[#111] bg-transparent placeholder-gray-400" 
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
            onClick={() => setStockStatusFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${stockStatusFilter === 'all' ? 'bg-[#5c0099] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            All Stock
          </button>
          <button
            onClick={() => setStockStatusFilter('low')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1 ${stockStatusFilter === 'low' ? 'bg-amber-500 text-white' : 'text-amber-700 hover:bg-amber-50'}`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span> Low Stock (&lt;5)
          </button>
          <button
            onClick={() => setStockStatusFilter('out')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1 ${stockStatusFilter === 'out' ? 'bg-rose-600 text-white' : 'text-rose-700 hover:bg-rose-50'}`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400"></span> Out of Stock (0)
          </button>
        </div>

        {/* Brand & Type Filters + Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Brand Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)} 
              className={`flex items-center gap-2 bg-white border-2 ${styles.borderMain} rounded-full px-4 py-2 font-semibold text-sm ${styles.textActive} hover:bg-gray-50 transition-colors shadow-sm`}
            >
              <Filter size={16} />
              <span>{selectedCategory === 'All' ? 'All Brands' : (categories.find(c => c.id === selectedCategory)?.name || 'Brand')}</span>
              <ChevronDown size={16} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            {isFilterOpen && (
              <div className="absolute top-[115%] right-0 w-48 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 py-1 max-h-60 overflow-y-auto">
                <button 
                  onClick={() => { setSelectedCategory('All'); setIsFilterOpen(false); }} 
                  className={`w-full px-4 py-2 text-left text-sm font-medium hover:bg-gray-100 ${selectedCategory === 'All' ? 'text-[#5c0099] font-bold bg-purple-50' : 'text-gray-700'}`}
                >
                  All Brands
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat.id} 
                    onClick={() => { setSelectedCategory(cat.id); setIsFilterOpen(false); }} 
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
            onChange={(e) => setSelectedDeviceType(e.target.value)} 
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

          {/* Add Device Button */}
          <button 
            onClick={() => setIsAddModalOpen(true)} 
            className="flex items-center gap-2 bg-[#5c0099] hover:bg-[#470077] text-white px-5 py-2 rounded-full font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>Add Product</span>
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
                <th className="py-4 px-4 text-center">Variants Count</th>
                <th className="py-4 px-4 text-center">Tagoloan Stock</th>
                <th className="py-4 px-4 text-center">Villanueva Stock</th>
                <th className="py-4 px-4 text-center">Jasaan Stock</th>
                <th className="py-4 px-4 text-center">Active Branch Stock</th>
                <th className="py-4 px-4 text-center">Base Price</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 border-4 border-purple-200 border-t-[#5c0099] rounded-full animate-spin"></div>
                      <span className="text-gray-500 font-semibold animate-pulse">Loading multi-branch inventory...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length > 0 ? (
                products.map((prod) => {
                  const isExpanded = expandedModelId === prod.id;
                  const variants: VariantData[] = prod.variations || [];
                  const isSingleOutOfStock = prod.stock === 0;

                  return (
                    <React.Fragment key={prod.id}>
                      {/* Parent Model Row */}
                      <tr 
                        onClick={() => setExpandedModelId(isExpanded ? null : prod.id)}
                        className={`hover:bg-purple-50/40 transition-colors cursor-pointer ${isExpanded ? 'bg-purple-50/60 font-semibold' : ''}`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3.5">
                            <button className="text-purple-700 bg-purple-100 hover:bg-purple-200 p-1.5 rounded-lg transition-transform">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            <img 
                              src={prod.image || '/Images/Aula.jpg'} 
                              alt={prod.name} 
                              className="w-10 h-10 object-cover rounded-lg border border-gray-200 shrink-0" 
                            />
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900 text-[0.95rem] hover:text-[#5c0099] transition-colors">
                                {prod.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {prod.category?.name || prod.type || 'Smartphone'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-full border border-gray-200">
                            <Layers size={13} className="text-purple-600" />
                            {variants.length > 0 ? `${variants.length} Variants` : 'Standard'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${prod.tagoloanStock > 0 ? (prod.tagoloanStock < 5 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800') : 'bg-rose-100 text-rose-700'}`}>
                            {prod.tagoloanStock > 0 ? `${prod.tagoloanStock} pcs` : 'Out of Stock'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${prod.villanuevaStock > 0 ? (prod.villanuevaStock < 5 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800') : 'bg-rose-100 text-rose-700'}`}>
                            {prod.villanuevaStock > 0 ? `${prod.villanuevaStock} pcs` : 'Out of Stock'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${prod.jasaanStock > 0 ? (prod.jasaanStock < 5 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800') : 'bg-rose-100 text-rose-700'}`}>
                            {prod.jasaanStock > 0 ? `${prod.jasaanStock} pcs` : 'Out of Stock'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-bold">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${prod.stock > 0 ? (prod.stock < 5 ? 'bg-amber-500 text-white' : 'bg-purple-700 text-white') : 'bg-rose-600 text-white'}`}>
                            {prod.stock > 0 ? `${prod.stock} pcs` : 'Out of Stock'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-gray-900">
                          ₱ {Number(prod.price || 0).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleEditClick(prod)} 
                              className="text-purple-600 hover:text-purple-800 p-2 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Model & Variants"
                            >
                              <Pencil size={18} />
                            </button>
                            {isSuperAdmin && (
                              <button 
                                onClick={() => { setProductToDelete(prod.id); setDeleteModalOpen(true); }} 
                                className="text-rose-500 hover:text-rose-700 p-2 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                                title="Delete Product"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Storage Variants Sub-Table */}
                      {isExpanded && (
                        <tr className="bg-purple-50/30 border-b-2 border-purple-200/40">
                          <td colSpan={8} className="p-4 sm:p-6">
                            <div className="bg-white rounded-xl border border-purple-200 p-4 shadow-sm flex flex-col gap-3">
                              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                <div className="flex items-center gap-2">
                                  <Package size={18} className="text-[#5c0099]" />
                                  <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wide">
                                    {prod.name} – Storage Variants & Branch Inventory
                                  </h4>
                                </div>
                                <span className="text-xs text-gray-500">Click variant row to adjust branch stock or transfer</span>
                              </div>

                              {variants.length > 0 ? (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs text-left">
                                    <thead>
                                      <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                                        <th className="py-2.5 px-3">Variant (Capacity)</th>
                                        <th className="py-2.5 px-3">Product ID</th>
                                        <th className="py-2.5 px-3 text-center">Tagoloan</th>
                                        <th className="py-2.5 px-3 text-center">Villanueva</th>
                                        <th className="py-2.5 px-3 text-center">Jasaan</th>
                                        <th className="py-2.5 px-3 text-center">Total Stock</th>
                                        <th className="py-2.5 px-3 text-right">Price</th>
                                        <th className="py-2.5 px-3 text-right">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 font-medium">
                                      {variants.map((v, vIdx) => (
                                        <tr key={v.id || vIdx} className="hover:bg-purple-50/50 transition-colors">
                                          <td className="py-3 px-3 font-bold text-gray-900">
                                            {prod.name} – {v.name}
                                          </td>
                                          <td className="py-3 px-3">
                                            <code className="bg-purple-100 text-purple-800 font-mono font-bold px-2 py-0.5 rounded text-[11px] border border-purple-200">
                                              {v.productId}
                                            </code>
                                          </td>
                                          <td className="py-3 px-3 text-center">
                                            <span className={`px-2 py-0.5 rounded font-bold ${v.tagoloanStock && v.tagoloanStock > 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                              {v.tagoloanStock && v.tagoloanStock > 0 ? `${v.tagoloanStock} pcs` : 'Out of Stock'}
                                            </span>
                                          </td>
                                          <td className="py-3 px-3 text-center">
                                            <span className={`px-2 py-0.5 rounded font-bold ${v.villanuevaStock && v.villanuevaStock > 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                              {v.villanuevaStock && v.villanuevaStock > 0 ? `${v.villanuevaStock} pcs` : 'Out of Stock'}
                                            </span>
                                          </td>
                                          <td className="py-3 px-3 text-center">
                                            <span className={`px-2 py-0.5 rounded font-bold ${v.jasaanStock && v.jasaanStock > 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                              {v.jasaanStock && v.jasaanStock > 0 ? `${v.jasaanStock} pcs` : 'Out of Stock'}
                                            </span>
                                          </td>
                                          <td className="py-3 px-3 text-center font-bold text-gray-800">
                                            {v.totalStock || ((v.tagoloanStock || 0) + (v.villanuevaStock || 0) + (v.jasaanStock || 0))} pcs
                                          </td>
                                          <td className="py-3 px-3 text-right font-bold text-[#5c0099]">
                                            ₱ {Number(v.price || prod.price).toLocaleString()}
                                          </td>
                                          <td className="py-3 px-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                              <button
                                                onClick={() => {
                                                  setAdjustItem({ device: prod, variant: v });
                                                  setAdjustBranch(isSuperAdmin ? 'Tagoloan' : userBranch);
                                                  setAdjustStockVal(String(isSuperAdmin ? (v.tagoloanStock || 0) : ((v as any)[`${userBranch.toLowerCase()}Stock`] || 0)));
                                                  setAdjustModalOpen(true);
                                                }}
                                                className="bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold px-2.5 py-1 rounded text-xs transition-colors cursor-pointer"
                                                title="Quick Adjust Stock"
                                              >
                                                Adjust Stock
                                              </button>
                                              {isSuperAdmin && (
                                                <button
                                                  onClick={() => {
                                                    setTransferDeviceId(prod.id);
                                                    setTransferVariationId(v.id || '');
                                                    setTransferModalOpen(true);
                                                  }}
                                                  className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold px-2.5 py-1 rounded text-xs transition-colors cursor-pointer flex items-center gap-1"
                                                  title="Transfer variant stock"
                                                >
                                                  <ArrowRightLeft size={12} /> Transfer
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-gray-500 text-xs italic py-2">No individual variants created. This item uses standard single inventory.</p>
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
                  <td colSpan={8} className="py-12 text-center text-gray-500 font-semibold">
                    No products found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex justify-between items-center p-4 bg-white/95 border-t border-gray-100 text-sm">
          <span className="text-xs text-gray-500">
            Showing page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1} 
              className={`p-2 rounded-lg border border-gray-200 transition-colors ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-purple-50 text-purple-700 cursor-pointer'}`}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-bold text-gray-800 px-2">{currentPage} / {totalPages}</span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={currentPage === totalPages} 
              className={`p-2 rounded-lg border border-gray-200 transition-colors ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:bg-purple-50 text-purple-700 cursor-pointer'}`}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/* 1. STOCK TRANSFER MODAL (Super Admin)                      */}
      {/* ========================================================== */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-purple-100 animate-in zoom-in-95">
            <div className="p-5 bg-gradient-to-r from-purple-700 to-indigo-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <ArrowRightLeft size={20} />
                <h3 className="font-bold text-lg">Transfer Stock Between Branches</h3>
              </div>
              <button onClick={() => setTransferModalOpen(false)} className="text-white/80 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="p-6 flex flex-col gap-4 text-left">
              {transferError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                  <AlertCircle size={16} /> {transferError}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Select Product Model</label>
                <select
                  value={transferDeviceId}
                  onChange={(e) => {
                    setTransferDeviceId(e.target.value);
                    setTransferVariationId('');
                  }}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Select a product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Variant Selector */}
              {(() => {
                const selectedDev = products.find(p => p.id === transferDeviceId);
                const vars: VariantData[] = selectedDev?.variations || [];
                if (vars.length === 0) return null;
                return (
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Select Variant (Product ID)</label>
                    <select
                      value={transferVariationId}
                      onChange={(e) => setTransferVariationId(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">All Variants / Standard</option>
                      {vars.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.productId}) — Tag: {v.tagoloanStock || 0}, Vil: {v.villanuevaStock || 0}, Jas: {v.jasaanStock || 0}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">From Branch</label>
                  <select
                    value={transferFromBranch}
                    onChange={(e) => setTransferFromBranch(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="Tagoloan">Tagoloan</option>
                    <option value="Villanueva">Villanueva</option>
                    <option value="Jasaan">Jasaan</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">To Branch</label>
                  <select
                    value={transferToBranch}
                    onChange={(e) => setTransferToBranch(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="Villanueva">Villanueva</option>
                    <option value="Tagoloan">Tagoloan</option>
                    <option value="Jasaan">Jasaan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Transfer Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Reason / Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Stock balancing, customer reserve..."
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTransferring}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-[#5c0099] hover:bg-[#450073] transition-colors disabled:opacity-50"
                >
                  {isTransferring ? 'Transferring...' : 'Execute Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 2. QUICK STOCK ADJUST / RESTOCK MODAL                      */}
      {/* ========================================================== */}
      {adjustModalOpen && adjustItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-purple-100 animate-in zoom-in-95">
            <div className="p-5 bg-gradient-to-r from-purple-800 to-indigo-800 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Pencil size={18} />
                <h3 className="font-bold text-base">Adjust Stock: {adjustItem.variant?.productId || adjustItem.device.name}</h3>
              </div>
              <button onClick={() => setAdjustModalOpen(false)} className="text-white/80 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-6 flex flex-col gap-4 text-left">
              {adjustError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                  <AlertCircle size={16} /> {adjustError}
                </div>
              )}

              <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 text-xs flex flex-col gap-1">
                <span className="font-bold text-purple-900">{adjustItem.device.name} – {adjustItem.variant?.name || 'Standard'}</span>
                <span className="text-purple-700 font-mono">Product ID: {adjustItem.variant?.productId || `${adjustItem.device.name}-STD`}</span>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Target Branch</label>
                <select
                  value={adjustBranch}
                  disabled={!isSuperAdmin}
                  onChange={(e) => setAdjustBranch(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                >
                  <option value="Tagoloan">Tagoloan Branch</option>
                  <option value="Villanueva">Villanueva Branch</option>
                  <option value="Jasaan">Jasaan Branch</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Action Type</label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="SET">Set Exact Stock</option>
                    <option value="ADD">Add to Stock (+)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={adjustStockVal}
                    onChange={(e) => setAdjustStockVal(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Adjustment Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Restocked shipment, inventory count..."
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjusting}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-[#5c0099] hover:bg-[#450073] transition-colors disabled:opacity-50"
                >
                  {isAdjusting ? 'Saving...' : 'Save Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 3. STOCK MOVEMENTS & AUDIT HISTORY MODAL                  */}
      {/* ========================================================== */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-purple-100 animate-in zoom-in-95 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <History size={22} />
                <div>
                  <h3 className="font-bold text-lg">Inventory History & Stock Movements</h3>
                  <p className="text-xs text-purple-200">Complete audit log of transfers, restocks, sales, and manual adjustments.</p>
                </div>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="text-white/80 hover:text-white">
                <X size={22} />
              </button>
            </div>

            {/* Filter controls */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                {isSuperAdmin && (
                  <select
                    value={historyBranchFilter}
                    onChange={(e) => setHistoryBranchFilter(e.target.value)}
                    className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 outline-none"
                  >
                    <option value="all">All Branches</option>
                    <option value="Tagoloan">Tagoloan</option>
                    <option value="Villanueva">Villanueva</option>
                    <option value="Jasaan">Jasaan</option>
                  </select>
                )}
                <select
                  value={historyTypeFilter}
                  onChange={(e) => setHistoryTypeFilter(e.target.value)}
                  className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 outline-none"
                >
                  <option value="ALL">All Movement Types</option>
                  <option value="TRANSFER">Transfers</option>
                  <option value="RESTOCK">Restocks</option>
                  <option value="SALE">Sales (POS/Online)</option>
                  <option value="ADJUSTMENT">Adjustments</option>
                </select>
              </div>
              <button
                onClick={fetchHistory}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 underline"
              >
                Refresh Log
              </button>
            </div>

            {/* Movements Table */}
            <div className="flex-1 overflow-y-auto p-4">
              {isHistoryLoading ? (
                <div className="py-12 text-center text-gray-500 font-semibold animate-pulse">
                  Loading movements log...
                </div>
              ) : movements.length > 0 ? (
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-purple-50/70 text-gray-700 font-bold uppercase tracking-wider border-b border-purple-100">
                      <th className="py-3 px-3">Date & Time</th>
                      <th className="py-3 px-3">Action</th>
                      <th className="py-3 px-3">Product Name / ID</th>
                      <th className="py-3 px-3">Branch Details</th>
                      <th className="py-3 px-3 text-center">Qty</th>
                      <th className="py-3 px-3 text-center">Stock Change</th>
                      <th className="py-3 px-3">Notes & Performed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {movements.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50/70">
                        <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${m.type === 'TRANSFER' ? 'bg-indigo-100 text-indigo-800' : m.type === 'SALE' ? 'bg-emerald-100 text-emerald-800' : m.type === 'RESTOCK' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'}`}>
                            {m.type}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900">{m.productName}</span>
                            <span className="font-mono text-[11px] text-purple-700">{m.productId}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {m.type === 'TRANSFER' ? (
                            <span className="font-bold text-gray-800">
                              {m.fromBranch} &rarr; <strong className="text-purple-700">{m.toBranch}</strong>
                            </span>
                          ) : (
                            <span className="font-bold text-gray-800">{m.branch}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-gray-900">
                          {m.quantity}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-gray-500 font-medium">
                            {m.previousStock} &rarr; <strong className="text-gray-900">{m.newStock}</strong>
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="text-gray-700 font-medium">{m.notes || '—'}</span>
                            <span className="text-[10px] text-gray-400">By: {m.performedBy || 'System'} ({m.userRole || 'User'})</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-gray-500 font-semibold">
                  No stock movements recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 4. PHYSICAL UNITS / IMEI TRACKING MODAL                    */}
      {/* ========================================================== */}
      {unitsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-purple-100 animate-in zoom-in-95 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-purple-800 to-indigo-800 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <Smartphone size={22} />
                <div>
                  <h3 className="font-bold text-lg">Device Units & Physical IMEI Records</h3>
                  <p className="text-xs text-purple-200">Track unique 15-digit IMEIs across Available vs Sold physical units.</p>
                </div>
              </div>
              <button onClick={() => setUnitsModalOpen(false)} className="text-white/80 hover:text-white">
                <X size={22} />
              </button>
            </div>

            {/* Top Registration / Search Bar */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search IMEI or Product ID..."
                  value={unitsSearch}
                  onChange={(e) => setUnitsSearch(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={unitsStatusFilter}
                  onChange={(e) => setUnitsStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Available">Available Only</option>
                  <option value="Sold">Sold Only</option>
                </select>
              </div>
            </div>

            {/* Quick Register Unit Form */}
            <form onSubmit={handleRegisterImei} className="p-4 bg-purple-50/50 border-b border-purple-100 flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-purple-900 uppercase tracking-wide shrink-0">+ Register New IMEI:</span>
              <input
                type="text"
                placeholder="15-digit IMEI (e.g. 861234567890123)"
                value={newImeiInput}
                onChange={(e) => setNewImeiInput(e.target.value)}
                className="border border-purple-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold flex-1 min-w-[200px] outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
              <select
                value={newImeiDeviceId}
                onChange={(e) => setNewImeiDeviceId(e.target.value)}
                className="border border-purple-300 rounded-xl px-3 py-1.5 text-xs font-medium bg-white outline-none"
                required
              >
                <option value="">Select Device Model...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {isSuperAdmin && (
                <select
                  value={newImeiBranch}
                  onChange={(e) => setNewImeiBranch(e.target.value)}
                  className="border border-purple-300 rounded-xl px-3 py-1.5 text-xs font-medium bg-white outline-none"
                >
                  <option value="Tagoloan">Tagoloan</option>
                  <option value="Villanueva">Villanueva</option>
                  <option value="Jasaan">Jasaan</option>
                </select>
              )}
              <button
                type="submit"
                disabled={isRegisteringImei}
                className="bg-[#5c0099] hover:bg-[#470077] text-white text-xs font-bold px-4 py-1.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {isRegisteringImei ? 'Registering...' : 'Add Unit'}
              </button>
            </form>

            {imeiError && (
              <div className="p-2.5 bg-rose-50 border-b border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
                <AlertCircle size={14} /> {imeiError}
              </div>
            )}

            {/* Units Table */}
            <div className="flex-1 overflow-y-auto p-4">
              {isUnitsLoading ? (
                <div className="py-12 text-center text-gray-500 font-semibold animate-pulse">
                  Loading physical units...
                </div>
              ) : deviceUnits.length > 0 ? (
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700 font-bold uppercase tracking-wider border-b border-gray-200">
                      <th className="py-3 px-3">IMEI / Serial Number</th>
                      <th className="py-3 px-3">Product Model</th>
                      <th className="py-3 px-3">Product ID</th>
                      <th className="py-3 px-3">Branch</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3">Registered Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deviceUnits.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/70">
                        <td className="py-3 px-3">
                          <code className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                            {u.imei}
                          </code>
                        </td>
                        <td className="py-3 px-3 font-bold text-gray-900">
                          {u.device?.name || 'Device'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-purple-700 font-semibold">
                            {u.productId || u.variation?.productId || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-gray-800">
                          {u.branch}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${u.status === 'Available' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-500">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-gray-500 font-semibold">
                  No IMEI units found in this branch view.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 5. ADD PRODUCT MODAL (With Multi-Branch Variants)          */}
      {/* ========================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-purple-100 animate-in zoom-in-95 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-purple-800 to-indigo-800 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <Plus size={22} />
                <h3 className="font-bold text-lg">Add New Product & Storage Variants</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-white/80 hover:text-white">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 text-left">
              {/* Basic Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Product Name / Model *</label>
                  <input
                    type="text"
                    placeholder="e.g. Vivo Y11"
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
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
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select Brand...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Origin / Branch *</label>
                  {isSuperAdmin ? (
                    <select
                      value={newDeviceBranch}
                      onChange={(e) => setNewDeviceBranch(e.target.value)}
                      className="w-full border border-purple-300 bg-purple-50/50 rounded-xl p-2.5 text-sm font-bold text-[#5c0099] outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Tagoloan">Tagoloan Branch</option>
                      <option value="Villanueva">Villanueva Branch</option>
                      <option value="Jasaan">Jasaan Branch</option>
                    </select>
                  ) : (
                    <div className="w-full bg-gray-100 border border-gray-200 rounded-xl p-2.5 text-sm font-bold text-gray-700">
                      {userBranch || 'Tagoloan'} Branch
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Smartphone">Smartphone</option>
                    <option value="Laptop">Laptop</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>
              </div>

              {/* Storage Variants & Multi-Branch Stock Table */}
              <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers size={18} className="text-[#5c0099]" />
                    <h4 className="font-bold text-sm text-gray-900 uppercase tracking-wider">
                      Storage Variants & Initial Branch Stock
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAddVariants(prev => [
                        ...prev,
                        { type: 'Storage', name: '512 GB', productId: '', price: '', cost: '', tagoloanStock: '0', villanuevaStock: '0', jasaanStock: '0' }
                      ]);
                    }}
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> Add Variant
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left bg-white rounded-xl border border-purple-100 overflow-hidden">
                    <thead>
                      <tr className="bg-purple-100/70 text-purple-900 font-bold border-b border-purple-200">
                        <th className="py-2.5 px-3">Variant (Capacity)</th>
                        <th className="py-2.5 px-3">Product ID (Auto/Custom)</th>
                        <th className="py-2.5 px-3 text-center">Tagoloan Stock</th>
                        <th className="py-2.5 px-3 text-center">Villanueva Stock</th>
                        <th className="py-2.5 px-3 text-center">Jasaan Stock</th>
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
                              placeholder="64 GB"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={v.productId}
                              placeholder={generateAutoProductId(newDeviceName, v.name)}
                              onChange={(e) => {
                                const updated = [...addVariants];
                                updated[idx]!.productId = e.target.value.toUpperCase();
                                setAddVariants(updated);
                              }}
                              className="border border-purple-200 bg-purple-50/50 rounded-lg p-1.5 text-xs font-mono font-bold w-36 outline-none"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={v.tagoloanStock}
                              onChange={(e) => {
                                const updated = [...addVariants];
                                updated[idx]!.tagoloanStock = e.target.value;
                                setAddVariants(updated);
                              }}
                              className="border border-gray-300 rounded-lg p-1.5 text-xs font-bold w-16 text-center outline-none"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={v.villanuevaStock}
                              onChange={(e) => {
                                const updated = [...addVariants];
                                updated[idx]!.villanuevaStock = e.target.value;
                                setAddVariants(updated);
                              }}
                              className="border border-gray-300 rounded-lg p-1.5 text-xs font-bold w-16 text-center outline-none"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={v.jasaanStock}
                              onChange={(e) => {
                                const updated = [...addVariants];
                                updated[idx]!.jasaanStock = e.target.value;
                                setAddVariants(updated);
                              }}
                              className="border border-gray-300 rounded-lg p-1.5 text-xs font-bold w-16 text-center outline-none"
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
                              className="text-rose-500 hover:text-rose-700 p-1"
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

              {/* Product Images (1 to 5 Images) */}
              <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={18} className="text-[#5c0099]" />
                    <h4 className="font-bold text-sm text-gray-900 uppercase tracking-wider">
                      Product Images * <span className="text-xs font-normal text-gray-500 normal-case">({newDeviceImages.length}/5 uploaded, 1 required)</span>
                    </h4>
                  </div>
                  {newDeviceImages.length < 5 && (
                    <label className="cursor-pointer text-xs font-bold text-[#5c0099] hover:text-[#450073] flex items-center gap-1.5 bg-white border border-purple-300 hover:border-[#5c0099] px-3 py-1.5 rounded-xl shadow-xs transition-all">
                      <Plus size={14} /> Add Images
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) handleAddProductImages(e.target.files);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>

                {newDeviceImages.length === 0 ? (
                  <label className="border-2 border-dashed border-purple-300 hover:border-[#5c0099] bg-white rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors group">
                    <div className="w-12 h-12 rounded-full bg-purple-50 group-hover:bg-purple-100 text-[#5c0099] flex items-center justify-center transition-colors">
                      <Upload size={22} />
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-bold text-[#5c0099] group-hover:underline">Click or drag images to upload</span>
                      <p className="text-xs text-gray-500 mt-0.5">Upload 1 to 5 product images (JPG, PNG, WEBP, max 10MB each). Image 1 will be the primary cover.</p>
                    </div>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) handleAddProductImages(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {newDeviceImagePreviews.map((previewUrl, idx) => (
                        <div 
                          key={idx}
                          className="group relative bg-white rounded-2xl border-2 border-purple-200 hover:border-[#5c0099] overflow-hidden flex flex-col shadow-xs transition-all"
                        >
                          {/* Header Badge */}
                          <div className="p-1.5 flex items-center justify-between bg-purple-50/80 border-b border-purple-100">
                            {idx === 0 ? (
                              <span className="inline-flex items-center gap-1 bg-[#5c0099] text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                                <Sparkles size={10} /> Cover / Main
                              </span>
                            ) : (
                              <span className="inline-flex items-center bg-gray-200 text-gray-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                                Image {idx + 1}
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveAddProductImage(idx)}
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-md transition-colors"
                              title="Remove Image"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {/* Thumbnail Image */}
                          <div className="aspect-square w-full p-2 bg-gray-50/50 flex items-center justify-center overflow-hidden">
                            <img 
                              src={previewUrl} 
                              alt={`Product Preview ${idx + 1}`} 
                              className="w-full h-full object-contain mix-blend-multiply" 
                            />
                          </div>

                          {/* Reorder Buttons Footer */}
                          <div className="p-1.5 flex items-center justify-between bg-white border-t border-gray-100">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveAddProductImage(idx, idx - 1)}
                              className="p-1 text-gray-500 hover:text-[#5c0099] hover:bg-purple-50 rounded disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-gray-500 cursor-pointer"
                              title="Move Left (Earlier in Gallery)"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <span className="text-[10px] font-bold text-gray-400">#{idx + 1}</span>
                            <button
                              type="button"
                              disabled={idx === newDeviceImages.length - 1}
                              onClick={() => handleMoveAddProductImage(idx, idx + 1)}
                              className="p-1 text-gray-500 hover:text-[#5c0099] hover:bg-purple-50 rounded disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-gray-500 cursor-pointer"
                              title="Move Right (Later in Gallery)"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] text-gray-500 italic">
                      💡 <strong className="text-gray-700">Display Order:</strong> Image 1 is the main product cover. Use the &larr; &rarr; arrows to reorder gallery images.
                    </p>
                  </div>
                )}
              </div>

              {/* Specs */}
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Specifications</label>
                <textarea
                  rows={2}
                  placeholder="Processor, Screen, RAM, Battery details..."
                  value={newDeviceSpecs}
                  onChange={(e) => setNewDeviceSpecs(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#5c0099] hover:bg-[#470077] transition-all disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {isAdding ? 'Adding Product...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 6. EDIT PRODUCT MODAL                                      */}
      {/* ========================================================== */}
      {isEditModalOpen && productToEdit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-purple-100 animate-in zoom-in-95 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-purple-800 to-indigo-800 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <Pencil size={20} />
                <h3 className="font-bold text-lg">Edit Product & Variants: {productToEdit.name}</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-white/80 hover:text-white">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Product Name / Model</label>
                  <input
                    type="text"
                    value={editDeviceName}
                    onChange={(e) => setEditDeviceName(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Base Price (₱)</label>
                  <input
                    type="number"
                    min="0"
                    value={editDevicePrice}
                    onChange={(e) => setEditDevicePrice(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-[#5c0099] outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              {/* Edit Variants Table */}
              <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers size={18} className="text-[#5c0099]" />
                    <h4 className="font-bold text-sm text-gray-900 uppercase tracking-wider">
                      Storage Variants & Branch Stocks
                    </h4>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left bg-white rounded-xl border border-purple-100 overflow-hidden">
                    <thead>
                      <tr className="bg-purple-100/70 text-purple-900 font-bold border-b border-purple-200">
                        <th className="py-2.5 px-3">Variant Name</th>
                        <th className="py-2.5 px-3">Product ID</th>
                        <th className="py-2.5 px-3 text-center">Tagoloan</th>
                        <th className="py-2.5 px-3 text-center">Villanueva</th>
                        <th className="py-2.5 px-3 text-center">Jasaan</th>
                        <th className="py-2.5 px-3 text-right">Price (₱)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {editVariants.map((v, idx) => (
                        <tr key={v.id || idx}>
                          <td className="py-2 px-3 font-bold text-gray-900">{v.name}</td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={v.productId}
                              onChange={(e) => {
                                const updated = [...editVariants];
                                updated[idx]!.productId = e.target.value.toUpperCase();
                                setEditVariants(updated);
                              }}
                              className="border border-purple-200 bg-purple-50 rounded-lg p-1.5 text-xs font-mono font-bold w-36 outline-none"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={v.tagoloanStock}
                              disabled={!isSuperAdmin && userBranch !== 'Tagoloan'}
                              onChange={(e) => {
                                const updated = [...editVariants];
                                updated[idx]!.tagoloanStock = e.target.value;
                                setEditVariants(updated);
                              }}
                              className="border border-gray-300 rounded-lg p-1.5 text-xs font-bold w-16 text-center outline-none disabled:bg-gray-100"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={v.villanuevaStock}
                              disabled={!isSuperAdmin && userBranch !== 'Villanueva'}
                              onChange={(e) => {
                                const updated = [...editVariants];
                                updated[idx]!.villanuevaStock = e.target.value;
                                setEditVariants(updated);
                              }}
                              className="border border-gray-300 rounded-lg p-1.5 text-xs font-bold w-16 text-center outline-none disabled:bg-gray-100"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={v.jasaanStock}
                              disabled={!isSuperAdmin && userBranch !== 'Jasaan'}
                              onChange={(e) => {
                                const updated = [...editVariants];
                                updated[idx]!.jasaanStock = e.target.value;
                                setEditVariants(updated);
                              }}
                              className="border border-gray-300 rounded-lg p-1.5 text-xs font-bold w-16 text-center outline-none disabled:bg-gray-100"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              value={v.price}
                              onChange={(e) => {
                                const updated = [...editVariants];
                                updated[idx]!.price = e.target.value;
                                setEditVariants(updated);
                              }}
                              className="border border-gray-300 rounded-lg p-1.5 text-xs font-bold text-[#5c0099] w-24 text-right outline-none"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Product Images (1 to 5 Images) */}
              <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={18} className="text-[#5c0099]" />
                    <h4 className="font-bold text-sm text-gray-900 uppercase tracking-wider">
                      Product Images * <span className="text-xs font-normal text-gray-500 normal-case">({editImages.length}/5 uploaded, 1 required)</span>
                    </h4>
                  </div>
                  {editImages.length < 5 && (
                    <label className="cursor-pointer text-xs font-bold text-[#5c0099] hover:text-[#450073] flex items-center gap-1.5 bg-white border border-purple-300 hover:border-[#5c0099] px-3 py-1.5 rounded-xl shadow-xs transition-all">
                      <Plus size={14} /> Add Images
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) handleAddEditImages(e.target.files);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>

                {editImages.length === 0 ? (
                  <label className="border-2 border-dashed border-purple-300 hover:border-[#5c0099] bg-white rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors group">
                    <div className="w-12 h-12 rounded-full bg-purple-50 group-hover:bg-purple-100 text-[#5c0099] flex items-center justify-center transition-colors">
                      <Upload size={22} />
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-bold text-[#5c0099] group-hover:underline">Click or drag images to upload</span>
                      <p className="text-xs text-gray-500 mt-0.5">Upload 1 to 5 product images (JPG, PNG, WEBP, max 10MB each). Image 1 will be the main cover.</p>
                    </div>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) handleAddEditImages(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {editImages.map((img, idx) => (
                        <div 
                          key={img.id || idx}
                          className="group relative bg-white rounded-2xl border-2 border-purple-200 hover:border-[#5c0099] overflow-hidden flex flex-col shadow-xs transition-all"
                        >
                          {/* Header Badge */}
                          <div className="p-1.5 flex items-center justify-between bg-purple-50/80 border-b border-purple-100">
                            {idx === 0 ? (
                              <span className="inline-flex items-center gap-1 bg-[#5c0099] text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                                <Sparkles size={10} /> Cover / Main
                              </span>
                            ) : (
                              <span className="inline-flex items-center bg-gray-200 text-gray-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                                Image {idx + 1}
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveEditImage(idx)}
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-md transition-colors"
                              title="Remove Image"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {/* Thumbnail Image */}
                          <div className="aspect-square w-full p-2 bg-gray-50/50 flex items-center justify-center overflow-hidden">
                            <img 
                              src={img.url} 
                              alt={`Product Preview ${idx + 1}`} 
                              className="w-full h-full object-contain mix-blend-multiply" 
                            />
                          </div>

                          {/* Reorder Buttons Footer */}
                          <div className="p-1.5 flex items-center justify-between bg-white border-t border-gray-100">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveEditImage(idx, idx - 1)}
                              className="p-1 text-gray-500 hover:text-[#5c0099] hover:bg-purple-50 rounded disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-gray-500 cursor-pointer"
                              title="Move Left (Earlier in Gallery)"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <span className="text-[10px] font-bold text-gray-400">#{idx + 1}</span>
                            <button
                              type="button"
                              disabled={idx === editImages.length - 1}
                              onClick={() => handleMoveEditImage(idx, idx + 1)}
                              className="p-1 text-gray-500 hover:text-[#5c0099] hover:bg-purple-50 rounded disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-gray-500 cursor-pointer"
                              title="Move Right (Later in Gallery)"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] text-gray-500 italic">
                      💡 <strong className="text-gray-700">Display Order:</strong> Image 1 is the main product cover. Use the &larr; &rarr; arrows to reorder gallery images.
                    </p>
                  </div>
                )}
              </div>

              {/* Specs in Edit Modal */}
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">Specifications</label>
                <textarea
                  rows={2}
                  placeholder="Processor, Screen, RAM, Battery details..."
                  value={editDeviceSpecs}
                  onChange={(e) => setEditDeviceSpecs(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#5c0099] hover:bg-[#470077] transition-all disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {isEditing ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl animate-in zoom-in-95 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="font-bold text-lg text-gray-900">{successModalContent.title}</h3>
            <p className="text-xs text-gray-600">{successModalContent.message}</p>
            <button
              onClick={() => setSuccessModalOpen(false)}
              className="mt-2 w-full py-2.5 rounded-xl bg-[#5c0099] hover:bg-[#450073] text-white font-bold text-sm shadow-md transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl animate-in zoom-in-95 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 size={28} />
            </div>
            <h3 className="font-bold text-lg text-gray-900">Delete Product</h3>
            <p className="text-xs text-gray-600">Are you sure you want to delete this product and all its variants from inventory across all branches?</p>
            {deleteError && <span className="text-xs text-rose-600 font-bold">{deleteError}</span>}
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================== */}
      {/* BRAND MANAGEMENT MODAL                                    */}
      {/* ========================================================== */}
      {categoriesModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-purple-100 animate-in zoom-in-95 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-[#5c0099] to-[#3a0066] text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-white border border-white/20 shadow-inner">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg m-0">Brand Management</h3>
                  <p className="text-xs text-white/80 m-0 mt-0.5">Add new device brands to your catalog or manage existing brands</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setCategoriesModalOpen(false);
                  setNewCatName('');
                  setNewCatImage(null);
                  setNewCatImagePreview(null);
                }} 
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all border-none cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              
              {/* Form: Add New Brand */}
              <div className="bg-purple-50/60 p-5 rounded-2xl border border-purple-200 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-purple-900 m-0 uppercase tracking-wider flex items-center gap-2">
                    <Plus size={16} className="text-[#5c0099]" /> Add New Brand
                  </h4>
                  <span className="text-[11px] text-purple-700 font-semibold">Instantly available in product forms</span>
                </div>

                <form onSubmit={handleAddCategory} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
                        Brand Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Apple, Samsung, Honor, Vivo..."
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-black outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
                        Brand Logo / Icon <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCatImageChange}
                        className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer bg-white border border-gray-300 rounded-xl p-1"
                      />
                    </div>
                  </div>

                  {newCatImagePreview && (
                    <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-purple-200 w-fit">
                      <img src={newCatImagePreview} alt="Logo preview" className="w-10 h-10 object-contain rounded-lg bg-gray-50 p-1 border border-gray-100" />
                      <div className="text-xs">
                        <span className="font-bold text-gray-800 block">Logo Selected</span>
                        <button
                          type="button"
                          onClick={() => {
                            setNewCatImage(null);
                            setNewCatImagePreview(null);
                          }}
                          className="text-[11px] text-red-600 hover:underline font-semibold bg-transparent border-none p-0 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isAddingCat || !newCatName.trim()}
                      className="px-6 py-2.5 bg-[#5c0099] hover:bg-[#470077] text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus size={16} />
                      {isAddingCat ? 'Adding Brand...' : 'Save & Register Brand'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Existing Brands Catalog */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-extrabold text-gray-900 m-0 uppercase tracking-wider">
                      Existing Brands Catalog
                    </h4>
                    <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-0.5 rounded-full">
                      {categories.length}
                    </span>
                  </div>

                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search registered brands..."
                      value={brandSearchTerm}
                      onChange={(e) => setBrandSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-purple-500"
                    />
                  </div>
                </div>

                {categories.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <Layers size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold text-gray-600 m-0">No brands created yet</p>
                    <p className="text-[11px] text-gray-400 m-0 mt-0.5">Use the form above to add your first device brand.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                    {categories
                      .filter(c => !brandSearchTerm.trim() || c.name.toLowerCase().includes(brandSearchTerm.toLowerCase()))
                      .map((cat) => (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between p-3 bg-gray-50 hover:bg-purple-50/50 rounded-xl border border-gray-200 hover:border-purple-200 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {cat.logoUrl ? (
                              <img src={cat.logoUrl} alt={cat.name} className="w-8 h-8 object-contain rounded-lg bg-white p-1 border border-gray-200 shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center border border-purple-200 shrink-0 uppercase">
                                {cat.name.slice(0, 2)}
                              </div>
                            )}
                            <div className="truncate">
                              <span className="font-bold text-xs text-gray-900 block truncate">{cat.name}</span>
                              <span className="text-[10px] text-gray-400 font-mono">ID: {cat.id.slice(-6)}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            disabled={isDeletingCats}
                            className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors bg-transparent border-none cursor-pointer"
                            title={`Delete brand ${cat.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCategoriesModalOpen(false);
                  setNewCatName('');
                  setNewCatImage(null);
                  setNewCatImagePreview(null);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors shadow-2xs"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
