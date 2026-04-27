"use client";

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, UserCircle2, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Comment {
  id: string;
  user: { name: string | null; image?: string | null };
  createdAt: string;
  text: string;
}

export default function CustomerProductInfo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const navigate = router.push;
  const [qty, setQty] = useState(1);
  const [newComment, setNewComment] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [isDownpaymentModalOpen, setIsDownpaymentModalOpen] = useState(false);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, any>>({});
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const variationGroups = useMemo(() => {
    if (!product?.variations || product.variations.length === 0) return null;
    return product.variations.reduce((acc: any, curr: any) => {
      if (!acc[curr.type]) acc[curr.type] = [];
      acc[curr.type].push(curr);
      return acc;
    }, {});
  }, [product]);
  
  useEffect(() => {
    if (id) {
      Promise.all([
        fetch(`/api/devices/${id}`).then(res => res.json()),
        fetch(`/api/devices/${id}/reviews`).then(res => res.json())
      ])
        .then(([productData, reviewsData]) => {
          setProduct(productData);
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

  const selectedVariationsArray = Object.values(selectedVariations);
  
  const currentPrice = selectedVariationsArray.length > 0
    ? selectedVariationsArray.reduce((acc, v) => acc + (v.price > 0 ? v.price : 0), 0) || product?.price
    : product?.price;

  const currentStock = selectedVariationsArray.length > 0
    ? Math.min(...selectedVariationsArray.map(v => v.stock))
    : product?.stock;
    
  const hasSelectedAllSections = variationGroups ? Object.keys(variationGroups).length === selectedVariationsArray.length : true;

  const updateQty = (change: number) => {
    if (!product) return;
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
      <main className="flex-1 p-6 md:p-10 font-['Signika'] flex justify-center items-center">
        <div className="text-2xl font-bold text-[#bd00ff]">Loading Device Details...</div>
      </main>
    );
  }

  if (!product || product.error) {
    return (
      <main className="flex-1 p-6 md:p-10 font-['Signika'] flex flex-col justify-center items-center gap-4">
        <div className="text-2xl font-bold text-red-500">Device Not Found</div>
        <button onClick={() => navigate('/customer/products')} className="px-6 py-2 bg-[#bd00ff] text-white rounded-lg border-none cursor-pointer font-bold">Back to Products</button>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 md:p-10 font-['Signika'] flex justify-center overflow-y-auto">
      <div className="w-full max-w-5xl flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/customer/products')} 
            className="text-inherit hover:text-[#bd00ff] hover:-translate-x-1 transition-all bg-transparent border-none cursor-pointer"
          >
            <ChevronLeft size={36} />
          </button>
          <h2 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#bd00ff] to-[#01f0ff] uppercase tracking-wide m-0">Product Information</h2>
        </div>

        {/* Product Info Card */}
        <section className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-10">
          
          <div className="flex flex-col gap-4 w-full h-[400px]">
            <div className="w-full h-[320px] bg-gray-50 rounded-2xl flex justify-center items-center p-4 border border-gray-100 relative group/gallery">
              {product.images && product.images.length > 1 && (
                <>
                  <button 
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full shadow-md flex items-center justify-center text-gray-700 hover:text-[#bd00ff] transition-all opacity-0 group-hover/gallery:opacity-100 border-none cursor-pointer z-10"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button 
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full shadow-md flex items-center justify-center text-gray-700 hover:text-[#bd00ff] transition-all opacity-0 group-hover/gallery:opacity-100 border-none cursor-pointer z-10"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
              {product.images && product.images.length > 0 ? (
                <img src={product.images[activeImageIndex]} alt={product.name} className="w-full h-full object-contain mix-blend-multiply transition-opacity duration-300" />
              ) : product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" />
              ) : (
                <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 font-bold">No Image</div>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar justify-center">
                {product.images.map((img: string, idx: number) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden bg-white ${activeImageIndex === idx ? 'border-[#bd00ff] shadow-sm' : 'border-gray-200 opacity-70'} transition-all hover:border-[#bd00ff] hover:opacity-100 p-1 cursor-pointer`}
                  >
                    <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-contain mix-blend-multiply" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <h3 className="text-2xl md:text-3xl font-bold text-black border-none m-0">{product.name}</h3>
            
            <div className="inline-flex items-center w-max px-6 py-2 bg-[#f4f5f7] border border-[#bd00ff] rounded-full">
              <span className="text-[#bd00ff] font-bold text-2xl mr-1">₱</span>
              <span className="text-[#bd00ff] font-bold text-3xl">{currentPrice?.toLocaleString()}</span>
            </div>

            <div className="flex flex-col gap-4 mt-2">
              <div className="flex items-start gap-4">
                <span className="w-24 text-gray-500 font-semibold pt-1">Availability:</span>
                <span className="text-black font-semibold pt-1">{currentStock > 0 ? `${currentStock} in stock` : 'Out of stock'}</span>
              </div>
              
              {variationGroups && (
                <div className="flex flex-col gap-4 border-t border-b border-gray-100 py-4 my-2">
                  {Object.entries(variationGroups).map(([section, vars]: [string, any]) => (
                    <div key={section} className="flex flex-col gap-2">
                      <span className="text-gray-500 font-semibold">{section}:</span>
                      <div className="flex flex-wrap gap-2">
                        {vars.map((v: any) => (
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
                              setQty(1); // Reset qty when changing variation
                            }}
                            disabled={v.stock === 0}
                            className={`px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all ${
                              v.stock === 0 
                                ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through' 
                                : selectedVariations[section]?.id === v.id 
                                  ? 'border-[#bd00ff] bg-purple-50 text-[#bd00ff] cursor-pointer' 
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-[#bd00ff] hover:text-[#bd00ff] cursor-pointer'
                            }`}
                          >
                            {v.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {product.specs && (
                <div className="flex items-start gap-4">
                  <span className="w-24 text-gray-500 font-semibold pt-1">Description:</span>
                  <div className="flex-1 flex flex-col items-start gap-2">
                    <p className="text-black font-semibold pt-1 m-0 whitespace-pre-wrap line-clamp-3">{product.specs}</p>
                    <button 
                      onClick={() => setIsDescriptionModalOpen(true)}
                      className="text-[#bd00ff] hover:text-[#9c00d6] font-bold text-sm bg-transparent border-none cursor-pointer p-0 underline-offset-2 hover:underline transition-all"
                    >
                      View More
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-4">
                <span className="w-24 text-gray-500 font-semibold">Quantity:</span>
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden w-max">
                  <button onClick={() => updateQty(-1)} className="px-4 py-2 bg-transparent border-none text-black cursor-pointer hover:bg-gray-100 transition-colors"><Minus size={20} /></button>
                  <input type="text" value={qty} readOnly className="w-12 text-center border-none font-bold text-lg outline-none bg-transparent text-black" />
                  <button onClick={() => updateQty(1)} className="px-4 py-2 bg-transparent border-none text-black cursor-pointer hover:bg-gray-100 transition-colors"><Plus size={20} /></button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-auto pt-4">
              <button 
                onClick={() => {
                  if (product?.downpaymentImage || product?.asLowAs || product?.warranty || product?.downpayment) {
                    setIsDownpaymentModalOpen(true);
                  } else {
                    alert('No downpayment information is available for this device.');
                  }
                }}
                disabled={currentStock === 0 || !hasSelectedAllSections}
                className="flex-1 py-3.5 border-2 border-[#bd00ff] bg-white rounded-xl text-[#bd00ff] font-bold text-lg hover:bg-purple-50 transition-colors cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Downpayment
              </button>
              <button 
                onClick={() => navigate(`/customer/payment?deviceId=${product.id}${selectedVariationsArray.length > 0 ? `&variationIds=${selectedVariationsArray.map(v => v.id).join(',')}` : ''}`)}
                disabled={currentStock === 0 || !hasSelectedAllSections}
                className="flex-1 py-3.5 border-none bg-[#bd00ff] rounded-xl text-white font-bold text-lg hover:bg-[#9c00d6] shadow-[0_4px_15px_rgba(189,0,255,0.4)] transition-all cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Buy Now
              </button>
            </div>
          </div>
        </section>

        {/* Comments Section */}
        <section className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-gray-100 mt-2">
          <h3 className="text-2xl font-bold text-black border-none m-0 mb-6">Customer Reviews ({comments.length})</h3>
          
          <div className="flex items-start gap-4 mb-10">
            <UserCircle2 size={48} className="text-[#4B0082]" />
            <div className="flex-1 flex flex-col gap-3">
              {product.hasPurchased ? (
                <>
                  <textarea 
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Write a review about this product..." 
                    className="w-full min-h-[100px] border-2 border-gray-200 rounded-xl p-4 text-black outline-none font-['Signika'] resize-vertical focus:border-[#bd00ff] transition-colors"
                  />
                  <button 
                    onClick={handlePostComment}
                    className="self-end px-6 py-2.5 bg-[#4B0082] text-white font-bold rounded-lg hover:bg-[#3a0066] transition-colors cursor-pointer border-none"
                  >
                    Post Review
                  </button>
                </>
              ) : (
                <div className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                  <p className="text-gray-600 font-semibold m-0">You must purchase this product before you can leave a review.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {comments.map(comment => (
              <div key={comment.id} className="flex items-start gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                {comment.user?.image ? (
                  <img src={comment.user.image} alt={comment.user?.name || 'User'} className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <UserCircle2 size={40} className="text-gray-400 shrink-0" />
                )}
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black text-lg">{comment.user?.name || 'Anonymous'}</span>
                    <span className="text-gray-500 text-sm font-semibold">{new Date(comment.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-gray-700 leading-relaxed m-0 text-base">{comment.text}</p>
                </div>
              </div>
            ))}
          </div>

        </section>

      </div>

      {/* Description Modal */}
      {isDescriptionModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border-2 border-purple-500/20 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-[#fcf8ff] rounded-t-3xl">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight m-0 border-none">
                Product Description
              </h3>
              <button
                onClick={() => setIsDescriptionModalOpen(false)}
                className="p-2 hover:bg-purple-100 rounded-full text-gray-500 hover:text-purple-700 transition cursor-pointer border-none bg-transparent flex items-center justify-center"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 md:p-8 overflow-y-auto">
              <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap font-medium m-0">
                {product.specs}
              </p>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-3xl flex justify-end">
              <button
                onClick={() => setIsDescriptionModalOpen(false)}
                className="px-8 py-3 bg-[#bd00ff] text-white rounded-xl font-bold hover:bg-[#9c00d6] transition-colors shadow-lg shadow-purple-500/30 cursor-pointer border-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Downpayment Modal */}
      {isDownpaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md flex flex-col shadow-2xl border-2 border-[#01f0ff]/20 animate-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-[#f0ffff] rounded-t-3xl shrink-0">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight m-0 border-none">
                Downpayment QR
              </h3>
              <button
                onClick={() => setIsDownpaymentModalOpen(false)}
                className="p-2 hover:bg-cyan-100 rounded-full text-gray-500 hover:text-cyan-700 transition cursor-pointer border-none bg-transparent flex items-center justify-center"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 md:p-8 flex flex-col items-center bg-gray-50 gap-6 overflow-y-auto">
              {(product?.asLowAs || product?.warranty || product?.downpayment) && (
                <div className="w-full flex flex-col gap-2 p-4 bg-cyan-50/50 border border-cyan-100 rounded-2xl">
                  <h4 className="text-cyan-800 font-bold m-0 text-sm mb-1 uppercase tracking-wide text-center">Installment Options</h4>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                    {product.asLowAs && (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-bold uppercase">As Low As</span>
                        <span className="text-black font-bold text-sm">{product.asLowAs}</span>
                      </div>
                    )}
                    {product.warranty && (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-bold uppercase">Warranty</span>
                        <span className="text-black font-bold text-sm">{product.warranty}</span>
                      </div>
                    )}
                    {product.downpayment && (
                      <div className="flex flex-col col-span-2">
                        <span className="text-[10px] text-gray-500 font-bold uppercase">Downpayment Required</span>
                        <span className="text-black font-bold text-sm">{product.downpayment}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {product?.downpaymentImage ? (
                <div className="flex flex-col gap-2 items-center w-full">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Scan to Pay Downpayment</span>
                  <img src={product.downpaymentImage} alt="Downpayment QR" className="w-full max-w-[250px] h-auto object-contain rounded-xl shadow-sm border border-gray-200" />
                </div>
              ) : (
                <div className="text-gray-500 font-semibold">No QR Code available</div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-white rounded-b-3xl flex justify-end">
              <button
                onClick={() => setIsDownpaymentModalOpen(false)}
                className="px-8 py-3 bg-[#01f0ff] text-gray-900 rounded-xl font-bold hover:bg-[#00d0e0] transition-colors shadow-lg shadow-cyan-500/30 cursor-pointer border-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
