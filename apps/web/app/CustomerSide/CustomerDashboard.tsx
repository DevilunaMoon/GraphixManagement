"use client";

import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const optimizeCloudinaryUrl = (url: string, width = 1200) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  // Insert f_auto,q_auto,w_[width] after '/upload/'
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
};

export default function CustomerDashboard({ user }: { user?: { name: string; email: string } | null }) {
  const router = useRouter();
  const navigate = router.push;
  const [products, setProducts] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (scrollOffset: number) => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({ left: scrollOffset, behavior: 'smooth' });
    }
  };

  const fallbackCategories = [
    { name: "Apple", logo: "/categories/Apple.jpg" },
    { name: "Samsung", logo: "/categories/Samsung.png" },
    { name: "Xiaomi", logo: "/categories/Xiaomi.png" },
    { name: "Oppo", logo: "/categories/Oppo.png" },
    { name: "Vivo", logo: "/categories/Vivo.jpg" },
    { name: "Realme", logo: "/categories/Realme.png" },
    { name: "Mobile Accessories", logo: "https://img.icons8.com/color/96/headphones.png" }
  ];

  const nextBanner = () => {
    if (banners.length > 0) {
      setDirection(1);
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }
  };
  
  const prevBanner = () => {
    if (banners.length > 0) {
      setDirection(-1);
      setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);
    }
  };
  
  const handleDotClick = (idx: number) => {
    setDirection(idx > currentBannerIndex ? 1 : -1);
    setCurrentBannerIndex(idx);
  };

  const bannerVariants = {
    enter: (direction: number) => {
      return {
        x: direction > 0 ? "100%" : "-100%",
        opacity: 0
      };
    },
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => {
      return {
        zIndex: 0,
        x: direction < 0 ? "100%" : "-100%",
        opacity: 0
      };
    }
  };

  // Optional auto-slide for banners
  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(nextBanner, 8000);
    return () => clearInterval(timer);
  }, [banners.length]);

  // Load cached banners immediately upon mount (Stale-While-Revalidate)
  useEffect(() => {
    try {
      const cached = localStorage.getItem('cached_banners');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBanners(parsed);
          // Preload first banner image from cache
          if (parsed[0] && parsed[0].imageUrl) {
            const optimizedFirstBanner = optimizeCloudinaryUrl(parsed[0].imageUrl, 1200);
            ReactDOM.preload(optimizedFirstBanner, { as: 'image' });
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load cached banners:', e);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    
    Promise.all([
      fetch('/api/devices').then(res => res.json()),
      fetch('/api/banners').then(res => res.json()),
      fetch('/api/categories').then(res => res.json())
    ])
    .then(([productsData, bannersData, catsData]) => {
      setProducts(Array.isArray(productsData) ? productsData : []);
      setCategoriesData(Array.isArray(catsData) ? catsData : []);
      
      if (Array.isArray(bannersData)) {
        setBanners(bannersData);
        // Preload first banner image from fresh database data
        if (bannersData[0] && bannersData[0].imageUrl) {
          const optimizedFirstBanner = optimizeCloudinaryUrl(bannersData[0].imageUrl, 1200);
          ReactDOM.preload(optimizedFirstBanner, { as: 'image' });
        }
        // Save fresh banners to cache
        try {
          localStorage.setItem('cached_banners', JSON.stringify(bannersData));
        } catch (e) {
          console.warn('Failed to save banners to cache:', e);
        }
      }
    })
    .catch(console.error)
    .finally(() => setIsLoading(false));
  }, []);

  const displayCategories = categoriesData.length > 0 ? categoriesData : fallbackCategories;

  return (
    <main className="flex-1 p-6 md:p-10 font-['Inter'] flex flex-col gap-10">
      

      {/* Banner Carousel Section */}
      {banners.length > 0 && (
      <section className="relative w-full max-w-7xl mx-auto rounded-xl shadow-sm overflow-hidden group">
        <div className="relative w-full h-[150px] sm:h-[200px] md:h-[250px] bg-white overflow-hidden">
          <AnimatePresence initial={false} custom={direction}>
            {banners.length > 0 && banners[currentBannerIndex] && (
              <motion.div
                key={currentBannerIndex}
                custom={direction}
                variants={bannerVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 120, damping: 25 },
                  opacity: { duration: 0.4 }
                }}
                className="absolute w-full h-full flex items-center justify-center pointer-events-auto"
              >
                {banners[currentBannerIndex].linkUrl ? (
                  <a href={banners[currentBannerIndex].linkUrl} target="_blank" rel="noopener noreferrer" className="w-full h-full block cursor-pointer">
                    <img 
                      src={optimizeCloudinaryUrl(banners[currentBannerIndex].imageUrl, 1200)} 
                      alt={banners[currentBannerIndex].name || `Promotional Banner`} 
                      className="w-full h-full object-contain hover:scale-[1.02] transition-transform duration-300"
                    />
                  </a>
                ) : (
                  <img 
                    src={optimizeCloudinaryUrl(banners[currentBannerIndex].imageUrl, 1200)} 
                    alt={banners[currentBannerIndex].name || `Promotional Banner`} 
                    className="w-full h-full object-contain"
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Navigation Buttons */}
        <button 
          onClick={prevBanner}
          className="absolute z-10 left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-[#5c0099] p-2 sm:p-3 rounded-full shadow-lg transition-all opacity-60 hover:opacity-100 cursor-pointer border-none"
        >
          <ChevronLeft size={24} />
        </button>
        <button 
          onClick={nextBanner}
          className="absolute z-10 right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-[#5c0099] p-2 sm:p-3 rounded-full shadow-lg transition-all opacity-60 hover:opacity-100 cursor-pointer border-none"
        >
          <ChevronRight size={24} />
        </button>

        {/* Indicators */}
        <div className="absolute z-10 bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, idx) => (
             <button 
               key={idx}
               onClick={() => handleDotClick(idx)}
               className={`w-3 h-3 rounded-full transition-all border-none cursor-pointer p-0 ${idx === currentBannerIndex ? 'bg-[#bd00ff] w-6' : 'bg-gray-300/80 hover:bg-gray-200'}`} 
             />
          ))}
        </div>
      </section>
      )}

      {/* Categories Section */}
      <section className="bg-white rounded-xl p-5 md:p-8 shadow-sm border-2 border-[#5c0099] flex flex-col gap-4 w-full max-w-7xl mx-auto relative group/cats">
        <h2 className="text-lg text-gray-500 font-bold uppercase tracking-wide m-0 border-none mb-2">Categories</h2>
        
        {/* Left Chevron */}
        <button 
          onClick={() => scrollCategories(-300)}
          className="absolute left-2 md:left-4 top-[55%] -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-100 z-10 text-gray-600 hover:text-[#bd00ff] hover:scale-110 transition-all opacity-0 group-hover/cats:opacity-100 cursor-pointer hidden md:flex"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Right Chevron */}
        <button 
          onClick={() => scrollCategories(300)}
          className="absolute right-2 md:right-4 top-[55%] -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-100 z-10 text-gray-600 hover:text-[#bd00ff] hover:scale-110 transition-all opacity-0 group-hover/cats:opacity-100 cursor-pointer hidden md:flex"
        >
          <ChevronRight size={24} />
        </button>

        <div 
          ref={categoryScrollRef}
          className="flex gap-4 sm:gap-8 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {displayCategories.map((category, idx) => (
            <div 
              key={category.id || idx} 
              onClick={() => navigate(`/customer/products?category=${encodeURIComponent(category.name || category.id)}`)}
              className="flex flex-col items-center gap-3 min-w-[80px] sm:min-w-[100px] cursor-pointer group"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-50 flex items-center justify-center shadow-sm border border-gray-200 group-hover:border-[#bd00ff] group-hover:shadow-md transition-all ease-out duration-300 p-4 shrink-0">
                {category.logoUrl || category.logo ? (
                  <img 
                    src={optimizeCloudinaryUrl(category.logoUrl || category.logo, 100)} 
                    alt={category.name} 
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                    style={category.name === 'Apple' ? { paddingBottom: '2px' } : {}}
                  />
                ) : (
                  <span className="text-xs text-gray-400 font-bold">No Img</span>
                )}
              </div>
              <span className="text-xs sm:text-sm font-semibold text-gray-700 text-center group-hover:text-[#bd00ff] transition-colors leading-tight">
                {category.name}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Shop Our Products Section */}
      <section className="bg-white rounded-xl p-5 md:p-8 shadow-sm border-2 border-[#5c0099] flex flex-col gap-6 w-full max-w-7xl mx-auto mb-10">
        <h2 className="text-2xl font-bold text-black m-0 border-none">Shop Our Products</h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {isLoading ? (
            <div className="col-span-full py-16 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-purple-100 border-t-[#5c0099] rounded-full animate-spin"></div>
              <p className="text-[#666] font-semibold animate-pulse text-lg">Loading products...</p>
            </div>
          ) : products.length > 0 ? (
            products.slice(0, 15).map(product => (
              <div key={product.id} onClick={() => navigate(`/customer/product-info?id=${product.id}`)} className="bg-white rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md md:hover:-translate-y-1 transition-all cursor-pointer flex flex-col gap-2 border-2 border-[#5c0099] group">
                <div className="h-28 sm:h-36 w-full bg-transparent flex justify-center items-center overflow-hidden mb-1 sm:mb-2 relative">
                  {product.image ? (
                    <img src={optimizeCloudinaryUrl(product.image, 300)} alt={product.name} className="h-full w-auto object-contain mix-blend-multiply md:group-hover:scale-110 transition-transform duration-300" />
                  ) : (
                    <div className="h-full w-full bg-gray-100 mix-blend-multiply" />
                  )}
                </div>
                <p className="text-black font-bold text-xs sm:text-sm leading-snug line-clamp-2 h-8 sm:h-10">{product.name}</p>
                <div className="flex justify-between items-end w-full">
                  <p className="text-[#bd00ff] font-black text-sm sm:text-base">₱ {product.price?.toLocaleString() || '0'}</p>
                  <div className="flex flex-col items-end">
                    <p className="text-[11px] sm:text-xs text-gray-500 font-bold">{product.sold || 0} Sold</p>
                    <p className="text-[10px] text-gray-400 font-medium">Stock: {product.stock || 0}</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/customer/product-info?id=${product.id}`);
                  }}
                  className="w-full mt-2 py-2 bg-purple-50 text-[#bd00ff] border border-[#bd00ff] font-bold rounded-lg group-hover:bg-[#bd00ff] group-hover:text-white transition-colors text-xs sm:text-sm shadow-sm"
                >
                  View Product
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-full py-10 text-center text-gray-500 font-bold">No products available.</div>
          )}
        </div>

        <div className="flex justify-center mt-2">
          <button 
            onClick={() => navigate('/customer/products')}
            className="px-8 py-2.5 bg-[#4B0082] text-white font-bold rounded-xl hover:bg-[#320057] transition-colors cursor-pointer border-none shadow-md"
          >
            View More
          </button>
        </div>
      </section>

    </main>
  );
}
