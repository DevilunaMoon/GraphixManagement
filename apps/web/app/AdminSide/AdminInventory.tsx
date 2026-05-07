"use client";

import { useState, useEffect, useRef } from 'react';
import { Search, Filter, ChevronDown, Trash2, ChevronLeft, ChevronRight, X, Plus, Pencil, Upload, AlertCircle, Trash } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

type VariationGroup = { section: string, variations: { name: string, price: string, cost: string, stock: string }[] };

export default function AdminInventory() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { styles } = useTheme();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();
  
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [viewMoreProduct, setViewMoreProduct] = useState<any | null>(null);
  
  const [initialProducts, setInitialProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Categories
  const [categories, setCategories] = useState<{ id: string, name: string, logoUrl?: string }[]>([]);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatImage, setNewCatImage] = useState<File | null>(null);
  const [newCatImagePreview, setNewCatImagePreview] = useState<string | null>(null);
  const [isAddingCat, setIsAddingCat] = useState(false);

  const fetchCategories = () => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(err => console.error("Error fetching categories:", err));
  };
  
  const handleCatImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewCatImage(file);
      setNewCatImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName) return;
    setIsAddingCat(true);
    const formData = new FormData();
    formData.append('categoryName', newCatName);
    if (newCatImage) formData.append('categoryImage', newCatImage);

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setNewCatName('');
        setNewCatImage(null);
        setNewCatImagePreview(null);
        fetchCategories();
      } else {
        alert('Failed to add category');
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsAddingCat(false);
    }
  };
  
  // Add Product State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceCost, setNewDeviceCost] = useState('');
  const [newDevicePrice, setNewDevicePrice] = useState('');
  const [newDeviceStocks, setNewDeviceStocks] = useState('');
  const [newDeviceCategory, setNewDeviceCategory] = useState('');
  const [newDeviceSpecs, setNewDeviceSpecs] = useState('');
  const [newDeviceAsLowAs, setNewDeviceAsLowAs] = useState('');
  const [newDeviceWarranty, setNewDeviceWarranty] = useState('');
  const [newDeviceDownpayment, setNewDeviceDownpayment] = useState('');
  
  const [newDeviceImages, setNewDeviceImages] = useState<File[]>([]);
  const [newDeviceImagePreviews, setNewDeviceImagePreviews] = useState<string[]>([]);
  const [newDeviceDownpaymentImage, setNewDeviceDownpaymentImage] = useState<File | null>(null);
  const [newDeviceDownpaymentImagePreview, setNewDeviceDownpaymentImagePreview] = useState<string | null>(null);
  const [newDeviceVariations, setNewDeviceVariations] = useState<VariationGroup[]>([]);

  // Edit Product State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [productToEdit, setProductToEdit] = useState<any | null>(null);
  
  const [editDeviceName, setEditDeviceName] = useState('');
  const [editDeviceCost, setEditDeviceCost] = useState('');
  const [editDevicePrice, setEditDevicePrice] = useState('');
  const [editDeviceStocks, setEditDeviceStocks] = useState('');
  const [editDeviceCategory, setEditDeviceCategory] = useState('');
  const [editDeviceSpecs, setEditDeviceSpecs] = useState('');
  const [editDeviceAsLowAs, setEditDeviceAsLowAs] = useState('');
  const [editDeviceWarranty, setEditDeviceWarranty] = useState('');
  const [editDeviceDownpayment, setEditDeviceDownpayment] = useState('');
  
  const [editDeviceImages, setEditDeviceImages] = useState<File[]>([]);
  const [editDeviceImagePreviews, setEditDeviceImagePreviews] = useState<string[]>([]);
  const [editDeviceDownpaymentImage, setEditDeviceDownpaymentImage] = useState<File | null>(null);
  const [editDeviceDownpaymentImagePreview, setEditDeviceDownpaymentImagePreview] = useState<string | null>(null);
  const [editDeviceVariations, setEditDeviceVariations] = useState<VariationGroup[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  const fetchProducts = () => {
    setIsLoading(true);
    fetch('/api/devices')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setInitialProducts(data.map(device => ({
            dbId: device.id,
            name: device.name || 'Unnamed',
            img: device.image || '/Images/Aula.jpg',
            id: device.id ? `#${String(device.id).substring(String(device.id).length - 8).toUpperCase()}` : '#UNKNOWN',
            displayPrice: `₱ ${Number(device.price || 0).toLocaleString()}`,
            displayStock: `${device.stock || 0} pcs`,
            type: device.specs || 'N/A',
            // Raw values for editing
            price: device.price?.toString() || '',
            cost: device.cost?.toString() || '',
            stock: device.stock?.toString() || '',
            categoryId: device.categoryId || '',
            asLowAs: device.asLowAs || '',
            warranty: device.warranty || '',
            downpayment: device.downpayment || '',
            images: device.images || [],
            downpaymentImage: device.downpaymentImage || null,
            variations: device.variations ? Object.values(device.variations.reduce((acc: any, v: any) => {
              if (!acc[v.type]) acc[v.type] = { section: v.type, variations: [] };
              acc[v.type].variations.push({ name: v.name, price: v.price?.toString() || '0', cost: v.cost?.toString() || '0', stock: v.stock?.toString() || '0' });
              return acc;
            }, {})) : []
          })));
        }
      })
      .catch(err => console.error("Error fetching inventory:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const handleDeleteClick = (dbId: string) => {
    setProductToDelete(dbId);
    setDeleteError(undefined);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    setDeleteError(undefined);
    try {
      const res = await fetch(`/api/devices/${productToDelete}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProducts(); // refresh
        setDeleteModalOpen(false);
        setProductToDelete(null);
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

  // Add Product Handlers
  const handleDeviceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setNewDeviceImages(prev => [...prev, ...filesArray]);
      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setNewDeviceImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };
  const removeNewDeviceImage = (index: number) => {
    setNewDeviceImages(prev => prev.filter((_, i) => i !== index));
    setNewDeviceImagePreviews(prev => prev.filter((_, i) => i !== index));
  };
  const handleNewDownpaymentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewDeviceDownpaymentImage(file);
      setNewDeviceDownpaymentImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newDeviceName || !newDeviceCost || !newDevicePrice || !newDeviceStocks || !newDeviceCategory) {
      alert("Please fill in all required fields.");
      return;
    }
    
    setIsAdding(true);
    const formData = new FormData();
    formData.append('deviceName', newDeviceName);
    formData.append('deviceCost', newDeviceCost);
    formData.append('devicePrice', newDevicePrice);
    formData.append('deviceStocks', newDeviceStocks);
    formData.append('deviceCategory', newDeviceCategory);
    formData.append('deviceSpecs', newDeviceSpecs);
    formData.append('deviceAsLowAs', newDeviceAsLowAs);
    formData.append('deviceWarranty', newDeviceWarranty);
    formData.append('deviceDownpayment', newDeviceDownpayment);
    
    if (newDeviceVariations.length > 0) {
      const flattened = newDeviceVariations.flatMap(group =>
        group.variations.map(v => ({ type: group.section, ...v }))
      );
      formData.append('variations', JSON.stringify(flattened));
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
        setNewDeviceName(''); setNewDeviceCost(''); setNewDevicePrice('');
        setNewDeviceStocks(''); setNewDeviceCategory(''); setNewDeviceSpecs('');
        setNewDeviceAsLowAs(''); setNewDeviceWarranty(''); setNewDeviceDownpayment('');
        setNewDeviceImages([]); setNewDeviceImagePreviews([]);
        setNewDeviceDownpaymentImage(null); setNewDeviceDownpaymentImagePreview(null);
        setNewDeviceVariations([]);
      } else {
        alert('Failed to add product');
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
    setEditDeviceCost(prod.cost);
    setEditDevicePrice(prod.price);
    setEditDeviceStocks(prod.stock);
    setEditDeviceCategory(prod.categoryId);
    setEditDeviceSpecs(prod.type !== 'N/A' ? prod.type : '');
    setEditDeviceAsLowAs(prod.asLowAs);
    setEditDeviceWarranty(prod.warranty);
    setEditDeviceDownpayment(prod.downpayment);
    setEditDeviceImagePreviews(prod.images.length > 0 ? prod.images : (prod.img !== '/Images/Aula.jpg' ? [prod.img] : []));
    setEditDeviceImages([]);
    setEditDeviceDownpaymentImagePreview(prod.downpaymentImage);
    setEditDeviceDownpaymentImage(null);
    setEditDeviceVariations(prod.variations || []);
    setIsEditModalOpen(true);
  };

  const handleEditDeviceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setEditDeviceImages(prev => [...prev, ...filesArray]);
      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setEditDeviceImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };
  const removeEditDeviceImage = (index: number) => {
    setEditDeviceImages(prev => prev.filter((_, i) => i !== index));
    setEditDeviceImagePreviews(prev => prev.filter((_, i) => i !== index));
  };
  const handleEditDownpaymentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditDeviceDownpaymentImage(file);
      setEditDeviceDownpaymentImagePreview(URL.createObjectURL(file));
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!productToEdit) return;
    setIsEditing(true);
    
    const formData = new FormData();
    formData.append('deviceName', editDeviceName);
    formData.append('deviceCost', editDeviceCost);
    formData.append('devicePrice', editDevicePrice);
    formData.append('deviceStocks', editDeviceStocks);
    formData.append('deviceCategory', editDeviceCategory);
    formData.append('deviceSpecs', editDeviceSpecs);
    formData.append('deviceAsLowAs', editDeviceAsLowAs);
    formData.append('deviceWarranty', editDeviceWarranty);
    formData.append('deviceDownpayment', editDeviceDownpayment);
    
    if (editDeviceVariations.length > 0) {
      const flattened = editDeviceVariations.flatMap(group =>
        group.variations.map(v => ({ type: group.section, ...v }))
      );
      formData.append('variations', JSON.stringify(flattened));
    } else {
      formData.append('variations', JSON.stringify([])); // Explicitly send empty array to clear variations if all removed
    }
    
    editDeviceImages.forEach(img => formData.append('deviceImages', img));
    if (editDeviceDownpaymentImage) {
      formData.append('deviceDownpaymentImage', editDeviceDownpaymentImage);
    }
    
    try {
      const res = await fetch(`/api/devices/${productToEdit.dbId}`, { method: 'PUT', body: formData });
      if (res.ok) {
        fetchProducts();
        setIsEditModalOpen(false);
        setProductToEdit(null);
      } else {
        alert('Failed to edit product');
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred while editing the product');
    } finally {
      setIsEditing(false);
    }
  };

  const filteredProducts = initialProducts.filter(prod => {
    const matchesSearch = (prod.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prod.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prod.type || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || prod.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const products = filteredProducts;
  const totalPages = Math.max(1, Math.ceil(products.length / itemsPerPage));
  const paginatedProducts = products.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const prevPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const nextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

  return (
    <div className="flex flex-col gap-6">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-2">
        <h2 className="text-[1.6rem] font-bold text-[#111] whitespace-nowrap">Inventory Product</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
          {/* Search Box */}
          <div className={`flex items-center bg-white border-2 ${styles.borderMain} rounded-full px-4 py-2 w-full sm:w-[250px] transition-colors duration-300`}>
            <Search className={`${styles.textActive} w-5 h-5 mr-2`} />
            <input type="text" placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="border-none outline-none w-full text-[0.95rem] text-[#111] bg-transparent placeholder-[#999]" />
          </div>

        {/* Filter Dropdown */}
          <div className="relative font-['Inter'] flex-shrink-0">
            <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center bg-white border-2 ${styles.borderMain} rounded-full px-4 py-2 cursor-pointer ${styles.textActive} text-[1.1rem] font-semibold hover:bg-black/5 transition-all w-full sm:w-[150px] justify-between`}>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            {isFilterOpen && (
              <div className="absolute top-[115%] right-0 w-[150px] bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-black/10 overflow-hidden flex flex-col z-50 animate-in fade-in slide-in-from-top-2 max-h-60 overflow-y-auto custom-scrollbar">
                <button onClick={() => { setSelectedCategory('All'); setIsFilterOpen(false); }} className={`px-5 py-3 text-left font-medium hover:bg-black/5 transition-colors ${selectedCategory === 'All' ? `${styles.textActive} font-bold` : 'text-[#111]'}`}>All Categories</button>
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => { setSelectedCategory(cat.id); setIsFilterOpen(false); }} className={`px-5 py-3 text-left font-medium hover:bg-black/5 transition-colors ${selectedCategory === cat.id ? `${styles.textActive} font-bold` : 'text-[#111]'}`}>
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button onClick={() => setCategoriesModalOpen(true)} className="flex items-center gap-2 bg-purple-100 text-[#5c0099] px-5 py-2.5 rounded-full font-bold hover:bg-purple-200 transition-colors shadow-sm cursor-pointer border-none flex-shrink-0 whitespace-nowrap">
            <span>Manage Categories</span>
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-[#5c0099] text-white px-5 py-2.5 rounded-full font-bold hover:bg-[#3d0066] transition-colors shadow-sm cursor-pointer border-none ml-auto lg:ml-0 flex-shrink-0 whitespace-nowrap">
            <Plus size={20} />
            <span>Add Device</span>
          </button>
        </div>
      </div>

      {/* Inventory Table Card */}
      <div className={`bg-white/95 backdrop-blur-md border-2 ${styles.borderMain} rounded-xl overflow-hidden shadow-sm flex flex-col transition-colors duration-300`}>
        <div className="w-full">
          <table className="w-full border-collapse text-center">
            <thead>
              <tr>
                <th className={`py-4 px-5 font-bold text-[1.05rem] text-[#111] border-b-2 ${styles.borderMain} text-left`}>Product Name</th>
                <th className={`py-4 px-5 font-bold text-[1.05rem] text-[#111] border-b-2 ${styles.borderMain}`}>Product ID</th>
                <th className={`py-4 px-5 font-bold text-[1.05rem] text-[#111] border-b-2 ${styles.borderMain} hidden md:table-cell`}>Price</th>
                <th className={`py-4 px-5 font-bold text-[1.05rem] text-[#111] border-b-2 ${styles.borderMain} hidden md:table-cell`}>Stock</th>
                <th className={`py-4 px-5 font-bold text-[1.05rem] text-[#111] border-b-2 ${styles.borderMain} hidden md:table-cell`}>Type</th>
                <th className={`py-4 px-5 font-bold text-[1.05rem] text-[#111] border-b-2 ${styles.borderMain} hidden md:table-cell`}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 border-4 border-purple-100 border-t-[#bd00ff] rounded-full animate-spin"></div>
                      <span className="text-[#666] font-semibold animate-pulse">Loading database...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedProducts.length > 0 ? (
                paginatedProducts.map((prod, index) => (
                  <tr key={index} className={`cursor-pointer md:cursor-default hover:bg-black/5 transition-colors border-b ${styles.borderMain}`} onClick={() => { if (window.innerWidth < 768) { setSelectedProduct(prod); } }}>
                    <td className={`py-4 px-5 border-b ${styles.borderMain}`}>
                      <div className="flex items-center gap-4 text-left">
                        <img src={prod.img} alt={prod.name} className="w-[45px] h-[45px] object-cover rounded-md border border-black/10 shrink-0" />
                        <div className="flex flex-col justify-center">
                          <span className="text-[0.9rem] font-bold text-[#111] leading-snug break-words max-w-[150px] sm:max-w-none">{prod.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className={`py-4 px-5 text-[0.95rem] text-[#666] border-b ${styles.borderMain} truncate max-w-[100px] sm:max-w-none`}>{prod.id}</td>
                    <td className={`py-4 px-5 text-[0.95rem] text-[#666] border-b ${styles.borderMain} hidden md:table-cell`}>{prod.displayPrice}</td>
                    <td className={`py-4 px-5 text-[0.95rem] text-[#666] border-b ${styles.borderMain} hidden md:table-cell`}>{prod.displayStock}</td>
                    <td className={`py-4 px-5 text-[0.95rem] text-[#666] border-b ${styles.borderMain} hidden md:table-cell max-w-[200px]`}>
                      {prod.type && prod.type.length > 80 ? (
                        <div className="inline-block">
                          {prod.type.substring(0, 80)}...
                          <button onClick={(e) => { e.stopPropagation(); setViewMoreProduct(prod); }} className="text-[#bd00ff] hover:underline font-bold bg-transparent border-none cursor-pointer ml-1 text-sm inline">View More</button>
                        </div>
                      ) : (prod.type)}
                    </td>
                    <td className={`py-4 px-5 border-b ${styles.borderMain} hidden md:table-cell`}>
                      <button onClick={(e) => { e.stopPropagation(); handleEditClick(prod); }} className="text-[#5c0099] hover:text-[#bd00ff] hover:scale-110 transition-all cursor-pointer bg-transparent border-none flex items-center justify-center w-full" title="Edit Product"><Pencil size={20} /></button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#666] font-semibold">No products found in the database.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-center items-center p-4 gap-4 bg-white/95 border-t border-black/5">
          <button onClick={prevPage} disabled={currentPage === 1} className={`text-[#111] transition-transform bg-transparent border-none ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-125 cursor-pointer'}`}><ChevronLeft size={24} /></button>
          <span className="text-[1.2rem] font-semibold text-[#111]">{currentPage}/{totalPages}</span>
          <button onClick={nextPage} disabled={currentPage === totalPages} className={`text-[#111] transition-transform bg-transparent border-none ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:scale-125 cursor-pointer'}`}><ChevronRight size={24} /></button>
        </div>
      </div>

      {/* Product Info Modal for Mobile */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-black/5 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-[#111] text-lg">Product Details</h3>
              <div className="flex items-center gap-3">
                <button className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-full transition-colors flex items-center justify-center" title="Delete Product" onClick={() => { handleDeleteClick(selectedProduct.dbId); setSelectedProduct(null); }}><Trash2 size={20} /></button>
                <button className="text-gray-400 hover:text-black transition-colors" onClick={() => setSelectedProduct(null)}><X size={20} /></button>
              </div>
            </div>
            <div className="p-6 flex flex-col gap-4 text-left">
              <div className="flex items-center gap-4 mb-2">
                 <img src={selectedProduct.img} alt={selectedProduct.name} className="w-[60px] h-[60px] object-cover rounded-md border border-black/10 shrink-0" />
                 <div className="flex flex-col">
                   <span className="font-bold text-[#111] text-[1.1rem] leading-snug">{selectedProduct.name}</span>
                   <span className="text-[#666] text-sm">{selectedProduct.id}</span>
                 </div>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <span className="text-[#666] font-medium">Price</span>
                <span className="font-bold text-[#111]">{selectedProduct.displayPrice}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <span className="text-[#666] font-medium">Stock</span>
                <span className="font-bold text-[#111]">{selectedProduct.displayStock}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#666] font-medium mb-1">Type/Specs</span>
                <span className="font-bold text-[#111]">{selectedProduct.type}</span>
              </div>
            </div>
            <div className="p-4 bg-gray-50/80 border-t border-black/5">
              <button className="w-full py-2.5 rounded-xl bg-[#bd00ff] text-white font-semibold hover:bg-purple-700 transition-colors" onClick={() => setSelectedProduct(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl border border-purple-500/20 flex flex-col items-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-5 shadow-sm"><Trash2 size={32} /></div>
            <h3 className="text-2xl font-bold text-[#111] mb-2 text-center">Delete Product?</h3>
            <p className="text-[#666] text-center mb-6 font-medium">Are you sure you want to permanently delete this product? This action cannot be undone.</p>
            {deleteError && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm font-bold border border-red-100 w-full text-center">{deleteError}</div>}
            <div className="flex w-full gap-4">
              <button onClick={() => { setDeleteModalOpen(false); setProductToDelete(null); setDeleteError(undefined); }} disabled={isDeleting} className="flex-1 py-3.5 px-4 rounded-xl font-bold text-[#666] bg-gray-100 hover:bg-gray-200 transition-colors border-none cursor-pointer disabled:opacity-50">Cancel</button>
              <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 py-3.5 px-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-[0_4px_15px_rgba(220,38,38,0.3)] transition-all border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                {isDeleting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Deleting...</> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Device Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 flex flex-col overflow-hidden max-h-[95vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50 shrink-0">
              <h3 className="text-xl font-bold text-[#5c0099] flex items-center gap-2 m-0"><Plus size={24} />Add New Device</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-500 hover:text-black hover:bg-gray-200 p-2 rounded-full transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center"><X size={24} /></button>
            </div>
            <form onSubmit={handleAddProduct} className="overflow-y-auto p-6 flex flex-col gap-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="shrink-0 flex flex-col gap-6 w-full md:w-[200px]">
                  <div className="flex flex-col gap-2">
                    <label className="w-full h-[120px] rounded-xl border-2 border-dashed border-[#5c0099] flex flex-col justify-center items-center gap-1 cursor-pointer hover:bg-purple-50 transition-colors text-[#5c0099] bg-white">
                      <Upload size={24} /><span className="text-xs font-semibold text-center leading-tight">Upload Photos</span>
                      <input type="file" multiple onChange={handleDeviceImageChange} accept="image/*" className="hidden" />
                    </label>
                    {newDeviceImagePreviews.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {newDeviceImagePreviews.map((preview, idx) => (
                          <div key={idx} className="relative w-[60px] h-[60px] shrink-0 border border-gray-200 rounded-lg overflow-hidden group">
                            <img src={preview} alt="preview" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removeNewDeviceImage(idx)} className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer"><X size={10} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#444] mb-1">Device Name <span className="text-red-500">*</span></label>
                    <input required type="text" value={newDeviceName} onChange={e => setNewDeviceName(e.target.value)} placeholder="e.g. iPhone 15 Pro" className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 focus:border-[#5c0099] outline-none transition-colors text-[#111]" />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-[#444] mb-1">Cost <span className="text-red-500">*</span></label>
                      <input required type="number" step="0.01" value={newDeviceCost} onChange={e => setNewDeviceCost(e.target.value)} placeholder="0.00" className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 focus:border-[#5c0099] outline-none transition-colors text-[#111]" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-[#444] mb-1">Selling Price <span className="text-red-500">*</span></label>
                      <input required type="number" step="0.01" value={newDevicePrice} onChange={e => setNewDevicePrice(e.target.value)} placeholder="0.00" className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 focus:border-[#5c0099] outline-none transition-colors text-[#111]" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-[#444] mb-1">Stocks <span className="text-red-500">*</span></label>
                      <input required type="number" value={newDeviceStocks} onChange={e => setNewDeviceStocks(e.target.value)} placeholder="0" className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 focus:border-[#5c0099] outline-none transition-colors text-[#111]" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="block text-sm font-bold text-[#444]">Category <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select required value={newDeviceCategory} onChange={e => setNewDeviceCategory(e.target.value)} className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 focus:border-[#5c0099] focus:ring-4 focus:ring-[#5c0099]/10 outline-none transition-all text-[#111] font-semibold appearance-none bg-white cursor-pointer hover:border-gray-300">
                      <option value="" disabled className="text-gray-400">Select a category...</option>
                      {categories.map((cat, idx) => (<option key={idx} value={cat.id} className="font-medium text-[#111]">{cat.name}</option>))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400"><svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg></div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="block text-sm font-bold text-[#444]">Specs / Description</label>
                  <textarea value={newDeviceSpecs} onChange={e => setNewDeviceSpecs(e.target.value)} rows={3} placeholder="Memory, Color, Connectivity, etc..." className="w-full border-2 border-gray-200 rounded-xl p-4 focus:border-[#5c0099] focus:ring-4 focus:ring-[#5c0099]/10 outline-none transition-all text-[#111] font-medium resize-y min-h-[80px]" />
                </div>
                
                <div className="mt-2 border-2 border-cyan-100 bg-cyan-50/20 rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden mb-4">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#01f0ff]" />
                  <h4 className="text-cyan-800 font-bold text-sm m-0">Downpayment Options</h4>
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="shrink-0 w-full md:w-[140px] flex flex-col gap-1">
                      <label className="block text-xs font-bold text-[#444]">QR Code</label>
                      <label className="w-full h-[100px] rounded-xl border-2 border-dashed border-[#01f0ff] flex flex-col justify-center items-center gap-1 cursor-pointer hover:bg-cyan-50 transition-colors text-[#01f0ff] overflow-hidden relative bg-white">
                        {newDeviceDownpaymentImagePreview ? (<img src={newDeviceDownpaymentImagePreview} alt="Preview" className="w-full h-full object-cover" />) : (<><Upload size={16} /><span className="text-[10px] font-semibold text-center leading-tight px-2">Upload QR</span></>)}
                        <input type="file" onChange={handleNewDownpaymentImageChange} accept="image/*" className="hidden" />
                      </label>
                    </div>
                    <div className="flex-1 flex flex-col gap-3 justify-end">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 flex flex-col gap-1">
                          <label className="block text-xs font-bold text-[#444]">As Low As <span className="text-gray-400 font-normal ml-1">(Optional)</span></label>
                          <input type="text" value={newDeviceAsLowAs} onChange={e => setNewDeviceAsLowAs(e.target.value)} placeholder="e.g. ₱1,500/mo" className="w-full h-10 border-2 border-cyan-100 rounded-lg px-3 focus:border-[#01f0ff] outline-none transition-colors text-[#111] text-sm" />
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                          <label className="block text-xs font-bold text-[#444]">Warranty <span className="text-gray-400 font-normal ml-1">(Optional)</span></label>
                          <input type="text" value={newDeviceWarranty} onChange={e => setNewDeviceWarranty(e.target.value)} placeholder="e.g. 1 Year Local" className="w-full h-10 border-2 border-cyan-100 rounded-lg px-3 focus:border-[#01f0ff] outline-none transition-colors text-[#111] text-sm" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="block text-xs font-bold text-[#444]">Downpayment <span className="text-gray-400 font-normal ml-1">(Optional)</span></label>
                        <input type="text" value={newDeviceDownpayment} onChange={e => setNewDeviceDownpayment(e.target.value)} placeholder="e.g. 20% or ₱5,000" className="w-full h-10 border-2 border-cyan-100 rounded-lg px-3 focus:border-[#01f0ff] outline-none transition-colors text-[#111] text-sm" />
                      </div>
                    </div>
                  </div>
                </div>

                                {/* Variations Section */}
                <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center px-1">
                    <label className="block text-sm font-bold text-[#444]">Variations <span className="text-gray-400 font-normal ml-1">(Optional)</span></label>
                    <button type="button" onClick={() => setNewDeviceVariations([...newDeviceVariations, { section: '', variations: [{ name: '', price: newDevicePrice || '0', cost: newDeviceCost || '0', stock: '0' }] }])} className="text-xs font-bold text-[#bd00ff] bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors border-none cursor-pointer flex items-center gap-1">
                      <Plus size={14} /> Add Section
                    </button>
                  </div>
                  {newDeviceVariations.length > 0 && (
                    <div className="flex flex-col gap-4 mt-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {newDeviceVariations.map((group, groupIdx) => (
                        <div key={groupIdx} className="flex flex-col gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 relative">
                          <div className="flex items-center gap-3">
                            <label className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Section</label>
                            <input type="text" value={group.section} onChange={e => {
                              const updated = [...newDeviceVariations];
                              if (updated[groupIdx]) updated[groupIdx].section = e.target.value;
                              setNewDeviceVariations(updated);
                            }} className="h-9 border border-gray-300 rounded-lg px-3 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold flex-1 max-w-[200px]" placeholder="e.g. Color" />
                            <div className="flex-1"></div>
                            <button type="button" onClick={() => {
                              const updated = newDeviceVariations.filter((_, i) => i !== groupIdx);
                              setNewDeviceVariations(updated);
                            }} className="h-8 w-8 flex items-center justify-center shrink-0 rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors border-none cursor-pointer shadow-sm" title="Remove Section"><Trash size={14} /></button>
                          </div>
                          <div className="flex flex-col gap-2 pl-2 border-l-2 border-purple-200 ml-2">
                            {group.variations.map((v, vIdx) => (
                              <div key={vIdx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-end relative group/var">
                                <div className="w-full sm:w-1/3">
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Variation Name</label>
                                  <input type="text" value={v.name} onChange={e => {
                                    const updated = [...newDeviceVariations];
                                    if (updated[groupIdx] && updated[groupIdx].variations[vIdx]) {
                                      updated[groupIdx].variations[vIdx].name = e.target.value;
                                      setNewDeviceVariations(updated);
                                    }
                                  }} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold" placeholder="e.g. Red" />
                                </div>
                                <div className="flex gap-2 w-full sm:w-[60%]">
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Price</label>
                                    <input type="number" step="0.01" value={v.price} onChange={e => {
                                      const updated = [...newDeviceVariations];
                                      if (updated[groupIdx] && updated[groupIdx].variations[vIdx]) {
                                        updated[groupIdx].variations[vIdx].price = e.target.value;
                                        setNewDeviceVariations(updated);
                                      }
                                    }} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold" placeholder="Price" />
                                  </div>
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cost</label>
                                    <input type="number" step="0.01" value={v?.cost || ''} onChange={e => {
                                      const updated = [...newDeviceVariations];
                                      if (updated[groupIdx] && updated[groupIdx].variations[vIdx]) {
                                        updated[groupIdx].variations[vIdx].cost = e.target.value;
                                        setNewDeviceVariations(updated);
                                      }
                                    }} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold" placeholder="Cost" />
                                  </div>
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Stock</label>
                                    <input type="number" value={v?.stock || ''} onChange={e => {
                                      const updated = [...newDeviceVariations];
                                      if (updated[groupIdx] && updated[groupIdx].variations[vIdx]) {
                                        updated[groupIdx].variations[vIdx].stock = e.target.value;
                                        setNewDeviceVariations(updated);
                                      }
                                    }} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold" placeholder="Stock" />
                                  </div>
                                </div>
                                <button type="button" onClick={() => {
                                  const updated = [...newDeviceVariations];
                                  if (updated[groupIdx]) {
                                    updated[groupIdx].variations = updated[groupIdx].variations.filter((_, i) => i !== vIdx);
                                    setNewDeviceVariations(updated);
                                  }
                                }} className="absolute -top-1 -right-1 h-5 w-5 sm:relative sm:top-0 sm:right-0 sm:h-9 sm:w-9 flex items-center justify-center shrink-0 rounded-full sm:rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors border-none cursor-pointer"><X size={14} /></button>
                              </div>
                            ))}
                            <button type="button" onClick={() => {
                              const updated = [...newDeviceVariations];
                              if (updated[groupIdx]) {
                                updated[groupIdx].variations.push({ name: '', price: newDevicePrice || '0', cost: newDeviceCost || '0', stock: '0' });
                                setNewDeviceVariations(updated);
                              }
                            }} className="mt-2 self-start text-[11px] font-bold text-[#bd00ff] bg-transparent hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors border-2 border-dashed border-[#bd00ff]/50 hover:border-[#bd00ff] cursor-pointer flex items-center gap-1"><Plus size={12} /> Add Variation</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-4 mt-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} disabled={isAdding} className="w-1/3 py-3.5 rounded-xl font-bold text-[#666] bg-gray-100 hover:bg-gray-200 transition-colors border-none cursor-pointer disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isAdding} className="flex-1 py-3.5 rounded-xl font-bold text-white bg-[#5c0099] hover:bg-[#3d0066] shadow-[0_4px_15px_rgba(92,0,153,0.3)] transition-all border-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50">
                  {isAdding ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Saving...</> : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Device Modal */}
      {isEditModalOpen && productToEdit && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 flex flex-col overflow-hidden max-h-[95vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50 shrink-0">
              <h3 className="text-xl font-bold text-[#5c0099] flex items-center gap-2 m-0"><Pencil size={24} />Edit Device</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-500 hover:text-black hover:bg-gray-200 p-2 rounded-full transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center"><X size={24} /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="overflow-y-auto p-6 flex flex-col gap-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="shrink-0 flex flex-col gap-6 w-full md:w-[200px]">
                  <div className="flex flex-col gap-2">
                    <label className="w-full h-[120px] rounded-xl border-2 border-dashed border-[#5c0099] flex flex-col justify-center items-center gap-1 cursor-pointer hover:bg-purple-50 transition-colors text-[#5c0099] bg-white">
                      <Upload size={24} /><span className="text-xs font-semibold text-center leading-tight">Upload Photos</span>
                      <input type="file" multiple onChange={handleEditDeviceImageChange} accept="image/*" className="hidden" />
                    </label>
                    {editDeviceImagePreviews.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {editDeviceImagePreviews.map((preview, idx) => (
                          <div key={idx} className="relative w-[60px] h-[60px] shrink-0 border border-gray-200 rounded-lg overflow-hidden group">
                            <img src={preview} alt="preview" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removeEditDeviceImage(idx)} className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer"><X size={10} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#444] mb-1">Device Name <span className="text-red-500">*</span></label>
                    <input required type="text" value={editDeviceName} onChange={e => setEditDeviceName(e.target.value)} placeholder="e.g. iPhone 15 Pro" className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 focus:border-[#5c0099] outline-none transition-colors text-[#111]" />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-[#444] mb-1">Cost <span className="text-red-500">*</span></label>
                      <input required type="number" step="0.01" value={editDeviceCost} onChange={e => setEditDeviceCost(e.target.value)} placeholder="0.00" className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 focus:border-[#5c0099] outline-none transition-colors text-[#111]" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-[#444] mb-1">Selling Price <span className="text-red-500">*</span></label>
                      <input required type="number" step="0.01" value={editDevicePrice} onChange={e => setEditDevicePrice(e.target.value)} placeholder="0.00" className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 focus:border-[#5c0099] outline-none transition-colors text-[#111]" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-[#444] mb-1">Stocks <span className="text-red-500">*</span></label>
                      <input required type="number" value={editDeviceStocks} onChange={e => setEditDeviceStocks(e.target.value)} placeholder="0" className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 focus:border-[#5c0099] outline-none transition-colors text-[#111]" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="block text-sm font-bold text-[#444]">Category <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select required value={editDeviceCategory} onChange={e => setEditDeviceCategory(e.target.value)} className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 focus:border-[#5c0099] focus:ring-4 focus:ring-[#5c0099]/10 outline-none transition-all text-[#111] font-semibold appearance-none bg-white cursor-pointer hover:border-gray-300">
                      <option value="" disabled className="text-gray-400">Select a category...</option>
                      {categories.map((cat, idx) => (<option key={idx} value={cat.id} className="font-medium text-[#111]">{cat.name}</option>))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400"><svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg></div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="block text-sm font-bold text-[#444]">Specs / Description</label>
                  <textarea value={editDeviceSpecs} onChange={e => setEditDeviceSpecs(e.target.value)} rows={3} placeholder="Memory, Color, Connectivity, etc..." className="w-full border-2 border-gray-200 rounded-xl p-4 focus:border-[#5c0099] focus:ring-4 focus:ring-[#5c0099]/10 outline-none transition-all text-[#111] font-medium resize-y min-h-[80px]" />
                </div>
                
                <div className="mt-2 border-2 border-cyan-100 bg-cyan-50/20 rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden mb-4">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#01f0ff]" />
                  <h4 className="text-cyan-800 font-bold text-sm m-0">Downpayment Options</h4>
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="shrink-0 w-full md:w-[140px] flex flex-col gap-1">
                      <label className="block text-xs font-bold text-[#444]">QR Code</label>
                      <label className="w-full h-[100px] rounded-xl border-2 border-dashed border-[#01f0ff] flex flex-col justify-center items-center gap-1 cursor-pointer hover:bg-cyan-50 transition-colors text-[#01f0ff] overflow-hidden relative bg-white">
                        {editDeviceDownpaymentImagePreview ? (<img src={editDeviceDownpaymentImagePreview} alt="Preview" className="w-full h-full object-cover" />) : (<><Upload size={16} /><span className="text-[10px] font-semibold text-center leading-tight px-2">Upload QR</span></>)}
                        <input type="file" onChange={handleEditDownpaymentImageChange} accept="image/*" className="hidden" />
                      </label>
                    </div>
                    <div className="flex-1 flex flex-col gap-3 justify-end">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 flex flex-col gap-1">
                          <label className="block text-xs font-bold text-[#444]">As Low As <span className="text-gray-400 font-normal ml-1">(Optional)</span></label>
                          <input type="text" value={editDeviceAsLowAs} onChange={e => setEditDeviceAsLowAs(e.target.value)} placeholder="e.g. ₱1,500/mo" className="w-full h-10 border-2 border-cyan-100 rounded-lg px-3 focus:border-[#01f0ff] outline-none transition-colors text-[#111] text-sm" />
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                          <label className="block text-xs font-bold text-[#444]">Warranty <span className="text-gray-400 font-normal ml-1">(Optional)</span></label>
                          <input type="text" value={editDeviceWarranty} onChange={e => setEditDeviceWarranty(e.target.value)} placeholder="e.g. 1 Year Local" className="w-full h-10 border-2 border-cyan-100 rounded-lg px-3 focus:border-[#01f0ff] outline-none transition-colors text-[#111] text-sm" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="block text-xs font-bold text-[#444]">Downpayment <span className="text-gray-400 font-normal ml-1">(Optional)</span></label>
                        <input type="text" value={editDeviceDownpayment} onChange={e => setEditDeviceDownpayment(e.target.value)} placeholder="e.g. 20% or ₱5,000" className="w-full h-10 border-2 border-cyan-100 rounded-lg px-3 focus:border-[#01f0ff] outline-none transition-colors text-[#111] text-sm" />
                      </div>
                    </div>
                  </div>
                </div>

                                {/* Variations Section */}
                <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center px-1">
                    <label className="block text-sm font-bold text-[#444]">Variations <span className="text-gray-400 font-normal ml-1">(Optional)</span></label>
                    <button type="button" onClick={() => setEditDeviceVariations([...editDeviceVariations, { section: '', variations: [{ name: '', price: editDevicePrice || '0', cost: editDeviceCost || '0', stock: '0' }] }])} className="text-xs font-bold text-[#bd00ff] bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors border-none cursor-pointer flex items-center gap-1">
                      <Plus size={14} /> Add Section
                    </button>
                  </div>
                  {editDeviceVariations?.length > 0 && (
                    <div className="flex flex-col gap-4 mt-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {editDeviceVariations?.map((group, groupIdx) => (
                        <div key={groupIdx} className="flex flex-col gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 relative">
                          <div className="flex items-center gap-3">
                            <label className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Section</label>
                            <input type="text" value={group?.section || ''} onChange={e => {
                              const updated = [...editDeviceVariations];
                              if (updated[groupIdx]) updated[groupIdx].section = e.target.value;
                              setEditDeviceVariations(updated);
                            }} className="h-9 border border-gray-300 rounded-lg px-3 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold flex-1 max-w-[200px]" placeholder="e.g. Color" />
                            <div className="flex-1"></div>
                            <button type="button" onClick={() => {
                              const updated = editDeviceVariations.filter((_, i) => i !== groupIdx);
                              setEditDeviceVariations(updated);
                            }} className="h-8 w-8 flex items-center justify-center shrink-0 rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors border-none cursor-pointer shadow-sm" title="Remove Section"><Trash size={14} /></button>
                          </div>
                          <div className="flex flex-col gap-2 pl-2 border-l-2 border-purple-200 ml-2">
                            {group?.variations?.map((v, vIdx) => (
                              <div key={vIdx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-end relative group/var">
                                <div className="w-full sm:w-1/3">
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Variation Name</label>
                                  <input type="text" value={v?.name || ''} onChange={e => {
                                    const updated = [...editDeviceVariations];
                                    if (updated[groupIdx] && updated[groupIdx].variations[vIdx]) {
                                      updated[groupIdx].variations[vIdx].name = e.target.value;
                                      setEditDeviceVariations(updated);
                                    }
                                  }} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold" placeholder="e.g. Red" />
                                </div>
                                <div className="flex gap-2 w-full sm:w-[60%]">
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Price</label>
                                    <input type="number" step="0.01" value={v.price} onChange={e => {
                                      const updated = [...editDeviceVariations];
                                      if (updated[groupIdx] && updated[groupIdx].variations[vIdx]) {
                                        updated[groupIdx].variations[vIdx].price = e.target.value;
                                        setEditDeviceVariations(updated);
                                      }
                                    }} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold" placeholder="Price" />
                                  </div>
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cost</label>
                                    <input type="number" step="0.01" value={v?.cost || ''} onChange={e => {
                                      const updated = [...editDeviceVariations];
                                      if (updated[groupIdx] && updated[groupIdx].variations[vIdx]) {
                                        updated[groupIdx].variations[vIdx].cost = e.target.value;
                                        setEditDeviceVariations(updated);
                                      }
                                    }} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold" placeholder="Cost" />
                                  </div>
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Stock</label>
                                    <input type="number" value={v?.stock || ''} onChange={e => {
                                      const updated = [...editDeviceVariations];
                                      if (updated[groupIdx] && updated[groupIdx].variations[vIdx]) {
                                        updated[groupIdx].variations[vIdx].stock = e.target.value;
                                        setEditDeviceVariations(updated);
                                      }
                                    }} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold" placeholder="Stock" />
                                  </div>
                                </div>
                                <button type="button" onClick={() => {
                                  const updated = [...editDeviceVariations];
                                  if (updated[groupIdx]) {
                                    updated[groupIdx].variations = updated[groupIdx].variations.filter((_, i) => i !== vIdx);
                                    setEditDeviceVariations(updated);
                                  }
                                }} className="absolute -top-1 -right-1 h-5 w-5 sm:relative sm:top-0 sm:right-0 sm:h-9 sm:w-9 flex items-center justify-center shrink-0 rounded-full sm:rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors border-none cursor-pointer"><X size={14} /></button>
                              </div>
                            ))}
                            <button type="button" onClick={() => {
                              const updated = [...editDeviceVariations];
                              if (updated[groupIdx]) {
                                updated[groupIdx].variations.push({ name: '', price: editDevicePrice || '0', cost: editDeviceCost || '0', stock: '0' });
                                setEditDeviceVariations(updated);
                              }
                            }} className="mt-2 self-start text-[11px] font-bold text-[#bd00ff] bg-transparent hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors border-2 border-dashed border-[#bd00ff]/50 hover:border-[#bd00ff] cursor-pointer flex items-center gap-1"><Plus size={12} /> Add Variation</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-4 mt-2">
                <button type="button" onClick={() => { setIsEditModalOpen(false); handleDeleteClick(productToEdit.dbId); }} disabled={isEditing} className="w-[60px] py-3.5 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer disabled:opacity-50 flex justify-center items-center gap-2" title="Delete Product"><Trash2 size={20} /></button>
                <button type="button" onClick={() => setIsEditModalOpen(false)} disabled={isEditing} className="w-1/3 py-3.5 rounded-xl font-bold text-[#666] bg-gray-100 hover:bg-gray-200 transition-colors border-none cursor-pointer disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isEditing} className="flex-1 py-3.5 rounded-xl font-bold text-white bg-[#5c0099] hover:bg-[#3d0066] shadow-[0_4px_15px_rgba(92,0,153,0.3)] transition-all border-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50">
                  {isEditing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Saving...</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View More Description Modal */}
      {viewMoreProduct && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in p-4 overflow-y-auto" onClick={() => setViewMoreProduct(null)}>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-purple-500/20 overflow-hidden my-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-black/5 flex justify-between items-center bg-purple-50/50">
              <div className="flex items-center gap-3">
                <img src={viewMoreProduct.img} alt={viewMoreProduct.name} className="w-10 h-10 object-cover rounded-full border border-purple-200" />
                <h3 className="font-bold text-[#111] text-lg leading-tight m-0">
                  <span className="block text-xs text-[#bd00ff] uppercase tracking-wide">Product Type / Specs</span>
                  {viewMoreProduct.name}
                </h3>
              </div>
              <button className="text-gray-400 hover:text-black transition-colors bg-transparent border-none cursor-pointer p-1 flex justify-center items-center" onClick={() => setViewMoreProduct(null)}>
                <X size={24} />
              </button>
            </div>
            <div className="p-8 text-[#444] text-[1.05rem] leading-relaxed max-h-[60vh] overflow-y-auto whitespace-pre-wrap font-medium">
              {viewMoreProduct.type}
            </div>
            <div className="p-4 bg-gray-50/80 border-t border-black/5">
              <button onClick={() => setViewMoreProduct(null)} className="w-full py-3.5 rounded-xl font-bold text-white bg-[#bd00ff] hover:bg-[#8f00c2] transition-colors shadow-sm cursor-pointer border-none">Close</button>
            </div>
          </div>
        </div>
      )}
      {/* Categories Management Modal */}
      {categoriesModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 flex flex-col overflow-hidden max-h-[90vh]">

            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xl font-bold text-black m-0">Manage Categories</h3>
              <button onClick={() => setCategoriesModalOpen(false)} className="text-gray-500 hover:text-black hover:bg-gray-200 p-2 rounded-full transition-colors border-none bg-transparent cursor-pointer">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">

              {/* Add Category Form */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                <label className="shrink-0 w-16 h-16 rounded-full border-2 border-dashed border-[#bd00ff] flex flex-col justify-center items-center cursor-pointer hover:bg-white transition-colors text-[#bd00ff] overflow-hidden relative bg-transparent">
                  {newCatImagePreview ? (
                    <img src={newCatImagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Upload size={20} />
                  )}
                  <input type="file" onChange={handleCatImageChange} accept="image/*" className="hidden" />
                </label>

                <div className="flex-1 w-full relative">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Enter new category name..."
                    className="w-full h-12 border-2 border-gray-200 rounded-xl px-4 focus:border-[#bd00ff] outline-none transition-colors text-black"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCategory();
                    }}
                  />
                </div>

                <button
                  onClick={handleAddCategory}
                  disabled={!newCatName || isAddingCat}
                  className="w-full sm:w-auto h-12 px-6 bg-[#bd00ff] text-white font-bold rounded-xl hover:bg-[#9c00d6] transition-colors border-none cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isAddingCat ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Plus size={20} /> Add</>}
                </button>
              </div>

              {/* List Categories */}
              <div className="flex flex-col gap-3">
                <h4 className="text-gray-500 font-bold uppercase text-sm mb-2">Existing Categories</h4>
                {categories.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">No categories found. Add one above!</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {categories.map((cat, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-[#bd00ff] transition-colors">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                          {cat.logoUrl ? (
                            <img src={cat.logoUrl} alt={cat.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs text-gray-400 font-bold text-center leading-tight">No<br/>Img</span>
                          )}
                        </div>
                        <span className="font-semibold text-black break-words line-clamp-2 text-sm">{cat.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
