"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Building2, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ThumbsUp, 
  ThumbsDown, 
  Wrench, 
  Clock, 
  Sparkles, 
  Quote, 
  RefreshCw,
  Hash,
  ArrowLeft,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';
import { useBranch } from '../../context/BranchContext';
import DatePicker from '../../components/ui/DatePicker';

interface RepairFeedbackItem {
  id: string;
  customerName: string;
  customerEmail: string;
  customerImage: string | null;
  technicianName: string;
  feedbackText: string;
  sentiment: 'Positive' | 'Negative' | string;
  branch: string;
  rawBranch: string;
  deviceName: string;
  deviceImage: string | null;
  repairCost: string | null;
  repairStatus: string;
  trackingNumber: string;
  createdAt: string;
}

export default function AdminRepairFeedback() {
  const router = useRouter();
  const { isSuperAdmin, userBranch, branches } = useBranch();

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');
  const [selectedSentiment, setSelectedSentiment] = useState<'all' | 'Positive' | 'Negative'>('all');
  const [filterDate, setFilterDate] = useState('');

  // Data state
  const [feedbacks, setFeedbacks] = useState<RepairFeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [positiveCount, setPositiveCount] = useState(0);
  const [negativeCount, setNegativeCount] = useState(0);

  const ITEMS_PER_PAGE = 8;

  const fetchFeedbacks = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(ITEMS_PER_PAGE),
        search: searchTerm,
        date: filterDate,
        sentiment: selectedSentiment,
      });

      if (isSuperAdmin) {
        if (selectedBranchFilter && selectedBranchFilter !== 'all') {
          params.append('branch', selectedBranchFilter);
        }
      } else {
        params.append('branch', userBranch || 'Tagoloan');
      }

      const res = await fetch(`/api/repair-feedback?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(Array.isArray(data.feedbacks) ? data.feedbacks : []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
        setPositiveCount(data.positiveCount || 0);
        setNegativeCount(data.negativeCount || 0);
      } else {
        console.error('Failed to fetch repair feedback:', res.statusText);
      }
    } catch (err) {
      console.error('Error loading repair feedback:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm, filterDate, selectedSentiment, isSuperAdmin, selectedBranchFilter, userBranch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFeedbacks();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchFeedbacks]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterDate('');
    setSelectedSentiment('all');
    if (isSuperAdmin) setSelectedBranchFilter('all');
    setCurrentPage(1);
  };

  const getBranchBadgeStyle = (branchName: string) => {
    const b = (branchName || '').toLowerCase();
    if (b.includes('tago')) {
      return 'bg-purple-100 text-[#BF00FF] border-purple-200';
    }
    if (b.includes('villa')) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    if (b.includes('jasaan')) {
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="flex flex-col gap-6 relative w-full max-w-7xl mx-auto pb-10">
      
      {/* Top Breadcrumb / Back Link */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push('/admin/settings')}
          className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-[#BF00FF] transition-colors cursor-pointer bg-transparent border-none p-0"
        >
          <ArrowLeft size={16} />
          <span>Back to Settings</span>
        </button>
      </div>

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-[1.8rem] font-black text-[#111] tracking-tight">Repair Feedback</h2>
            <span className="bg-[#BF00FF]/10 text-[#BF00FF] border border-[#BF00FF]/30 font-bold px-3 py-0.5 rounded-full text-xs">
              {totalCount} {totalCount === 1 ? 'Repair Feedback' : 'Repair Feedbacks'}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {isSuperAdmin 
              ? 'View customer feedback, ratings, and comments about completed repairs across all Graphix branches.'
              : `Viewing customer feedback and service ratings for completed repairs at ${userBranch || 'your assigned'} branch.`}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => fetchFeedbacks()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-[#BF00FF] text-gray-700 hover:text-[#BF00FF] font-semibold text-sm rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin text-[#BF00FF]' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border-2 border-[#BF00FF]/40 shadow-sm p-4 md:p-5 flex flex-col gap-4">
        
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search customer, device model, technician, reference (GRPX-TAG-A1)..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 focus:border-[#BF00FF] focus:bg-white rounded-xl text-sm font-medium outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Branch filter (Super Admin only) */}
            {isSuperAdmin ? (
              <div className="relative min-w-[170px]">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BF00FF] w-4 h-4 pointer-events-none" />
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => {
                    setSelectedBranchFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 hover:border-[#BF00FF] focus:border-[#BF00FF] focus:bg-white rounded-xl text-sm font-semibold text-gray-800 outline-none cursor-pointer transition-all appearance-none"
                >
                  <option value="all">🏢 All Branches</option>
                  <option value="Tagoloan">📍 Tagoloan Branch</option>
                  <option value="Villanueva">📍 Villanueva Branch</option>
                  <option value="Jasaan">📍 Jasaan Branch</option>
                  {branches && branches.length > 0 && branches
                    .filter(b => !['tagoloan', 'villanueva', 'jasaan'].includes(b.name.toLowerCase().replace(/\s*branch$/i, '')))
                    .map(b => (
                      <option key={b.id} value={b.name}>📍 {b.name}</option>
                    ))
                  }
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-[#BF00FF]">
                <Building2 size={14} />
                <span>{userBranch || 'Tagoloan'} Branch</span>
              </div>
            )}

            {/* Date filter */}
            <div className="relative min-w-[170px]">
              <DatePicker
                value={filterDate}
                onChange={(newDate) => {
                  setFilterDate(newDate);
                  setCurrentPage(1);
                }}
                placeholder="Filter by Date"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 hover:border-[#BF00FF] rounded-xl text-sm font-semibold text-gray-800 transition-all flex items-center justify-between"
              />
            </div>

            {/* Clear button if active filters */}
            {(searchTerm || filterDate || selectedSentiment !== 'all' || (isSuperAdmin && selectedBranchFilter !== 'all')) && (
              <button
                onClick={handleClearFilters}
                className="px-3 py-2.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <X size={14} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Sentiment Filter Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mr-1">
            <SlidersHorizontal size={12} /> Rating:
          </span>
          <button
            onClick={() => { setSelectedSentiment('all'); setCurrentPage(1); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              selectedSentiment === 'all'
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-transparent'
            }`}
          >
            All Feedback ({totalCount})
          </button>
          <button
            onClick={() => { setSelectedSentiment('Positive'); setCurrentPage(1); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              selectedSentiment === 'Positive'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
            }`}
          >
            <ThumbsUp size={12} /> Positive ({positiveCount})
          </button>
          <button
            onClick={() => { setSelectedSentiment('Negative'); setCurrentPage(1); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              selectedSentiment === 'Negative'
                ? 'bg-red-600 text-white border-red-600 shadow-xs'
                : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
            }`}
          >
            <ThumbsDown size={12} /> Negative ({negativeCount})
          </button>
        </div>

      </div>

      {/* Main Feedback List / Cards */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border-2 border-[#BF00FF] shadow-sm p-5 md:p-8 w-full flex flex-col gap-6">
        
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-purple-100 border-t-[#BF00FF] rounded-full animate-spin"></div>
            <p className="text-gray-500 font-bold animate-pulse text-base">Loading customer repair feedback...</p>
          </div>
        ) : feedbacks.length > 0 ? (
          <div className="grid grid-cols-1 gap-5">
            {feedbacks.map((fb) => {
              const isPositive = (fb.sentiment || '').toLowerCase() === 'positive';
              return (
                <div 
                  key={fb.id} 
                  className="group relative bg-gradient-to-r from-purple-50/40 via-white to-gray-50/60 hover:from-purple-50/70 hover:to-purple-50/30 rounded-2xl border border-purple-100 hover:border-[#BF00FF]/60 shadow-sm hover:shadow-md p-5 md:p-6 transition-all duration-200 flex flex-col lg:flex-row gap-5 lg:gap-6 justify-between items-start"
                >
                  {/* Left: Customer Profile & Branch */}
                  <div className="flex items-start gap-4 min-w-[260px] max-w-[320px]">
                    <div className="relative shrink-0">
                      {fb.customerImage ? (
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#BF00FF] shadow-inner relative bg-purple-50">
                          <Image 
                            src={fb.customerImage} 
                            alt={fb.customerName}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-2xl border-2 border-[#BF00FF] bg-gradient-to-br from-purple-100 to-fuchsia-100 flex items-center justify-center text-[#BF00FF] font-black text-2xl uppercase shadow-inner">
                          {fb.customerName.charAt(0)}
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 bg-emerald-500 border-2 border-white rounded-full w-4 h-4 flex items-center justify-center" title="Verified Customer Repair">
                        <Sparkles size={8} className="text-white" />
                      </span>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-gray-900 text-base md:text-lg truncate group-hover:text-[#BF00FF] transition-colors">
                        {fb.customerName}
                      </span>
                      {fb.customerEmail && (
                        <span className="text-xs text-gray-500 truncate mb-1">
                          {fb.customerEmail}
                        </span>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getBranchBadgeStyle(fb.branch)}`}>
                          <Building2 size={11} /> {fb.branch}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Device Details, Technician, & Feedback Comment */}
                  <div className="flex-1 flex flex-col gap-3 w-full">
                    {/* Device & Tracking Number Pill */}
                    <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200/80 rounded-xl p-3 shadow-xs">
                      <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-[#BF00FF] shrink-0">
                        <Wrench size={20} />
                      </div>
                      <div className="flex flex-col flex-1 min-w-[200px]">
                        <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Repaired Device</span>
                        <span className="text-sm font-bold text-gray-900 line-clamp-1">{fb.deviceName}</span>
                      </div>

                      {/* Tracking / Reference Number Badge */}
                      {fb.trackingNumber && (
                        <div className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 border border-purple-200/80 rounded-lg text-xs font-mono font-bold text-[#BF00FF]" title="Repair Reference Number">
                          <Hash size={12} />
                          <span>{fb.trackingNumber}</span>
                        </div>
                      )}

                      {/* Technician Badge */}
                      {fb.technicianName && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700">
                          <span className="text-gray-400">Tech:</span>
                          <span className="font-bold text-gray-900">{fb.technicianName}</span>
                        </div>
                      )}
                    </div>

                    {/* Feedback quotation */}
                    <div className="relative bg-white/80 rounded-xl p-4 border border-purple-100/80 text-gray-700 text-sm md:text-[0.95rem] leading-relaxed shadow-xs">
                      <Quote className="absolute -top-2.5 -left-2 text-[#BF00FF]/30 w-6 h-6 fill-current" />
                      <p className="whitespace-pre-wrap relative z-10 font-normal m-0">
                        {fb.feedbackText || <span className="italic text-gray-400">No written comment provided.</span>}
                      </p>
                    </div>
                  </div>

                  {/* Right: Sentiment Badge & Repair Date */}
                  <div className="flex lg:flex-col justify-between items-end lg:items-end w-full lg:w-auto shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100 gap-3">
                    
                    {/* Sentiment / Rating Badge */}
                    <span 
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
                        isPositive 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                          : 'bg-red-100 text-red-800 border-red-300'
                      }`}
                    >
                      {isPositive ? <ThumbsUp size={13} className="text-emerald-700" /> : <ThumbsDown size={13} className="text-red-700" />}
                      <span>{isPositive ? 'Positive' : 'Negative'}</span>
                    </span>

                    {/* Date */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mt-1">
                      <Clock size={13} className="text-gray-400" />
                      <span>{new Date(fb.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="py-20 flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-purple-50 border-2 border-[#BF00FF]/30 flex items-center justify-center text-[#BF00FF] mb-4 shadow-sm">
              <Wrench size={28} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">No Repair Feedback Found</h3>
            <p className="text-gray-500 text-sm max-w-md mb-5">
              {searchTerm || filterDate || selectedSentiment !== 'all' || (isSuperAdmin && selectedBranchFilter !== 'all')
                ? 'No repair feedback matched your search criteria. Try modifying or clearing your filters.'
                : 'Customer feedback and service ratings submitted for completed repairs will appear here.'}
            </p>
            {(searchTerm || filterDate || selectedSentiment !== 'all' || (isSuperAdmin && selectedBranchFilter !== 'all')) && (
              <button
                onClick={handleClearFilters}
                className="px-5 py-2.5 bg-gradient-to-r from-[#BF00FF] to-[#6B21A8] text-white rounded-xl text-sm font-bold shadow-md hover:opacity-95 transition-opacity cursor-pointer border-none"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-purple-100">
            <span className="text-xs font-semibold text-gray-500">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} reviews
            </span>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-gray-200 hover:border-[#BF00FF] text-gray-700 hover:text-[#BF00FF] disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-700 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-bold text-gray-800 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-gray-200 hover:border-[#BF00FF] text-gray-700 hover:text-[#BF00FF] disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-700 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
