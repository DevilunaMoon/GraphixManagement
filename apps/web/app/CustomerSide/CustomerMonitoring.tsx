"use client";

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search, Wrench, Plus, Lock, ArrowRight, PhoneCall, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CustomerRepairRequestModal from '../../components/CustomerSide/CustomerRepairRequestModal';

interface MonitoringDevice {
  id: string;
  deviceName: string;
  ownerName?: string;
  progress: string;
  image: string | null;
  status: string;
}

interface CustomerMonitoringProps {
  initialUser?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}

export default function CustomerMonitoring({ initialUser }: CustomerMonitoringProps = {}) {
  const router = useRouter();
  const navigate = router.push;
  const [filter, setFilter] = useState('Newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [devices, setDevices] = useState<MonitoringDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isPhoneRequiredModalOpen, setIsPhoneRequiredModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    id?: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null>(initialUser || null);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (!data.error) {
          setUserProfile(data);
        }
      }
    } catch (err) {
      console.error('Error fetching profile in monitoring:', err);
    }
  };

  useEffect(() => {
    fetchProfile();
    const handleFocus = () => fetchProfile();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const hasPhoneNumber = Boolean(
    userProfile?.phone &&
    userProfile.phone.trim() !== '' &&
    !userProfile.phone.includes('₱') &&
    !userProfile.phone.toLowerCase().includes('cash')
  );

  const handleRequestRepairClick = () => {
    if (hasPhoneNumber) {
      setIsRequestModalOpen(true);
    } else {
      setIsPhoneRequiredModalOpen(true);
    }
  };

  const ITEMS_PER_PAGE = 8;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, debouncedSearchQuery]);

  const fetchDevices = () => {
    setIsLoading(true);
    fetch(`/api/monitoring?page=${currentPage}&limit=${ITEMS_PER_PAGE}&search=${encodeURIComponent(debouncedSearchQuery)}&sort=${encodeURIComponent(filter)}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch paginated devices");
        return res.json();
      })
      .then(data => {
        if (data && Array.isArray(data.requests)) {
          setDevices(data.requests);
          setTotalCount(data.totalCount || 0);
          setTotalPages(data.totalPages || 1);
        } else {
          setDevices([]);
          setTotalCount(0);
          setTotalPages(1);
        }
      })
      .catch(err => {
        console.error(err);
        setDevices([]);
        setTotalCount(0);
        setTotalPages(1);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchDevices();
  }, [currentPage, debouncedSearchQuery, filter]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const paginatedDevices = devices;

  const getSemanticStatus = (device: MonitoringDevice) => {
    const prog = (device.progress || '').toLowerCase();
    if (prog === 'rejected' || prog === 'cancelled' || device.status?.toLowerCase() === 'cancelled') return 'Cancelled';
    if (device.status === 'Completed' || device.progress === '100%' || prog === 'completed') return 'Completed';
    if (prog === 'accepted') return 'Accepted';
    if (device.progress === '0%' || device.progress === '25%' || prog === 'diagnostic' || prog === 'diagnosis') return 'Diagnostic';
    if (device.progress === '50%' || device.progress === '75%' || prog === 'repairing') return 'Repairing';
    if (prog === 'pending') return 'Pending';
    return 'Pending';
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Accepted':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Diagnostic':
      case 'Diagnosis':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Repairing':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Cancelled':
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Pending':
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <main className="flex-1 p-3.5 sm:p-6 md:p-10 font-['Inter'] flex flex-col items-center overflow-y-auto w-full">
      <div className="w-full max-w-7xl flex flex-col gap-5 sm:gap-6">

        {/* Header & Filter */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4 border-b border-purple-100/80 pb-4 w-full">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button 
              onClick={() => router.back()}
              className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-purple-100 bg-white hover:border-[#8b00cc] hover:text-[#8b00cc] text-gray-600 cursor-pointer transition-all shrink-0 shadow-sm p-0"
              title="Go Back"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-black text-gray-900 uppercase tracking-wide border-none m-0">
                Device Monitoring Progress
              </h2>
              <p className="text-[11px] sm:text-xs md:text-sm text-gray-500 font-medium m-0 mt-0.5">
                Track your repair progress or submit a new repair request
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Request Repair Button */}
            {hasPhoneNumber ? (
              <button
                onClick={handleRequestRepairClick}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] hover:brightness-110 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer border-none w-full sm:w-auto text-xs sm:text-sm shrink-0"
              >
                <Plus size={18} />
                <span>Request Repair</span>
              </button>
            ) : (
              <button
                onClick={handleRequestRepairClick}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#690099] to-[#8b00cc] hover:brightness-110 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer border border-purple-300/30 w-full sm:w-auto text-xs sm:text-sm shrink-0 group"
                title="Locked: Phone number required"
              >
                <Lock size={16} className="text-purple-200 group-hover:scale-110 transition-transform" />
                <span>Request Repair</span>
                <span className="text-[10px] font-extrabold uppercase tracking-wide bg-black/30 text-purple-100 px-2 py-0.5 rounded-full border border-white/20">
                  Locked
                </span>
              </button>
            )}

            {/* Search Bar */}
            <div className="flex items-center border border-purple-100 focus-within:border-[#bd00ff] focus-within:ring-2 focus-within:ring-[#bd00ff]/20 rounded-xl px-3.5 py-2 bg-white w-full sm:w-[220px] md:w-[260px] shadow-sm transition-all">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Search by Device Name..." 
                className="border-none outline-none pl-2.5 text-xs sm:text-sm w-full text-gray-800 placeholder-gray-400 bg-transparent font-medium"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative w-full sm:w-auto" ref={filterRef}>
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-purple-100 rounded-xl text-gray-800 font-semibold cursor-pointer hover:border-purple-300 transition-all w-full sm:w-auto text-xs sm:text-sm shadow-sm"
              >
                <span>{filter}</span>
                {isFilterOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
              </button>
              
              {isFilterOpen && (
                <div className="absolute top-[110%] right-0 bg-white border border-purple-100 rounded-xl shadow-xl w-full min-w-[130px] flex flex-col overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100 p-1">
                  <button 
                    onClick={() => { setFilter('Newest'); setIsFilterOpen(false); }}
                    className={`px-3.5 py-2 text-left rounded-lg border-none cursor-pointer transition-colors text-xs sm:text-sm ${filter === 'Newest' ? 'bg-purple-50 text-[#8b00cc] font-bold' : 'bg-transparent text-gray-700 hover:bg-gray-50'}`}
                  >
                    Newest
                  </button>
                  <button 
                    onClick={() => { setFilter('Oldest'); setIsFilterOpen(false); }}
                    className={`px-3.5 py-2 text-left rounded-lg border-none cursor-pointer transition-colors text-xs sm:text-sm ${filter === 'Oldest' ? 'bg-purple-50 text-[#8b00cc] font-bold' : 'bg-transparent text-gray-700 hover:bg-gray-50'}`}
                  >
                    Oldest
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 md:gap-6">
          {isLoading ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-purple-100 border-t-[#8b00cc] rounded-full animate-spin"></div>
              <p className="text-gray-500 font-semibold animate-pulse text-base">Loading devices...</p>
            </div>
          ) : paginatedDevices.length > 0 ? (
            paginatedDevices.map(device => {
              const semanticStatus = getSemanticStatus(device);
              const badgeStyle = getStatusBadgeStyle(semanticStatus);

              return (
                <div 
                  key={device.id} 
                  onClick={() => navigate('/customer/device-info/' + device.id)}
                  className="bg-white rounded-2xl p-3 sm:p-5 shadow-sm hover:shadow-xl border border-purple-100/90 hover:border-purple-300 md:hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group text-center relative"
                >
                  <div>
                    {/* Device Image Box */}
                    <div className="h-28 sm:h-40 w-full flex justify-center items-center overflow-hidden rounded-xl bg-gray-50/70 p-2 sm:p-3 mb-2.5 sm:mb-3 border border-gray-100/60">
                      {device.image ? (
                        <img 
                          src={device.image} 
                          alt={device.deviceName} 
                          className="h-full w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" 
                        />
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-1.5">
                          <Wrench size={24} className="text-gray-300" />
                          <span className="text-xs font-medium">No Image</span>
                        </div>
                      )}
                    </div>

                    {/* Device Name */}
                    <div className="flex flex-col gap-0.5 sm:gap-1 mb-2.5 sm:mb-3">
                      <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider">Device Model</span>
                      <h3 className="font-bold text-xs sm:text-sm text-gray-900 truncate m-0 border-none group-hover:text-[#8b00cc] transition-colors">
                        {device.deviceName}
                      </h3>
                    </div>
                  </div>

                  {/* Status Badge & CTA */}
                  <div className="pt-2.5 sm:pt-3 border-t border-gray-100 flex flex-col gap-2">
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1 text-xs">
                      <span className="text-[10px] sm:text-[11px] text-gray-400 font-semibold shrink-0">Progress:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border max-w-full truncate inline-flex items-center justify-center leading-tight tracking-tight ${badgeStyle}`}>
                        {semanticStatus}
                      </span>
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/customer/device-info/' + device.id);
                      }}
                      className="w-full mt-0.5 sm:mt-1 py-1.5 sm:py-2 bg-purple-50 text-[#8b00cc] group-hover:bg-gradient-to-r group-hover:from-[#8b00cc] group-hover:to-[#bd00ff] group-hover:text-white font-bold rounded-xl transition-all text-[11px] sm:text-xs border border-purple-100/90 shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-16 text-center flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-dashed border-purple-200 p-8 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center text-[#8b00cc] mb-1">
                <Wrench size={30} />
              </div>
              <h3 className="text-gray-900 font-bold text-lg m-0 border-none">No active monitoring devices</h3>
              <p className="text-gray-500 text-xs sm:text-sm max-w-md m-0">
                Have a device that needs repair? Click the button below to submit a new repair request.
              </p>
              <button
                onClick={handleRequestRepairClick}
                className="mt-3 px-6 py-2.5 bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:brightness-110 transition-all cursor-pointer border-none flex items-center justify-center gap-2"
              >
                {hasPhoneNumber ? (
                  <>
                    <Plus size={16} />
                    <span>Request Repair Now</span>
                  </>
                ) : (
                  <>
                    <Lock size={16} className="text-purple-200" />
                    <span>Request Repair Now (Locked)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="flex justify-center w-full mt-6">
            <div className="flex items-center justify-center gap-6 bg-white px-8 py-3 rounded-full shadow-sm border border-purple-100 mx-auto">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="bg-transparent border-none text-gray-600 cursor-pointer hover:text-[#8b00cc] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-600 flex justify-center items-center p-0 transition-colors"
              >
                <ChevronLeft size={22} />
              </button>
              <span className="font-bold text-base sm:text-lg text-gray-800">
                {currentPage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="bg-transparent border-none text-gray-600 cursor-pointer hover:text-[#8b00cc] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-600 flex justify-center items-center p-0 transition-colors"
              >
                <ChevronRight size={22} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Customer Repair Request Modal */}
      <CustomerRepairRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={() => {
          fetchDevices();
        }}
        initialCustomerPhone={userProfile?.phone || ''}
      />

      {/* Phone Required Modal */}
      {isPhoneRequiredModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-purple-100 flex flex-col gap-6 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-purple-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 shadow-xs">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-950 m-0">Phone Number Required</h3>
                  <p className="text-gray-500 m-0 text-xs font-medium">Profile update required to unlock repairs</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPhoneRequiredModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center border-none cursor-pointer transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-start gap-3">
                <PhoneCall size={20} className="text-[#8b00cc] shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-gray-700 font-medium m-0 leading-relaxed">
                  To submit a device repair request, you need to add your <strong className="text-purple-950 font-bold">contact phone number</strong> in your profile. Our technicians use this number to contact you regarding diagnostic updates, estimates, and repair completion.
                </p>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl px-4 py-2.5 text-xs text-amber-900 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span>Feature is currently locked until your phone number is saved.</span>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2.5 w-full pt-1">
              <button 
                type="button"
                onClick={() => setIsPhoneRequiredModalOpen(false)}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer border-none transition-colors text-xs sm:text-sm"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={() => router.push('/customer/profile?action=phone&from=monitoring')}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] hover:brightness-110 text-white font-bold rounded-xl border-none cursor-pointer hover:shadow-md transition-all text-xs sm:text-sm flex items-center justify-center gap-2"
              >
                <span>Go to Profile</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
