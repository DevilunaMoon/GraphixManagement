"use client";

import { useState, useEffect, useRef } from 'react';
import { Search, Filter, ChevronDown, Trash2, ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function AdminInventory() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
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
  
  // Add Product State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortOrder]);

  const fetchProducts = () => {
    setIsLoading(true);
    fetch('/api/devices')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setInitialProducts(data.map(device => ({
            dbId: device.id,
            name: device.name,
            img: device.image || '/Images/Aula.jpg', // Placeholder fallback
            id: `#${device.id.substring(device.id.length - 8).toUpperCase()}`,
            price: `₱ ${device.price.toLocaleString()}`,
            stock: `${device.stock} pcs`,
            type: device.specs || 'N/A'
          })));
        }
      })
      .catch(err => console.error("Error fetching inventory:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchProducts();
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

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAdding(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        fetchProducts();
        setIsAddModalOpen(false);
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

  const filteredProducts = initialProducts.filter(prod => 
    prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prod.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prod.type.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const products = sortOrder === 'oldest' ? [...filteredProducts].reverse() : filteredProducts;

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
            <input 
              type="text" 
              placeholder="Search" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-none outline-none w-full text-[0.95rem] text-[#111] bg-transparent placeholder-[#999]"
            />
          </div>

        {/* Filter Dropdown */}
          <div className="relative font-['Inter'] flex-shrink-0">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center bg-white border-2 ${styles.borderMain} rounded-full px-4 py-2 cursor-pointer ${styles.textActive} text-[1.1rem] font-semibold hover:bg-black/5 transition-all w-full sm:w-[150px] justify-between`}
            >
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {isFilterOpen && (
              <div className="absolute top-[115%] right-0 w-[150px] bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-black/10 overflow-hidden flex flex-col z-50 animate-in fade-in slide-in-from-top-2">
                <button 
                  onClick={() => { setSortOrder('newest'); setIsFilterOpen(false); }}
                  className={`px-5 py-3 text-left font-medium hover:bg-black/5 transition-colors ${sortOrder === 'newest' ? `${styles.textActive} font-bold` : 'text-[#111]'}`}
                >
                  Newest
                </button>
                <button 
                  onClick={() => { setSortOrder('oldest'); setIsFilterOpen(false); }}
                  className={`px-5 py-3 text-left font-medium hover:bg-black/5 transition-colors ${sortOrder === 'oldest' ? `${styles.textActive} font-bold` : 'text-[#111]'}`}
                >
                  Oldest
                </button>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-[#5c0099] text-white px-5 py-2.5 rounded-full font-bold hover:bg-[#3d0066] transition-colors shadow-sm cursor-pointer border-none ml-auto lg:ml-0 flex-shrink-0"
          >
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
                  <tr 
                    key={index} 
                    className={`last:border-b-2 last:${styles.borderMain} cursor-pointer md:cursor-default hover:bg-black/5 transition-colors`}
                    onClick={() => {
                      if (window.innerWidth < 768) {
                        setSelectedProduct(prod);
                      }
                    }}
                  >
                    <td className={`py-4 px-5 border-b ${styles.borderMain}`}>
                      <div className="flex items-center gap-4 text-left">
                        <img src={prod.img} alt={prod.name} className="w-[45px] h-[45px] object-cover rounded-md border border-black/10 shrink-0" />
                        <div className="flex flex-col justify-center">
                          <span className="text-[0.9rem] font-bold text-[#111] leading-snug break-words max-w-[150px] sm:max-w-none">
                            {prod.name}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className={`py-4 px-5 text-[0.95rem] text-[#666] border-b ${styles.borderMain} truncate max-w-[100px] sm:max-w-none`}>{prod.id}</td>
                    <td className={`py-4 px-5 text-[0.95rem] text-[#666] border-b ${styles.borderMain} hidden md:table-cell`}>{prod.price}</td>
                    <td className={`py-4 px-5 text-[0.95rem] text-[#666] border-b ${styles.borderMain} hidden md:table-cell`}>{prod.stock}</td>
                    <td className={`py-4 px-5 text-[0.95rem] text-[#666] border-b ${styles.borderMain} hidden md:table-cell max-w-[200px]`}>
                      {prod.type && prod.type.length > 80 ? (
                        <div className="inline-block">
                          {prod.type.substring(0, 80)}...
                          <button 
                            onClick={(e) => { e.stopPropagation(); setViewMoreProduct(prod); }}
                            className="text-[#bd00ff] hover:underline font-bold bg-transparent border-none cursor-pointer ml-1 text-sm inline"
                          >
                            View More
                          </button>
                        </div>
                      ) : (
                        prod.type
                      )}
                    </td>
                    <td className={`py-4 px-5 border-b ${styles.borderMain} hidden md:table-cell`}>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(prod.dbId); }} className="text-red-600 hover:text-red-700 hover:scale-110 transition-all cursor-pointer bg-transparent border-none flex items-center justify-center w-full">
                        <Trash2 size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#666] font-semibold">
                    No products found in the database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="flex justify-center items-center p-4 gap-4 bg-white/95 border-t border-black/5">
          <button 
            onClick={prevPage}
            disabled={currentPage === 1}
            className={`text-[#111] transition-transform bg-transparent border-none ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-125 cursor-pointer'}`}
          >
            <ChevronLeft size={24} />
          </button>
          <span className="text-[1.2rem] font-semibold text-[#111]">{currentPage}/{totalPages}</span>
          <button 
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className={`text-[#111] transition-transform bg-transparent border-none ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:scale-125 cursor-pointer'}`}
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* Product Info Modal for Mobile */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-black/5 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-[#111] text-lg">Product Details</h3>
              <div className="flex items-center gap-3">
                <button 
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-full transition-colors flex items-center justify-center"
                  title="Delete Product"
                  onClick={() => {
                     handleDeleteClick(selectedProduct.dbId);
                     setSelectedProduct(null);
                  }}
                >
                  <Trash2 size={20} />
                </button>
                <button className="text-gray-400 hover:text-black transition-colors" onClick={() => setSelectedProduct(null)}>
                  <X size={20} />
                </button>
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
                <span className="font-bold text-[#111]">{selectedProduct.price}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <span className="text-[#666] font-medium">Stock</span>
                <span className="font-bold text-[#111]">{selectedProduct.stock}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#666] font-medium mb-1">Type/Specs</span>
                <span className="font-bold text-[#111]">{selectedProduct.type}</span>
              </div>
            </div>
            <div className="p-4 bg-gray-50/80 border-t border-black/5">
              <button 
                className="w-full py-2.5 rounded-xl bg-[#bd00ff] text-white font-semibold hover:bg-purple-700 transition-colors"
                onClick={() => setSelectedProduct(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl border border-purple-500/20 flex flex-col items-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-5 shadow-sm">
              <Trash2 size={32} />
            </div>
            <h3 className="text-2xl font-bold text-[#111] mb-2 text-center">Delete Product?</h3>
            <p className="text-[#666] text-center mb-6 font-medium">
              Are you sure you want to permanently delete this product? This action cannot be undone.
            </p>

            {deleteError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm font-bold border border-red-100 w-full text-center">
                {deleteError}
              </div>
            )}

            <div className="flex w-full gap-4">
              <button 
                onClick={() => { setDeleteModalOpen(false); setProductToDelete(null); setDeleteError(undefined); }}
                disabled={isDeleting}
                className="flex-1 py-3.5 px-4 rounded-xl font-bold text-[#666] bg-gray-100 hover:bg-gray-200 transition-colors border-none cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-3.5 px-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-[0_4px_15px_rgba(220,38,38,0.3)] transition-all border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  'Yes, Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Device Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-purple-500/20 overflow-hidden my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-black/5 flex justify-between items-center bg-gray-50/50 text-[#5c0099]">
              <h3 className="font-bold text-xl flex items-center gap-2">
                <Plus size={24} />
                Add New Device
              </h3>
              <button className="text-gray-400 hover:text-black transition-colors bg-transparent border-none cursor-pointer" onClick={() => setIsAddModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddProduct} className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-[#444]">Device Name *</label>
                <input required type="text" name="deviceName" placeholder="e.g. iPhone 14 Pro" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#5c0099] transition-colors" />
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-sm font-bold text-[#444]">Price (₱) *</label>
                  <input required type="number" step="0.01" name="devicePrice" placeholder="0.00" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#5c0099] transition-colors" />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-sm font-bold text-[#444]">Initial Stock *</label>
                  <input required type="number" name="deviceStocks" placeholder="0" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#5c0099] transition-colors" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-[#444]">Specifications</label>
                <input type="text" name="deviceSpecs" placeholder="e.g. 256GB Storage, Space Black" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#5c0099] transition-colors" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-[#444]">Product Image</label>
                <div className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-[#5c0099] transition-colors bg-gray-50/50">
                  <input type="file" name="deviceImage" accept="image/*" ref={fileInputRef} className="text-sm text-gray-500 w-full cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-[#5c0099] hover:file:bg-purple-100 transition-colors" />
                </div>
              </div>
              
              <div className="flex gap-4 mt-2">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isAdding}
                  className="w-1/3 py-3.5 rounded-xl font-bold text-[#666] bg-gray-100 hover:bg-gray-200 transition-colors border-none cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isAdding}
                  className="flex-1 py-3.5 rounded-xl font-bold text-white bg-[#5c0099] hover:bg-[#3d0066] shadow-[0_4px_15px_rgba(92,0,153,0.3)] transition-all border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAdding ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    'Add Product'
                  )}
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
                <h3 className="font-bold text-[#111] text-lg leading-tight">
                  <span className="block text-xs text-[#bd00ff] uppercase tracking-wide">Product Type / Specs</span>
                  {viewMoreProduct.name}
                </h3>
              </div>
              <button className="text-gray-400 hover:text-black transition-colors bg-transparent border-none cursor-pointer p-1" onClick={() => setViewMoreProduct(null)}>
                <X size={24} />
              </button>
            </div>
            <div className="p-8 text-[#444] text-[1.05rem] leading-relaxed max-h-[60vh] overflow-y-auto whitespace-pre-wrap font-medium">
              {viewMoreProduct.type}
            </div>
            <div className="p-4 bg-gray-50/80 border-t border-black/5">
              <button 
                onClick={() => setViewMoreProduct(null)}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-[#bd00ff] hover:bg-[#8f00c2] transition-colors shadow-sm cursor-pointer border-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
