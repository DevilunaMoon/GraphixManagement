"use client";

import { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, ChevronLeft, ChevronRight, Trash2, X, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function AdminAccounts() {
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
  }, [searchQuery, filter]);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: string, name: string, error?: string}>({ isOpen: false, id: '', name: '' });
  const [isDeleting, setIsDeleting] = useState(false);
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

    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        const newUser = await res.json();
        setAccounts(prev => [newUser, ...prev]);
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

  const openDeleteModal = (id: string, name: string) => {
    setDeleteModal({ isOpen: true, id, name, error: undefined });
  };

  const confirmDelete = async () => {
    const { id } = deleteModal;
    if (!id) return;
    
    setIsDeleting(true);
    setDeleteModal(prev => ({ ...prev, error: undefined }));
    try {
      const res = await fetch(`/api/admin/accounts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAccounts(prev => prev.filter(acc => acc.id !== id));
        setDeleteModal({ isOpen: false, id: '', name: '' });
      } else {
        const errorData = await res.json().catch(() => ({}));
        setDeleteModal(prev => ({ ...prev, error: errorData.error || 'Failed to delete account' }));
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setDeleteModal(prev => ({ ...prev, error: 'An error occurred while deleting the account' }));
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetch('/api/admin/accounts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAccounts(data.map((user: any) => ({
            id: user.id,
            name: user.name || 'Anonymous',
            email: user.email,
            phone: user.phone || 'N/A',
            dob: user.dateOfBirth || 'N/A',
            password: '••••••••'
          })));
        }
      })
      .catch(err => console.error("Failed to fetch accounts:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredAccounts = accounts.filter(acc => 
    acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.phone.includes(searchQuery)
  );
  
  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / itemsPerPage));
  const paginatedAccounts = filteredAccounts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const prevPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const nextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

  return (
    <div className="flex flex-col gap-6">
      {/* Accounts Header Row */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-2">
        <h2 className="text-[1.6rem] font-bold text-[#111] whitespace-nowrap">Customer Accounts</h2>
        
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
                <th className={`py-4 px-5 font-bold text-[1.1rem] text-[#111] border-b-2 ${styles.borderMain}`}>Name</th>
                <th className={`py-4 px-5 font-bold text-[1.1rem] text-[#111] border-b-2 ${styles.borderMain}`}>Email</th>
                <th className={`py-4 px-5 font-bold text-[1.1rem] text-[#111] border-b-2 ${styles.borderMain} hidden md:table-cell`}>Contact #</th>
                <th className={`py-4 px-5 font-bold text-[1.1rem] text-[#111] border-b-2 ${styles.borderMain} hidden md:table-cell`}>Birthdate</th>
                <th className={`py-4 px-5 font-bold text-[1.1rem] text-[#111] border-b-2 ${styles.borderMain} hidden md:table-cell`}>Password</th>
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
                    <td className={`py-4 px-5 text-[0.95rem] font-bold text-[#111] border-b ${styles.borderMain} max-w-[120px] sm:max-w-none truncate`}>{acc.name}</td>
                    <td className={`py-4 px-5 text-[0.95rem] text-[#666] border-b ${styles.borderMain} max-w-[150px] sm:max-w-none truncate`}>{acc.email}</td>
                    <td className={`py-4 px-5 text-[0.95rem] text-[#666] border-b ${styles.borderMain} hidden md:table-cell`}>{acc.phone}</td>
                    <td className={`py-4 px-5 text-[0.95rem] text-[#666] border-b ${styles.borderMain} hidden md:table-cell`}>{acc.dob}</td>
                    <td className={`py-4 px-5 text-[0.95rem] text-[#666] border-b ${styles.borderMain} hidden md:table-cell`}>{acc.password}</td>
                    <td className={`py-4 px-5 border-b ${styles.borderMain} hidden md:table-cell`}>
                      <button
                        onClick={(e) => { e.stopPropagation(); openDeleteModal(acc.id, acc.name); }}
                        className="text-red-500 hover:text-red-700 transition-colors p-2 rounded-full hover:bg-red-50 cursor-pointer flex items-center justify-center mx-auto"
                        title="Delete Account"
                      >
                        <Trash2 size={20} />
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

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-[#111] mb-2">Delete Account</h3>
            <p className="text-gray-600 mb-6 font-medium">
              Are you sure you want to delete <span className="font-bold text-[#111]">{deleteModal.name}</span>? This action cannot be undone.
            </p>
            
            {deleteModal.error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm font-bold border border-red-100 text-center">
                {deleteModal.error}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal({ isOpen: false, id: '', name: '' })}
                disabled={isDeleting}
                className="px-4 py-2.5 text-[#111] hover:bg-gray-100 rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete Account'
                )}
              </button>
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
              
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-700">Name</label>
                <input required name="name" type="text" placeholder="Full Name" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8b00cc] focus:bg-white transition-all text-[#111] font-medium" />
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

              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-700">Role</label>
                <select name="role" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8b00cc] focus:bg-white transition-all text-[#111] font-medium appearance-none">
                  <option value="CASHIER">Cashier</option>
                  <option value="ADMIN">Admin</option>
                  <option value="CUSTOMER">Customer</option>
                </select>
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
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-full transition-colors flex items-center justify-center"
                  title="Delete Account"
                  onClick={() => {
                     openDeleteModal(selectedAccount.id, selectedAccount.name);
                     setSelectedAccount(null);
                  }}
                >
                  <Trash2 size={20} />
                </button>
                <button className="text-gray-400 hover:text-black transition-colors" onClick={() => setSelectedAccount(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 flex flex-col gap-4 text-left">
              <div className="flex flex-col border-b border-gray-100 pb-3">
                <span className="text-[#666] text-sm font-medium mb-1">Name</span>
                <span className="font-bold text-[#111]">{selectedAccount.name}</span>
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
