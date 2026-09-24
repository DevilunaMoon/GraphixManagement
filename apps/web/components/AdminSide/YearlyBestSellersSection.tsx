"use client";

import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Building2, 
  Package, 
  ShoppingCart, 
  Award, 
  Smartphone, 
  Sparkles,
  Info
} from 'lucide-react';
import { BranchBestSellersSummary, BestSellerProduct } from '../../lib/analyticsBestSellers';

const BEST_SELLER_COLORS = [
  '#bd00ff', // 1st: Primary Graphix Purple
  '#00b4d8', // 2nd: Vibrant Sky Blue
  '#10b981', // 3rd: Vibrant Emerald Green
  '#f97316', // 4th: Vibrant Warm Orange
  '#f43f5e', // 5th: Vibrant Coral Red
];

const formatCurrency = (val: number) => {
  return '₱' + (val || 0).toLocaleString('en-PH', {
    minimumFractionDigits: (val || 0) % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  });
};

interface YearlyBestSellersSectionProps {
  branchBestSellers?: Record<string, BranchBestSellersSummary>;
  topProducts?: Array<{ name: string; sold: number }>; // Fallback if branchBestSellers is empty
  isSuperAdmin: boolean;
  currentBranch?: string;
  timeframeLabel?: string;
}

const ALL_BRANCHES = ['Tagoloan', 'Villanueva', 'Jasaan'];

