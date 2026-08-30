"use client";

import { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
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
  RefreshCw
} from 'lucide-react';
import { useBranch } from '../../context/BranchContext';

interface BranchMetricItem {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  status: string;
  createdAt: string;
  adminsCount: number;
  cashiersCount: number;
  totalStock: number;
  totalRevenue: number;
}

export default function AdminBranches() {
  const { refreshBranches, isSuperAdmin } = useBranch();
  const [branches, setBranches] = useState<BranchMetricItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchMetricItem | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState('Active');
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
    setFormStatus('Active');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (branch: BranchMetricItem) => {
    setSelectedBranch(branch);
    setFormName(branch.name);
    setFormAddress(branch.address || '');
    setFormPhone(branch.phone || '');
    setFormStatus(branch.status);
    setIsEditModalOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Branch name is required');
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
          status: formStatus
        })
      });

      const data = await res.json();
      if (res.ok) {
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        await fetchBranchMetrics();
        await refreshBranches();
        alert(data.message || 'Branch saved successfully!');
      } else {
        alert(data.error || 'Failed to save branch');
      }
    } catch (err) {
      console.error('Save branch error:', err);
      alert('An error occurred while saving branch');
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
        alert(data.message || 'Branch removed/deactivated successfully!');
      } else {
        alert(data.error || 'Failed to delete branch');
      }
    } catch (err) {
      console.error('Delete branch error:', err);
      alert('Failed to delete branch');
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
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update branch status');
      }
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.address && b.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Header Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-[#bd00ff] shadow-sm">
            <Building2 size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 m-0">Branch Management</h2>
            <p className="text-gray-500 m-0 text-sm">Create, monitor, and manage system branches across all locations</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={fetchBranchMetrics}
            title="Refresh"
            className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#bd00ff] hover:bg-purple-700 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-purple-200 transition-all cursor-pointer"
          >
            <Plus size={18} /> Add New Branch
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
        <Search size={20} className="text-gray-400" />
        <input
          type="text"
          placeholder="Search branches by name or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
        />
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
          <p className="text-sm text-gray-500 mt-1">Try adjusting your search query or add a new branch.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBranches.map((branch) => (
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
                  </div>
                  <button
                    onClick={() => handleToggleStatus(branch)}
                    title={`Click to ${branch.status === 'Active' ? 'Deactivate' : 'Activate'}`}
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
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
                      {branch.adminsCount + branch.cashiersCount}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {branch.adminsCount} Admins • {branch.cashiersCount} Cashiers
                    </span>
                  </div>

                  <div className="bg-blue-50/60 rounded-2xl p-3.5 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                      <Package size={14} /> Available Stock
                    </div>
                    <span className="text-lg font-black text-gray-900">
                      {branch.totalStock.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-gray-500">Total units on inventory</span>
                  </div>

                  <div className="bg-emerald-50/60 rounded-2xl p-3.5 flex flex-col gap-1 col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <TrendingUp size={14} /> Total Completed Sales
                      </span>
                      <span className="text-base font-black text-emerald-700">
                        ₱{branch.totalRevenue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleOpenEdit(branch)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                >
                  <Edit3 size={14} /> Edit Details
                </button>
                <button
                  onClick={() => setBranchToDelete(branch)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Branch Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 m-0">
                {isEditModalOpen ? `Edit ${selectedBranch?.name} Branch` : 'Add New Branch'}
              </h3>
              <button 
                onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="flex flex-col gap-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Branch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Gingoog, Balingasag"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#bd00ff] focus:bg-white transition-all"
                />
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
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Contact Phone</label>
                <input
                  type="text"
                  placeholder="e.g., 09123456789"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#bd00ff] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#bd00ff] focus:bg-white transition-all cursor-pointer"
                >
                  <option value="Active">Active (Open for transactions & staff)</option>
                  <option value="Inactive">Inactive (Restricted)</option>
                </select>
              </div>

              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-[#bd00ff] hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-200 transition-all cursor-pointer disabled:opacity-50"
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
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBranch}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-200 transition-all cursor-pointer disabled:opacity-50"
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
