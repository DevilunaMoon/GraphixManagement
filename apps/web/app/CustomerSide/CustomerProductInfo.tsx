"use client";

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, UserCircle2, X, ShoppingCart, CheckCircle, Star, ChevronDown, MapPin } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Comment {
  id: string;
  user: { name: string | null; image?: string | null };
  createdAt: string;
  text: string;
}

import { Suspense } from 'react';

const formatCurrency = (val: any) => {
  if (val === undefined || val === null || val === '') return '';
  const numStr = String(val).replace(/[^0-9.]/g, '');
  const num = parseFloat(numStr);
  if (isNaN(num)) return String(val);
  return `₱${num.toLocaleString()}`;
};

const formatMonthly = (val: any) => {
  if (val === undefined || val === null || val === '') return '';
  const formatted = formatCurrency(val);
  return formatted.toLowerCase().includes('/mo') ? formatted : `${formatted}/Mo`;
};

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
  const [isDownpaymentModalOpen, setIsDownpaymentModalOpen] = useState(false);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, any>>({});
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const isDefaultFlyer = useMemo(() => {
    if (!product?.downpaymentImage) return false;
    const url = product.downpaymentImage.toLowerCase();
    return url.includes('skyro') || url.includes('iphone') || url.includes('flyer') || url.includes('banner');
  }, [product?.downpaymentImage]);

  const brandName = useMemo(() => {
    if (!product) return 'Graphix';
    return product.category?.name || product.name.split(' ')[0] || 'Graphix';
  }, [product]);

  useEffect(() => {
    if (isDownpaymentModalOpen || showSuccessModal) {
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
  }, [isDownpaymentModalOpen, showSuccessModal]);

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
    if (!product) return;
    setQty(prev => Math.min(Math.max(1, prev + change), Math.max(1, currentStock)));
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
    <div className="flex-1 p-6 md:p-10 font-['Inter'] flex justify-center bg-[#f8fafc]">
      <div className="w-full max-w-5xl flex flex-col gap-8">
        
        {/* Header Options */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/customer/products')} 
            className="w-12 h-12 rounded-2xl bg-white hover:bg-purple-50 border border-gray-200/80 hover:border-purple-200 text-gray-700 hover:text-[#bd00ff] transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-90"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-black text-[#bd00ff] tracking-widest uppercase">Customer Portal</span>
            <h2 className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-purple-950 to-indigo-950 tracking-tight m-0">Product Details</h2>
          </div>
        </div>

        {/* Product Details Section Card */}
        <section className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100 flex flex-col gap-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          
            {/* Gallery Left Component */}
            <div className="flex flex-col gap-5 w-full">
              <div className="w-full aspect-[4/3] bg-gradient-to-br from-gray-50/50 to-gray-100/50 rounded-3xl flex justify-center items-center p-6 border border-gray-200/60 relative group/gallery overflow-hidden shadow-inner">
                {product.images && product.images.length > 1 && (
                  <>
                    <button 
                      onClick={handlePrevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/95 hover:bg-white rounded-full shadow-md flex items-center justify-center text-gray-700 hover:text-[#bd00ff] transition-all opacity-0 group-hover/gallery:opacity-100 border border-gray-100 cursor-pointer z-10 hover:scale-105 active:scale-95"
                    >
                      <ChevronLeft size={24} strokeWidth={2.5} />
                    </button>
                    <button 
                      onClick={handleNextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/95 hover:bg-white rounded-full shadow-md flex items-center justify-center text-gray-700 hover:text-[#bd00ff] transition-all opacity-0 group-hover/gallery:opacity-100 border border-gray-100 cursor-pointer z-10 hover:scale-105 active:scale-95"
                    >
                      <ChevronRight size={24} strokeWidth={2.5} />
                    </button>
                  </>
                )}
                {product.images && product.images.length > 0 ? (
                  <img src={product.images[activeImageIndex]} alt={product.name} className="w-full h-full object-contain mix-blend-multiply transition-all duration-300 group-hover/gallery:scale-[1.03]" />
                ) : product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-contain mix-blend-multiply group-hover/gallery:scale-[1.03] transition-all duration-300" />
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 font-extrabold">No Image Provided</div>
                )}
              </div>
              {product.images && product.images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto py-1 scrollbar-thin justify-center w-full">
                  {product.images.map((img: string, idx: number) => (
                    <button 
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`shrink-0 w-20 h-20 rounded-2xl border-2 overflow-hidden bg-white ${activeImageIndex === idx ? 'border-[#bd00ff] shadow-md shadow-purple-500/10 scale-95' : 'border-gray-200/80 opacity-70'} transition-all hover:border-[#bd00ff] hover:opacity-100 p-1.5 cursor-pointer hover:scale-95`}
                    >
                      <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-contain mix-blend-multiply" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Meta Info Right */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <h3 className="text-3xl md:text-4xl font-black text-gray-900 border-none m-0 tracking-tight leading-tight">{product.name}</h3>
                
                {/* Branch Availability Filter */}
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <div className="flex items-center gap-2">
                    <label htmlFor="branchFilterSelect" className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <MapPin size={13} className="text-[#bd00ff]" />
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
                        className="bg-white border-2 border-purple-200 hover:border-[#bd00ff] text-[#bd00ff] font-extrabold text-sm rounded-xl px-3.5 py-1.5 pr-8 appearance-none outline-none transition-all cursor-pointer shadow-sm focus:ring-2 focus:ring-[#bd00ff]/20"
                      >
                        <option value="Tagoloan" className="text-black font-semibold">Tagoloan</option>
                        <option value="Villanueva" className="text-black font-semibold">Villanueva</option>
                        <option value="Jasaan" className="text-black font-semibold">Jasaan</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-[#bd00ff]">
                        <ChevronDown size={15} strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all ${currentStock > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/50 shadow-sm' : 'bg-rose-50 text-rose-600 border border-rose-200/50 shadow-sm'}`}>
                    <span className={`w-2 h-2 rounded-full ${currentStock > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
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

                const rawPrice = currentPrice || 0;
                const discountedPrice = isDiscountActive ? (rawPrice * (1 - discountPercent / 100)) : rawPrice;

                return (
                  <div className="flex flex-col gap-1.5 p-5 rounded-3xl bg-gradient-to-br from-purple-50/70 to-indigo-50/20 border border-purple-100/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.015)] w-full">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Special Portal Price</span>
                      {isDiscountActive && (
                        <span className="bg-rose-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm animate-pulse">
                          {discountPercent}% OFF
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <div className="flex items-baseline text-[#bd00ff]">
                        <span className="text-2xl font-black mr-0.5">₱</span>
                        <span className="text-4xl font-black tracking-tight">{discountedPrice?.toLocaleString()}</span>
                      </div>
                      {isDiscountActive && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base text-gray-400 line-through font-semibold">
                            ₱ {rawPrice?.toLocaleString()}
                          </span>
                          <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                            Save ₱ {((rawPrice * discountPercent) / 100).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                    {isDiscountActive && discountEndDate && (
                      <div className="mt-1 pt-1.5 border-t border-purple-100/80 flex items-center gap-1.5 text-xs text-amber-800 font-bold">
                        <span>⏰ Sale duration:</span>
                        <span className="bg-amber-100/80 px-2 py-0.5 rounded text-[11px]">
                          Ends {new Date(discountEndDate).toLocaleDateString()} at {new Date(discountEndDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex flex-col gap-5 mt-1">
                {/* Variation Controls */}
                {variationGroups && (
                  <div className="flex flex-col gap-5 border-t border-b border-gray-100 py-5">
                    {Object.entries(variationGroups).map(([section, vars]: [string, any]) => (
                      <div key={section} className="flex flex-col gap-2.5">
                        <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">{section}:</span>
                        <div className="flex flex-wrap gap-2.5">
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
                                className={`px-5 py-3 rounded-2xl border-2 font-extrabold text-sm transition-all duration-200 ${
                                  v.stock === 0 
                                    ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through' 
                                    : isSelected 
                                      ? 'border-[#bd00ff] bg-gradient-to-br from-purple-50 to-indigo-50/50 text-[#bd00ff] shadow-md shadow-purple-500/10 scale-95' 
                                      : 'border-gray-200 bg-white text-gray-600 hover:border-purple-300 hover:text-[#bd00ff] cursor-pointer'
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
                <div className="flex items-center gap-4">
                  <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider w-20">Quantity:</span>
                  <div className="flex items-center bg-gray-50 border border-gray-200/80 rounded-2xl p-1 w-max">
                    <button 
                      onClick={() => updateQty(-1)} 
                      className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-700 cursor-pointer hover:bg-gray-100 hover:text-black transition-all flex items-center justify-center shadow-sm active:scale-90"
                    >
                      <Minus size={16} strokeWidth={2.5} />
                    </button>
                    <span className="w-12 text-center font-black text-gray-800 text-lg">{qty}</span>
                    <button 
                      onClick={() => updateQty(1)} 
                      className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-700 cursor-pointer hover:bg-gray-100 hover:text-black transition-all flex items-center justify-center shadow-sm active:scale-90"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Purchase Call-To-Actions */}
              <div className="flex flex-col lg:flex-row items-center gap-3 mt-auto pt-6 border-t border-gray-50 w-full">
                <button 
                  onClick={() => {
                    if (product?.downpaymentImage || product?.asLowAs || product?.warranty || product?.downpayment) {
                      setIsDownpaymentModalOpen(true);
                    } else {
                      alert('No downpayment information is available for this device.');
                    }
                  }}
                  disabled={currentStock === 0 || !hasSelectedAllSections}
                  className="w-full lg:flex-1 py-4 border-2 border-cyan-400 bg-white rounded-2xl text-cyan-600 font-extrabold text-base hover:bg-cyan-50/30 transition-all cursor-pointer text-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm"
                >
                  Downpayment Info
                </button>
                <button 
                  onClick={handleAddToCart}
                  disabled={currentStock === 0 || !hasSelectedAllSections || isAddingToCart}
                  className="w-full lg:flex-1 py-4 flex items-center justify-center gap-2 border-2 border-[#bd00ff] bg-purple-50/50 rounded-2xl text-[#bd00ff] font-extrabold text-base hover:bg-purple-100/50 transition-all cursor-pointer text-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm"
                >
                  <ShoppingCart size={20} strokeWidth={2.5} />
                  {isAddingToCart ? 'Adding...' : 'Add to Cart'}
                </button>
                <button 
                  onClick={() => navigate(`/customer/payment?deviceId=${targetDeviceId}${selectedVariationsArray.length > 0 ? `&variationIds=${selectedVariationsArray.map(v => v.id).join(',')}` : ''}`)}
                  disabled={currentStock === 0 || !hasSelectedAllSections}
                  className="w-full lg:flex-1 py-4 border-none bg-gradient-to-r from-[#bd00ff] to-[#4B0082] rounded-2xl text-white font-extrabold text-base hover:opacity-95 shadow-lg shadow-purple-500/20 transition-all cursor-pointer text-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  Buy Now
                </button>
              </div>
            </div>
          </div>

          {/* Expandable Specifications Section */}
          {product.specs && (
            <div className="flex flex-col gap-4 pt-8 border-t border-gray-100">
              <h3 className="text-xl font-black text-gray-900 border-none m-0 tracking-tight">Technical Specifications</h3>
              <div className={`relative transition-all duration-300 ${!isDescriptionExpanded ? 'max-h-[140px] overflow-hidden' : ''}`}>
                <p className="text-gray-600 font-medium whitespace-pre-wrap m-0 leading-relaxed text-base">{product.specs}</p>
                {!isDescriptionExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                )}
              </div>
              <button 
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="self-center px-5 py-2 border border-purple-200 hover:border-purple-400 text-[#bd00ff] font-extrabold text-xs bg-white rounded-full cursor-pointer hover:shadow-sm transition-all"
              >
                {isDescriptionExpanded ? 'Show Less Specs' : 'View Full Details'}
              </button>
            </div>
          )}
        </section>

        {/* Customer Reviews Section */}
        <section className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100 mt-2">
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
              <div key={comment.id} className="flex items-start gap-4 p-5 bg-gray-50/50 rounded-2xl border border-gray-100">
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
            ))}
          </div>

        </section>

      </div>

      {/* Downpayment QR Modal */}
      {isDownpaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/45 backdrop-blur-sm animate-in fade-in duration-200 overscroll-contain" onWheel={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-md flex flex-col shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden overscroll-contain">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-cyan-50/30 rounded-t-[2.5rem] shrink-0">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Downpayment Options</span>
                <h3 className="text-xl font-black text-gray-900 tracking-tight m-0 border-none">
                  Secure Downpayment Info
                </h3>
              </div>
              <button
                onClick={() => setIsDownpaymentModalOpen(false)}
                className="w-9 h-9 hover:bg-cyan-100/50 rounded-xl text-gray-400 hover:text-cyan-600 transition border-none bg-transparent flex items-center justify-center cursor-pointer"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 md:p-8 flex flex-col items-center bg-gray-50/50 gap-6 overflow-y-auto overscroll-contain">
              <div className="w-full bg-purple-50 border border-purple-100 p-3.5 rounded-2xl text-center">
                <p className="text-[#bd00ff] font-extrabold text-xs m-0">
                  📍 In-Store Notice: Downpayments are available when purchasing walk-in at our physical store POS terminal. Online checkouts process full payment.
                </p>
              </div>

              {(product?.asLowAs || product?.warranty || product?.downpayment) && (
                <div className="w-full flex flex-col gap-3 p-5 bg-gradient-to-br from-cyan-50 to-teal-50/20 border border-cyan-100/80 rounded-2xl">
                  <h4 className="text-cyan-800 font-black m-0 text-xs uppercase tracking-wider text-center">Installment & Warranty Summary</h4>
                  <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 mt-2">
                    {product.asLowAs && (
                      <div className="flex flex-col">
                        <span className="text-[9px] text-cyan-600 font-black uppercase tracking-wider">As Low As</span>
                        <span className="text-gray-900 font-extrabold text-sm">{product.asLowAs}</span>
                      </div>
                    )}
                    {product.warranty && (
                      <div className="flex flex-col">
                        <span className="text-[9px] text-cyan-600 font-black uppercase tracking-wider">Warranty</span>
                        <span className="text-gray-900 font-extrabold text-sm">{product.warranty}</span>
                      </div>
                    )}
                    {product.downpayment && (
                      <div className="flex flex-col col-span-2 border-t border-cyan-100/50 pt-2.5">
                        <span className="text-[9px] text-cyan-600 font-black uppercase tracking-wider">Downpayment Required</span>
                        <span className="text-[#bd00ff] font-black text-base">₱{parseFloat(product.downpayment).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {product?.downpaymentImage ? (
                <div className="flex flex-col gap-2.5 items-center w-full">
                  <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                    {isDefaultFlyer ? 'Installment Flyer Preview' : 'Scan QR Code To Transact'}
                  </span>
                  
                  {isDefaultFlyer ? (
                    /* Dynamic Premium Flyer Mockup */
                    <div className="w-full max-w-[360px] bg-white border border-gray-200/80 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex gap-4 items-stretch font-['Inter'] relative overflow-hidden select-none">
                      {/* Subtle premium background glow */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                      
                      {/* Left Column: Product Info Card */}
                      <div className="w-[45%] flex flex-col items-center justify-between p-3 bg-gradient-to-b from-gray-50/80 to-gray-50/30 rounded-2xl border border-gray-100 text-center relative">
                        {/* Brand header */}
                        <div className="flex flex-col items-center gap-1">
                          {product.category?.logoUrl ? (
                            <img src={product.category.logoUrl} alt={brandName} className="h-5 max-w-[55px] object-contain opacity-90" />
                          ) : (
                            <span className="text-xs font-black text-purple-600 tracking-tight">{brandName}</span>
                          )}
                          <span className="text-[7px] font-black text-gray-400 tracking-widest uppercase">
                            OFFICIAL STORE
                          </span>
                        </div>

                        {/* Device image */}
                        <div className="my-2.5 w-full aspect-square flex items-center justify-center">
                          <img 
                            src={product.image || '/Images/iphone.jpg'} 
                            alt={product.name} 
                            className="max-w-full max-h-[85px] object-contain drop-shadow-md transition-transform hover:scale-105 duration-300" 
                          />
                        </div>

                        {/* Device name */}
                        <span className="text-[9px] font-black text-gray-800 uppercase tracking-tight line-clamp-2 leading-snug">
                          {product.name.replace(/official store/i, '').trim()}
                        </span>
                      </div>

                      {/* Thin vertical separator line */}
                      <div className="w-px bg-gray-100" />

                      {/* Right Column: Skyro Installment Terms */}
                      <div className="w-[52%] flex flex-col justify-between py-0.5 pl-1">
                        {/* Skyro brand logo */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[#0057E7]">
                            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.5 14.25l-3.75-3.75 1.4-1.4 2.35 2.35 6.35-6.35 1.4 1.4-7.75 7.75z" />
                            </svg>
                            <span className="text-base font-black tracking-tight" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>Skyro</span>
                          </div>
                          <span className="text-[7px] font-black text-[#0057E7] bg-blue-50 border border-blue-100/50 px-1.5 py-0.5 rounded">FINANCING</span>
                        </div>

                        {/* Financial metrics */}
                        <div className="flex flex-col gap-2.5 mt-2">
                          {product.asLowAs && (
                            <div className="flex flex-col">
                              <span className="text-[7px] text-gray-400 font-extrabold uppercase tracking-wider leading-none mb-0.5">As Low As</span>
                              <span className="text-gray-900 font-black text-[15px] leading-tight">
                                {formatMonthly(product.asLowAs)}
                              </span>
                              <span className="text-[7px] text-gray-400 font-bold uppercase tracking-wider leading-none mt-0.5">For 12 Months</span>
                            </div>
                          )}

                          {product.downpayment && (
                            <div className="flex flex-col">
                              <span className="text-[7px] text-gray-400 font-extrabold uppercase tracking-wider leading-none mb-0.5">Downpayment</span>
                              <span className="text-[#bd00ff] font-black text-sm leading-tight">
                                {formatCurrency(product.downpayment)}
                              </span>
                            </div>
                          )}

                          <div className="flex flex-col">
                            <span className="text-[7px] text-gray-400 font-extrabold uppercase tracking-wider leading-none mb-0.5">Cash Price</span>
                            <span className="text-gray-950 font-black text-sm leading-tight">
                              {formatCurrency(product.price)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Regular custom QR Code image */
                    <div className="p-3 bg-white border border-gray-200/80 rounded-3xl shadow-sm">
                      <img src={product.downpaymentImage} alt="Downpayment QR" className="w-full max-w-[220px] h-auto object-contain rounded-xl" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-400 font-bold text-sm py-4">No GCash Merchant QR Uploaded</div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-white rounded-b-[2.5rem] flex justify-end">
              <button
                onClick={() => setIsDownpaymentModalOpen(false)}
                className="px-6 py-3 bg-cyan-400 hover:bg-cyan-500 text-gray-900 rounded-xl font-extrabold transition-all shadow-md shadow-cyan-400/25 cursor-pointer border-none active:scale-95 text-sm"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

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