export default function YearlyBestSellersSection({
  branchBestSellers = {},
  topProducts = [],
  isSuperAdmin,
  currentBranch = 'Tagoloan',
  timeframeLabel = 'By Units Sold'
}: YearlyBestSellersSectionProps) {
  // Determine active branch tab for Super Admin; default to selected currentBranch or 'Tagoloan'
  const [activeBranch, setActiveBranch] = useState<string>(() => {
    if (!isSuperAdmin) return currentBranch || 'Tagoloan';
    if (currentBranch && ALL_BRANCHES.includes(currentBranch)) return currentBranch;
    return 'Tagoloan';
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sync if currentBranch changes and user is branch admin
  React.useEffect(() => {
    if (!isSuperAdmin && currentBranch) {
      setActiveBranch(currentBranch);
    }
  }, [currentBranch, isSuperAdmin]);

  const activeBranchData: BranchBestSellersSummary | undefined = branchBestSellers[activeBranch];

  // Derive products list: use activeBranchData.products, or fallback to topProducts if branchBestSellers is not yet loaded
  const products: BestSellerProduct[] = activeBranchData?.products || (
    topProducts.length > 0 ? topProducts.map((p, idx) => ({
      rank: idx + 1,
      productId: `fallback-${idx}`,
      productModel: p.name,
      variant: 'Standard',
      condition: 'New' as const,
      image: null,
      unitsSold: p.sold,
      totalRevenue: 0,
      percentage: 0
    })) : []
  );

  const totalUnits = activeBranchData?.totalUnitsSold ?? products.reduce((sum, p) => sum + p.unitsSold, 0);

  // Calculate percentages for all products
  const productsWithPercentage = products.map((p) => ({
    ...p,
    percentage: totalUnits > 0 ? Math.round((p.unitsSold / totalUnits) * 100) : 0
  }));

  // Top 5 products for card display and pie chart
  const top5Products = productsWithPercentage.slice(0, 5);
  const top5TotalUnits = top5Products.reduce((sum, p) => sum + p.unitsSold, 0);

  // Build conic gradient for Top 5 pie chart
  let gradientStr = '';
  if (totalUnits > 0 && top5Products.length > 0) {
    let currentPct = 0;
    const slices = top5Products.map((p, idx) => {
      const color = BEST_SELLER_COLORS[idx % BEST_SELLER_COLORS.length];
      const slicePct = (p.unitsSold / totalUnits) * 100;
      const start = currentPct;
      const end = currentPct + slicePct;
      currentPct = end;
      return `${color} ${start.toFixed(1)}% ${end.toFixed(1)}%`;
    });

    // If top 5 don't make up 100% of branch units, fill remaining with subtle lavender gray
    if (currentPct < 99.9) {
      slices.push(`#e2e8f0 ${currentPct.toFixed(1)}% 100%`);
    }

    gradientStr = `conic-gradient(${slices.join(', ')})`;
  }

  return (
    <>
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-sm p-6 md:p-8 lg:col-span-1 flex flex-col justify-between">
        {/* Header with Title and Super Admin Branch Switcher */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-[#111]">Yearly Best Sellers</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                  {activeBranch}
                </span>
              </div>
              <p className="text-sm text-[#666] mt-0.5">{timeframeLabel}</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#bd00ff] font-semibold text-xs transition-colors border border-purple-200/60 shadow-xs shrink-0 cursor-pointer"
              title="View detailed branch best sellers"
            >
              <ExternalLink size={14} />
              <span>Details</span>
            </button>
          </div>

          {/* Super Admin Branch Switcher Tabs */}
          {isSuperAdmin && (
            <div className="flex items-center gap-1.5 p-1 bg-purple-50/70 rounded-xl border border-purple-100 mb-4 overflow-x-auto">
              {ALL_BRANCHES.map((bName) => {
                const isActive = activeBranch.toLowerCase() === bName.toLowerCase();
                const bSold = branchBestSellers[bName]?.totalUnitsSold ?? 0;
                return (
                  <button
                    key={bName}
                    onClick={() => setActiveBranch(bName)}
                    className={`flex-1 min-w-[75px] py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-white text-[#bd00ff] shadow-xs border border-purple-200/60'
                        : 'text-gray-600 hover:text-purple-700 hover:bg-white/50'
                    }`}
                  >
                    <span>{bName}</span>
                    {bSold > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-purple-100 text-purple-700' : 'bg-gray-200/80 text-gray-700'
                      }`}>
                        {bSold}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Branch Subheader for clarity */}
          <div className="mb-4 pb-2 border-b border-purple-50 flex items-center justify-between text-xs">
            <span className="font-bold text-gray-800 flex items-center gap-1.5">
              <Building2 size={13} className="text-[#bd00ff]" />
              {activeBranch} Branch — Best Sellers
            </span>
            <span className="text-gray-500 font-medium">
              {totalUnits} {totalUnits === 1 ? 'unit' : 'units'} sold
            </span>
          </div>
        </div>

        {/* Pie Chart & Legends */}
        <div className="flex flex-col items-center">
          {top5Products.length === 0 || totalUnits === 0 ? (
            <div className="h-[220px] w-full flex flex-col items-center justify-center text-gray-400 gap-2 bg-purple-50/20 rounded-xl border border-dashed border-purple-100 p-4">
              <Package size={28} className="text-purple-300" />
              <p className="text-sm font-semibold text-gray-500">No completed sales recorded</p>
              <p className="text-xs text-gray-400 text-center">Completed sales for {activeBranch} will appear here.</p>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-4">
              {/* Conic-gradient Pie Chart Container */}
              <div 
                className="flex justify-center my-1 cursor-pointer transition-transform hover:scale-105"
                onClick={() => setIsModalOpen(true)}
                title="Click to view full branch best seller breakdown"
              >
                <div
                  className="w-36 h-36 rounded-full shadow-lg relative flex items-center justify-center border-4 border-white transition-all"
                  style={{ background: gradientStr }}
                >
                  <div className="w-20 h-20 bg-white/95 rounded-full flex flex-col items-center justify-center shadow-inner text-center p-1">
                    <span className="text-xs font-black text-gray-900 leading-none">{totalUnits}</span>
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-tighter mt-0.5">Units</span>
                  </div>
                </div>
              </div>

              {/* Legends list for Top 5 */}
              <div className="flex flex-col gap-2 max-h-[190px] overflow-y-auto pr-1">
                {top5Products.map((product, idx) => {
                  const color = BEST_SELLER_COLORS[idx % BEST_SELLER_COLORS.length];
                  const prodName = product.productModel || (product as any).name || 'Product';

                  return (
                    <div 
                      key={`${product.productId}-${idx}`}
                      onClick={() => setIsModalOpen(true)}
                      className="flex items-center justify-between text-xs hover:bg-purple-50/60 p-1.5 rounded-lg transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span 
                          className="w-3 h-3 rounded-full shrink-0 shadow-xs" 
                          style={{ backgroundColor: color }} 
                        />
                        <div className="truncate">
                          <span className="font-bold text-gray-800 group-hover:text-purple-700 transition-colors block truncate" title={prodName}>
                            {prodName}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-right">
                        <span className="text-gray-500 font-medium whitespace-nowrap">
                          {product.unitsSold} sold
                        </span>
                        <span className="font-extrabold text-gray-900 w-9 text-right">
                          {product.percentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer info / quick link */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1 text-[11px]">
            <Sparkles size={12} className="text-[#bd00ff]" />
            {products.length > 5 ? `Top 5 of ${products.length} models` : 'Ranked by total units'}
          </span>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-[#bd00ff] font-bold text-xs hover:underline cursor-pointer"
          >
            Full Breakdown →
          </button>
        </div>
      </div>

      {/* Best Seller Details Modal */}
      {isModalOpen && (
        <BestSellerDetailsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          branchName={activeBranch}
          summaryData={activeBranchData}
          products={productsWithPercentage}
          timeframeLabel={timeframeLabel}
          isSuperAdmin={isSuperAdmin}
          onSelectBranch={(branch) => setActiveBranch(branch)}
          allBranches={ALL_BRANCHES}
        />
      )}
    </>
  );
}

interface BestSellerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchName: string;
  summaryData?: BranchBestSellersSummary;
  products: BestSellerProduct[];
  timeframeLabel: string;
  isSuperAdmin: boolean;
  onSelectBranch: (branch: string) => void;
  allBranches: string[];
}

function BestSellerDetailsModal({
  isOpen,
  onClose,
  branchName,
  summaryData,
  products,
  timeframeLabel,
  isSuperAdmin,
  onSelectBranch,
  allBranches
}: BestSellerDetailsModalProps) {
  if (!isOpen) return null;

  const totalUnits = summaryData?.totalUnitsSold ?? products.reduce((sum, p) => sum + p.unitsSold, 0);
  const totalRevenue = summaryData?.totalRevenue ?? products.reduce((sum, p) => sum + (p.totalRevenue || 0), 0);
  const totalOrders = summaryData?.totalOrders ?? 0;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-[#FAF7FF] rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl border border-purple-200 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-white px-6 py-5 border-b border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
              <Award size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  {branchName} Branch
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
                  Best Sellers
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
                Detailed performance overview • {timeframeLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Super Admin Branch Switcher in Modal */}
            {isSuperAdmin && (
              <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
                {allBranches.map((b) => (
                  <button
                    key={b}
                    onClick={() => onSelectBranch(b)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      branchName.toLowerCase() === b.toLowerCase()
                        ? 'bg-white text-[#bd00ff] shadow-xs'
                        : 'text-gray-600 hover:text-purple-700'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
            <button 
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer"
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-6">
          {/* Branch Summary Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-purple-100/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-purple-600 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Branch</span>
                <Building2 size={18} />
              </div>
              <div>
                <p className="text-lg font-black text-gray-900 truncate">{branchName}</p>
                <p className="text-[11px] text-gray-400 font-medium">Verified Location</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-purple-100/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-600 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Units Sold</span>
                <Package size={18} />
              </div>
              <div>
                <p className="text-xl font-black text-gray-900">{totalUnits.toLocaleString()} pcs</p>
                <p className="text-[11px] text-emerald-600 font-bold">Completed sales</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-purple-100/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-[#bd00ff] mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Revenue</span>
                <span className="text-lg font-black">₱</span>
              </div>
              <div>
                <p className="text-xl font-black text-gray-900 truncate" title={formatCurrency(totalRevenue)}>
                  {formatCurrency(totalRevenue)}
                </p>
                <p className="text-[11px] text-purple-600 font-bold">Gross Best Sellers</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-purple-100/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-blue-600 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Completed Orders</span>
                <ShoppingCart size={18} />
              </div>
              <div>
                <p className="text-xl font-black text-gray-900">{totalOrders.toLocaleString()}</p>
                <p className="text-[11px] text-blue-600 font-bold">Transactions</p>
              </div>
            </div>
          </div>

          {/* Ranked Best Selling Products Table */}
          <div className="bg-white rounded-2xl border border-purple-100 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award size={18} className="text-[#bd00ff]" />
                <h3 className="font-black text-gray-900 text-base">Ranked Best-Selling Products</h3>
              </div>
              <span className="text-xs text-gray-500 font-semibold">
                {products.length} {products.length === 1 ? 'Product Model' : 'Product Models'}
              </span>
            </div>

            {products.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Package size={36} className="mx-auto mb-2 text-purple-300" />
                <p className="font-bold text-gray-600">No Sales Data Found</p>
                <p className="text-xs text-gray-400 mt-1">There are no completed orders recorded for {branchName} in this timeframe.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-purple-50/40 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                      <th className="py-3.5 px-4 text-center w-14">Rank</th>
                      <th className="py-3.5 px-4 min-w-[200px]">Product Info</th>
                      <th className="py-3.5 px-4 min-w-[150px]">Variant / Storage</th>
                      <th className="py-3.5 px-4 min-w-[110px]">Condition</th>
                      <th className="py-3.5 px-4 text-right min-w-[100px]">Units Sold</th>
                      <th className="py-3.5 px-4 text-right min-w-[130px]">Total Revenue</th>
                      <th className="py-3.5 px-4 text-right min-w-[80px]">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {products.map((p, idx) => {
                      const rank = idx + 1;
                      const rankBadge = rank === 1 
                        ? 'bg-amber-100 text-amber-800 border-amber-300' 
                        : rank === 2 
                        ? 'bg-slate-200 text-slate-800 border-slate-300' 
                        : rank === 3 
                        ? 'bg-amber-700/10 text-amber-900 border-amber-600/30' 
                        : 'bg-gray-100 text-gray-700 border-gray-200';

                      const prodName = p.productModel || (p as any).name || 'Unknown Device';
                      const prodVariant = p.variant && p.variant !== 'Standard' ? p.variant : null;
                      const isPreOwned = p.condition === 'Pre-Owned' || (p as any).isPreOwned;
                      const revenue = p.totalRevenue || 0;

                      return (
                        <tr key={`${p.productId}-${rank}`} className="hover:bg-purple-50/30 transition-colors">
                          {/* Rank */}
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-black border ${rankBadge}`}>
                              #{rank}
                            </span>
                          </td>

                          {/* Product Info (Image + Model) */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center overflow-hidden shrink-0">
                                {p.image ? (
                                  <img 
                                    src={p.image} 
                                    alt={prodName} 
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <Smartphone size={18} className="text-purple-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 truncate hover:text-purple-700 transition-colors" title={prodName}>
                                  {prodName}
                                </p>
                                <span className="text-[11px] text-gray-400 font-medium block">
                                  Graphix Device Catalog
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Variant / Storage */}
                          <td className="py-3.5 px-4">
                            {prodVariant ? (
                              <span 
                                className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200 max-w-[200px] truncate"
                                title={prodVariant}
                              >
                                {prodVariant}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Standard</span>
                            )}
                          </td>

                          {/* Condition */}
                          <td className="py-3.5 px-4">
                            {isPreOwned ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                Pre-Owned
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Brand New
                              </span>
                            )}
                          </td>

                          {/* Units Sold */}
                          <td className="py-3.5 px-4 text-right font-black text-gray-900 whitespace-nowrap">
                            <span>{p.unitsSold.toLocaleString()}</span>
                            <span className="text-xs text-gray-400 font-medium ml-1">pcs</span>
                          </td>

                          {/* Revenue */}
                          <td className="py-3.5 px-4 text-right font-black text-[#bd00ff] whitespace-nowrap">
                            {formatCurrency(revenue)}
                          </td>

                          {/* Percentage Share */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <span className="text-xs font-extrabold text-gray-800 bg-purple-50 px-2 py-1 rounded-md border border-purple-100">
                              {p.percentage || (totalUnits > 0 ? Math.round((p.unitsSold / totalUnits) * 100) : 0)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-white px-6 py-4 border-t border-purple-100 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
            <Info size={14} className="text-[#bd00ff]" />
            <span>Sales data calculated from verified completed transactions only.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-[#bd00ff] hover:from-purple-700 hover:to-purple-800 text-white font-bold text-sm shadow-md shadow-purple-500/20 transition-all cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
