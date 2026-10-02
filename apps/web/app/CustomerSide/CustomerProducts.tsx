"use client";

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Clock, Flame, Percent } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import CountdownTimer from '../../components/Common/CountdownTimer';

import { Suspense } from 'react';

function CustomerProductsContent() {
  const router = useRouter();
  const navigate = router.push;
  const [products, setProducts] = useState<any[]>([]);
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('default');
  const [budgetFilter, setBudgetFilter] = useState('');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState('all');
  const searchParams = useSearchParams();
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
  const categoryFilter = searchParams ? searchParams.get('category') : null;
  const searchFilter = searchParams ? searchParams.get('search') : null;


  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/devices?t=' + Date.now(), { cache: 'no-store' }).then(res => res.json()),
      fetch('/api/categories?t=' + Date.now(), { cache: 'no-store' }).then(res => res.json())
    ])
      .then(([productsData, catsData]) => {
        setProducts(Array.isArray(productsData) ? productsData : []);
        setCategoriesData(Array.isArray(catsData) ? catsData : []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const displayCategories = categoriesData.length > 0 ? categoriesData : fallbackCategories;

  const sortedProducts = [...products]
    .filter(p => {
      let matchesCategory = true;
      let matchesSearch = true;
      let matchesBudget = true;
      let matchesPreOwned = true;
      let matchesDeviceType = true;
      let matchesDiscount = true;
      let matchesUnder2k = true;

      const now = new Date();
      const isDiscountActive = Boolean(
        p.discount && 
        p.discount > 0 &&
        (!p.discountStartDate || new Date(p.discountStartDate) <= now) &&
        (!p.discountEndDate || new Date(p.discountEndDate) >= now)
      );

      const effectivePrice = isDiscountActive 
        ? (p.price * (1 - p.discount / 100)) 
        : (p.price || 0);

      if (sortOrder === 'discounted') {
        matchesDiscount = isDiscountActive;
      } else if (sortOrder === 'under-2k') {
        matchesUnder2k = effectivePrice < 2000;
      }

      if (sortOrder === 'pre-owned') {
        const pName = (p.name || '').toLowerCase();
        const pSpecs = (p.specs || '').toLowerCase();
        const pCat = (p.category?.name || '').toLowerCase();
        matchesPreOwned = p.isPreOwned === true || 
                          pName.includes('pre-owned') || pName.includes('pre owned') || pName.includes('preowned') || pName.includes('second hand') ||
                          pSpecs.includes('pre-owned') || pSpecs.includes('pre owned') || pSpecs.includes('second hand') ||
                          pCat.includes('pre-owned') || pCat.includes('pre owned');
      }

      if (categoryFilter) {
        const filterLower = categoryFilter.toLowerCase();
        const catName = p.category?.name?.toLowerCase() || '';
        matchesCategory = p.categoryId === categoryFilter || catName === filterLower || p.name.toLowerCase().includes(filterLower);
      }

      if (searchFilter) {
        const searchLower = searchFilter.toLowerCase();
        const catName = p.category?.name?.toLowerCase() || '';
        matchesSearch = p.name.toLowerCase().includes(searchLower) || catName.includes(searchLower);
      }

      if (budgetFilter) {
        const budget = parseFloat(budgetFilter);
        if (!isNaN(budget)) {
          matchesBudget = effectivePrice <= budget;
        }
      }

      if (deviceTypeFilter !== 'all') {
        const pName = (p.name || '').toLowerCase();
        const pSpecs = (p.specs || '').toLowerCase();
        const pCat = (p.category?.name || '').toLowerCase();

        if (deviceTypeFilter === 'smartphone') {
          const isPhoneWord = pName.includes('phone') || pName.includes('mobile') || pName.includes('smartphone') || 
                              pSpecs.includes('phone') || pSpecs.includes('mobile') ||
                              pCat.includes('phone') || pCat.includes('mobile') || pCat.includes('smartphone');
          
          const isPhoneBrand = ['apple', 'samsung', 'xiaomi', 'oppo', 'vivo', 'realme', 'infinix', 'itel', 'huawei', 'oneplus'].some(b => 
            pName.includes(b) || pCat.includes(b)
          );

          const isAccessory = pName.includes('case') || pName.includes('charger') || pName.includes('cable') || 
                              pName.includes('earphone') || pName.includes('headset') || pName.includes('buds') || 
                              pName.includes('watch') || pName.includes('peripherals') || pName.includes('accessories') ||
                              pName.includes('keyboard') || pName.includes('mouse') || pName.includes('tempered') ||
                              pCat.includes('accessories') || pCat.includes('peripherals');
                              
          const isIpadOrLaptop = pName.includes('ipad') || pName.includes('tablet') || pName.includes('tab') || 
                                 pName.includes('laptop') || pName.includes('macbook') || pName.includes('notebook') ||
                                 pSpecs.includes('ipad') || pSpecs.includes('tablet') || pSpecs.includes('laptop');

          matchesDeviceType = (isPhoneWord || isPhoneBrand) && !isAccessory && !isIpadOrLaptop;
        } 
        else if (deviceTypeFilter === 'laptop') {
          matchesDeviceType = pName.includes('laptop') || pName.includes('macbook') || pName.includes('notebook') || 
                              pName.includes('thinkpad') || pName.includes('zenbook') || pName.includes('chromebook') ||
                              pSpecs.includes('laptop') || pSpecs.includes('macbook') || pSpecs.includes('notebook') ||
                              pCat.includes('laptop') || pCat.includes('macbook');
        } 
        else if (deviceTypeFilter === 'ipad') {
          matchesDeviceType = pName.includes('ipad') || pName.includes('tablet') || pName.includes('tab') || pName.includes('pad') ||
                              pSpecs.includes('ipad') || pSpecs.includes('tablet') || pSpecs.includes('tab') ||
                              pCat.includes('ipad') || pCat.includes('tablet') || pCat.includes('tab');
        } 
        else if (deviceTypeFilter === 'tv') {
          matchesDeviceType = pName.includes('tv') || pName.includes('television') || pName.includes('smart tv') || pName.includes('led tv') ||
                              pSpecs.includes('tv') || pSpecs.includes('television') ||
                              pCat.includes('tv') || pCat.includes('television');
        } 
        else if (deviceTypeFilter === 'speaker') {
          matchesDeviceType = pName.includes('speaker') || pName.includes('audio') || pName.includes('soundbar') || pName.includes('subwoofer') ||
                              pSpecs.includes('speaker') || pSpecs.includes('audio') ||
                              pCat.includes('speaker') || pCat.includes('audio');
        } 
        else if (deviceTypeFilter === 'phone accessories') {
          matchesDeviceType = pName.includes('case') || pName.includes('charger') || pName.includes('cable') || 
                              pName.includes('earphone') || pName.includes('headset') || pName.includes('buds') || 
                              pName.includes('watch') || pName.includes('peripherals') || pName.includes('accessories') ||
                              pName.includes('tempered') || pName.includes('powerbank') || pName.includes('hub') ||
                              pCat.includes('accessories') || pCat.includes('peripherals');
        }
      }

      return matchesCategory && matchesSearch && matchesBudget && matchesPreOwned && matchesDeviceType && matchesDiscount && matchesUnder2k;
    })
    .sort((a, b) => {
      const now = new Date();
      const isDiscountA = Boolean(a.discount && a.discount > 0 && (!a.discountStartDate || new Date(a.discountStartDate) <= now) && (!a.discountEndDate || new Date(a.discountEndDate) >= now));
      const isDiscountB = Boolean(b.discount && b.discount > 0 && (!b.discountStartDate || new Date(b.discountStartDate) <= now) && (!b.discountEndDate || new Date(b.discountEndDate) >= now));

      const priceA = isDiscountA ? (a.price * (1 - a.discount / 100)) : (a.price || 0);
      const priceB = isDiscountB ? (b.price * (1 - b.discount / 100)) : (b.price || 0);
      if (sortOrder === 'price-asc') return priceA - priceB;
      if (sortOrder === 'price-desc') return priceB - priceA;
      if (sortOrder === 'default') {
        if (isDiscountA && !isDiscountB) return -1;
        if (isDiscountB && !isDiscountA) return 1;
        return (b.discount || 0) - (a.discount || 0);
      }
      return 0;
    });

  const now = new Date();
  const hasAnyActiveDiscounts = products.some(p => 
    p.discount && 
    p.discount > 0 && 
    (!p.discountStartDate || new Date(p.discountStartDate) <= now) && 
    (!p.discountEndDate || new Date(p.discountEndDate) >= now)
  );

  return (
    <main className="flex-1 p-6 md:p-10 font-['Inter'] flex flex-col items-center">
      <div className="w-full max-w-7xl flex flex-col gap-6">

        {/* Header & Filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-purple-100/80 w-full mb-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#bd00ff] to-[#01f0ff] uppercase tracking-wide m-0 border-none">
              {searchFilter ? `Search: "${searchFilter}"` : categoryFilter ? `Shop: ${categoryFilter}` : sortOrder === 'discounted' ? 'Discounted Items' : sortOrder === 'under-2k' ? 'Items Under ₱2,000' : 'Shop Our Products'}
            </h2>
            {hasAnyActiveDiscounts && (
              <button
                onClick={() => setSortOrder(prev => prev === 'discounted' ? 'default' : 'discounted')}
                className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer border flex items-center gap-1 shadow-sm ${
                  sortOrder === 'discounted'
                    ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-300'
                    : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                }`}
              >
                🔥 {sortOrder === 'discounted' ? 'Showing Sale Items' : 'Sale Deals Available'}
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Price Sort Filter */}
            <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-between sm:justify-start">
              <span className="text-gray-500 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Filter:</span>
              <div className="relative w-full sm:w-auto">
                <select 
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full sm:w-auto appearance-none pl-3.5 pr-8 py-2 rounded-xl border border-purple-100 bg-white text-gray-800 font-semibold text-xs sm:text-sm outline-none focus:border-[#bd00ff] focus:ring-2 focus:ring-[#bd00ff]/20 transition-all cursor-pointer shadow-sm"
                >
                  <option value="default">Featured</option>
                  <option value="discounted">Discounted (Sale)</option>
                  <option value="under-2k">Less Than ₱2,000</option>
                  <option value="pre-owned">Pre-Owned</option>
                  <option value="price-desc">Price: Highest to Lowest</option>
                  <option value="price-asc">Price: Lowest to Highest</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400">
                  <ChevronRight size={14} className="rotate-90" />
                </div>
              </div>
            </div>

            {/* Device Type Filter */}
            <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-between sm:justify-start">
              <span className="text-gray-500 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Type:</span>
              <div className="relative w-full sm:w-auto">
                <select 
                  value={deviceTypeFilter}
                  onChange={(e) => setDeviceTypeFilter(e.target.value)}
                  className="w-full sm:w-auto appearance-none pl-3.5 pr-8 py-2 rounded-xl border border-purple-100 bg-white text-gray-800 font-semibold text-xs sm:text-sm outline-none focus:border-[#bd00ff] focus:ring-2 focus:ring-[#bd00ff]/20 transition-all cursor-pointer shadow-sm"
                >
                  <option value="all">All Devices</option>
                  <option value="smartphone">Smartphone</option>
                  <option value="laptop">Laptop</option>
                  <option value="ipad">iPad/Tablet</option>
                  <option value="tv">TV</option>
                  <option value="speaker">Speaker</option>
                  <option value="phone accessories">Phone Accessories</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400">
                  <ChevronRight size={14} className="rotate-90" />
                </div>
              </div>
            </div>

            {/* Budget Filter */}
            <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-between sm:justify-start">
              <span className="text-gray-500 font-bold text-xs uppercase tracking-wider whitespace-nowrap">Budget: ₱</span>
              <input 
                type="number" 
                value={budgetFilter}
                onChange={(e) => setBudgetFilter(e.target.value)}
                placeholder="Max price" 
                className="w-full sm:w-28 px-3.5 py-2 rounded-xl border border-purple-100 bg-white text-gray-800 font-semibold text-xs sm:text-sm outline-none focus:border-[#bd00ff] focus:ring-2 focus:ring-[#bd00ff]/20 transition-all shadow-sm"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* ========================================================== */}
        {/* DEDICATED SEPARATE DISCOUNTED PRODUCTS CONTAINER           */}
        {/* ========================================================== */}
        {(() => {
          const now = new Date();
          const activeDiscountedProducts = products.filter(p => Boolean(
            p.discount && 
            p.discount > 0 &&
            (!p.discountStartDate || new Date(p.discountStartDate) <= now) &&
            (!p.discountEndDate || new Date(p.discountEndDate) >= now)
          ));

          if (activeDiscountedProducts.length === 0) return null;

          return (
            <section className="bg-gradient-to-br from-purple-950 via-indigo-950 to-black rounded-3xl p-5 md:p-8 shadow-2xl border border-purple-800/60 flex flex-col gap-6 w-full text-white relative overflow-hidden">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-purple-800/60 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🔥</span>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#01f0ff] via-pink-400 to-[#bd00ff] uppercase tracking-wide m-0">
                      DISCOUNTED PRODUCTS
                    </h2>
                    <p className="text-xs sm:text-sm text-purple-200 m-0 font-medium">Limited-time offers</p>
                  </div>
                </div>
                <span className="bg-rose-600 text-white text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-md animate-pulse">
                  {activeDiscountedProducts.length} Flash Deals Active
                </span>
              </div>

              {/* Discounted Product Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                {activeDiscountedProducts.map((product) => {
                  const discountedPrice = Math.round(product.price * (1 - product.discount / 100));
                  const branchName = product.branch ? (product.branch.includes('Branch') ? product.branch : `${product.branch} Branch`) : 'Tagoloan Branch';
                  const conditionText = product.isPreOwned ? 'Pre-Owned' : 'New';

                  return (
                    <div 
                      key={product.id}
                      onClick={() => navigate(`/customer/product-info?id=${product.id}`)}
                      className="bg-white rounded-2xl p-4 shadow-xl hover:shadow-2xl md:hover:-translate-y-1.5 transition-all cursor-pointer flex flex-col justify-between gap-3 border border-purple-200 hover:border-[#01f0ff] group relative text-gray-900"
                    >
                      {/* Product Image & Badges */}
                      <div className="aspect-square w-full bg-gray-50/80 rounded-xl flex justify-center items-center overflow-hidden relative p-3">
                        {/* Condition Badge */}
                        <span className={`absolute top-2 left-2 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md uppercase tracking-wider z-10 border ${
                          product.isPreOwned 
                            ? 'bg-amber-100 text-amber-900 border-amber-300' 
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}>
                          {conditionText}
                        </span>

                        {/* Discount Badge */}
                        <span className="absolute top-2 right-2 bg-rose-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md uppercase tracking-wider z-10 animate-pulse">
                          {Math.round(product.discount)}% OFF
                        </span>

                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.name} 
                            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" 
                          />
                        ) : (
                          <div className="h-full w-full bg-gray-100 rounded-lg" />
                        )}
                      </div>

                      {/* Product Name & Brand */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] text-gray-500 font-bold uppercase truncate">
                          {product.category?.name || product.type || 'Smartphone'}
                        </span>
                        <h4 className="text-gray-950 font-black text-sm leading-snug line-clamp-2 h-10 m-0 group-hover:text-[#8b00cc] transition-colors">
                          {product.name}
                        </h4>
                      </div>

                      {/* Pricing Breakdown */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-gray-400 line-through text-xs font-semibold">
                          ₱ {Number(product.price || 0).toLocaleString()}
                        </span>
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-[#8b00cc] font-black text-xl leading-none">
                            ₱ {discountedPrice.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
                            Save ₱ {(product.price - discountedPrice).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Available Branch & Stock */}
                      <div className="flex flex-col gap-0.5 text-xs text-gray-600 border-t border-gray-100 pt-2 font-semibold">
                        <span className="text-purple-700 truncate font-bold text-[11px]">
                          Available at: {branchName}
                        </span>
                        <span className="text-gray-500 text-[10px]">
                          Available stock: <strong className="text-gray-900">{product.stock || 0} pcs</strong>
                        </span>
                      </div>

                      {/* Real-time Countdown Timer */}
                      {product.discountEndDate && (
                        <div className="bg-purple-50/80 rounded-xl p-2 border border-purple-200">
                          <span className="text-[10px] text-purple-900 font-extrabold uppercase block mb-0.5 flex items-center gap-1">
                            <Clock size={11} className="text-purple-700" /> Ends in:
                          </span>
                          <CountdownTimer 
                            targetDate={product.discountEndDate} 
                            format="short" 
                            className="text-xs text-rose-700 font-bold" 
                          />
                        </div>
                      )}

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/customer/product-info?id=${product.id}`);
                        }}
                        className="w-full mt-1 py-2.5 bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white font-bold rounded-xl hover:brightness-110 transition-all text-xs shadow-md border-none cursor-pointer"
                      >
                        View Deal &rarr;
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* Categories / Explore Brands Section */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 md:p-8 shadow-sm border border-purple-100/90 flex flex-col gap-4 w-full relative group/cats">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-black text-[#8b00cc] uppercase tracking-widest m-0 border-none">
              Explore Brands
            </h3>
            {categoryFilter && (
              <button 
                onClick={() => navigate('/customer/products')} 
                className="text-xs font-bold text-[#8b00cc] hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1"
              >
                Clear Brand Filter ✕
              </button>
            )}
          </div>
          
          {/* Left Chevron */}
          <button 
            onClick={() => scrollCategories(-300)}
            aria-label="Previous Brands"
            className="absolute left-2 md:left-4 top-[58%] -translate-y-1/2 w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center border border-purple-100 z-10 text-gray-600 hover:text-[#8b00cc] hover:scale-110 transition-all cursor-pointer"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>

          {/* Right Chevron */}
          <button 
            onClick={() => scrollCategories(300)}
            aria-label="Next Brands"
            className="absolute right-2 md:right-4 top-[58%] -translate-y-1/2 w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center border border-purple-100 z-10 text-gray-600 hover:text-[#8b00cc] hover:scale-110 transition-all cursor-pointer"
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>

          <div 
            ref={categoryScrollRef}
            className="flex gap-4 sm:gap-6 md:gap-8 overflow-x-auto pb-2 px-8 [&::-webkit-scrollbar]:hidden items-center"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {displayCategories.map((category, idx) => {
              const catName = category.name || category.id;
              const isActive = categoryFilter === catName;
              return (
                <div 
                  key={category.id || idx} 
                  onClick={() => {
                    if (isActive) {
                      navigate('/customer/products');
                    } else {
                      navigate(`/customer/products?category=${encodeURIComponent(catName)}`);
                    }
                  }}
                  className="flex flex-col items-center gap-2.5 min-w-[76px] sm:min-w-[90px] cursor-pointer group"
                >
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center border transition-all ease-out duration-300 p-3.5 ${
                    isActive 
                      ? 'bg-purple-50 border-[#bd00ff] ring-4 ring-purple-100 shadow-md scale-105' 
                      : 'bg-white border-gray-150 shadow-sm group-hover:border-purple-300 group-hover:shadow-md group-hover:scale-105'
                  }`}>
                    {category.logoUrl || category.logo ? (
                      <img 
                        src={category.logoUrl || category.logo} 
                        alt={category.name} 
                        className={`w-full h-full object-contain transition-transform duration-300 ${isActive ? '' : 'group-hover:scale-110'}`}
                        style={category.name === 'Apple' ? { paddingBottom: '2px' } : {}}
                      />
                    ) : (
                      <span className="text-xs text-gray-400 font-bold">No Img</span>
                    )}
                  </div>
                  <span className={`text-xs sm:text-sm font-semibold text-center transition-colors leading-tight ${
                    isActive ? 'text-[#8b00cc] font-bold' : 'text-gray-700 group-hover:text-[#8b00cc]'
                  }`}>
                    {category.name}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================== */}
        {/* ALL PRODUCTS SECTION                                       */}
        {/* ========================================================== */}
        <section className="flex flex-col gap-4 w-full">
          <div className="flex items-center justify-between border-b border-purple-100/80 pb-3">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-wide m-0 border-none">
              ALL PRODUCTS
            </h2>
            <span className="text-xs font-bold text-gray-500 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
              Showing {sortedProducts.length} items
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5 md:gap-6">
            {isLoading ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-purple-100 border-t-[#8b00cc] rounded-full animate-spin"></div>
                <p className="text-gray-500 font-semibold animate-pulse text-base">Loading products...</p>
              </div>
            ) : sortedProducts.length > 0 ? (
              sortedProducts.map(product => {
                const now = new Date();
                const isDiscountActive = Boolean(
                  product.discount && 
                  product.discount > 0 &&
                  (!product.discountStartDate || new Date(product.discountStartDate) <= now) &&
                  (!product.discountEndDate || new Date(product.discountEndDate) >= now)
                );

                const discountedPrice = isDiscountActive 
                  ? Math.round(product.price * (1 - product.discount / 100))
                  : (product.price || 0);

                return (
                  <div 
                    key={product.id} 
                    onClick={() => navigate(`/customer/product-info?id=${product.id}`)}
                    className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-xl border border-purple-100/90 hover:border-purple-300 transition-all duration-300 cursor-pointer flex flex-col justify-between group md:hover:-translate-y-1 relative"
                  >
                    <div>
                      {/* Product Image Area */}
                      <div className="aspect-square w-full bg-gray-50/70 rounded-xl flex justify-center items-center overflow-hidden relative p-3 mb-3">
                        {(product.isPreOwned || (product.name || '').toLowerCase().includes('pre-owned') || (product.name || '').toLowerCase().includes('pre owned')) && (
                          <span className="absolute top-2 left-2 bg-gradient-to-r from-purple-700 to-indigo-800 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm uppercase tracking-wider z-10 border border-purple-300/60">
                            PRE-OWNED
                          </span>
                        )}
                        {isDiscountActive && (
                          <span className="absolute top-2 right-2 bg-rose-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm uppercase tracking-wider z-10 animate-pulse">
                            {Math.round(product.discount)}% OFF
                          </span>
                        )}
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.name} 
                            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" 
                          />
                        ) : (
                          <div className="h-full w-full bg-gray-100 rounded-lg" />
                        )}
                      </div>

                      {/* Brand / Category */}
                      <span className="text-[10px] sm:text-[11px] text-gray-400 font-bold uppercase tracking-wider truncate block mb-1">
                        {product.category?.name || product.type || 'Device'}
                      </span>

                      {/* Product Name */}
                      <h3 className="text-gray-900 font-bold text-xs sm:text-sm leading-snug line-clamp-2 h-8 sm:h-10 group-hover:text-[#8b00cc] transition-colors m-0 border-none">
                        {product.name}
                      </h3>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex flex-col gap-2">
                      {/* Pricing & Stock row */}
                      <div className="flex items-end justify-between gap-1">
                        <div className="flex flex-col">
                          {isDiscountActive ? (
                            <>
                              <span className="text-gray-400 line-through text-[11px] font-semibold leading-tight">
                                ₱ {product.price?.toLocaleString()}
                              </span>
                              <span className="text-[#8b00cc] font-black text-sm sm:text-base leading-tight">
                                ₱ {discountedPrice.toLocaleString()}
                              </span>
                            </>
                          ) : (
                            <span className="text-[#8b00cc] font-black text-sm sm:text-base leading-tight">
                              ₱ {product.price?.toLocaleString() || '0'}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col items-end text-right">
                          <span className="text-[10px] text-gray-400 font-medium">
                            {product.sold || 0} sold
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {product.stock || 0} stock
                          </span>
                        </div>
                      </div>

                      {/* View Product CTA */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/customer/product-info?id=${product.id}`);
                        }}
                        className="w-full mt-1 py-2 bg-purple-50 text-[#8b00cc] group-hover:bg-gradient-to-r group-hover:from-[#8b00cc] group-hover:to-[#bd00ff] group-hover:text-white font-bold rounded-xl transition-all text-xs border border-purple-100/90 shadow-sm hidden md:flex items-center justify-center gap-1 cursor-pointer"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-12 text-center text-gray-500 font-bold bg-white rounded-2xl border border-purple-100">
                No products found matching your filters.
              </div>
            )}
          </div>
        </section>

        {/* Pagination */}
        <div className="flex justify-center mt-6">
          <div className="flex items-center gap-6 bg-white px-8 py-3 rounded-full shadow-sm border border-purple-100">
            <button className="bg-transparent border-none text-gray-600 cursor-pointer hover:text-[#8b00cc] hover:-translate-x-1 transition-all"><ChevronLeft size={22} /></button>
            <span className="font-bold text-base sm:text-lg text-gray-800">1 / 1</span>
            <button className="bg-transparent border-none text-gray-600 cursor-pointer hover:text-[#8b00cc] hover:translate-x-1 transition-all"><ChevronRight size={22} /></button>
          </div>
        </div>

      </div>
    </main>
  );
}

export default function CustomerProducts() {
  return (
    <Suspense fallback={<div className="flex-1 flex justify-center items-center h-screen"><div className="w-12 h-12 border-4 border-purple-100 border-t-[#bd00ff] rounded-full animate-spin"></div></div>}>
      <CustomerProductsContent />
    </Suspense>
  );
}
