"use client";

import { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, ChevronLeft, ChevronRight, Ban, X, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

import { useBranch } from '../../context/BranchContext';

const splitName = (fullName: string) => {
  const nameToSplit = (fullName || '').trim();
  if (!nameToSplit) return { first: 'Anonymous', last: '-' };
  const parts = nameToSplit.split(/\s+/);
  if (parts.length <= 1) return { first: nameToSplit, last: '-' };
  const last = parts.pop() || '';
  const first = parts.join(' ');
  return { first, last };
};

export default function AdminAccounts() {
  const { selectedBranch, branches, isSuperAdmin } = useBranch();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filter, setFilter] = useState('All Accounts');
  const [searchQuery, setSearchQuery] = useState('');
  const { styles } = useTheme();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filter, selectedBranch]);

  const [suspendModal, setSuspendModal] = useState<{isOpen: boolean, id: string, name: string, error?: string, status?: string, suspendedUntil?: string}>({ isOpen: false, id: '', name: '' });
  const [isSuspending, setIsSuspending] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);

  const [createModal, setCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError('');
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    const payload = {
      name: fullName,
      email: data.email,
      password: data.password,
      role: data.role,
      branch: data.branch || (selectedBranch !== 'all' ? selectedBranch : 'Tagoloan')
    };

    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newUser = await res.json();
        const { first, last } = splitName(newUser.name);
        const mappedUser = {
          id: newUser.id,
          firstName: first,
          lastName: last,
          email: newUser.email,
          phone: newUser.phone || 'N/A',
          dob: newUser.dateOfBirth || 'N/A',
          role: newUser.role,
          branch: newUser.branch,
          password: '••••••••',
          status: newUser.status || 'Active',
          suspendedUntil: newUser.suspendedUntil
        };
        setAccounts(prev => [mappedUser, ...prev]);
        setCreateModal(false);
      } else {
        const err = await res.json();
        setCreateError(err.error || 'Failed to create account');
      }
    } catch (error) {
      setCreateError('An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  const openSuspendModal = (id: string, name: string, status?: string, suspendedUntil?: string) => {
    setSuspendModal({ isOpen: true, id, name, status, suspendedUntil, error: undefined });
  };

  const handleSuspend = async (duration: string) => {
    const { id } = suspendModal;
    if (!id) return;
    
    setIsSuspending(true);
    setSuspendModal(prev => ({ ...prev, error: undefined }));
    try {
      const res = await fetch(`/api/admin/accounts/${id}/suspend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration })
      });
      
      if (res.ok) {
        const updatedUser = await res.json();
        setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, status: updatedUser.status, suspendedUntil: updatedUser.suspendedUntil } : acc));
        setSuspendModal({ isOpen: false, id: '', name: '' });
      } else {
        const errorData = await res.json().catch(() => ({}));
        setSuspendModal(prev => ({ ...prev, error: errorData.error || 'Failed to update suspension' }));
      }
    } catch (error) {
      console.error('Error suspending account:', error);
      setSuspendModal(prev => ({ ...prev, error: 'An error occurred while updating the account' }));
    } finally {
      setIsSuspending(false);
    }
  };

  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchAccounts = () => {
    setIsLoading(true);
    let roleParam = 'all';
    if (filter === 'Admins') roleParam = 'ADMIN';
    else if (filter === 'Cashiers') roleParam = 'CASHIER';
    else if (filter === 'Customers') roleParam = 'CUSTOMER';

    fetch(`/api/admin/accounts?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(searchQuery)}&branch=${selectedBranch}&role=${roleParam}`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.users)) {
          setAccounts(data.users.map((user: any) => {
            const { first, last } = splitName(user.name);
            return {
              id: user.id,
              firstName: first,
              lastName: last,
              email: user.email,
              phone: user.phone || 'N/A',
              dob: user.dateOfBirth || 'N/A',
              role: user.role,
              branch: user.branch,
              password: '••••••••',
              status: user.status || 'Active',
              suspendedUntil: user.suspendedUntil
            };
          }));
          setTotalCount(data.total || 0);
          setTotalPages(data.totalPages || 1);
        }
      })
      .catch(err => console.error("Failed to fetch accounts:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchAccounts();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchQuery, filter, selectedBranch]);

  const paginatedAccounts = accounts;

  const prevPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const nextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

  return (
    <div className="flex flex-col gap-6">
      {/* Accounts Header Row */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-2">
        <h2 className="text-[1.6rem] font-bold text-[#111] whitespace-nowrap">User Management</h2>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
          {/* Search Box */}
          <div className={`flex items-center bg-white border-2 ${styles.borderMain} rounded-full px-4 py-2 w-full sm:w-[250px] transition-colors duration-300`}>
            <Search className={`${styles.textActive} w-5 h-5 mr-2`} />
            <input 
              type="text" 
              placeholder="Search" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-none outline-none w-full text-[0.95rem] text-[#111] bg-transparent placeholder-[#999]"
            />
          </div>

          {/* Filter Dropdown */}
          <div className="relative font-['Inter']">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center bg-white border-2 ${styles.borderMain} rounded-full px-4 py-2 cursor-pointer ${styles.textActive} text-[1.1rem] font-semibold hover:bg-black/5 transition-all w-full sm:w-[200px] justify-between`}
            >
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                <span>{filter}</span>
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {isFilterOpen && (
              <div className="absolute top-[115%] right-0 w-[200px] bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-black/10 overflow-hidden flex flex-col z-50 animate-in fade-in slide-in-from-top-2">
                <button 
                  onClick={() => { setFilter('All Accounts'); setIsFilterOpen(false); }}
                  className={`px-5 py-3 text-left font-medium hover:bg-black/5 transition-colors ${filter === 'All Accounts' ? `${styles.textActive} font-bold` : 'text-[#111]'}`}
                >
                  All Accounts
                </button>
                <button 
                  onClick={() => { setFilter('Downpayment'); setIsFilterOpen(false); }}
                  className={`px-5 py-3 text-left font-medium hover:bg-black/5 transition-colors ${filter === 'Downpayment' ? `${styles.textActive} font-bold` : 'text-[#111]'}`}
                >
                  Downpayment
                </button>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setCreateModal(true)}
            className={`flex items-center justify-center bg-[#8b00cc] text-white rounded-full px-6 py-2 cursor-pointer text-[1.1rem] font-semibold hover:bg-[#bd00ff] transition-all w-full sm:w-auto shadow-sm whitespace-nowrap`}
          >
            Create Account
          </button>
        </div>
      </div>

      {/* Accounts Table Card */}
      <div className={`bg-white/95 backdrop-blur-md border-2 ${styles.borderMain} rounded-xl overflow-hidden shadow-sm flex flex-col transition-colors duration-300`}>
        <div className="w-full">
          <table className="w-full border-collapse text-center">
            <thead>
              <tr>
                <th className={`py-4 px-5 font-bold text-[1.1rem] text-[#111] border-b-2 ${styles.borderMain}`}>Email</th>
                <th className={`py-4 px-5 font-bold text-[1.1rem] text-[#111] border-b-2 ${styles.borderMain} hidden md:table-cell`}>Role</th>
                <th className={`py-4 px-5 font-bold text-[1.1rem] text-[#111] border-b-2 ${styles.borderMain} hidden md:table-cell`}>Branch</th>
                <th className={`py-4 px-5 font-bold text-[1.1rem] text-[#111] border-b-2 ${styles.borderMain} hidden md:table-cell`}>Contact #</th>
                <th className={`py-4 px-5 font-bold text-[1.1rem] text-[#111] border-b-2 ${styles.borderMain} hidden md:table-cell`}>Full Name</th>
                <th className={`py-4 px-5 font-bold text-[1.1rem] text-[#111] border-b-2 ${styles.borderMain} hidden md:table-cell`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 border-4 border-purple-100 border-t-[#bd00ff] rounded-full animate-spin"></div>
                      <span className="text-[#666] font-semibold animate-pulse">Loading accounts...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedAccounts.length > 0 ? (
                paginatedAccounts.map((acc, index) => (
                  <tr 
                    key={index} 
                    className={`last:border-b-2 last:${styles.borderMain} cursor-pointer hover:bg-black/5 transition-colors`}
                    onClick={() => setSelectedAccount(acc)}
                  >
                    <td className={`py-4 px-5 text-[0.95rem] font-medium text-[#111] border-b ${styles.borderMain} max-w-[150px] sm:max-w-none truncate`}>
                      <div className="flex items-center justify-center gap-2">
                        {acc.email}
                        {acc.status === 'Suspended' && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block">Suspended</span>}
                      </div>
                    </td>
                    <td className={`py-4 px-5 text-[0.85rem] border-b ${styles.borderMain} hidden md:table-cell`}>
                      <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                        acc.role === 'SUPER_ADMIN' 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : acc.role === 'ADMIN' 
                            ? 'bg-purple-100 text-purple-800' 
                            : acc.role === 'CASHIER' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-700'
                      }`}>
                        {acc.role || 'Customer'}
                      </span>
                    </td>
                    <td className={`py-4 px-5 text-[0.85rem] text-[#666] border-b ${styles.borderMain} hidden md:table-cell font-semibold`}>
                      📍 {acc.branch || 'Tagoloan'}
                    </td>
                    <td className={`py-4 px-5 text-[0.95rem] text-[#666] border-b ${styles.borderMain} hidden md:table-cell`}>{acc.phone}</td>
                    <td className={`py-4 px-5 text-[0.95rem] font-bold border-b ${styles.borderMain} hidden md:table-cell truncate ${acc.status === 'Suspended' ? 'text-red-500' : 'text-[#111]'}`}>
                      {acc.firstName} {acc.lastName !== '-' ? acc.lastName : ''}
                    </td>
                    <td className={`py-4 px-5 border-b ${styles.borderMain} hidden md:table-cell`}>
                      <button
                        onClick={(e) => { e.stopPropagation(); openSuspendModal(acc.id, `${acc.firstName} ${acc.lastName}`, acc.status, acc.suspendedUntil); }}
                        className="text-orange-500 hover:text-orange-700 transition-colors p-2 rounded-full hover:bg-orange-50 cursor-pointer flex items-center justify-center mx-auto"
                        title="Suspend Account"
                      >
                        <Ban size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#666] font-semibold">
                    No accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-center items-center p-4 gap-4 bg-white/95 border-t border-black/5">
          <button 
            onClick={prevPage}
            disabled={currentPage === 1}
            className={`text-[#111] transition-transform bg-transparent border-none ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-125 cursor-pointer'}`}
          >
            <ChevronLeft size={24} />
          </button>
          <span className="text-[1.2rem] font-semibold text-[#111]">{currentPage}/{totalPages}</span>
          <button 
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className={`text-[#111] transition-transform bg-transparent border-none ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:scale-125 cursor-pointer'}`}
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* Suspend Confirmation Modal */}
      {suspendModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSuspendModal({ isOpen: false, id: '', name: '' })}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-black/5 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-[#111] text-lg">Manage Account Access</h3>
              <button className="text-gray-400 hover:text-black transition-colors" onClick={() => setSuspendModal({ isOpen: false, id: '', name: '' })}>
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-1">
                <Ban size={24} />
              </div>
              <p className="text-[#444] text-sm font-medium">
                Set suspension duration or restore access for <br />
                <span className="font-bold text-[#111] text-base">{suspendModal.name}</span>
              </p>

              {suspendModal.error && (
                <div className="bg-red-50 text-red-600 p-2.5 rounded-xl text-xs font-semibold border border-red-100">
                  {suspendModal.error}
                </div>
              )}

              {suspendModal.status !== 'Suspended' ? (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button 
                    disabled={isSuspending}
                    onClick={() => handleSuspend('1_week')}
                    className="py-2.5 px-3 bg-gray-100 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 border border-transparent rounded-xl text-xs font-bold text-[#444] transition-all disabled:opacity-50"
                  >
                    1 Week
                  </button>
                  <button 
                    disabled={isSuspending}
                    onClick={() => handleSuspend('1_month')}
                    className="py-2.5 px-3 bg-gray-100 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 border border-transparent rounded-xl text-xs font-bold text-[#444] transition-all disabled:opacity-50"
                  >
                    1 Month
                  </button>
                  <button 
                    disabled={isSuspending}
                    onClick={() => handleSuspend('1_year')}
                    className="py-2.5 px-3 bg-gray-100 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 border border-transparent rounded-xl text-xs font-bold text-[#444] transition-all disabled:opacity-50"
                  >
                    1 Year
                  </button>
                  <button 
                    disabled={isSuspending}
                    onClick={() => handleSuspend('permanent')}
                    className="py-2.5 px-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-bold text-red-600 transition-all disabled:opacity-50"
                  >
                    Permanent
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 mt-2">
                  <span className="text-xs text-red-500 font-semibold">
                    Account is currently suspended
                  </span>
                  <button 
                    disabled={isSuspending}
                    onClick={() => handleSuspend('lift')}
                    className="py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-200 disabled:opacity-50"
                  >
                    Lift Suspension
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-black/5 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-[#111] text-xl">Create Account</h3>
              <button className="text-gray-400 hover:text-black transition-colors" onClick={() => setCreateModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateAccount} className="p-6 flex flex-col gap-4">
              {createError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold border border-red-100 text-center animate-in fade-in">
                  {createError}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-bold text-gray-700">First Name</label>
                  <input required name="firstName" type="text" placeholder="First Name" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8b00cc] focus:bg-white transition-all text-[#111] font-medium" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-bold text-gray-700">Last Name</label>
                  <input required name="lastName" type="text" placeholder="Last Name" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8b00cc] focus:bg-white transition-all text-[#111] font-medium" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-700">Email</label>
                <input required name="email" type="email" placeholder="Email Address" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8b00cc] focus:bg-white transition-all text-[#111] font-medium" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-700">Password</label>
                <div className="relative">
                  <input required name="password" type={showPassword ? "text" : "password"} placeholder="Password" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8b00cc] focus:bg-white transition-all text-[#111] font-medium pr-12" />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1 flex items-center justify-center transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-bold text-gray-700">Role</label>
                  <select name="role" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8b00cc] focus:bg-white transition-all text-[#111] font-medium appearance-none">
                    <option value="CASHIER">Cashier</option>
                    <option value="ADMIN">Admin</option>
                    {isSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
                    <option value="CUSTOMER">Customer</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-bold text-gray-700">Branch</label>
                  <select 
                    name="branch" 
                    defaultValue={selectedBranch !== 'all' ? selectedBranch : 'Tagoloan'}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8b00cc] focus:bg-white transition-all text-[#111] font-medium appearance-none"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.name}>{b.name} Branch</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  disabled={isCreating}
                  className="flex-1 px-4 py-3 text-[#111] bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 px-4 py-3 bg-[#8b00cc] hover:bg-[#bd00ff] text-white rounded-xl font-bold transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Info Modal for Mobile */}
      {selectedAccount && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedAccount(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-black/5 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-[#111] text-lg">Account Details</h3>
              <div className="flex items-center gap-3">
                <button 
                  className="text-orange-500 hover:text-orange-700 hover:bg-orange-50 p-1.5 rounded-full transition-colors flex items-center justify-center"
                  title="Suspend Account"
                  onClick={() => {
                     openSuspendModal(selectedAccount.id, `${selectedAccount.firstName} ${selectedAccount.lastName}`, selectedAccount.status, selectedAccount.suspendedUntil);
                     setSelectedAccount(null);
                  }}
                >
                  <Ban size={20} />
                </button>
                <button className="text-gray-400 hover:text-black transition-colors" onClick={() => setSelectedAccount(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 flex flex-col gap-4 text-left">
              <div className="flex flex-col border-b border-gray-100 pb-3">
                <span className="text-[#666] text-sm font-medium mb-1">First Name</span>
                <span className="font-bold text-[#111]">{selectedAccount.firstName}</span>
              </div>
              <div className="flex flex-col border-b border-gray-100 pb-3">
                <span className="text-[#666] text-sm font-medium mb-1">Last Name</span>
                <span className="font-bold text-[#111]">{selectedAccount.lastName}</span>
              </div>
              <div className="flex flex-col border-b border-gray-100 pb-3">
                <span className="text-[#666] text-sm font-medium mb-1">Email</span>
                <span className="font-bold text-[#111] break-all">{selectedAccount.email}</span>
              </div>
              <div className="flex flex-col border-b border-gray-100 pb-3">
                <span className="text-[#666] text-sm font-medium mb-1">Contact #</span>
                <span className="font-bold text-[#111]">{selectedAccount.phone}</span>
              </div>
              <div className="flex flex-col border-b border-gray-100 pb-3">
                <span className="text-[#666] text-sm font-medium mb-1">Birthdate</span>
                <span className="font-bold text-[#111]">{selectedAccount.dob}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#666] text-sm font-medium mb-1">Password</span>
                <span className="font-bold text-[#111]">{selectedAccount.password}</span>
              </div>
            </div>
            <div className="p-4 bg-gray-50/80 border-t border-black/5">
              <button 
                className="w-full py-2.5 rounded-xl bg-[#bd00ff] text-white font-semibold hover:bg-purple-700 transition-colors"
                onClick={() => setSelectedAccount(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
