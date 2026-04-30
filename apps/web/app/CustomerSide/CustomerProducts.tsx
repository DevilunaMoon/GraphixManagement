"use client";

import { useState, useEffect } from 'react';
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
  const searchParams = useSearchParams();

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
      fetch('/api/devices').then(res => res.json()),
      fetch('/api/categories').then(res => res.json())
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
          matchesBudget = (p.price || 0) <= budget;
        }
      }

      return matchesCategory && matchesSearch && matchesBudget;
    })
    .sort((a, b) => {
      if (sortOrder === 'price-asc') return (a.price || 0) - (b.price || 0);
      if (sortOrder === 'price-desc') return (b.price || 0) - (a.price || 0);
      return 0;
    });

  return (
    <main className="flex-1 p-6 md:p-10 font-['Signika'] flex flex-col items-center">
      <div className="w-full max-w-7xl flex flex-col gap-6">

        {/* Header & Filters */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pb-4 border-b border-gray-100 w-full mb-2">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#bd00ff] to-[#01f0ff] uppercase tracking-wide border-none">
            {searchFilter ? `Search: "${searchFilter}"` : categoryFilter ? `Shop: ${categoryFilter}` : 'Shop Our Products'}
          </h2>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Price Sort Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <span className="text-gray-500 font-semibold text-sm uppercase whitespace-nowrap">Sort:</span>
              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 rounded-lg border-2 border-purple-100 bg-white text-black font-semibold text-sm outline-none focus:border-[#bd00ff] transition-colors cursor-pointer"
              >
                <option value="default">Featured</option>
                <option value="price-desc">Price: Highest to Lowest</option>
                <option value="price-asc">Price: Lowest to Highest</option>
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
        <section className="bg-white rounded-xl p-5 md:p-8 shadow-sm border-2 border-[#5c0099] flex flex-col gap-4 w-full">
          <h2 className="text-lg text-gray-500 font-bold uppercase tracking-wide m-0 border-none mb-2">Categories</h2>
          
          <div className="flex gap-4 sm:gap-8 overflow-x-auto pb-4 scrollbar-hide">
            {displayCategories.map((category, idx) => (
              <div 
                key={category.id || idx} 
                onClick={() => navigate(`/customer/products?category=${encodeURIComponent(category.name || category.id)}`)}
                className="flex flex-col items-center gap-3 min-w-[80px] sm:min-w-[100px] cursor-pointer group"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-50 flex items-center justify-center shadow-sm border border-gray-200 group-hover:border-[#bd00ff] group-hover:shadow-md transition-all ease-out duration-300 p-4">
                  {category.logoUrl || category.logo ? (
                    <img 
                      src={category.logoUrl || category.logo} 
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

        {/* Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
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
                className="bg-white rounded-xl p-2 sm:p-4 shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col gap-1.5 sm:gap-3 group border-2 border-[#5c0099] md:hover:-translate-y-1"
              >
                <div className="h-28 sm:h-36 w-full bg-transparent flex justify-center items-center overflow-hidden mb-1 sm:mb-2">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="h-full w-auto object-contain mix-blend-multiply md:group-hover:scale-110 transition-transform duration-300" />
                  ) : (
                    <div className="h-full w-full bg-gray-100 mix-blend-multiply" />
                  )}
                </div>
                <p className="text-black font-bold text-xs sm:text-sm leading-snug line-clamp-2 h-8 sm:h-10 px-1">{product.name}</p>
                <p className="text-black font-bold text-sm sm:text-base mt-auto px-1">₱ {product.price?.toLocaleString() || '0'}</p>
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
