"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Users, 
  Package, 
  TrendingUp, 
  MapPin, 
  Phone, 
  X, 
  AlertTriangle,
  RefreshCw,
  QrCode,
  Upload,
  ChevronLeft,
  Mail
} from 'lucide-react';
import { useBranch } from '../../context/BranchContext';

interface BranchMetricItem {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  status: string;
  gcashName?: string | null;
  gcashNumber?: string | null;
  gcashQrCode?: string | null;
  createdAt: string;
  adminsCount: number;
  cashiersCount: number;
  totalStock: number;
  totalRevenue: number;
}

export default function AdminBranches() {
  const { refreshBranches, isSuperAdmin, userBranch } = useBranch();
  const [branches, setBranches] = useState<BranchMetricItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchMetricItem | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStatus, setFormStatus] = useState('Active');
  const [formGcashName, setFormGcashName] = useState('');
  const [formGcashNumber, setFormGcashNumber] = useState('');
  const [formGcashQrCode, setFormGcashQrCode] = useState<string | null>(null);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Delete State
  const [branchToDelete, setBranchToDelete] = useState<BranchMetricItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchBranchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/branches');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.branches)) {
          setBranches(data.branches);
        } else if (Array.isArray(data)) {
          setBranches(data);
        }
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranchMetrics();
  }, []);

  const handleOpenAdd = () => {
    setFormName('');
    setFormAddress('');
    setFormPhone('');
    setFormEmail('');
    setFormStatus('Active');
    setFormGcashName('GRAPHIX MANAGEMENT');
    setFormGcashNumber('0967 123 4567');
    setFormGcashQrCode(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (branch: BranchMetricItem) => {
    setSelectedBranch(branch);
    setFormName(branch.name);
    setFormAddress(branch.address || '');
    setFormPhone(branch.phone || '');
    setFormEmail(branch.email || '');
    setFormStatus(branch.status);
    setFormGcashName(branch.gcashName || 'GRAPHIX MANAGEMENT');
    setFormGcashNumber(branch.gcashNumber || '0967 123 4567');
    setFormGcashQrCode(branch.gcashQrCode || null);
    setIsEditModalOpen(true);
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQr(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'branch_gcash_qr');
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        setFormGcashQrCode(data.url);
        showToast('GCash QR Code uploaded successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to upload QR image', 'error');
      }
    } catch (err) {
      console.error('QR upload error:', err);
      showToast('Failed to upload QR image', 'error');
    } finally {
      setUploadingQr(false);
    }
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Branch name is required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const url = isEditModalOpen && selectedBranch 
        ? `/api/branches/${selectedBranch.id}` 
        : '/api/branches';
      const method = isEditModalOpen && selectedBranch ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          address: formAddress.trim() || null,
          phone: formPhone.trim() || null,
          email: formEmail.trim() || null,
          status: formStatus,
          gcashName: formGcashName.trim() || null,
          gcashNumber: formGcashNumber.trim() || null,
          gcashQrCode: formGcashQrCode || null
        })
      });

      const data = await res.json();
      if (res.ok) {
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        await fetchBranchMetrics();
        await refreshBranches();
        showToast(data.message || (isEditModalOpen ? 'Branch updated successfully!' : 'Branch created successfully!'), 'success');
      } else {
        showToast(data.error || 'Failed to save branch', 'error');
      }
    } catch (err) {
      console.error('Save branch error:', err);
      showToast('An error occurred while saving branch', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBranch = async () => {
    if (!branchToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/branches/${branchToDelete.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        setBranchToDelete(null);
        await fetchBranchMetrics();
        await refreshBranches();
        showToast(data.message || 'Branch removed/deactivated successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to delete branch', 'error');
      }
    } catch (err) {
      console.error('Delete branch error:', err);
      showToast('Failed to delete branch', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (branch: BranchMetricItem) => {
    const newStatus = branch.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await fetch(`/api/branches/${branch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        await fetchBranchMetrics();
        await refreshBranches();
        showToast(`Branch status changed to ${newStatus}`, 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to update branch status', 'error');
      }
    } catch (err) {
      console.error('Toggle status error:', err);
      showToast('Network error while updating status', 'error');
    }
  };

  const cleanBranch = (name: string) => (name || '').replace(/\s*Branch$/i, '').trim().toLowerCase();

  const filteredBranches = branches.filter(b => {
    if (!isSuperAdmin && userBranch && cleanBranch(b.name) !== cleanBranch(userBranch)) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 font-['Inter'] relative">
      {/* Toast Feedback Notification */}
      {toast && (
        <div 
          className={`fixed top-6 right-6 z-[9999] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'error'
              ? 'bg-rose-600 text-white border-rose-500 shadow-rose-200'
              : 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-200'
          }`}
        >
          {toast.type === 'error' ? (
            <XCircle size={20} className="shrink-0 text-white" />
          ) : (
            <CheckCircle2 size={20} className="shrink-0 text-white" />
          )}
          <span className="text-sm font-bold tracking-wide">{toast.message}</span>
          <button 
            onClick={() => setToast(null)} 
            className="text-white hover:text-gray-200 bg-transparent border-none outline-none font-black ml-3 cursor-pointer p-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <Link
            href="/admin/settings"
            className="w-11 h-11 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors shrink-0 no-underline"
            title="Back to Settings"
          >
            <ChevronLeft size={22} />
          </Link>
          <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-[#bd00ff] shadow-sm shrink-0">
            <Building2 size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 m-0">
              {isSuperAdmin ? 'Branch Management' : 'Branch Settings'}
            </h2>
            <p className="text-gray-500 m-0 text-sm">
              {isSuperAdmin 
                ? 'Create, monitor, and manage system branches across all locations'
                : 'Configure branch information, GCash payment account, and QR Code for your store location'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={fetchBranchMetrics}
            title="Refresh"
            className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer border-none"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          {isSuperAdmin && (
            <button
              onClick={handleOpenAdd}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#bd00ff] hover:bg-purple-700 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-purple-200 transition-all cursor-pointer border-none"
            >
              <Plus size={18} /> Add New Branch
            </button>
          )}
        </div>
      </div>

      {/* Branch Cards Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-purple-200 border-t-[#bd00ff] rounded-full animate-spin"></div>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
          <Building2 size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-bold text-gray-700">No Branches Found</h3>
          <p className="text-sm text-gray-500 mt-1">
            {isSuperAdmin ? 'Click "Add New Branch" to register a branch.' : 'No branch record found for your account.'}
          </p>
        </div>
      ) : filteredBranches.length === 1 ? (
        /* Single Branch Full-Width Layout */
        <div className="w-full">
          {filteredBranches.map((branch) => {
            const admins = branch.adminsCount || 0;
            const cashiers = branch.cashiersCount || 0;
            const stock = branch.totalStock || 0;
            const revenue = branch.totalRevenue || 0;

            return (
              <div 
                key={branch.id} 
                className={`w-full bg-white rounded-3xl p-6 md:p-8 shadow-sm border transition-all flex flex-col gap-6 ${
                  branch.status === 'Active' ? 'border-gray-100' : 'border-red-200 bg-red-50/20'
                }`}
              >
                {/* Branch Header Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-100">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl md:text-3xl font-black text-gray-900 m-0">{branch.name}</h3>
                      <button
                        onClick={() => handleToggleStatus(branch)}
                        title={`Click to ${branch.status === 'Active' ? 'Deactivate' : 'Activate'}`}
                        className={`px-3.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border-none ${
                          branch.status === 'Active' 
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {branch.status === 'Active' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        {branch.status}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-2">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={15} className="text-gray-400 shrink-0" />
                        <span>{branch.address || 'No address specified'}</span>
                      </div>
                      {branch.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone size={15} className="text-gray-400 shrink-0" />
                          <span>{branch.phone}</span>
                        </div>
                      )}
                      {branch.email && (
                        <div className="flex items-center gap-1.5 text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg font-medium border border-purple-100">
                          <Mail size={14} className="text-[#bd00ff] shrink-0" />
                          <span>{branch.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => handleOpenEdit(branch)}
                      className="flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold text-[#bd00ff] bg-purple-50 hover:bg-purple-100 rounded-xl transition-all cursor-pointer border-none shadow-xs"
                    >
                      <Edit3 size={15} /> Edit Contact Us & Branch Details
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => setBranchToDelete(branch)}
                        className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer border-none"
                      >
                        <Trash2 size={15} /> Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Metrics & GCash Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Staff Members */}
                  <div className="bg-purple-50/60 rounded-2xl p-4 md:p-5 flex flex-col justify-between gap-3 border border-purple-100/50">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-700 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5"><Users size={16} /> Staff Members</span>
                    </div>
                    <div>
                      <span className="text-2xl md:text-3xl font-black text-gray-900 leading-none">
                        {admins + cashiers}
                      </span>
                      <p className="text-xs text-gray-500 mt-1.5 m-0 font-medium">
                        {admins} Admins • {cashiers} Cashiers
                      </p>
                    </div>
                  </div>

                  {/* Available Stock */}
                  <div className="bg-blue-50/60 rounded-2xl p-4 md:p-5 flex flex-col justify-between gap-3 border border-blue-100/50">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-700 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5"><Package size={16} /> Available Stock</span>
                    </div>
                    <div>
                      <span className="text-2xl md:text-3xl font-black text-gray-900 leading-none">
                        {stock.toLocaleString()}
                      </span>
                      <p className="text-xs text-gray-500 mt-1.5 m-0 font-medium">
                        Total units on inventory
                      </p>
                    </div>
                  </div>

                  {/* Completed Sales */}
                  <div className="bg-emerald-50/60 rounded-2xl p-4 md:p-5 flex flex-col justify-between gap-3 border border-emerald-100/50">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-700 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5"><TrendingUp size={16} /> Completed Sales</span>
                    </div>
                    <div>
                      <span className="text-2xl md:text-3xl font-black text-emerald-700 leading-none">
                        ₱{revenue.toLocaleString()}
                      </span>
                      <p className="text-xs text-gray-500 mt-1.5 m-0 font-medium">
                        Total branch revenue
                      </p>
                    </div>
                  </div>

                  {/* GCash Payment Info */}
                  <div className="bg-gradient-to-br from-blue-50/90 to-indigo-50/50 rounded-2xl p-4 md:p-5 flex flex-col justify-between gap-3 border border-blue-200/70">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#005ce6] uppercase tracking-wider flex items-center gap-1.5">
                        <QrCode size={16} /> GCash Payment
                      </span>
                      {branch.gcashQrCode ? (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 size={11} /> Official QR
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Auto QR Active
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Account</span>
                        <span className="text-xs font-extrabold text-gray-900 truncate">
                          {branch.gcashName || 'GRAPHIX MANAGEMENT'}
                        </span>
                        <span className="text-xs font-mono font-bold text-[#005ce6] mt-0.5">
                          {branch.gcashNumber || '0967 123 4567'}
                        </span>
                      </div>

                      <div className="w-12 h-12 rounded-xl bg-white border border-blue-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                        {branch.gcashQrCode ? (
                          <img src={branch.gcashQrCode} alt="GCash QR" className="w-full h-full object-contain" />
                        ) : (
                          <QrCode size={26} className="text-[#005ce6]" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Multi-Branch 3-Column Grid for Super Admin */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBranches.map((branch) => {
            const admins = branch.adminsCount || 0;
            const cashiers = branch.cashiersCount || 0;
            const stock = branch.totalStock || 0;
            const revenue = branch.totalRevenue || 0;

            return (
            <div 
              key={branch.id} 
              className={`bg-white rounded-3xl p-6 shadow-sm border transition-all hover:shadow-md flex flex-col justify-between gap-5 ${
                branch.status === 'Active' ? 'border-gray-100' : 'border-red-200 bg-red-50/20'
              }`}
            >
              <div>
                {/* Branch Header */}
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 m-0">{branch.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                      <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{branch.address || 'No address specified'}</span>
                    </div>
                    {branch.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                        <Phone size={14} className="text-gray-400 flex-shrink-0" />
                        <span>{branch.phone}</span>
                      </div>
                    )}
                    {branch.email && (
                      <div className="flex items-center gap-1.5 text-xs text-purple-700 font-medium mt-1">
                        <Mail size={14} className="text-[#bd00ff] flex-shrink-0" />
                        <span className="truncate">{branch.email}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleStatus(branch)}
                    title={`Click to ${branch.status === 'Active' ? 'Deactivate' : 'Activate'}`}
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border-none ${
                      branch.status === 'Active' 
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    {branch.status === 'Active' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    {branch.status}
                  </button>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
                  <div className="bg-purple-50/60 rounded-2xl p-3.5 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700">
                      <Users size={14} /> Staff Members
                    </div>
                    <span className="text-lg font-black text-gray-900">
                      {admins + cashiers}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {admins} Admins • {cashiers} Cashiers
                    </span>
                  </div>

                  <div className="bg-blue-50/60 rounded-2xl p-3.5 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                      <Package size={14} /> Available Stock
                    </div>
                    <span className="text-lg font-black text-gray-900">
                      {stock.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-gray-500">Total units on inventory</span>
                  </div>

                  <div className="bg-emerald-50/60 rounded-2xl p-3.5 flex flex-col gap-1 col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <TrendingUp size={14} /> Total Completed Sales
                      </span>
                      <span className="text-base font-black text-emerald-700">
                        ₱{revenue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* GCash Payment Transfer & QR Info */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <QrCode size={14} className="text-[#005ce6]" />
                      GCash Payment Details
                    </span>
                    {branch.gcashQrCode ? (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={11} /> Official QR
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                        Auto QR Active
                      </span>
                    )}
                  </div>
                  
                  <div className="bg-blue-50/50 rounded-2xl p-3 border border-blue-100/80 flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Account</span>
                      <span className="text-xs font-extrabold text-gray-900 truncate">
                        {branch.gcashName || 'GRAPHIX MANAGEMENT'}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#005ce6] mt-0.5">
                        {branch.gcashNumber || '0967 123 4567'}
                      </span>
                    </div>

                    <div className="w-12 h-12 rounded-xl bg-white border border-blue-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                      {branch.gcashQrCode ? (
                        <img src={branch.gcashQrCode} alt="GCash QR" className="w-full h-full object-contain" />
                      ) : (
                        <QrCode size={26} className="text-[#005ce6]" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleOpenEdit(branch)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#bd00ff] bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors cursor-pointer border-none"
                >
                  <Edit3 size={14} /> Edit Contact Us & Details
                </button>
                {isSuperAdmin && (
                  <button
                    onClick={() => setBranchToDelete(branch)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer border-none"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Branch Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#bd00ff] flex items-center justify-center">
                  <Building2 size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 m-0">
                    {isEditModalOpen ? `Edit ${selectedBranch?.name} Branch` : 'Add New Branch'}
                  </h3>
                  <p className="text-xs text-gray-500 m-0 mt-0.5">
                    Configure store details, contact info, and customer checkout GCash details
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black flex items-center justify-center transition-colors cursor-pointer border-none"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="flex flex-col gap-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1: Store & Branch Info */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <Building2 size={16} className="text-[#bd00ff]" />
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider m-0">Store Information</h4>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Branch Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Gingoog, Balingasag"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#bd00ff] focus:bg-white transition-all font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Support Email (Customer Contact Us)</span>
                      <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-full">
                        customer side
                      </span>
                    </label>
                    <input
                      type="email"
                      placeholder="e.g., tagoloan@graphix.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#bd00ff] focus:bg-white transition-all font-medium"
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Displayed under "Contact Us &gt; Email Support" on the customer side.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Contact Phone (Call Us)</span>
                      <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-full">
                        customer side
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 0967 123 4567"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#bd00ff] focus:bg-white transition-all font-mono"
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Displayed under "Contact Us &gt; Call Us" on the customer side.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Branch Address</label>
                    <input
                      type="text"
                      placeholder="e.g., Highway 1, Gingoog City"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#bd00ff] focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Branch Status</label>
                    <select
                      value={formStatus}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#bd00ff] focus:bg-white transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                    >
                      <option value="Active">Active (Open for transactions & staff)</option>
                      <option value="Inactive">Inactive (Restricted)</option>
                    </select>
                    {!isSuperAdmin && (
                      <span className="text-[10px] text-gray-400 mt-1 block">Only Super Admins can alter operational branch status.</span>
                    )}
                  </div>
                </div>

                {/* Column 2: GCash Transfer & QR Configuration */}
                <div className="p-5 bg-gradient-to-b from-blue-50/90 to-white rounded-2xl border border-blue-200 flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#005ce6] text-white flex items-center justify-center font-black text-xs shadow-xs">
                        G
                      </div>
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider m-0">
                        GCash Transfer Settings
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-100/70 px-2.5 py-0.5 rounded-full">
                      Customer Facing
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                      GCash Account Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. GRAPHIX MANAGEMENT - TAGOLOAN"
                      value={formGcashName}
                      onChange={(e) => setFormGcashName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-[#005ce6] transition-all shadow-xs"
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Shown to customer on checkout as the transfer recipient.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                      GCash Mobile Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 0967 123 4567"
                      value={formGcashNumber}
                      onChange={(e) => setFormGcashNumber(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#005ce6] outline-none focus:border-[#005ce6] transition-all shadow-xs"
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Recipient number copied with 1-tap by customer.
                    </span>
                  </div>

                  <div className="pt-2 border-t border-blue-100">
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Official GCash QR Code Image
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-blue-200 bg-white flex items-center justify-center overflow-hidden shrink-0 relative shadow-inner p-1">
                        {formGcashQrCode ? (
                          <img src={formGcashQrCode} alt="GCash QR Preview" className="w-full h-full object-contain" />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-1">
                            <QrCode size={26} className="text-blue-300" />
                            <span className="text-[8px] text-blue-500 font-bold mt-1">Auto-Gen</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 flex-1">
                        <label className="px-4 py-2.5 bg-white hover:bg-blue-50 border border-blue-300 rounded-xl text-xs font-bold text-[#005ce6] flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs">
                          <Upload size={14} />
                          <span>{uploadingQr ? 'Uploading...' : formGcashQrCode ? 'Replace QR Image' : 'Upload GCash QR'}</span>
                          <input type="file" accept="image/*" onChange={handleQrUpload} disabled={uploadingQr} className="hidden" />
                        </label>
                        {formGcashQrCode && (
                          <button
                            type="button"
                            onClick={() => setFormGcashQrCode(null)}
                            className="text-[11px] font-semibold text-red-500 hover:underline bg-transparent border-none cursor-pointer self-start p-0"
                          >
                            Remove QR Image (Use Auto-Gen)
                          </button>
                        )}
                        <span className="text-[10px] text-gray-500 leading-relaxed">
                          Upload official GCash QR Code image downloaded from your business account, or leave empty to auto-generate.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                  className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 rounded-xl bg-[#bd00ff] hover:bg-purple-700 text-white font-bold text-sm shadow-lg shadow-purple-200 transition-all cursor-pointer disabled:opacity-50 border-none"
                >
                  {submitting ? 'Saving...' : isEditModalOpen ? 'Update Branch' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {branchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-gray-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Remove Branch?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to remove <strong>{branchToDelete.name}</strong>? If this branch has existing sales, devices, or staff, it will be safely deactivated instead of deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setBranchToDelete(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors cursor-pointer bg-transparent"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBranch}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-200 transition-all cursor-pointer disabled:opacity-50 border-none"
              >
                {isDeleting ? 'Removing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
