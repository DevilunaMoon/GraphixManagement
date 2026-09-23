"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, User, Mail, Phone, Calendar, MapPin, ShieldCheck, 
  ShoppingBag, Wrench, MessageSquare, Search, Receipt, 
  Smartphone, ChevronRight, CheckCircle2, Clock, AlertCircle, 
  Sparkles, Building2, UserCircle2, ArrowUpRight, Hash, Award
} from 'lucide-react';
import StandardDigitalReceipt from './StandardDigitalReceipt';

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  onViewReceipt?: (tx: any) => void;
}

const formatVariations = (variationsStr: string | null): string => {
  if (!variationsStr) return '';
  try {
    const parsed = JSON.parse(variationsStr);
    if (Array.isArray(parsed)) {
      return parsed.map((v: any) => v.name).join(', ');
    }
    if (parsed && typeof parsed === 'object') {
      return Object.values(parsed).map((v: any) => v.name).join(', ');
    }
  } catch (e) {}
  return variationsStr;
};

export default function CustomerDetailsModal({
  isOpen,
  onClose,
  customerId,
  customerEmail,
  customerName,
  onViewReceipt
}: CustomerDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'purchases' | 'devices' | 'repairs' | 'reviews'>('profile');
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search terms for tabs
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [repairSearch, setRepairSearch] = useState('');
  const [deviceSearch, setDeviceSearch] = useState('');

  // Receipt Modal inside Customer Details
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<any | null>(null);

  const identifier = customerId || customerEmail || customerName;

  useEffect(() => {
    if (!isOpen || !identifier) {
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    const fetchCustomer = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/customers/${encodeURIComponent(identifier)}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to load customer details');
        }
        const json = await res.json();
        if (isMounted) {
          setData(json);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load customer information');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCustomer();
    return () => {
      isMounted = false;
    };
  }, [isOpen, identifier]);

  // Lock scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    if (!data?.purchases) return [];
    if (!purchaseSearch.trim()) return data.purchases;
    const q = purchaseSearch.toLowerCase();
    return data.purchases.filter((p: any) => 
      (p.referenceId || '').toLowerCase().includes(q) ||
      (p.device?.name || '').toLowerCase().includes(q) ||
      (p.imei || '').toLowerCase().includes(q) ||
      (p.branch || '').toLowerCase().includes(q) ||
      (p.paymentType || '').toLowerCase().includes(q)
    );
  }, [data?.purchases, purchaseSearch]);

  // Filtered Devices
  const filteredDevices = useMemo(() => {
    if (!data?.purchasedDevices) return [];
    if (!deviceSearch.trim()) return data.purchasedDevices;
    const q = deviceSearch.toLowerCase();
    return data.purchasedDevices.filter((d: any) => 
      (d.referenceId || '').toLowerCase().includes(q) ||
      (d.deviceName || '').toLowerCase().includes(q) ||
      (d.imei || '').toLowerCase().includes(q) ||
      (d.branch || '').toLowerCase().includes(q)
    );
  }, [data?.purchasedDevices, deviceSearch]);

  // Filtered Repairs
  const filteredRepairs = useMemo(() => {
    if (!data?.repairRequests) return [];
    if (!repairSearch.trim()) return data.repairRequests;
    const q = repairSearch.toLowerCase();
    return data.repairRequests.filter((r: any) => 
      (r.id || '').toLowerCase().includes(q) ||
      (r.deviceName || '').toLowerCase().includes(q) ||
      (r.cause || '').toLowerCase().includes(q) ||
      (r.progress || '').toLowerCase().includes(q) ||
      (r.branch || '').toLowerCase().includes(q)
    );
  }, [data?.repairRequests, repairSearch]);

  if (!isOpen) return null;

  const customer = data?.customer;
  const stats = data?.stats;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs font-['Inter'] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#8B00FF] via-[#A825FF] to-[#6A0DAD] text-white p-5 sm:p-6 flex items-center justify-between shrink-0 shadow-sm relative overflow-hidden">
          {/* Subtle decorative circles */}
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center gap-3.5 z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <UserCircle2 size={28} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight m-0 text-white">
                  Customer Details
                </h2>
                {customer?.status && (
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    customer.status === 'Active' 
                      ? 'bg-emerald-400 text-emerald-950 font-black' 
                      : 'bg-rose-400 text-rose-950 font-black'
                  }`}>
                    {customer.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-purple-100 m-0 font-medium opacity-90">
                Complete profile, purchase history, IMEI status, and repair records
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border-none z-10"
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            <p className="text-gray-500 font-semibold text-sm">Loading customer information...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
            <AlertCircle size={48} className="text-rose-500 mb-2" />
            <h3 className="text-lg font-bold text-gray-800">Unable to Load Customer</h3>
            <p className="text-sm text-gray-500 max-w-md mb-4">{error}</p>
            <button 
              onClick={onClose}
              className="px-5 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl border-none cursor-pointer hover:bg-purple-700"
            >
              Close
            </button>
          </div>
        ) : customer ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Customer Banner & Quick Info */}
            <div className="bg-purple-50/50 border-b border-purple-100/60 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 shadow-sm shrink-0">
                  <div className="w-full h-full bg-white rounded-[14px] overflow-hidden flex items-center justify-center">
                    {customer.image ? (
                      <img 
                        src={customer.image} 
                        alt={customer.name || 'Customer'} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <UserCircle2 size={44} className="text-purple-300" />
                    )}
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                      {customer.name || 'Anonymous Customer'}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md">
                      {customer.role || 'CUSTOMER'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 font-semibold flex items-center gap-1.5 mt-0.5">
                    <Mail size={12} className="text-purple-500" /> {customer.email}
                  </span>
                  {customer.phone && (
                    <span className="text-xs text-gray-500 font-semibold flex items-center gap-1.5 mt-0.5">
                      <Phone size={12} className="text-purple-500" /> {customer.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Operating Branch & Reg Date */}
              <div className="flex flex-col sm:items-end gap-1 text-xs font-semibold text-gray-600 self-stretch sm:self-center bg-white sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-purple-100">
                <div className="flex items-center gap-1.5 text-purple-900 font-bold">
                  <Building2 size={14} className="text-purple-600" />
                  <span>Branch: {customer.branch || 'Tagoloan'}</span>
                </div>
                <span className="text-gray-400 text-[11px]">
                  Registered: {new Date(customer.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Quick KPI Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 sm:px-6 bg-gray-50/80 border-b border-gray-100 shrink-0">
              <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-2xs flex flex-col">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Purchases</span>
                <span className="text-lg font-black text-purple-700 mt-0.5">{stats?.totalPurchases || 0}</span>
                <span className="text-[10px] text-gray-500 font-semibold mt-0.5">₱{(stats?.totalSpent || 0).toLocaleString()} spent</span>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-2xs flex flex-col">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Pending Pickup</span>
                <span className={`text-lg font-black mt-0.5 ${(stats?.pendingPickupCount || 0) > 0 ? 'text-amber-600' : 'text-gray-700'}`}>
                  {stats?.pendingPickupCount || 0}
                </span>
                <span className="text-[10px] text-gray-500 font-semibold mt-0.5">Phones awaiting IMEI</span>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-2xs flex flex-col">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Assigned IMEIs</span>
                <span className="text-lg font-black text-indigo-600 mt-0.5">{stats?.assignedImeiCount || 0}</span>
                <span className="text-[10px] text-gray-500 font-semibold mt-0.5">Units picked up</span>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-2xs flex flex-col">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Repairs</span>
                <span className="text-lg font-black text-emerald-600 mt-0.5">{stats?.totalRepairs || 0}</span>
                <span className="text-[10px] text-gray-500 font-semibold mt-0.5">{stats?.completedRepairs || 0} completed</span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 px-4 sm:px-6 border-b border-gray-200 bg-white overflow-x-auto shrink-0 scrollbar-none">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer bg-transparent ${
                  activeTab === 'profile'
                    ? 'border-[#bd00ff] text-[#bd00ff]'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <User size={16} /> Profile & Account
              </button>

              <button
                onClick={() => setActiveTab('purchases')}
                className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer bg-transparent ${
                  activeTab === 'purchases'
                    ? 'border-[#bd00ff] text-[#bd00ff]'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <ShoppingBag size={16} /> Purchase History ({data?.purchases?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab('devices')}
                className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer bg-transparent ${
                  activeTab === 'devices'
                    ? 'border-[#bd00ff] text-[#bd00ff]'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Smartphone size={16} /> Purchased Devices & IMEI ({data?.purchasedDevices?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab('repairs')}
                className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer bg-transparent ${
                  activeTab === 'repairs'
                    ? 'border-[#bd00ff] text-[#bd00ff]'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Wrench size={16} /> Repair History ({data?.repairRequests?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer bg-transparent ${
                  activeTab === 'reviews'
                    ? 'border-[#bd00ff] text-[#bd00ff]'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <MessageSquare size={16} /> Reviews ({data?.reviews?.length || 0})
              </button>
            </div>

            {/* Tab Contents Area (Scrollable) */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-gray-50/40">
              
              {/* TAB 1: PROFILE & ACCOUNT */}
              {activeTab === 'profile' && (
                <div className="flex flex-col gap-6 animate-in fade-in duration-150">
                  {/* Basic Profile Grid */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <User size={16} className="text-purple-600" /> Basic Information
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                      <div className="flex flex-col gap-1 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                        <span className="text-gray-400 font-semibold">Full Name</span>
                        <span className="font-bold text-gray-900 text-sm">{customer.name || 'Anonymous'}</span>
                      </div>

                      <div className="flex flex-col gap-1 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                        <span className="text-gray-400 font-semibold">Email Address</span>
                        <span className="font-bold text-gray-900 text-sm break-all">{customer.email}</span>
                      </div>

                      <div className="flex flex-col gap-1 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                        <span className="text-gray-400 font-semibold">Phone Number</span>
                        <span className="font-bold text-gray-900 text-sm">{customer.phone || 'Not provided'}</span>
                      </div>

                      <div className="flex flex-col gap-1 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                        <span className="text-gray-400 font-semibold">Date of Birth</span>
                        <span className="font-bold text-gray-900 text-sm">
                          {customer.dateOfBirth 
                            ? new Date(customer.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                            : 'Not set'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                        <span className="text-gray-400 font-semibold">Age (Dynamic)</span>
                        <span className="font-bold text-purple-700 text-sm">
                          {customer.age !== null ? `${customer.age} years old` : 'Not available'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                        <span className="text-gray-400 font-semibold">Gender</span>
                        <span className="font-bold text-gray-900 text-sm">{customer.gender || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Account Information */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-purple-600" /> Account Details
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                      <div className="flex flex-col gap-1 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                        <span className="text-gray-400 font-semibold">Customer ID</span>
                        <span className="font-mono font-bold text-gray-800">{customer.id}</span>
                      </div>

                      <div className="flex flex-col gap-1 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                        <span className="text-gray-400 font-semibold">Account Status</span>
                        <span className={`font-bold text-xs px-2 py-0.5 rounded-md w-fit ${
                          customer.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {customer.status || 'Active'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                        <span className="text-gray-400 font-semibold">Registered Date</span>
                        <span className="font-bold text-gray-800">
                          {new Date(customer.createdAt).toLocaleString(undefined, { 
                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                          })}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                        <span className="text-gray-400 font-semibold">Default Branch</span>
                        <span className="font-bold text-purple-800">{customer.branch || 'Tagoloan'}</span>
                      </div>

                      <div className="flex flex-col gap-1 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                        <span className="text-gray-400 font-semibold">Authentication Method</span>
                        <span className="font-bold text-gray-800">{customer.authProvider || 'LOCAL'}</span>
                      </div>

                      <div className="flex flex-col gap-1 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                        <span className="text-gray-400 font-semibold">Role</span>
                        <span className="font-bold text-gray-800">{customer.role}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PURCHASE HISTORY */}
              {activeTab === 'purchases' && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                  {/* Search Toolbar */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="text"
                        placeholder="Search purchases by ID, device, IMEI, branch..."
                        value={purchaseSearch}
                        onChange={e => setPurchaseSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-purple-500 shadow-2xs"
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-500">
                      Showing {filteredPurchases.length} of {data?.purchases?.length || 0} purchases
                    </span>
                  </div>

                  {filteredPurchases.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-500 flex flex-col items-center">
                      <ShoppingBag size={40} className="text-gray-300 mb-2" />
                      <p className="font-bold text-gray-700 m-0">No Purchases Found</p>
                      <p className="text-xs text-gray-400 m-0 mt-1">This customer has no purchase records matching your criteria.</p>
                    </div>
                  ) : (
                    <div className="w-full bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-gradient-to-r from-[#BF00FF] to-[#4B0082] text-white">
                            <th className="px-4 py-3 font-semibold">Transaction ID</th>
                            <th className="px-4 py-3 font-semibold">Device / Product</th>
                            <th className="px-4 py-3 font-semibold">Branch</th>
                            <th className="px-4 py-3 font-semibold">Payment</th>
                            <th className="px-4 py-3 font-semibold">Amount</th>
                            <th className="px-4 py-3 font-semibold">Date</th>
                            <th className="px-4 py-3 font-semibold text-center">Receipt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPurchases.map((tx: any) => (
                            <tr key={tx.id} className="border-b border-gray-100 last:border-b-0 hover:bg-purple-50/40 transition-colors">
                              <td className="px-4 py-3 font-semibold">
                                <span className="text-xs font-bold text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                  {tx.referenceId}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  {tx.device?.image ? (
                                    <img src={tx.device.image} alt={tx.device.name} className="w-8 h-8 rounded-lg object-cover bg-gray-50 border border-gray-100 shrink-0" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
                                  )}
                                  <div className="flex flex-col max-w-[220px]">
                                    <span className="font-bold text-gray-900 truncate">{tx.device?.name}</span>
                                    <span className="text-[11px] text-gray-500 truncate">
                                      Qty: {tx.quantity} {tx.variations && `• ${formatVariations(tx.variations)}`}
                                    </span>
                                    {tx.imei ? (
                                      <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded w-fit mt-0.5">
                                        IMEI: {tx.imei}
                                      </span>
                                    ) : tx.isPendingPickup ? (
                                      <span className="font-mono text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded w-fit mt-0.5">
                                        IMEI: Pending Pickup
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[11px] border border-purple-200">
                                  {tx.branch || 'Tagoloan'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-semibold text-gray-700">{tx.paymentType || 'Full'}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-black text-[#bd00ff]">
                                  ₱{(tx.amount || tx.device?.price || 0).toLocaleString()}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600 font-semibold">
                                {new Date(tx.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => {
                                    if (onViewReceipt) {
                                      onViewReceipt(tx);
                                    } else {
                                      setSelectedReceiptTx(tx);
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer border-none shadow-2xs"
                                  title="View Digital Receipt"
                                >
                                  <Receipt size={12} /> Receipt
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PURCHASED DEVICES & IMEI */}
              {activeTab === 'devices' && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="text"
                        placeholder="Search devices by model, IMEI, transaction..."
                        value={deviceSearch}
                        onChange={e => setDeviceSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-purple-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  {filteredDevices.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-500 flex flex-col items-center">
                      <Smartphone size={40} className="text-gray-300 mb-2" />
                      <p className="font-bold text-gray-700 m-0">No Purchased Devices Found</p>
                      <p className="text-xs text-gray-400 m-0 mt-1">This customer does not have any recorded device purchases.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredDevices.map((d: any, idx: number) => (
                        <div key={d.purchaseId || idx} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex flex-col justify-between gap-3">
                          <div className="flex items-start gap-3">
                            {d.deviceImage ? (
                              <img src={d.deviceImage} alt={d.deviceName} className="w-12 h-12 rounded-xl object-cover bg-gray-50 border border-gray-100 shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                                <Smartphone size={24} />
                              </div>
                            )}

                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="font-bold text-gray-900 text-sm truncate">{d.deviceName}</span>
                              <span className="text-xs text-gray-500 font-semibold truncate">
                                Unit: {d.variations ? formatVariations(d.variations) : 'Standard'}
                              </span>
                              <span className="text-[11px] text-gray-400 mt-0.5">
                                Transaction: {d.referenceId} • {d.branch}
                              </span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-gray-500">IMEI Status:</span>
                            {d.imei ? (
                              <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                                IMEI: {d.imei}
                              </span>
                            ) : d.isPendingPickup ? (
                              <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                IMEI: Pending Pickup
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-gray-500">
                                Standard Unit
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: REPAIR HISTORY */}
              {activeTab === 'repairs' && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="text"
                        placeholder="Search repairs by ID, device, problem..."
                        value={repairSearch}
                        onChange={e => setRepairSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-purple-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  {filteredRepairs.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-500 flex flex-col items-center">
                      <Wrench size={40} className="text-gray-300 mb-2" />
                      <p className="font-bold text-gray-700 m-0">No Repair Records Found</p>
                      <p className="text-xs text-gray-400 m-0 mt-1">This customer has not submitted any gadget repair requests.</p>
                    </div>
                  ) : (
                    <div className="w-full bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-gradient-to-r from-[#BF00FF] to-[#4B0082] text-white">
                            <th className="px-4 py-3 font-semibold">Repair ID</th>
                            <th className="px-4 py-3 font-semibold">Device</th>
                            <th className="px-4 py-3 font-semibold">Problem / Issue</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3 font-semibold">Technician</th>
                            <th className="px-4 py-3 font-semibold">Branch</th>
                            <th className="px-4 py-3 font-semibold">Cost</th>
                            <th className="px-4 py-3 font-semibold">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRepairs.map((r: any) => (
                            <tr key={r.id} className="border-b border-gray-100 last:border-b-0 hover:bg-purple-50/40 transition-colors">
                              <td className="px-4 py-3 font-mono font-bold text-gray-800">
                                #{r.id.slice(-8).toUpperCase()}
                              </td>
                              <td className="px-4 py-3 font-bold text-gray-900">
                                {r.deviceName}
                              </td>
                              <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                                {r.cause || 'General Maintenance / Repair'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  (r.progress || '').toLowerCase() === 'completed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : (r.progress || '').toLowerCase() === 'diagnosing'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {r.progress || r.status || 'In Progress'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-700 font-medium">
                                {r.technician || 'Pending Assignment'}
                              </td>
                              <td className="px-4 py-3 font-bold text-purple-700">
                                {r.branch || 'Tagoloan'}
                              </td>
                              <td className="px-4 py-3 font-bold text-gray-900">
                                {r.repairCost ? `₱${r.repairCost}` : 'TBD'}
                              </td>
                              <td className="px-4 py-3 text-gray-500">
                                {new Date(r.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: REVIEWS & FEEDBACK */}
              {activeTab === 'reviews' && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                  {(!data?.reviews || data.reviews.length === 0) ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-500 flex flex-col items-center">
                      <MessageSquare size={40} className="text-gray-300 mb-2" />
                      <p className="font-bold text-gray-700 m-0">No Reviews Submitted</p>
                      <p className="text-xs text-gray-400 m-0 mt-1">This customer has not posted any product reviews or feedback yet.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {data.reviews.map((rev: any) => (
                        <div key={rev.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900 text-sm">
                              {rev.device?.name || 'Product Review'}
                            </span>
                            <span className="text-[11px] text-gray-400 font-semibold">
                              {new Date(rev.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100 m-0">
                            "{rev.text}"
                          </p>

                          {rev.adminReply && (
                            <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-100 flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-900">
                                <ShieldCheck size={14} className="text-purple-600" />
                                <span>Graphix Response ({rev.adminReplyRole || 'Staff'})</span>
                              </div>
                              <p className="text-xs text-purple-800 m-0">{rev.adminReply}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:px-6 bg-white border-t border-gray-100 flex items-center justify-between shrink-0">
              <span className="text-xs text-gray-400 font-semibold">
                Customer Profile • Graphix Management System
              </span>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs transition-colors border-none cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        ) : null}
      </div>

      {/* Internal Digital Receipt Modal */}
      {selectedReceiptTx && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
          onClick={() => setSelectedReceiptTx(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-5 sm:p-7 flex flex-col gap-4 my-8"
            onClick={e => e.stopPropagation()}
          >
            <StandardDigitalReceipt 
              data={selectedReceiptTx as any}
              onBack={() => setSelectedReceiptTx(null)}
              showToolbar={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
