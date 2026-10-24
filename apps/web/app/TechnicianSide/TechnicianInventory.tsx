"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Search, RefreshCw, AlertTriangle, CheckCircle2, 
  Wrench, Plus, ChevronLeft, ChevronRight, Filter, X, 
  Layers, DollarSign, Smartphone, Sparkles, Box, ShieldCheck, Tag,
  Pencil, Trash2
} from 'lucide-react';

interface SparePartItem {
  id: string;
  name: string;
  type?: string;
  price?: number;
  cost?: number;
  stock?: number;
  specs?: string;
  image?: string;
  branch?: string;
  category?: { id: string; name: string } | string;
  branchStocks?: { branch: string; stock: number }[];
  tagoloanStock?: number;
  villanuevaStock?: number;
  jasaanStock?: number;
}

const PART_CATEGORIES = [
  'All Categories',
  'Screen & Display',
  'Battery & Power',
  'Charging Port & Flex',
  'Camera & Lens',
  'Back Glass & Housing',
  'Speaker & Audio',
  'Adhesives & Consumables',
  'Tools & Equipment',
  'Other Materials'
];

export default function TechnicianInventory() {
  const [items, setItems] = useState<SparePartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [technician, setTechnician] = useState<any>(null);
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Add Spare Part Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addPartName, setAddPartName] = useState('');
  const [addCompatibleModel, setAddCompatibleModel] = useState('');
  const [addCategory, setAddCategory] = useState(PART_CATEGORIES[1]);
  const [addStock, setAddStock] = useState('10');
  const [addCost, setAddCost] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [addImageFile, setAddImageFile] = useState<File | null>(null);
  const [addImagePreview, setAddImagePreview] = useState<string | null>(null);
  const [addModalError, setAddModalError] = useState<string | null>(null);
  const [addModalSuccess, setAddModalSuccess] = useState<string | null>(null);

  // Edit Spare Part Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePartItem | null>(null);
  const [editPartName, setEditPartName] = useState('');
  const [editCompatibleModel, setEditCompatibleModel] = useState('');
  const [editCategory, setEditCategory] = useState(PART_CATEGORIES[1]);
  const [editStock, setEditStock] = useState('0');
  const [editCost, setEditCost] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [editModalSuccess, setEditModalSuccess] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Delete State
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const activeBranch = technician?.branch || 'Tagoloan';

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const profRes = await fetch('/api/profile');
      if (profRes.ok) {
        const prof = await profRes.json();
        setTechnician(prof);
      }

      // Fetch categories
      try {
        const catRes = await fetch('/api/categories?t=' + Date.now());
        if (catRes.ok) {
          const catData = await catRes.json();
          if (Array.isArray(catData)) setCategories(catData);
        }
      } catch (cErr) {
        console.warn('Could not load categories:', cErr);
      }

      const res = await fetch(`/api/devices?limit=100&branch=${encodeURIComponent(activeBranch)}&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.devices || [];
        setItems(list);
      }
    } catch (err) {
      console.error('Failed to load spare parts inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  /**
   * Filter out complete retail devices (e.g. iPhone 11 Pro Max, finished phones/laptops/tablets)
   * Only show genuine repair spare parts, replacement components, and materials.
   */
  const sparePartsOnly = useMemo(() => {
    return items.filter((item) => {
      const type = (item.type || '').toLowerCase();
      const name = (item.name || '').toLowerCase();
      const cat = typeof item.category === 'string' 
        ? item.category.toLowerCase() 
        : (item.category?.name || '').toLowerCase();

      // If explicitly marked as Spare Part or Material
      if (
        type === 'spare part' || 
        type === 'spare_part' || 
        type === 'part' || 
        type === 'material' || 
        type === 'tool' ||
        cat.includes('part') || 
        cat.includes('material') ||
        cat.includes('component')
      ) {
        return true;
      }

      // Check for retail phones / complete gadgets (e.g., iPhone 11 Pro Max, Smartphone, Laptop, Tablet)
      const isRetailDevice = 
        type === 'smartphone' || 
        type === 'phone' || 
        type === 'laptop' || 
        type === 'tablet' ||
        name === 'iphone 11 pro max' ||
        cat.includes('smartphone') ||
        cat.includes('phones');

      if (isRetailDevice) {
        // Exclude completely UNLESS it is specifically labeled as a component/part (e.g., "iPhone 11 Pro Max LCD Screen")
        const isExplicitPart = 
          name.includes('lcd') || 
          name.includes('screen') || 
          name.includes('battery') || 
          name.includes('flex') || 
          name.includes('port') || 
          name.includes('glass') || 
          name.includes('housing') || 
          name.includes('camera') || 
          name.includes('adhesive') || 
          name.includes('speaker') || 
          name.includes('ic') || 
          name.includes('part') ||
          name.includes('ribbon');

        return isExplicitPart;
      }

      return true;
    });
  }, [items]);

  // Search & Filtered items
  const filteredParts = useMemo(() => {
    return sparePartsOnly.filter((item) => {
      const q = search.trim().toLowerCase();
      const name = (item.name || '').toLowerCase();
      const specs = (item.specs || '').toLowerCase();
      const type = (item.type || '').toLowerCase();
      const cat = typeof item.category === 'string' 
        ? item.category.toLowerCase() 
        : (item.category?.name || '').toLowerCase();

      // Search match
      const matchesSearch = !q || name.includes(q) || specs.includes(q) || type.includes(q) || cat.includes(q);

      // Category match
      let matchesCategory = true;
      if (selectedCategory !== 'All Categories') {
        const catKey = selectedCategory.toLowerCase().split(' ')[0] || '';
        matchesCategory = cat.includes(catKey) || name.includes(catKey) || type.includes(catKey) || specs.includes(catKey);
      }

      // Branch Stock
      const branchLower = activeBranch.toLowerCase();
      const stock = branchLower === 'villanueva'
        ? (item.villanuevaStock ?? item.stock ?? 0)
        : branchLower === 'jasaan'
        ? (item.jasaanStock ?? item.stock ?? 0)
        : (item.tagoloanStock ?? item.stock ?? 0);

      // Stock status filter
      let matchesStock = true;
      if (stockFilter === 'low') {
        matchesStock = stock > 0 && stock < 5;
      } else if (stockFilter === 'out') {
        matchesStock = stock === 0;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [sparePartsOnly, search, selectedCategory, stockFilter, activeBranch]);

  // Pagination calculations
  const totalCount = filteredParts.length;
  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
  const paginatedParts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredParts.slice(start, start + itemsPerPage);
  }, [filteredParts, currentPage, itemsPerPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Stock counts
  const stockCounts = useMemo(() => {
    let low = 0;
    let out = 0;
    sparePartsOnly.forEach((item) => {
      const branchLower = activeBranch.toLowerCase();
      const s = branchLower === 'villanueva'
        ? (item.villanuevaStock ?? item.stock ?? 0)
        : branchLower === 'jasaan'
        ? (item.jasaanStock ?? item.stock ?? 0)
        : (item.tagoloanStock ?? item.stock ?? 0);
      if (s === 0) out++;
      else if (s < 5) low++;
    });
    return { all: sparePartsOnly.length, low, out };
  }, [sparePartsOnly, activeBranch]);

  const handleCloseAndResetModal = () => {
    setIsAddModalOpen(false);
    setAddPartName('');
    setAddCompatibleModel('');
    setAddCategory(PART_CATEGORIES[1]);
    setAddStock('10');
    setAddCost('');
    setAddPrice('');
    setAddImageFile(null);
    setAddImagePreview(null);
    setAddModalError(null);
    setAddModalSuccess(null);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: SparePartItem) => {
    setEditingPart(item);
    setEditPartName(item.name || '');

    const specs = item.specs || '';
    const compMatch = specs.match(/Compatible:\s*([^|]+)/i);
    setEditCompatibleModel(compMatch && compMatch[1] ? compMatch[1].trim() : (specs.trim() || ''));

    const catMatch = specs.match(/Category:\s*(.+)$/i);
    const catName = catMatch && catMatch[1] 
      ? catMatch[1].trim() 
      : (typeof item.category === 'string' ? item.category : item.category?.name || PART_CATEGORIES[1]);
    setEditCategory(catName);

    const branchLower = activeBranch.toLowerCase();
    const currentStock = branchLower === 'villanueva'
      ? (item.villanuevaStock ?? item.stock ?? 0)
      : branchLower === 'jasaan'
      ? (item.jasaanStock ?? item.stock ?? 0)
      : (item.tagoloanStock ?? item.stock ?? 0);
    setEditStock(String(currentStock));

    setEditCost(item.cost !== undefined && item.cost !== null ? String(item.cost) : '');
    setEditPrice(item.price !== undefined && item.price !== null ? String(item.price) : '');
    setEditImageFile(null);
    setEditImagePreview(item.image || null);
    setEditModalError(null);
    setEditModalSuccess(null);
    setIsEditModalOpen(true);
  };

  // Handle Edit Part Submit
  const handleEditPartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPart) return;
    if (!editPartName.trim()) {
      setEditModalError('Part / Material name is required');
      return;
    }

    setIsEditSubmitting(true);
    setEditModalError(null);
    setEditModalSuccess(null);

    const formData = new FormData();
    formData.append('deviceName', editPartName.trim());
    formData.append('deviceType', 'Spare Part');
    formData.append('type', 'Spare Part');
    formData.append('deviceSpecs', `Compatible: ${editCompatibleModel.trim() || 'Universal'} | Category: ${editCategory}`);
    formData.append('deviceStocks', editStock || '0');
    formData.append('devicePrice', editPrice || '0');
    formData.append('deviceCost', editCost || '0');
    formData.append('branch', activeBranch);

    const catSearch = (editCategory || '').toLowerCase();
    const matchingCat = categories.find(c => 
      c.name.toLowerCase() === catSearch ||
      c.name.toLowerCase().includes('spare') ||
      c.name.toLowerCase().includes('part')
    );
    if (matchingCat) {
      formData.append('deviceCategory', matchingCat.id);
      formData.append('categoryId', matchingCat.id);
    }

    if (editImageFile) {
      formData.append('deviceImage', editImageFile);
      formData.append('deviceImages', editImageFile);
    } else if (editImagePreview) {
      formData.append('existingImages', JSON.stringify([editImagePreview]));
    }

    try {
      const res = await fetch(`/api/devices/${editingPart.id}`, {
        method: 'PUT',
        body: formData
      });

      if (res.ok) {
        setEditModalSuccess('Spare part updated successfully!');
        setTimeout(() => {
          setIsEditModalOpen(false);
          setEditingPart(null);
          setEditModalSuccess(null);
          fetchInventory();
        }, 1000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setEditModalError(errData.error || 'Failed to update spare part.');
      }
    } catch (err: any) {
      console.error(err);
      setEditModalError(err.message || 'Error updating spare part.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Handle Delete Part
  const handleDeletePart = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from spare parts inventory?`)) {
      return;
    }
    setIsDeleting(id);
    try {
      const res = await fetch(`/api/devices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchInventory();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to delete spare part');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting spare part');
    } finally {
      setIsDeleting(null);
    }
  };

  // Handle Add Part
  const handleAddPartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPartName.trim()) {
      setAddModalError('Part / Material name is required');
      return;
    }

    setIsSubmitting(true);
    setAddModalError(null);
    setAddModalSuccess(null);

    const formData = new FormData();
    formData.append('deviceName', addPartName.trim());
    formData.append('deviceType', 'Spare Part');
    formData.append('type', 'Spare Part');
    formData.append('deviceSpecs', `Compatible: ${addCompatibleModel.trim() || 'Universal'} | Category: ${addCategory}`);
    formData.append('deviceStocks', addStock || '0');
    formData.append('devicePrice', addPrice || '0');
    formData.append('deviceCost', addCost || '0');
    formData.append('branch', activeBranch);

    // Link category if found
    const catSearch = (addCategory || '').toLowerCase();
    const matchingCat = categories.find(c => 
      c.name.toLowerCase() === catSearch ||
      c.name.toLowerCase().includes('spare') ||
      c.name.toLowerCase().includes('part')
    );
    if (matchingCat) {
      formData.append('deviceCategory', matchingCat.id);
      formData.append('categoryId', matchingCat.id);
    }

    if (addImageFile) {
      formData.append('deviceImage', addImageFile);
      formData.append('deviceImages', addImageFile);
    }

    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        setAddModalSuccess('Spare part added successfully to branch inventory!');
        setTimeout(() => {
          handleCloseAndResetModal();
          fetchInventory();
        }, 1200);
      } else {
        const errData = await res.json().catch(() => ({}));
        setAddModalError(errData.error || 'Failed to add spare part.');
      }
    } catch (err: any) {
      console.error(err);
      setAddModalError(err.message || 'Error adding spare part.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 p-3.5 sm:p-6 md:p-8 flex flex-col gap-6 max-w-7xl w-full mx-auto font-['Inter']">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-purple-100 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8b00cc] to-[#bd00ff] text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Wrench size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight m-0">
                Spare Parts & Materials
              </h1>
              <span className="text-[11px] font-bold bg-purple-100 text-[#8b00cc] px-2.5 py-0.5 rounded-full border border-purple-200">
                📍 {activeBranch} Branch
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 font-medium m-0 mt-0.5">
              Live stock tracking, parts availability, and repair components for {activeBranch} branch.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] hover:from-[#7a00b3] hover:to-[#a900e6] text-white font-bold text-xs transition-all shadow-md shadow-purple-500/20 flex items-center gap-2 cursor-pointer border-none"
          >
            <Plus size={16} />
            <span>Add Spare Part</span>
          </button>
          <button
            onClick={fetchInventory}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-purple-50 text-gray-700 font-bold text-xs transition-colors flex items-center gap-2 border border-purple-200 cursor-pointer shadow-xs"
            title="Refresh Stock"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-purple-600' : 'text-gray-500'} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="flex-1 max-w-lg bg-white p-1 rounded-2xl border border-purple-100 shadow-xs">
          <div className="flex items-center gap-2.5 px-3 py-2 bg-gray-50/70 rounded-xl border border-gray-200/70 focus-within:ring-2 focus-within:ring-purple-500 focus-within:bg-white transition-all">
            <Search size={16} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search spare parts, component name, or compatible model..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-medium text-gray-900 bg-transparent outline-none placeholder-gray-400"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="text-gray-400 hover:text-gray-600 p-0.5 border-none bg-transparent cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Stock Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          <button
            type="button"
            onClick={() => { setStockFilter('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              stockFilter === 'all'
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
            }`}
          >
            All Stock ({stockCounts.all})
          </button>
          <button
            type="button"
            onClick={() => { setStockFilter('low'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              stockFilter === 'low'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
            }`}
          >
            Low Stock ({stockCounts.low})
          </button>
          <button
            type="button"
            onClick={() => { setStockFilter('out'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              stockFilter === 'out'
                ? 'bg-red-600 text-white border-red-600 shadow-xs'
                : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
            }`}
          >
            Out of Stock ({stockCounts.out})
          </button>
        </div>
      </div>

      {/* Main Spare Parts Table */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden flex flex-col">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-[760px]">
            <thead>
              <tr className="bg-purple-50/70 text-gray-700 text-xs uppercase tracking-wider font-bold border-b border-purple-200/50">
                <th className="py-4 px-6">Part / Component Name</th>
                <th className="py-4 px-4 text-left">Compatible Device</th>
                <th className="py-4 px-4 text-center">Category</th>
                <th className="py-4 px-4 text-center">{activeBranch} Stock</th>
                <th className="py-4 px-4 text-right">Unit Price</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-9 h-9 border-3 border-purple-200 border-t-[#8b00cc] rounded-full animate-spin"></div>
                      <span className="text-gray-500 font-semibold text-xs">
                        Loading {activeBranch} spare parts inventory...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : paginatedParts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto p-4">
                      <div className="w-14 h-14 rounded-2xl bg-purple-50 text-[#8b00cc] flex items-center justify-center mb-1">
                        <Box size={28} />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 m-0">No spare parts recorded yet</h3>
                      <p className="text-xs text-gray-500 m-0 leading-relaxed text-center">
                        {search 
                          ? 'No spare parts match your search query.' 
                          : 'You can add replacement screens, batteries, flex cables, and repair materials by clicking "+ Add Spare Part" above.'}
                      </p>
                      {search ? (
                        <button
                          onClick={() => setSearch('')}
                          className="mt-2 px-3 py-1.5 rounded-xl bg-purple-100 text-purple-700 font-bold text-xs cursor-pointer border-none hover:bg-purple-200"
                        >
                          Clear Search
                        </button>
                      ) : (
                        <button
                          onClick={() => setIsAddModalOpen(true)}
                          className="mt-2 px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs cursor-pointer border-none hover:bg-purple-700 shadow-sm flex items-center gap-1.5"
                        >
                          <Plus size={14} />
                          <span>Add First Spare Part</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedParts.map((item) => {
                  const branchLower = activeBranch.toLowerCase();
                  const stock = branchLower === 'villanueva'
                    ? (item.villanuevaStock ?? item.stock ?? 0)
                    : branchLower === 'jasaan'
                    ? (item.jasaanStock ?? item.stock ?? 0)
                    : (item.tagoloanStock ?? item.stock ?? 0);

                  const isOut = stock === 0;
                  const isLow = stock > 0 && stock < 5;

                  // Parse compatible model from specs
                  const specs = item.specs || '';
                  const compMatch = specs.match(/Compatible:\s*([^|]+)/i);
                  const compatibleDevice = compMatch && compMatch[1] ? compMatch[1].trim() : (specs.trim() || 'Universal');

                  // Parse category
                  const catMatch = specs.match(/Category:\s*(.+)$/i);
                  const categoryName = catMatch && catMatch[1]
                    ? catMatch[1].trim() 
                    : (typeof item.category === 'string' ? item.category : item.category?.name || item.type || 'Spare Part');

                  return (
                    <tr key={item.id} className="hover:bg-purple-50/30 transition-colors">
                      {/* Part Name & Thumbnail */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <Wrench size={18} className="text-purple-600" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                              {item.name}
                            </span>
                            <span className="text-[11px] text-gray-400 font-mono">
                              SKU: GRPX-PART-{item.id.slice(-4).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Compatible Device */}
                      <td className="py-3.5 px-4 text-xs font-semibold text-gray-700">
                        <div className="flex items-center gap-1.5">
                          <Smartphone size={13} className="text-purple-600 shrink-0" />
                          <span className="truncate">{compatibleDevice}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/70">
                          {categoryName}
                        </span>
                      </td>

                      {/* Live Branch Stock */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-lg font-mono font-extrabold text-xs ${
                          isOut ? 'bg-red-50 text-red-600 border border-red-200' :
                          isLow ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {stock} pcs
                        </span>
                      </td>

                      {/* Unit Price */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono font-bold text-gray-900 text-xs sm:text-sm">
                          ₱{(item.price || 0).toLocaleString()}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isOut ? 'bg-red-100 text-red-700' :
                          isLow ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-6 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 hover:text-purple-900 border border-purple-200 transition-colors cursor-pointer shadow-xs"
                            title="Edit Part & Stock"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePart(item.id, item.name)}
                            disabled={isDeleting === item.id}
                            className="p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 border border-red-200 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                            title="Delete Part"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-purple-100 bg-gray-50/50">
            <span className="text-xs font-semibold text-gray-500">
              Showing <span className="text-gray-900 font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of <span className="text-gray-900 font-bold">{totalCount}</span> spare parts
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-3 bg-white px-3.5 py-1.5 rounded-xl border border-purple-200 shadow-2xs">
                <button
                  onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                  disabled={currentPage === 1 || loading}
                  className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 text-purple-700 hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed flex justify-center items-center cursor-pointer transition-all"
                  title="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>

                <span className="font-semibold text-xs text-gray-600 px-1">
                  Page <span className="text-purple-900 font-extrabold">{currentPage}</span> of <span className="text-purple-900 font-extrabold">{totalPages}</span>
                </span>

                <button
                  onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                  disabled={currentPage === totalPages || loading}
                  className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 text-purple-700 hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed flex justify-center items-center cursor-pointer transition-all"
                  title="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Spare Part Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-purple-100 shadow-2xl animate-in zoom-in-95 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-purple-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Wrench size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 m-0">Add Spare Part / Material</h3>
                  <p className="text-xs text-gray-500 m-0">Add replacement part to {activeBranch} branch inventory</p>
                </div>
              </div>
            </div>

            {addModalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                {addModalError}
              </div>
            )}

            {addModalSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{addModalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddPartSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Part / Material Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. iPhone 11 Pro Max OLED Screen Assembly"
                  value={addPartName}
                  onChange={(e) => setAddPartName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Compatible Device / Model
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. iPhone 11 Pro Max, Universal"
                    value={addCompatibleModel}
                    onChange={(e) => setAddCompatibleModel(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Category
                  </label>
                  <select
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    {PART_CATEGORIES.filter(c => c !== 'All Categories').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Initial Stock (pcs) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={addStock}
                    onChange={(e) => setAddStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Cost Price (₱)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={addCost}
                    onChange={(e) => setAddCost(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Selling Price (₱) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    value={addPrice}
                    onChange={(e) => setAddPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Part Photo (Optional)
                </label>
                <div className="flex items-center gap-3">
                  {addImagePreview ? (
                    <div className="relative w-14 h-14 rounded-xl border border-purple-200 overflow-hidden shrink-0">
                      <img src={addImagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setAddImageFile(null); setAddImagePreview(null); }}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 cursor-pointer border-none"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : null}
                  <label className="flex-1 px-3 py-2 border-2 border-dashed border-gray-200 hover:border-purple-300 rounded-xl text-center cursor-pointer bg-gray-50/50 hover:bg-purple-50/30 transition-colors">
                    <span className="text-xs text-purple-700 font-bold">+ Upload Part Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAddImageFile(file);
                          setAddImagePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseAndResetModal}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white font-bold text-xs hover:from-[#7a00b3] hover:to-[#a900e6] cursor-pointer border-none shadow-md shadow-purple-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Part...' : 'Save Part to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Spare Part Modal */}
      {isEditModalOpen && editingPart && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-purple-100 shadow-2xl animate-in zoom-in-95 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-purple-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Pencil size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 m-0">Edit Spare Part / Material</h3>
                  <p className="text-xs text-gray-500 m-0">Update inventory details and stock for {activeBranch} branch</p>
                </div>
              </div>
            </div>

            {editModalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                {editModalError}
              </div>
            )}

            {editModalSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{editModalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleEditPartSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Part / Material Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LCD Screen, iPhone Battery, Charging Flex"
                  value={editPartName}
                  onChange={(e) => setEditPartName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Compatible Device / Model
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. iPhone 13, Galaxy S21"
                    value={editCompatibleModel}
                    onChange={(e) => setEditCompatibleModel(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    {PART_CATEGORIES.filter(c => c !== 'All Categories').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    {activeBranch} Stock (pcs) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Cost Price (₱)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Selling Price (₱) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Part Photo (Optional)
                </label>
                <div className="flex items-center gap-3">
                  {editImagePreview ? (
                    <div className="relative w-14 h-14 rounded-xl border border-purple-200 overflow-hidden shrink-0">
                      <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setEditImageFile(null); setEditImagePreview(null); }}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 cursor-pointer border-none"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : null}
                  <label className="flex-1 px-3 py-2 border-2 border-dashed border-gray-200 hover:border-purple-300 rounded-xl text-center cursor-pointer bg-gray-50/50 hover:bg-purple-50/30 transition-colors">
                    <span className="text-xs text-purple-700 font-bold">
                      {editImagePreview ? 'Change Part Photo' : '+ Upload Part Photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setEditImageFile(file);
                          setEditImagePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setEditingPart(null); }}
                  disabled={isEditSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white font-bold text-xs hover:from-[#7a00b3] hover:to-[#a900e6] cursor-pointer border-none shadow-md shadow-purple-500/20 disabled:opacity-50"
                >
                  {isEditSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
