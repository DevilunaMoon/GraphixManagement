"use client";

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, UserCircle2, ShoppingCart, CheckCircle, Star, ChevronDown, MapPin, Clock } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import CountdownTimer from '../../components/Common/CountdownTimer';

interface Comment {
  id: string;
  user: { name: string | null; image?: string | null };
  createdAt: string;
  text: string;
  adminReply?: string | null;
  adminReplyBy?: string | null;
  adminReplyRole?: string | null;
  adminReplyDate?: string | null;
}

import { Suspense } from 'react';

function CustomerProductInfoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const navigate = router.push;
  const [qty, setQty] = useState(1);
  const [newComment, setNewComment] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [selectedBranch, setSelectedBranch] = useState<'Tagoloan' | 'Villanueva' | 'Jasaan'>('Tagoloan');
  const [loading, setLoading] = useState(true);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, any>>({});
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const brandName = useMemo(() => {
    if (!product) return 'Graphix';
    return product.category?.name || product.name.split(' ')[0] || 'Graphix';
  }, [product]);

  useEffect(() => {
    if (showSuccessModal) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      const scrollables = document.querySelectorAll('main, .overflow-y-auto');
      scrollables.forEach((el) => {
        if (!el.closest('.fixed.inset-0')) {
          (el as HTMLElement).style.overflow = 'hidden';
        }
      });
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      const scrollables = document.querySelectorAll('main, .overflow-y-auto');
      scrollables.forEach((el) => {
        (el as HTMLElement).style.overflow = '';
      });
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      const scrollables = document.querySelectorAll('main, .overflow-y-auto');
      scrollables.forEach((el) => {
        (el as HTMLElement).style.overflow = '';
      });
    };
  }, [showSuccessModal]);

  const branchData = useMemo(() => {
    if (!product) return null;
    return product.branchAvailability?.[selectedBranch] || null;
  }, [product, selectedBranch]);

  const availableVariations = useMemo(() => {
    if (branchData && branchData.variations && branchData.variations.length > 0) {
      return branchData.variations;
    }
    if ((product?.branch || 'Tagoloan').toLowerCase() === selectedBranch.toLowerCase()) {
      return product?.variations || [];
    }
    return [];
  }, [branchData, product, selectedBranch]);

  const variationGroups = useMemo(() => {
    if (!availableVariations || availableVariations.length === 0) return null;
    return availableVariations.reduce((acc: any, curr: any) => {
      if (!acc[curr.type]) acc[curr.type] = [];
      acc[curr.type].push(curr);
      return acc;
    }, {});
  }, [availableVariations]);

  const selectedVariationsArray = Object.values(selectedVariations);

  const currentPrice = selectedVariationsArray.length > 0
    ? selectedVariationsArray.reduce((acc, v) => acc + (v.price > 0 ? v.price : 0), 0) || (branchData?.price || product?.price)
    : (branchData?.price || product?.price);

  const currentStock = useMemo(() => {
    if (!product) return 0;
    if (selectedVariationsArray.length > 0) {
      return Math.min(...selectedVariationsArray.map(v => v.stock));
    }
    if (branchData !== null && branchData !== undefined) {
      return branchData.stock;
    }
    if ((product.branch || 'Tagoloan').toLowerCase() === selectedBranch.toLowerCase()) {
      return product.stock;
    }
    return 0;
  }, [product, branchData, selectedBranch, selectedVariationsArray]);

  const targetDeviceId = branchData?.deviceId || product?.id;
  const hasSelectedAllSections = variationGroups ? Object.keys(variationGroups).length === selectedVariationsArray.length : true;

  const handleAddToCart = async () => {
    if (!product || currentStock === 0 || !hasSelectedAllSections) return;
    setIsAddingToCart(true);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: targetDeviceId,
          quantity: qty,
          variations: selectedVariationsArray.length > 0 ? JSON.stringify(selectedVariationsArray) : null
        })
      });
      if (res.ok) {
        window.dispatchEvent(new Event('cartUpdated'));
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 3000);
      } else {
        alert('Failed to add to cart.');
      }
    } catch (err) {
      console.error(err);
      alert('Error adding to cart.');
    } finally {
      setIsAddingToCart(false);
    }
  };
  
  useEffect(() => {
    if (id) {
      Promise.all([
        fetch(`/api/devices/${id}`, { cache: 'no-store' }).then(res => res.json()),
        fetch(`/api/devices/${id}/reviews`, { cache: 'no-store' }).then(res => res.json())
      ])
        .then(([productData, reviewsData]) => {
          setProduct(productData);
          if (productData.branch && (productData.branch === 'Tagoloan' || productData.branch === 'Villanueva' || productData.branch === 'Jasaan')) {
            setSelectedBranch(productData.branch);
          }
          if (Array.isArray(reviewsData)) {
            setComments(reviewsData);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [id]);

  const [comments, setComments] = useState<Comment[]>([]);

  const updateQty = (change: number) => {
    if (!product || currentStock <= 0) return;
    setQty(prev => Math.min(Math.max(1, prev + change), currentStock));
  };

  const handlePrevImage = () => {
    if (product?.images && product.images.length > 1) {
      setActiveImageIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
    }
  };

  const handleNextImage = () => {
    if (product?.images && product.images.length > 1) {
      setActiveImageIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !id) return;
    try {
      const res = await fetch(`/api/devices/${id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment })
      });
      if (res.ok) {
        const comment = await res.json();
        setComments([comment, ...comments]);
        setNewComment('');
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to post review');
      }
    } catch (err) {
      console.error('Error posting review:', err);
      alert('An error occurred while posting your review.');
    }
  };

  if (loading) {
    return (
      <main className="flex-1 p-6 md:p-10 font-['Inter'] flex justify-center items-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-purple-100 border-t-[#bd00ff] rounded-full animate-spin"></div>
          <span className="text-gray-500 font-extrabold tracking-wide">Loading Product Details...</span>
        </div>
      </main>
    );
  }

  if (!product || product.error) {
    return (
      <main className="flex-1 p-6 md:p-10 font-['Inter'] flex flex-col justify-center items-center gap-6 bg-[#f8fafc]">
        <div className="bg-red-50 border border-red-200 p-8 rounded-3xl text-center max-w-md shadow-sm">
          <h3 className="text-red-700 font-extrabold text-2xl m-0 mb-2">Device Not Found</h3>
          <p className="text-gray-600 font-medium m-0">The requested device details could not be loaded. It may have been removed or is currently unavailable.</p>
        </div>
        <button 
          onClick={() => navigate('/customer/products')} 
          className="px-8 py-3.5 bg-[#bd00ff] hover:bg-[#9c00d6] text-white rounded-xl border-none cursor-pointer font-extrabold shadow-lg shadow-purple-500/20 transition-all active:scale-95"
        >
          Back to Products
        </button>
      </main>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-10 font-['Inter'] flex justify-center bg-[#fbfaff]">
      <div className="w-full max-w-5xl flex flex-col gap-6">
        
        {/* Header Options */}
        <div className="flex items-center gap-3.5">
          <button 
            onClick={() => navigate('/customer/products')} 
            className="w-10 h-10 rounded-2xl bg-white hover:bg-purple-50 border border-purple-100/80 hover:border-purple-300 text-gray-700 hover:text-[#8b00cc] transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
            title="Back to products"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-[#8b00cc] tracking-widest uppercase">Customer Portal</span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight m-0">Product Details</h2>
          </div>
        </div>

        {/* Product Details Section Card */}
        <section className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-purple-100/90 flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
          
            {/* Gallery Left Component */}
            <div className="flex flex-col gap-4 w-full">
              <div className="w-full aspect-[4/3] bg-gradient-to-br from-purple-50/20 via-white to-gray-50/50 rounded-3xl flex justify-center items-center p-6 border border-purple-100/80 relative group/gallery overflow-hidden shadow-xs">
                {product.images && product.images.length > 1 && (
                  <>
                    <button 
                      onClick={handlePrevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/95 hover:bg-white rounded-full shadow-md flex items-center justify-center text-gray-700 hover:text-[#8b00cc] transition-all opacity-0 group-hover/gallery:opacity-100 border border-purple-100 cursor-pointer z-10 hover:scale-105 active:scale-95"
                      title="Previous Image"
                    >
                      <ChevronLeft size={20} strokeWidth={2.5} />
                    </button>
                    <button 
                      onClick={handleNextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/95 hover:bg-white rounded-full shadow-md flex items-center justify-center text-gray-700 hover:text-[#8b00cc] transition-all opacity-0 group-hover/gallery:opacity-100 border border-purple-100 cursor-pointer z-10 hover:scale-105 active:scale-95"
                      title="Next Image"
                    >
                      <ChevronRight size={20} strokeWidth={2.5} />
                    </button>
                  </>
                )}
                {(product.isPreOwned || (product.name || '').toLowerCase().includes('pre-owned') || (product.name || '').toLowerCase().includes('pre owned')) ? (
                  <span className="absolute top-3.5 left-3.5 bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-black px-3 py-0.8 rounded-full shadow-xs uppercase tracking-wider z-10">
                    PRE-OWNED
                  </span>
                ) : (
                  <span className="absolute top-3.5 left-3.5 bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-black px-3 py-0.8 rounded-full shadow-xs uppercase tracking-wider z-10">
                    NEW
                  </span>
                )}
                {product.images && product.images.length > 0 ? (
                  <img 
                    src={product.images[activeImageIndex] || product.images[0] || product.image} 
                    alt={product.name} 
                    className="w-full h-full object-contain mix-blend-multiply transition-all duration-300 group-hover/gallery:scale-[1.03]" 
                  />
                ) : product.image ? (
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-contain mix-blend-multiply group-hover/gallery:scale-[1.03] transition-all duration-300" 
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 font-extrabold">No Image Provided</div>
                )}
              </div>
              {product.images && product.images.filter(Boolean).length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto py-1 scrollbar-thin justify-center w-full">
                  {product.images.filter(Boolean).map((img: string, idx: number) => (
                    <button 
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden bg-white ${activeImageIndex === idx ? 'border-[#8b00cc] shadow-md shadow-purple-500/15 scale-95' : 'border-gray-200/80 opacity-70'} transition-all hover:border-[#8b00cc] hover:opacity-100 p-1 cursor-pointer hover:scale-95`}
                    >
                      <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-contain mix-blend-multiply" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Meta Info Right */}
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2.5">
                <h3 className="text-2xl sm:text-3xl font-black text-gray-950 border-none m-0 tracking-tight leading-snug">{product.name}</h3>
                
                {/* Branch Availability & Condition Filter */}
                <div className="flex flex-wrap items-center gap-2.5 mt-0.5">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="branchFilterSelect" className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <MapPin size={12} className="text-[#8b00cc]" />
                      Branch:
                    </label>
                    <div className="relative">
                      <select
                        id="branchFilterSelect"
                        value={selectedBranch}
                        onChange={(e) => {
                          setSelectedBranch(e.target.value as any);
                          setSelectedVariations({});
                          setQty(1);
                        }}
                        className="bg-purple-50/60 border border-purple-200 hover:border-[#8b00cc] text-[#8b00cc] font-black text-xs rounded-xl px-3 py-1 pr-7 appearance-none outline-none transition-all cursor-pointer shadow-2xs focus:ring-2 focus:ring-[#8b00cc]/20"
                      >
                        <option value="Tagoloan" className="text-black font-semibold">Tagoloan</option>
                        <option value="Villanueva" className="text-black font-semibold">Villanueva</option>
                        <option value="Jasaan" className="text-black font-semibold">Jasaan</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-[#8b00cc]">
                        <ChevronDown size={14} strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>

                  {/* Product Condition Display */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">
                      Condition:
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.8 rounded-full text-[11px] font-black uppercase tracking-wider ${
                      product.isPreOwned || (product.name || '').toLowerCase().includes('pre-owned') || (product.name || '').toLowerCase().includes('pre owned')
                        ? 'bg-amber-50 text-amber-900 border border-amber-300'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        product.isPreOwned || (product.name || '').toLowerCase().includes('pre-owned') || (product.name || '').toLowerCase().includes('pre owned')
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`} />
                      {product.isPreOwned || (product.name || '').toLowerCase().includes('pre-owned') || (product.name || '').toLowerCase().includes('pre owned')
                        ? 'Pre-Owned'
                        : 'New'}
                    </span>
                  </div>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.8 rounded-full text-[11px] font-black uppercase tracking-wider transition-all ${currentStock > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs' : 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${currentStock > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    {currentStock > 0 ? `Available (${currentStock} in stock)` : 'Out of Stock'}
                  </span>
                </div>
              </div>

              {/* Dynamic Price Box */}
              {(() => {
                const now = new Date();
                const discountPercent = branchData?.discount !== undefined ? branchData.discount : (product?.discount || 0);
                const discountStartDate = branchData?.discountStartDate !== undefined ? branchData.discountStartDate : product?.discountStartDate;
                const discountEndDate = branchData?.discountEndDate !== undefined ? branchData.discountEndDate : product?.discountEndDate;

                const isDiscountActive = Boolean(
                  discountPercent > 0 &&
                  (!discountStartDate || new Date(discountStartDate) <= now) &&
                  (!discountEndDate || new Date(discountEndDate) >= now)
                );

                const unitRawPrice = currentPrice || 0;
                const unitDiscountedPrice = isDiscountActive ? (unitRawPrice * (1 - discountPercent / 100)) : unitRawPrice;

                const totalRawPrice = unitRawPrice * qty;
                const totalDiscountedPrice = unitDiscountedPrice * qty;
                const totalSavings = isDiscountActive ? ((unitRawPrice * discountPercent / 100) * qty) : 0;

                return (
                  <div className="flex flex-col gap-1 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-50/70 via-indigo-50/30 to-purple-50/40 border border-purple-100 shadow-xs w-full">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-[#8b00cc] uppercase tracking-widest">Special Portal Price</span>
                      {isDiscountActive && (
                        <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs animate-pulse">
                          {discountPercent}% OFF
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <div className="flex items-baseline text-[#8b00cc]">
                        <span className="text-xl sm:text-2xl font-black mr-0.5">₱</span>
                        <span className="text-3xl sm:text-4xl font-black tracking-tight">{totalDiscountedPrice?.toLocaleString()}</span>
                      </div>
                      {isDiscountActive && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-gray-400 line-through font-semibold">
                            ₱ {totalRawPrice?.toLocaleString()}
                          </span>
                          <span className="text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                            Save ₱ {totalSavings.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                    {isDiscountActive && discountEndDate && (
                      <div className="mt-1.5 pt-1.5 border-t border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-amber-900 font-bold bg-amber-50/80 p-2 rounded-xl border border-amber-200/60">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-amber-700 shrink-0" />
                          <span className="text-[11px]">Sale Ends {new Date(discountEndDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] uppercase tracking-wider text-purple-900 font-black">Ends in:</span>
                          <CountdownTimer targetDate={discountEndDate} format="short" className="text-rose-700 font-black text-xs" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex flex-col gap-4">
                {/* Variation Controls */}
                {variationGroups && (
                  <div className="flex flex-col gap-3.5 border-t border-b border-purple-100/70 py-3.5">
                    {Object.entries(variationGroups).map(([section, vars]: [string, any]) => (
                      <div key={section} className="flex flex-col gap-2">
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">{section}:</span>
                        <div className="flex flex-wrap gap-2">
                          {vars.map((v: any) => {
                            const isSelected = selectedVariations[section]?.id === v.id;
                            return (
                              <button
                                key={v.id}
                                onClick={() => {
                                  setSelectedVariations(prev => {
                                    const updated = { ...prev };
                                    if (updated[section]?.id === v.id) {
                                      delete updated[section];
                                    } else {
                                      updated[section] = v;
                                    }
                                    return updated;
                                  });
                                  setQty(1);
                                }}
                                disabled={v.stock === 0}
                                className={`px-4 py-2 rounded-xl border font-black text-xs transition-all duration-200 ${
                                  v.stock === 0 
                                    ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through' 
                                    : isSelected 
                                      ? 'border-[#8b00cc] bg-gradient-to-r from-[#8b00cc] to-[#9d00e6] text-white shadow-sm shadow-purple-500/20' 
                                      : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:text-[#8b00cc] cursor-pointer'
                                }`}
                              >
                                {v.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Quantity Control */}
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider w-16">Quantity:</span>
                  <div className="flex items-center bg-gray-50 border border-gray-200/80 rounded-xl p-0.5 w-max">
                    <button 
                      onClick={() => updateQty(-1)} 
                      disabled={qty <= 1 || currentStock <= 0}
                      className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-700 cursor-pointer hover:bg-gray-100 hover:text-black transition-all flex items-center justify-center shadow-2xs active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Minus size={14} strokeWidth={2.5} />
                    </button>
                    <span className="w-10 text-center font-black text-gray-900 text-sm">{qty}</span>
                    <button 
                      onClick={() => updateQty(1)} 
                      disabled={qty >= currentStock || currentStock <= 0}
                      className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-700 cursor-pointer hover:bg-gray-100 hover:text-black transition-all flex items-center justify-center shadow-2xs active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Purchase Call-To-Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 mt-auto pt-4 border-t border-purple-100/70 w-full">
                <button 
                  onClick={handleAddToCart}
                  disabled={currentStock === 0 || !hasSelectedAllSections || isAddingToCart}
                  className="w-full sm:flex-1 py-3 px-4 flex items-center justify-center gap-2 border-2 border-[#8b00cc] bg-purple-50/50 rounded-xl text-[#8b00cc] font-black text-xs sm:text-sm hover:bg-purple-100/60 transition-all cursor-pointer text-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] shadow-xs"
                >
                  <ShoppingCart size={18} strokeWidth={2.5} />
                  {isAddingToCart ? 'Adding...' : 'Add to Cart'}
                </button>
                <button 
                  onClick={() => navigate(`/customer/payment?deviceId=${targetDeviceId}${selectedVariationsArray.length > 0 ? `&variationIds=${selectedVariationsArray.map(v => v.id).join(',')}` : ''}&quantity=${qty}`)}
                  disabled={currentStock === 0 || !hasSelectedAllSections}
                  className="w-full sm:flex-1 py-3 px-4 border-none bg-gradient-to-r from-[#8b00cc] via-[#9d00e6] to-[#bd00ff] hover:from-[#7a00b3] hover:to-[#a900e6] rounded-xl text-white font-black text-xs sm:text-sm shadow-md shadow-purple-500/25 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer text-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  Buy Now
                </button>
              </div>
            </div>
          </div>

          {/* Expandable Specifications Section */}
          {product.specs && (
            <div className="flex flex-col gap-3 pt-6 border-t border-purple-100/70">
              <h3 className="text-lg font-black text-gray-900 border-none m-0 tracking-tight">Technical Specifications</h3>
              <div className={`relative transition-all duration-300 ${!isDescriptionExpanded ? 'max-h-[120px] overflow-hidden' : ''}`}>
                <p className="text-gray-600 font-medium whitespace-pre-wrap m-0 leading-relaxed text-xs sm:text-sm">{product.specs}</p>
                {!isDescriptionExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                )}
              </div>
              <button 
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="self-center px-4 py-1.5 border border-purple-200 hover:border-purple-400 text-[#8b00cc] font-extrabold text-xs bg-white rounded-full cursor-pointer hover:shadow-xs transition-all"
              >
                {isDescriptionExpanded ? 'Show Less Specs' : 'View Full Details'}
              </button>
            </div>
          )}
        </section>

        {/* Customer Reviews Section */}
        <section id="reviews" className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100 mt-2">
          <h3 className="text-2xl font-black text-gray-900 border-none m-0 mb-6 tracking-tight">Customer Reviews ({comments.length})</h3>
          
          <div className="flex items-start gap-4 mb-8">
            <UserCircle2 size={46} className="text-[#4B0082] shrink-0" />
            <div className="flex-1 flex flex-col gap-3">
              {product.hasPurchased ? (
                <>
                  <textarea 
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Write your honest review about this product..." 
                    className="w-full min-h-[110px] border-2 border-gray-100 focus:border-purple-300 rounded-2xl p-4 text-black outline-none font-['Inter'] font-medium resize-vertical transition-colors bg-gray-50/30"
                  />
                  <button 
                    onClick={handlePostComment}
                    className="self-end px-7 py-3 bg-[#4B0082] hover:bg-[#3a0066] text-white font-extrabold rounded-xl transition-all cursor-pointer border-none shadow-md hover:shadow-lg active:scale-95"
                  >
                    Submit Review
                  </button>
                </>
              ) : (
                <div className="w-full bg-gray-50/50 border border-gray-200/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  <p className="text-gray-500 font-bold m-0 text-sm">Only verified buyers who completed a purchase can submit a review.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {comments.map(comment => (
              <div key={comment.id} className="flex flex-col gap-3 p-5 bg-gray-50/60 rounded-2xl border border-gray-100 shadow-xs">
                {/* Customer Review Section */}
                <div className="flex items-start gap-4">
                  {comment.user?.image ? (
                    <img src={comment.user.image} alt={comment.user?.name || 'User'} className="w-11 h-11 rounded-full object-cover shrink-0 border border-gray-200" />
                  ) : (
                    <UserCircle2 size={44} className="text-gray-400 shrink-0" />
                  )}
                  <div className="flex flex-col gap-1.5 w-full">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-gray-900 text-base">{comment.user?.name || 'Anonymous'}</span>
                      <span className="text-gray-400 text-xs font-bold bg-white px-2.5 py-0.5 rounded-full border border-gray-100">{new Date(comment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <p className="text-gray-600 font-medium leading-relaxed m-0 text-sm whitespace-pre-wrap">{comment.text}</p>
                  </div>
                </div>

                {/* Graphix Admin / Super Admin Response */}
                {comment.adminReply && (
                  <div className="mt-1 ml-4 sm:ml-12 p-4 bg-gradient-to-r from-purple-50/90 to-fuchsia-50/40 rounded-2xl border-l-4 border-[#bd00ff] border-y border-r border-purple-100 shadow-xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-gradient-to-r from-purple-600 to-[#bd00ff] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                          {comment.adminReplyRole || 'Admin'}
                        </span>
                        <span className="font-extrabold text-gray-900 text-xs sm:text-sm">
                          Graphix {comment.adminReplyRole || 'Admin'} Response
                        </span>
                      </div>
                      {comment.adminReplyDate && (
                        <span className="text-gray-400 text-[11px] font-semibold bg-white/80 px-2 py-0.5 rounded-full border border-purple-100/60">
                          {new Date(comment.adminReplyDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 font-medium leading-relaxed m-0 text-xs sm:text-sm whitespace-pre-wrap">
                      {comment.adminReply}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

        </section>

      </div>

      {/* Add to Cart Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 overscroll-contain" onWheel={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200 border border-gray-100 overscroll-contain">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-2 border border-emerald-100">
              <CheckCircle size={44} className="text-emerald-500" strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 m-0 text-center tracking-tight">Added to Cart!</h3>
            <p className="text-gray-500 text-center font-bold text-sm m-0">Your item has been successfully added to your shopping cart.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerProductInfo() {
  return (
    <Suspense fallback={<div className="flex-1 flex justify-center items-center h-screen"><div className="w-12 h-12 border-4 border-purple-100 border-t-[#bd00ff] rounded-full animate-spin"></div></div>}>
      <CustomerProductInfoContent />
    </Suspense>
  );
}
