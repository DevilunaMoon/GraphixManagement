"use client";

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

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

      const effectivePrice = (p.discount && p.discount > 0) 
        ? (p.price * (1 - p.discount / 100)) 
        : (p.price || 0);

      if (sortOrder === 'discounted') {
        matchesDiscount = (p.discount || 0) > 0;
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
      const priceA = (a.discount && a.discount > 0) ? (a.price * (1 - a.discount / 100)) : (a.price || 0);
      const priceB = (b.discount && b.discount > 0) ? (b.price * (1 - b.discount / 100)) : (b.price || 0);
      if (sortOrder === 'price-asc') return priceA - priceB;
      if (sortOrder === 'price-desc') return priceB - priceA;
      return 0;
    });

  return (
    <main className="flex-1 p-6 md:p-10 font-['Inter'] flex flex-col items-center">
      <div className="w-full max-w-7xl flex flex-col gap-6">

        {/* Header & Filters */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pb-4 border-b border-gray-100 w-full mb-2">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#bd00ff] to-[#01f0ff] uppercase tracking-wide border-none">
            {searchFilter ? `Search: "${searchFilter}"` : categoryFilter ? `Shop: ${categoryFilter}` : sortOrder === 'discounted' ? 'Discounted Items' : sortOrder === 'under-2k' ? 'Items Under ₱2,000' : 'Shop Our Products'}
          </h2>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Price Sort Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <span className="text-gray-500 font-semibold text-sm uppercase whitespace-nowrap">Filter:</span>
              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 rounded-lg border-2 border-purple-100 bg-white text-black font-semibold text-sm outline-none focus:border-[#bd00ff] transition-colors cursor-pointer"
              >
                <option value="default">Featured</option>
                <option value="discounted">Discounted (Sale)</option>
                <option value="under-2k">Less Than ₱2,000</option>
                <option value="pre-owned">Pre Owned</option>
                <option value="price-desc">Price: Highest to Lowest</option>
                <option value="price-asc">Price: Lowest to Highest</option>
              </select>
            </div>
            {/* Device Type Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <span className="text-gray-500 font-semibold text-sm uppercase whitespace-nowrap">Type:</span>
              <select 
                value={deviceTypeFilter}
                onChange={(e) => setDeviceTypeFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 rounded-lg border-2 border-purple-100 bg-white text-black font-semibold text-sm outline-none focus:border-[#bd00ff] transition-colors cursor-pointer"
              >
                <option value="all">All Devices</option>
                <option value="smartphone">Smartphone</option>
                <option value="laptop">Laptop</option>
                <option value="ipad">iPad/Tablet</option>
                <option value="tv">TV</option>
                <option value="speaker">Speaker</option>
                <option value="phone accessories">Phone Accessories</option>
              </select>
            </div>
            {/* Budget Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <span className="text-gray-500 font-semibold text-sm uppercase whitespace-nowrap">Budget: ₱</span>
              <input 
                type="number" 
                value={budgetFilter}
                onChange={(e) => setBudgetFilter(e.target.value)}
                placeholder="Max price" 
                className="w-full sm:w-28 px-3 py-2 rounded-lg border-2 border-purple-100 bg-white text-black font-semibold text-sm outline-none focus:border-[#bd00ff] transition-colors"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Categories Section */}
        <section className="bg-white rounded-xl p-5 md:p-8 shadow-sm border-2 border-[#5c0099] flex flex-col gap-4 w-full relative group/cats">
          <h2 className="text-lg text-gray-500 font-bold uppercase tracking-wide m-0 border-none mb-2">Brands</h2>
          
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
                className="flex flex-col items-center gap-3 min-w-[80px] sm:min-w-[100px] cursor-pointer group"
              >
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-sm border transition-all ease-out duration-300 p-4 ${isActive ? 'bg-purple-100 border-[#bd00ff] shadow-md scale-105' : 'bg-gray-50 border-gray-200 group-hover:border-[#bd00ff] group-hover:shadow-md'}`}>
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
                <span className={`text-xs sm:text-sm font-semibold text-center transition-colors leading-tight ${isActive ? 'text-[#bd00ff]' : 'text-gray-700 group-hover:text-[#bd00ff]'}`}>
                  {category.name}
                </span>
              </div>
              );
            })}
          </div>
        </section>

        {/* Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-6">
          {isLoading ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-purple-100 border-t-[#5c0099] rounded-full animate-spin"></div>
              <p className="text-[#666] font-semibold animate-pulse text-lg">Loading products...</p>
            </div>
          ) : sortedProducts.length > 0 ? (
            sortedProducts.map(product => (
              <div 
                key={product.id} 
                onClick={() => navigate(`/customer/product-info?id=${product.id}`)}
                className="bg-white rounded-xl p-2 sm:p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-md md:hover:-translate-y-1 transition-all cursor-pointer flex flex-col gap-2 border border-transparent md:border-2 md:border-[#5c0099] group"
              >
                <div className="aspect-square w-full md:h-36 bg-transparent flex justify-center items-center overflow-hidden mb-1 sm:mb-2 relative">
                  {(product.isPreOwned || (product.name || '').toLowerCase().includes('pre-owned') || (product.name || '').toLowerCase().includes('pre owned')) && (
                    <span className="absolute top-1 left-1 bg-[#5c0099] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wider z-10 border border-purple-300">
                      Pre-Owned
                    </span>
                  )}
                  {product.discount > 0 && (
                    <span className="absolute top-1 right-1 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wider z-10 animate-pulse">
                      {product.discount}% OFF
                    </span>
                  )}
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-contain p-1 md:p-0 mix-blend-multiply md:group-hover:scale-110 transition-transform duration-300" />
                  ) : (
                    <div className="h-full w-full bg-gray-100 mix-blend-multiply" />
                  )}
                </div>
                <p className="text-black font-bold text-xs sm:text-sm leading-snug line-clamp-2 h-8 sm:h-10">{product.name}</p>
                <div className="flex justify-between items-end w-full">
                  <div className="flex flex-col">
                    {product.discount > 0 ? (
                      <>
                        <span className="text-gray-400 line-through text-[11px] font-semibold">₱ {product.price?.toLocaleString()}</span>
                        <p className="text-[#bd00ff] font-black text-sm sm:text-base m-0 leading-tight">
                          ₱ {(product.price * (1 - product.discount / 100)).toLocaleString()}
                        </p>
                      </>
                    ) : (
                      <p className="text-[#bd00ff] font-black text-sm sm:text-base m-0">₱ {product.price?.toLocaleString() || '0'}</p>
                    )}
                  </div>
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
                  className="w-full mt-2 py-2 bg-purple-50 text-[#bd00ff] border border-[#bd00ff] font-bold rounded-lg group-hover:bg-[#bd00ff] group-hover:text-white transition-colors text-xs sm:text-sm shadow-sm hidden md:block"
                >
                  View Product
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-full py-10 text-center text-gray-500 font-bold">No products available.</div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex justify-center mt-6">
          <div className="flex items-center gap-6 bg-white px-8 py-3 rounded-full shadow-sm border border-gray-100">
            <button className="bg-transparent border-none text-black cursor-pointer hover:text-[#bd00ff] hover:-translate-x-1 transition-transform"><ChevronLeft size={24} /></button>
            <span className="font-bold text-xl text-black">1/1</span>
            <button className="bg-transparent border-none text-black cursor-pointer hover:text-[#bd00ff] hover:translate-x-1 transition-transform"><ChevronRight size={24} /></button>
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
