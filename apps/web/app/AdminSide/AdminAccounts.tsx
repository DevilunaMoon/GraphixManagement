"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Filter, ChevronDown, ChevronLeft, ChevronRight, X, 
  Eye, EyeOff, MoreVertical, ShieldCheck, UserCheck, Users, 
  Building2, Key, Edit3, ArrowRightLeft, Power, Ban, Plus,
  CheckCircle2, AlertCircle, Sparkles, Crown, User, Phone
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useBranch } from '../../context/BranchContext';
import CustomerDetailsModal from '../../components/Common/CustomerDetailsModal';
import { formatStaffId } from '../../lib/staffId';

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
  const { selectedBranch, setSelectedBranch, branches, isSuperAdmin, userBranch, userRole } = useBranch();
  const { styles } = useTheme();

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Accounts');
  const [branchFilter, setBranchFilter] = useState('All Branches');
  const [statusFilter, setStatusFilter] = useState('All');

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Accounts Data & Stats
  const [accounts, setAccounts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalCashiers: 0,
    totalCustomers: 0,
    activeAccounts: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 8;

  // Active Row Menu Dropdown State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modals State
  const [viewModalAccount, setViewModalAccount] = useState<any | null>(null);
  const [customerDetailsTarget, setCustomerDetailsTarget] = useState<{ id?: string; email?: string; name?: string } | null>(null);
  const [editModalAccount, setEditModalAccount] = useState<any | null>(null);
  const [changeBranchAccount, setChangeBranchAccount] = useState<any | null>(null);
  const [resetPasswordAccount, setResetPasswordAccount] = useState<any | null>(null);
  const [suspendModal, setSuspendModal] = useState<{isOpen: boolean, id: string, name: string, error?: string, status?: string, suspendedUntil?: string}>({ isOpen: false, id: '', name: '' });
  const [createModal, setCreateModal] = useState(false);

  // Form Submissions State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Synchronize branchFilter with global selectedBranch
  useEffect(() => {
    if (selectedBranch === 'all') {
      setBranchFilter('All Branches');
    } else if (selectedBranch) {
      setBranchFilter(selectedBranch);
    }
  }, [selectedBranch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, branchFilter, statusFilter]);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuId(null);
      setIsRoleDropdownOpen(false);
      setIsBranchDropdownOpen(false);
      setIsStatusDropdownOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Fetch Accounts & Stats
  const fetchAccounts = () => {
    setIsLoading(true);

    let roleParam = 'all';
    if (roleFilter === 'Super Admin') roleParam = 'SUPER_ADMIN';
    else if (roleFilter === 'Admin') roleParam = 'ADMIN';
    else if (roleFilter === 'Cashier') roleParam = 'CASHIER';
    else if (roleFilter === 'Customer') roleParam = 'CUSTOMER';

    let branchParam = 'all';
    if (isSuperAdmin) {
      if (branchFilter !== 'All Branches') branchParam = branchFilter;
    } else {
      branchParam = userBranch || 'Tagoloan';
    }

    let statusParam = 'all';
    if (statusFilter === 'Active') statusParam = 'ACTIVE';
    else if (statusFilter === 'Inactive') statusParam = 'INACTIVE';

    const queryUrl = `/api/admin/accounts?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(searchQuery)}&branch=${encodeURIComponent(branchParam)}&role=${encodeURIComponent(roleParam)}&status=${encodeURIComponent(statusParam)}`;

    fetch(queryUrl)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.users)) {
          setAccounts(data.users.map((user: any) => {
            const { first, last } = splitName(user.name);
            return {
              id: user.id,
              firstName: first,
              lastName: last,
              fullName: user.name || `${first} ${last}`,
              email: user.email,
              phone: user.phone || 'N/A',
              dob: user.dateOfBirth || 'N/A',
              role: user.role,
              branch: user.branch || 'Tagoloan',
              status: user.status || 'Active',
              suspendedUntil: user.suspendedUntil,
              createdAt: user.createdAt
            };
          }));
          setTotalCount(data.total || 0);
          setTotalPages(data.totalPages || 1);
          if (data.stats) {
            setStats(data.stats);
          }
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
  }, [currentPage, searchQuery, roleFilter, branchFilter, statusFilter, selectedBranch]);

  // Create Account Handler
  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    const payload = {
      name: fullName,
      email: data.email,
      phone: data.phone,
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
        fetchAccounts();
        setCreateModal(false);
      } else {
        const err = await res.json().catch(() => ({}));
        setModalError(err.error || 'Failed to create account');
      }
    } catch (error) {
      setModalError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Account Handler
  const handleEditAccountSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editModalAccount) return;
    setIsSubmitting(true);
    setModalError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const role = formData.get('role') as string;

    try {
      const res = await fetch(`/api/admin/accounts/${editModalAccount.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, ...(isSuperAdmin ? { role } : {}) })
      });

      if (res.ok) {
        fetchAccounts();
        setEditModalAccount(null);
      } else {
        const err = await res.json().catch(() => ({}));
        setModalError(err.error || 'Failed to update account');
      }
    } catch (error) {
      setModalError('Failed to update account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Change Branch Handler
  const handleChangeBranchSubmit = async (newBranch: string) => {
    if (!changeBranchAccount) return;
    setIsSubmitting(true);
    setModalError(null);

    try {
      const res = await fetch(`/api/admin/accounts/${changeBranchAccount.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: newBranch })
      });

      if (res.ok) {
        fetchAccounts();
        setChangeBranchAccount(null);
      } else {
        const err = await res.json().catch(() => ({}));
        setModalError(err.error || 'Failed to change branch');
      }
    } catch (error) {
      setModalError('Failed to change branch');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Activate / Deactivate Account
  const handleToggleStatus = async (account: any) => {
    const newStatus = account.status === 'Inactive' ? 'Active' : 'Inactive';
    try {
      const res = await fetch(`/api/admin/accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, status: newStatus } : a));
        if (viewModalAccount?.id === account.id) {
          setViewModalAccount((prev: any) => ({ ...prev, status: newStatus }));
        }
      } else {
        alert('Failed to update account status');
      }
    } catch (error) {
      alert('Error updating status');
    }
  };

  // Reset Password Handler
  const handleResetPasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!resetPasswordAccount || !newPasswordInput) return;
    if (newPasswordInput.length < 6) {
      setModalError('Password must be at least 6 characters long');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      const res = await fetch(`/api/admin/accounts/${resetPasswordAccount.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPasswordInput })
      });

      if (res.ok) {
        setResetPasswordAccount(null);
        setNewPasswordInput('');
        alert('Password has been successfully updated.');
      } else {
        const err = await res.json().catch(() => ({}));
        setModalError(err.error || 'Failed to reset password');
      }
    } catch (error) {
      setModalError('Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Suspend Handler
  const handleSuspend = async (duration: string) => {
    const { id } = suspendModal;
    if (!id) return;
    
    setIsSubmitting(true);
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
      setSuspendModal(prev => ({ ...prev, error: 'An error occurred while updating the account' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const prevPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const nextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);

  const getPageNumbers = () => {
    const total = Math.max(1, totalPages);
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, '...', total];
    }
    if (currentPage >= total - 2) {
      return [1, '...', total - 3, total - 2, total - 1, total];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', total];
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* ========================================================== */}
      {/* 1. USER MANAGEMENT SUMMARY CARDS                           */}
      {/* ========================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <AccountStatCard
          icon={<Users size={22} />}
          label="Total Users"
          value={stats.totalUsers}
          subLabel="accounts"
          badgeText="All Roles"
          gradientBorder="from-purple-500 via-fuchsia-500 to-indigo-600"
          iconBg="bg-purple-100/80"
          iconColor="text-[#5c0099]"
          badgeBg="bg-purple-50"
          badgeColor="text-[#5c0099]"
        />

        <AccountStatCard
          icon={<Crown size={22} />}
          label="Total Admins"
          value={stats.totalAdmins}
          subLabel="staff"
          badgeText="Admin"
          gradientBorder="from-indigo-500 via-purple-500 to-pink-500"
          iconBg="bg-indigo-100/80"
          iconColor="text-indigo-700"
          badgeBg="bg-indigo-50"
          badgeColor="text-indigo-700"
        />

        <AccountStatCard
          icon={<UserCheck size={22} />}
          label="Total Cashiers"
          value={stats.totalCashiers}
          subLabel="staff"
          badgeText="POS Cashier"
          gradientBorder="from-blue-500 via-sky-400 to-cyan-500"
          iconBg="bg-blue-100/80"
          iconColor="text-blue-700"
          badgeBg="bg-blue-50"
          badgeColor="text-blue-700"
        />

        <AccountStatCard
          icon={<User size={22} />}
          label="Total Customers"
          value={stats.totalCustomers}
          subLabel="buyers"
          badgeText="Customer"
          gradientBorder="from-emerald-500 via-teal-400 to-emerald-600"
          iconBg="bg-emerald-100/80"
          iconColor="text-emerald-700"
          badgeBg="bg-emerald-50"
          badgeColor="text-emerald-700"
        />

        <AccountStatCard
          icon={<CheckCircle2 size={22} />}
          label="Active Accounts"
          value={stats.activeAccounts}
          subLabel="enabled"
          badgeText="Active"
          gradientBorder="from-fuchsia-500 via-purple-500 to-violet-600"
          iconBg="bg-fuchsia-100/80"
          iconColor="text-fuchsia-700"
          badgeBg="bg-fuchsia-50"
          badgeColor="text-fuchsia-700"
        />
      </div>

      {/* ========================================================== */}
      {/* 2. ENHANCED USER FILTERS BAR                               */}
      {/* ========================================================== */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-purple-100 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 relative z-30">
        {/* Search Bar */}
        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 sm:py-2 flex-1 max-w-full lg:max-w-xs focus-within:ring-2 focus-within:ring-purple-500 focus-within:bg-white transition-all">
          <Search size={18} className="text-purple-600 mr-2 shrink-0" />
          <input 
            type="text" 
            placeholder="Search name, email, or phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-none outline-none w-full text-xs md:text-sm text-gray-900 bg-transparent placeholder-gray-400 font-medium"
          />
        </div>

        {/* Dropdown Filters & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full lg:w-auto">
          {/* Dropdown Filters: 2-column grid on mobile, inline flex on tablet/desktop */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Role Filter */}
            <div className="relative w-full sm:w-auto" onClick={e => e.stopPropagation()}>
              <button 
                type="button"
                onClick={() => {
                  setIsRoleDropdownOpen(!isRoleDropdownOpen);
                  setIsBranchDropdownOpen(false);
                  setIsStatusDropdownOpen(false);
                }}
                className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <span className="truncate">Role: <strong className="text-purple-800">{roleFilter}</strong></span>
                <ChevronDown size={14} className={`transition-transform shrink-0 ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute top-[115%] left-0 w-44 bg-white rounded-xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col z-50 animate-in fade-in zoom-in-95">
                  {['All Accounts', 'Super Admin', 'Admin', 'Cashier', 'Customer'].map((role) => (
                    <button 
                      key={role}
                      type="button"
                      onClick={() => { setRoleFilter(role); setIsRoleDropdownOpen(false); }}
                      className={`px-4 py-2.5 text-left text-xs font-bold transition-colors hover:bg-purple-50 ${roleFilter === role ? 'text-[#5c0099] bg-purple-50/70 font-black' : 'text-gray-700'}`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Branch Filter (Super Admin Enabled) */}
            {isSuperAdmin && (
              <div className="relative w-full sm:w-auto" onClick={e => e.stopPropagation()}>
                <button 
                  type="button"
                  onClick={() => {
                    setIsBranchDropdownOpen(!isBranchDropdownOpen);
                    setIsRoleDropdownOpen(false);
                    setIsStatusDropdownOpen(false);
                  }}
                  className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <span className="truncate">Branch: <strong className="text-purple-800">{branchFilter}</strong></span>
                  <ChevronDown size={14} className={`transition-transform shrink-0 ${isBranchDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isBranchDropdownOpen && (
                  <div className="absolute top-[115%] left-0 w-40 bg-white rounded-xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col z-50 animate-in fade-in zoom-in-95">
                    {['All Branches', 'Tagoloan', 'Villanueva', 'Jasaan'].map((b) => (
                      <button 
                        key={b}
                        type="button"
                        onClick={() => {
                          setBranchFilter(b);
                          setSelectedBranch(b === 'All Branches' ? 'all' : b);
                          setIsBranchDropdownOpen(false);
                        }}
                        className={`px-4 py-2.5 text-left text-xs font-bold transition-colors hover:bg-purple-50 ${branchFilter === b ? 'text-[#5c0099] bg-purple-50/70 font-black' : 'text-gray-700'}`}
                      >
                        {b === 'All Branches' ? '🏢 All Branches' : `📍 ${b}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Status Filter */}
            <div className="relative w-full sm:w-auto" onClick={e => e.stopPropagation()}>
              <button 
                type="button"
                onClick={() => {
                  setIsStatusDropdownOpen(!isStatusDropdownOpen);
                  setIsRoleDropdownOpen(false);
                  setIsBranchDropdownOpen(false);
                }}
                className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <span className="truncate">Status: <strong className="text-purple-800">{statusFilter}</strong></span>
                <ChevronDown size={14} className={`transition-transform shrink-0 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isStatusDropdownOpen && (
                <div className="absolute top-[115%] left-0 w-36 bg-white rounded-xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col z-50 animate-in fade-in zoom-in-95">
                  {['All', 'Active', 'Inactive'].map((st) => (
                    <button 
                      key={st}
                      type="button"
                      onClick={() => { setStatusFilter(st); setIsStatusDropdownOpen(false); }}
                      className={`px-4 py-2.5 text-left text-xs font-bold transition-colors hover:bg-purple-50 ${statusFilter === st ? 'text-[#5c0099] bg-purple-50/70 font-black' : 'text-gray-700'}`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Create Account Button */}
          <button 
            type="button"
            onClick={() => {
              setModalError(null);
              setCreateModal(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-[#5c0099] hover:bg-[#4a007a] text-white rounded-xl px-4 py-2.5 sm:py-2 text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <Plus size={16} />
            <span>Create Account</span>
          </button>
        </div>
      </div>

      {/* ========================================================== */}
      {/* 3. USER MANAGEMENT TABLE & MOBILE CARDS                     */}
      {/* ========================================================== */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-100 shadow-sm overflow-hidden flex flex-col relative z-10">
        {/* Mobile View: Responsive Account Cards (< md) */}
        <div className="md:hidden flex flex-col gap-3 p-3 bg-gray-50/50">
          {isLoading ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-purple-100">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-purple-200 border-t-[#5c0099] rounded-full animate-spin"></div>
                <span className="text-gray-500 font-semibold animate-pulse text-xs">
                  {isSuperAdmin ? 'Loading accounts across branches...' : 'Loading branch accounts...'}
                </span>
              </div>
            </div>
          ) : accounts.length > 0 ? (
            accounts.map((acc) => {
              const isMenuOpen = activeMenuId === `mob-${acc.id}`;

              return (
                <div 
                  key={`mob-${acc.id}`}
                  className="bg-white rounded-2xl border border-purple-100/90 p-4 shadow-xs flex flex-col gap-3 transition-all active:scale-[0.99] cursor-pointer relative"
                  onClick={() => {
                    if (acc.role === 'CUSTOMER') {
                      setCustomerDetailsTarget({ id: acc.id, email: acc.email, name: acc.fullName || acc.name });
                    } else {
                      setViewModalAccount(acc);
                    }
                  }}
                >
                  {/* Top Row: User Avatar + Name + Email + Action Menu */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-[#5c0099] font-bold text-sm shrink-0">
                        {acc.fullName ? acc.fullName.charAt(0).toUpperCase() : acc.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-gray-900 text-sm truncate">
                          {acc.fullName || 'Anonymous'}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-gray-500 truncate font-medium">{acc.email}</span>
                          {acc.status === 'Suspended' && (
                            <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-black uppercase tracking-wider">
                              Suspended
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Menu (⋮ More) */}
                    <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setActiveMenuId(isMenuOpen ? null : `mob-${acc.id}`)}
                        className="p-1.5 rounded-lg hover:bg-purple-100 text-gray-600 hover:text-purple-900 transition-colors cursor-pointer"
                        title="More Actions"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-2xl border border-purple-100 py-1.5 z-50 animate-in fade-in zoom-in-95">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              if (acc.role === 'CUSTOMER') {
                                setCustomerDetailsTarget({ id: acc.id, email: acc.email, name: acc.fullName || acc.name });
                              } else {
                                setViewModalAccount(acc);
                              }
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-bold text-gray-700 hover:bg-purple-50 hover:text-[#5c0099] flex items-center gap-2"
                          >
                            <Eye size={14} /> View Details
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditModalAccount(acc);
                              setModalError(null);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-bold text-gray-700 hover:bg-purple-50 hover:text-[#5c0099] flex items-center gap-2"
                          >
                            <Edit3 size={14} /> Edit Account
                          </button>

                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setChangeBranchAccount(acc);
                                setModalError(null);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-bold text-gray-700 hover:bg-purple-50 hover:text-[#5c0099] flex items-center gap-2"
                            >
                              <ArrowRightLeft size={14} /> Change Branch
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              handleToggleStatus(acc);
                              setActiveMenuId(null);
                            }}
                            className={`w-full px-3.5 py-2 text-left text-xs font-bold flex items-center gap-2 ${
                              acc.status === 'Inactive' 
                                ? 'text-emerald-700 hover:bg-emerald-50' 
                                : 'text-amber-700 hover:bg-amber-50'
                            }`}
                          >
                            <Power size={14} /> {acc.status === 'Inactive' ? 'Activate Account' : 'Deactivate Account'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setResetPasswordAccount(acc);
                              setNewPasswordInput('');
                              setModalError(null);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-bold text-gray-700 hover:bg-purple-50 hover:text-[#5c0099] flex items-center gap-2 border-t border-gray-100"
                          >
                            <Key size={14} /> Reset Password
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSuspendModal({
                                isOpen: true,
                                id: acc.id,
                                name: acc.fullName,
                                status: acc.status,
                                suspendedUntil: acc.suspendedUntil
                              });
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                          >
                            <Ban size={14} /> Suspend Access
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Badges Row: Role, Branch, Status, Staff ID */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-gray-100">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-1 ${
                      acc.role === 'SUPER_ADMIN' 
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black' 
                        : acc.role === 'ADMIN' 
                          ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                          : acc.role === 'CASHIER' 
                            ? 'bg-blue-100 text-blue-900 border border-blue-200' 
                            : 'bg-gray-100 text-gray-700'
                    }`}>
                      {acc.role === 'SUPER_ADMIN' && <Crown size={10} />}
                      {acc.role || 'Customer'}
                    </span>

                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 ${
                      acc.branch === 'Tagoloan'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : acc.branch === 'Villanueva'
                          ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                          : acc.branch === 'Jasaan'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-purple-50 text-purple-800 border border-purple-200'
                    }`}>
                      📍 {acc.branch || 'Tagoloan'}
                    </span>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      acc.status === 'Inactive'
                        ? 'bg-gray-100 text-gray-600'
                        : acc.status === 'Suspended'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {acc.status || 'Active'}
                    </span>

                    {acc.role !== 'CUSTOMER' && (
                      <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-mono text-[10px] font-bold">
                        {formatStaffId(acc)}
                      </span>
                    )}
                  </div>

                  {/* Contact Row (if present) */}
                  {acc.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
                      <Phone size={12} className="text-purple-500 shrink-0" />
                      <span>{acc.phone}</span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-gray-500 font-bold text-xs bg-white rounded-2xl border border-gray-100">
              No matching user accounts found for this branch view.
            </div>
          )}
        </div>

        {/* Desktop View: Full 8-Column Table (≥ md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-purple-50/70 text-purple-900 font-bold border-b border-purple-100 uppercase tracking-wider">
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Staff ID</th>
                <th className="py-3.5 px-4 text-center">Role</th>
                <th className="py-3.5 px-4 text-center">Branch</th>
                <th className="py-3.5 px-4">Contact #</th>
                <th className="py-3.5 px-4">Full Name</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 border-4 border-purple-200 border-t-[#5c0099] rounded-full animate-spin"></div>
                      <span className="text-gray-500 font-semibold animate-pulse">
                        {isSuperAdmin ? 'Loading accounts across branches...' : 'Loading branch accounts...'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : accounts.length > 0 ? (
                accounts.map((acc) => {
                  const isMenuOpen = activeMenuId === acc.id;

                  return (
                    <tr 
                      key={acc.id} 
                      className="hover:bg-purple-50/40 transition-colors group cursor-pointer"
                      onClick={() => {
                        if (acc.role === 'CUSTOMER') {
                          setCustomerDetailsTarget({ id: acc.id, email: acc.email, name: acc.fullName || acc.name });
                        } else {
                          setViewModalAccount(acc);
                        }
                      }}
                    >
                      {/* Email */}
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[200px]">{acc.email}</span>
                          {acc.status === 'Suspended' && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-black uppercase">Suspended</span>
                          )}
                        </div>
                      </td>

                      {/* Staff ID */}
                      <td className="py-3 px-4 font-mono font-bold text-xs">
                        {acc.role !== 'CUSTOMER' ? (
                          <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 inline-block font-mono text-[11px]">
                            {formatStaffId(acc)}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-normal">—</span>
                        )}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-1 ${
                          acc.role === 'SUPER_ADMIN' 
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black' 
                            : acc.role === 'ADMIN' 
                              ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                              : acc.role === 'CASHIER' 
                                ? 'bg-blue-100 text-blue-900 border border-blue-200' 
                                : 'bg-gray-100 text-gray-700'
                        }`}>
                          {acc.role === 'SUPER_ADMIN' && <Crown size={10} />}
                          {acc.role || 'Customer'}
                        </span>
                      </td>

                      {/* Branch Badge */}
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 ${
                          acc.branch === 'Tagoloan'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : acc.branch === 'Villanueva'
                              ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                              : acc.branch === 'Jasaan'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-purple-50 text-purple-800 border border-purple-200'
                        }`}>
                          📍 {acc.branch || 'Tagoloan'}
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4 text-gray-500 font-mono text-xs">
                        {acc.phone || 'N/A'}
                      </td>

                      {/* Full Name */}
                      <td className="py-3 px-4 font-bold text-gray-900">
                        {acc.fullName}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          acc.status === 'Inactive'
                            ? 'bg-gray-100 text-gray-600'
                            : acc.status === 'Suspended'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {acc.status || 'Active'}
                        </span>
                      </td>

                      {/* Action Menu (⋮ More) */}
                      <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() => setActiveMenuId(isMenuOpen ? null : acc.id)}
                            className="p-1.5 rounded-lg hover:bg-purple-100 text-gray-600 hover:text-purple-900 transition-colors cursor-pointer"
                            title="More Actions"
                          >
                            <MoreVertical size={18} />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-2xl border border-purple-100 py-1.5 z-50 animate-in fade-in zoom-in-95">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  if (acc.role === 'CUSTOMER') {
                                    setCustomerDetailsTarget({ id: acc.id, email: acc.email, name: acc.fullName || acc.name });
                                  } else {
                                    setViewModalAccount(acc);
                                  }
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-bold text-gray-700 hover:bg-purple-50 hover:text-[#5c0099] flex items-center gap-2"
                              >
                                <Eye size={14} /> View Details
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditModalAccount(acc);
                                  setModalError(null);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-bold text-gray-700 hover:bg-purple-50 hover:text-[#5c0099] flex items-center gap-2"
                              >
                                <Edit3 size={14} /> Edit Account
                              </button>

                              {isSuperAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setChangeBranchAccount(acc);
                                    setModalError(null);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-gray-700 hover:bg-purple-50 hover:text-[#5c0099] flex items-center gap-2"
                                >
                                  <ArrowRightLeft size={14} /> Change Branch
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  handleToggleStatus(acc);
                                  setActiveMenuId(null);
                                }}
                                className={`w-full px-3.5 py-2 text-left text-xs font-bold flex items-center gap-2 ${
                                  acc.status === 'Inactive' 
                                    ? 'text-emerald-700 hover:bg-emerald-50' 
                                    : 'text-amber-700 hover:bg-amber-50'
                                }`}
                              >
                                <Power size={14} /> {acc.status === 'Inactive' ? 'Activate Account' : 'Deactivate Account'}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setResetPasswordAccount(acc);
                                  setNewPasswordInput('');
                                  setModalError(null);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-bold text-gray-700 hover:bg-purple-50 hover:text-[#5c0099] flex items-center gap-2 border-t border-gray-100"
                              >
                                <Key size={14} /> Reset Password
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSuspendModal({
                                    isOpen: true,
                                    id: acc.id,
                                    name: acc.fullName,
                                    status: acc.status,
                                    suspendedUntil: acc.suspendedUntil
                                  });
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                              >
                                <Ban size={14} /> Suspend Access
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500 font-bold text-xs">
                    No matching user accounts found for this branch view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 bg-white border-t border-gray-100 text-xs">
          <span className="text-gray-500 font-medium text-center sm:text-left">
            Showing <span className="font-bold text-gray-900">{startItem}</span> to <span className="font-bold text-gray-900">{endItem}</span> of <span className="font-bold text-gray-900">{totalCount}</span> user accounts
          </span>
          <div className="flex items-center gap-1.5 justify-center flex-wrap">
            <button 
              onClick={prevPage}
              disabled={currentPage === 1}
              className="h-8 px-2.5 sm:px-3 rounded-xl border border-gray-200 bg-white hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 disabled:opacity-30 disabled:pointer-events-none transition-all text-xs font-semibold text-gray-700 flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
              title="Previous Page"
            >
              <ChevronLeft size={15} />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <div className="flex items-center gap-1">
              {getPageNumbers().map((p, idx) => {
                if (p === '...') {
                  return (
                    <span key={`dots-${idx}`} className="w-6 h-8 flex items-center justify-center text-xs text-gray-400 font-bold select-none">
                      ...
                    </span>
                  );
                }
                const isCurrent = p === currentPage;
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p as number)}
                    className={`h-8 min-w-[32px] px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer active:scale-95 ${
                      isCurrent
                        ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-sm shadow-purple-500/25 ring-2 ring-purple-400/30'
                        : 'bg-white hover:bg-purple-50 text-gray-700 hover:text-purple-700 border border-gray-200/90 hover:border-purple-200'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button 
              onClick={nextPage}
              disabled={currentPage === totalPages || totalPages === 0}
              className="h-8 px-2.5 sm:px-3 rounded-xl border border-gray-200 bg-white hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 disabled:opacity-30 disabled:pointer-events-none transition-all text-xs font-semibold text-gray-700 flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
              title="Next Page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/* 4. MODALS (View Details, Edit, Change Branch, Password)    */}
      {/* ========================================================== */}

      {/* 👁️ View Account Details Modal */}
      {viewModalAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-purple-100 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="p-5 bg-gradient-to-r from-purple-800 to-indigo-800 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <User size={20} />
                <h3 className="font-bold text-base">User Account Profile</h3>
              </div>
              <button onClick={() => setViewModalAccount(null)} className="text-white/80 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 text-xs">
              <div className="flex items-center justify-between p-3 bg-purple-50/60 rounded-2xl border border-purple-100">
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-bold tracking-wider">Account Role</span>
                  <span className="text-sm font-black text-[#5c0099]">{viewModalAccount.role}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-bold tracking-wider text-right">Assigned Branch</span>
                  <span className="text-sm font-bold text-gray-900 text-right block">📍 {viewModalAccount.branch}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 divide-y divide-gray-100">
                {viewModalAccount.role !== 'CUSTOMER' && (
                  <div className="pt-2 flex justify-between">
                    <span className="text-gray-500 font-semibold">Staff ID</span>
                    <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">{formatStaffId(viewModalAccount)}</span>
                  </div>
                )}
                <div className="pt-2 flex justify-between">
                  <span className="text-gray-500 font-semibold">Full Name</span>
                  <span className="font-bold text-gray-900">{viewModalAccount.fullName}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-gray-500 font-semibold">Email Address</span>
                  <span className="font-bold text-gray-900">{viewModalAccount.email}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-gray-500 font-semibold">Contact Number</span>
                  <span className="font-mono font-bold text-gray-900">{viewModalAccount.phone || 'N/A'}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-gray-500 font-semibold">Account Status</span>
                  <span className={`font-bold ${viewModalAccount.status === 'Inactive' ? 'text-gray-500' : 'text-emerald-700'}`}>
                    {viewModalAccount.status}
                  </span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-gray-500 font-semibold">Created Date</span>
                  <span className="text-gray-700">{new Date(viewModalAccount.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  handleToggleStatus(viewModalAccount);
                }}
                className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold transition-colors"
              >
                {viewModalAccount.status === 'Inactive' ? 'Activate Account' : 'Deactivate Account'}
              </button>
              <button
                type="button"
                onClick={() => setViewModalAccount(null)}
                className="py-2 px-5 bg-[#5c0099] hover:bg-[#4a007a] text-white rounded-xl font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ Edit Account Modal */}
      {editModalAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-purple-100 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="p-5 bg-gradient-to-r from-purple-800 to-indigo-800 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <Edit3 size={20} />
                <h3 className="font-bold text-base">Edit Account Information</h3>
              </div>
              <button onClick={() => setEditModalAccount(null)} className="text-white/80 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditAccountSubmit} className="p-6 flex flex-col gap-4 text-xs">
              {modalError && (
                <div className="p-2.5 bg-red-50 text-red-600 rounded-xl font-bold border border-red-100">
                  {modalError}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="font-bold text-gray-700 uppercase tracking-wide">Full Name</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editModalAccount.fullName}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-gray-700 uppercase tracking-wide">Contact Number</label>
                <input
                  type="text"
                  name="phone"
                  defaultValue={editModalAccount.phone !== 'N/A' ? editModalAccount.phone : ''}
                  placeholder="e.g. 09123456789"
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                />
              </div>

              {isSuperAdmin && (
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-700 uppercase tracking-wide">Role Permission</label>
                  <select
                    name="role"
                    defaultValue={editModalAccount.role}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalAccount(null)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-[#5c0099] hover:bg-[#4a007a] text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📍 Change Branch Modal */}
      {changeBranchAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-purple-100 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="p-5 bg-gradient-to-r from-purple-800 to-indigo-800 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Building2 size={20} />
                <h3 className="font-bold text-base">Reassign User Branch</h3>
              </div>
              <button onClick={() => setChangeBranchAccount(null)} className="text-white/80 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 text-xs text-left">
              <p className="text-gray-600 font-medium">
                Select the physical store branch for <strong className="text-gray-900">{changeBranchAccount.fullName}</strong> ({changeBranchAccount.email}):
              </p>

              <div className="flex flex-col gap-2">
                {['Tagoloan', 'Villanueva', 'Jasaan'].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => handleChangeBranchSubmit(b)}
                    disabled={isSubmitting}
                    className={`py-3 px-4 rounded-xl border text-left font-bold transition-all flex items-center justify-between cursor-pointer ${
                      changeBranchAccount.branch === b 
                        ? 'border-purple-500 bg-purple-50 text-[#5c0099]' 
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50 text-gray-800'
                    }`}
                  >
                    <span>📍 {b} Branch</span>
                    {changeBranchAccount.branch === b && <CheckCircle2 size={16} className="text-[#5c0099]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔑 Reset Password Modal */}
      {resetPasswordAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-purple-100 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="p-5 bg-gradient-to-r from-purple-800 to-indigo-800 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Key size={20} />
                <h3 className="font-bold text-base">Reset Account Password</h3>
              </div>
              <button onClick={() => setResetPasswordAccount(null)} className="text-white/80 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-6 flex flex-col gap-4 text-xs text-left">
              <p className="text-gray-600 font-medium">
                Enter a new secure password for <strong className="text-gray-900">{resetPasswordAccount.email}</strong>:
              </p>

              {modalError && (
                <div className="p-2.5 bg-red-50 text-red-600 rounded-xl font-bold border border-red-100">
                  {modalError}
                </div>
              )}

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New password (min. 6 characters)"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordAccount(null)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-[#5c0099] hover:bg-[#4a007a] text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚫 Suspend Confirmation Modal */}
      {suspendModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSuspendModal({ isOpen: false, id: '', name: '' })}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-black/5 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900 text-base">Manage Account Access</h3>
              <button className="text-gray-400 hover:text-black transition-colors" onClick={() => setSuspendModal({ isOpen: false, id: '', name: '' })}>
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-1">
                <Ban size={24} />
              </div>
              <p className="text-gray-600 text-xs font-medium">
                Set suspension duration or restore access for <br />
                <span className="font-bold text-gray-900 text-sm">{suspendModal.name}</span>
              </p>

              {suspendModal.error && (
                <div className="bg-red-50 text-red-600 p-2.5 rounded-xl text-xs font-semibold border border-red-100">
                  {suspendModal.error}
                </div>
              )}

              {suspendModal.status !== 'Suspended' ? (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button 
                    disabled={isSubmitting}
                    onClick={() => handleSuspend('1_week')}
                    className="py-2.5 px-3 bg-gray-100 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 border border-transparent rounded-xl text-xs font-bold text-gray-700 transition-all disabled:opacity-50"
                  >
                    1 Week
                  </button>
                  <button 
                    disabled={isSubmitting}
                    onClick={() => handleSuspend('1_month')}
                    className="py-2.5 px-3 bg-gray-100 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 border border-transparent rounded-xl text-xs font-bold text-gray-700 transition-all disabled:opacity-50"
                  >
                    1 Month
                  </button>
                  <button 
                    disabled={isSubmitting}
                    onClick={() => handleSuspend('1_year')}
                    className="py-2.5 px-3 bg-gray-100 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 border border-transparent rounded-xl text-xs font-bold text-gray-700 transition-all disabled:opacity-50"
                  >
                    1 Year
                  </button>
                  <button 
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
                    onClick={() => handleSuspend('lift')}
                    className="py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-200 disabled:opacity-50"
                  >
                    Lift Suspension
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ➕ Create Account Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setCreateModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 bg-gradient-to-r from-purple-800 to-indigo-800 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Plus size={20} />
                <h3 className="font-bold text-base">Create New Account</h3>
              </div>
              <button className="text-white/80 hover:text-white" onClick={() => setCreateModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateAccount} className="p-6 flex flex-col gap-3.5 text-xs text-left">
              {modalError && (
                <div className="bg-red-50 text-red-600 p-2.5 rounded-xl font-bold border border-red-100">
                  {modalError}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-700">First Name</label>
                  <input required name="firstName" type="text" placeholder="John" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white text-gray-900 font-medium outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-700">Last Name</label>
                  <input required name="lastName" type="text" placeholder="Doe" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white text-gray-900 font-medium outline-none" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-gray-700">Email Address *</label>
                <input required name="email" type="email" placeholder="user@graphix.com" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white text-gray-900 font-medium outline-none" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-gray-700">Contact Number</label>
                <input name="phone" type="text" placeholder="09123456789" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white text-gray-900 font-medium outline-none" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-gray-700">Initial Password *</label>
                <div className="relative">
                  <input required name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white text-gray-900 font-medium pr-10 outline-none" />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-700">Role</label>
                  <select name="role" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="CASHIER">Cashier</option>
                    <option value="ADMIN">Admin</option>
                    {isSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
                    <option value="CUSTOMER">Customer</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-gray-700">Branch</label>
                  {isSuperAdmin ? (
                    <select 
                      name="branch" 
                      defaultValue={selectedBranch !== 'all' ? selectedBranch : 'Tagoloan'}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Tagoloan">Tagoloan</option>
                      <option value="Villanueva">Villanueva</option>
                      <option value="Jasaan">Jasaan</option>
                    </select>
                  ) : (
                    <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl font-bold text-gray-700">
                      {userBranch || 'Tagoloan'}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-[#5c0099] hover:bg-[#4a007a] text-white rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Customer Details Modal */}
      {customerDetailsTarget && (
        <CustomerDetailsModal
          isOpen={Boolean(customerDetailsTarget)}
          onClose={() => setCustomerDetailsTarget(null)}
          customerId={customerDetailsTarget.id}
          customerEmail={customerDetailsTarget.email}
          customerName={customerDetailsTarget.name}
        />
      )}
    </div>
  );
}

function AccountStatCard({
  icon,
  label,
  value,
  subLabel,
  badgeText,
  gradientBorder,
  iconBg,
  iconColor,
  badgeBg,
  badgeColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subLabel: string;
  badgeText: string;
  gradientBorder: string;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeColor: string;
}) {
  return (
    <div className="group relative bg-white/95 backdrop-blur-md rounded-2xl p-5 border border-purple-500/15 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden">
      {/* Top Accent Gradient Line */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradientBorder} opacity-80 group-hover:opacity-100 transition-opacity`} />
      
      {/* Icon & Badge Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className={`w-11 h-11 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform`}>
          {icon}
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeBg} ${badgeColor} border border-black/5 shadow-2xs`}>
          {badgeText}
        </span>
      </div>

      {/* Label & Number */}
      <div>
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
          {label}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-none">
            {value}
          </span>
          <span className="text-xs font-semibold text-gray-400 truncate">
            {subLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
