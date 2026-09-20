"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Plus, Search, ChevronDown, Edit2, Trash2, 
  HelpCircle, CheckCircle, X, AlertCircle, Eye, Power, Loader2
} from 'lucide-react';
import { useBranch } from '../../context/BranchContext';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  isActive: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminFaqs() {
  const router = useRouter();
  const { isSuperAdmin } = useBranch();

  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null);
  const [modalQuestion, setModalQuestion] = useState('');
  const [modalAnswer, setModalAnswer] = useState('');
  const [modalIsActive, setModalIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Delete Dialog States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingFaq, setDeletingFaq] = useState<FAQItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/faqs?all=true', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setFaqs(data);
        }
      } else {
        showToast('Failed to load FAQs', 'error');
      }
    } catch (err) {
      console.error('Error fetching FAQs:', err);
      showToast('Error loading FAQs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const query = searchQuery.toLowerCase();
    return faqs.filter(
      f => f.question.toLowerCase().includes(query) || f.answer.toLowerCase().includes(query)
    );
  }, [faqs, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingFaq(null);
    setModalQuestion('');
    setModalAnswer('');
    setModalIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (faq: FAQItem) => {
    setEditingFaq(faq);
    setModalQuestion(faq.question);
    setModalAnswer(faq.answer);
    setModalIsActive(faq.isActive);
    setIsModalOpen(true);
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalQuestion.trim()) {
      showToast('Please enter a question', 'error');
      return;
    }
    if (!modalAnswer.trim()) {
      showToast('Please enter an answer', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingFaq) {
        // Edit existing FAQ
        const res = await fetch(`/api/faqs/${editingFaq.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: modalQuestion.trim(),
            answer: modalAnswer.trim(),
            isActive: modalIsActive
          })
        });

        if (res.ok) {
          const updated = await res.json();
          setFaqs(prev => prev.map(f => (f.id === updated.id ? updated : f)));
          setIsModalOpen(false);
          showToast('FAQ updated successfully!');
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to update FAQ', 'error');
        }
      } else {
        // Add new FAQ
        const res = await fetch('/api/faqs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: modalQuestion.trim(),
            answer: modalAnswer.trim(),
            isActive: modalIsActive
          })
        });

        if (res.ok) {
          const created = await res.json();
          setFaqs(prev => [created, ...prev]);
          setIsModalOpen(false);
          showToast('FAQ created successfully!');
        } else {
          const err = await res.json();
          showToast(err.error || 'Failed to create FAQ', 'error');
        }
      }
    } catch (err) {
      console.error('Error saving FAQ:', err);
      showToast('An unexpected error occurred', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (faq: FAQItem) => {
    if (!isSuperAdmin) return;
    try {
      const res = await fetch(`/api/faqs/${faq.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !faq.isActive })
      });

      if (res.ok) {
        const updated = await res.json();
        setFaqs(prev => prev.map(f => (f.id === updated.id ? updated : f)));
        showToast(`FAQ marked as ${updated.isActive ? 'Active' : 'Inactive'}`);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update status', 'error');
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      showToast('Failed to update status', 'error');
    }
  };

  const handleOpenDeleteModal = (faq: FAQItem) => {
    setDeletingFaq(faq);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingFaq) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/faqs/${deletingFaq.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setFaqs(prev => prev.filter(f => f.id !== deletingFaq.id));
        setIsDeleteModalOpen(false);
        setDeletingFaq(null);
        showToast('FAQ deleted successfully!');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to delete FAQ', 'error');
      }
    } catch (err) {
      console.error('Error deleting FAQ:', err);
      showToast('An error occurred while deleting FAQ', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-['Inter'] max-w-6xl mx-auto w-full pb-10">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-xl border animate-in slide-in-from-top-3 duration-200 ${
          toastMessage.type === 'success' 
            ? 'bg-white text-emerald-800 border-emerald-200' 
            : 'bg-white text-rose-800 border-rose-200'
        }`}>
          {toastMessage.type === 'success' ? (
            <CheckCircle size={18} className="text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-500 shrink-0" />
          )}
          <span className="text-sm font-bold">{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border-2 border-[#BF00FF] shadow-sm p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => router.push('/admin/settings')}
            className="w-10 h-10 rounded-xl bg-purple-50 text-[#BF00FF] hover:bg-[#BF00FF] hover:text-white flex items-center justify-center transition-all cursor-pointer border border-purple-100 shadow-xs shrink-0"
            title="Back to Settings"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 m-0">Frequently Asked Questions</h2>
              {!isSuperAdmin && (
                <span className="px-3 py-0.5 bg-purple-50 text-[#bd00ff] font-extrabold text-xs rounded-full border border-purple-200 flex items-center gap-1 shadow-2xs">
                  <Eye size={12} /> View Only
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 font-medium m-0 mt-0.5">
              {isSuperAdmin 
                ? 'Manage frequently asked questions and answers displayed to customers.'
                : 'View published frequently asked questions and answers.'
              }
            </p>
          </div>
        </div>

        {isSuperAdmin && (
          <button
            onClick={handleOpenAddModal}
            className="px-5 py-3 bg-gradient-to-r from-[#bd00ff] to-[#4B0082] hover:opacity-95 text-white font-extrabold text-sm rounded-xl border-none cursor-pointer shadow-md shadow-purple-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Add FAQ</span>
          </button>
        )}
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search FAQs by question or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-800 outline-none focus:border-[#bd00ff] focus:ring-2 focus:ring-purple-100 transition-all shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 text-xs font-bold text-gray-500 bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-xs">
          <span>Total: <strong className="text-gray-900">{faqs.length}</strong></span>
          <span>•</span>
          <span>Active: <strong className="text-emerald-600">{faqs.filter(f => f.isActive).length}</strong></span>
          <span>•</span>
          <span>Inactive: <strong className="text-gray-400">{faqs.filter(f => !f.isActive).length}</strong></span>
        </div>
      </div>

      {/* FAQs List Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 sm:p-7 flex flex-col gap-4">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-400">
            <div className="w-10 h-10 border-4 border-purple-100 border-t-[#bd00ff] rounded-full animate-spin"></div>
            <span className="text-sm font-bold">Loading Frequently Asked Questions...</span>
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-16 h-16 bg-purple-50 text-[#bd00ff] rounded-full flex items-center justify-center mb-1">
              <HelpCircle size={32} />
            </div>
            <h4 className="text-lg font-extrabold text-gray-800 m-0">No FAQs Found</h4>
            <p className="text-xs sm:text-sm text-gray-500 max-w-sm m-0">
              {searchQuery ? `No questions matched "${searchQuery}". Try a different search term.` : 'No frequently asked questions have been created yet.'}
            </p>
            {isSuperAdmin && !searchQuery && (
              <button
                onClick={handleOpenAddModal}
                className="mt-2 px-5 py-2.5 bg-[#bd00ff] text-white font-bold text-xs rounded-xl border-none cursor-pointer hover:bg-[#9c00d6] transition-all shadow-sm"
              >
                Create First FAQ
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {filteredFaqs.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                    isOpen ? 'border-[#bd00ff] shadow-md bg-white' : 'border-gray-200 hover:border-purple-200 bg-gray-50/40'
                  }`}
                >
                  {/* Header / Question Row */}
                  <div
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4 cursor-pointer bg-white select-none"
                  >
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#bd00ff] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 sm:mt-0">
                        Q
                      </div>
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="font-extrabold text-gray-900 text-sm sm:text-base leading-snug">
                          {faq.question}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap sm:hidden">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            faq.isActive 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                              : 'bg-gray-100 text-gray-400 border border-gray-200'
                          }`}>
                            {faq.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Status Badge */}
                      <span className={`hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                        faq.isActive 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}>
                        {faq.isActive ? 'Active' : 'Inactive'}
                      </span>

                      {/* Management Controls (Super Admin Only) */}
                      {isSuperAdmin && (
                        <div 
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(faq)}
                            className={`p-2 rounded-xl transition-all cursor-pointer border shadow-2xs ${
                              faq.isActive 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' 
                                : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'
                            }`}
                            title={faq.isActive ? 'Deactivate FAQ' : 'Activate FAQ'}
                          >
                            <Power size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(faq)}
                            className="p-2 bg-purple-50 text-[#bd00ff] hover:bg-purple-100 rounded-xl transition-all cursor-pointer border border-purple-200 shadow-2xs"
                            title="Edit FAQ"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(faq)}
                            className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-all cursor-pointer border border-rose-200 shadow-2xs"
                            title="Delete FAQ"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}

                      <ChevronDown
                        size={20}
                        className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#bd00ff]' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Expandable Answer Body */}
                  <div
                    className={`transition-all duration-300 overflow-hidden ${
                      isOpen ? 'max-h-96 border-t border-gray-100 bg-purple-50/20' : 'max-h-0'
                    }`}
                  >
                    <div className="p-5 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#bd00ff] bg-purple-100/70 px-2 py-0.5 rounded">
                          Answer
                        </span>
                        {faq.updatedAt && (
                          <span className="text-[11px] text-gray-400 font-medium">
                            Updated {new Date(faq.updatedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 font-medium text-sm sm:text-base leading-relaxed m-0 whitespace-pre-wrap">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit FAQ Modal (Super Admin Only) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-100 flex flex-col gap-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#bd00ff] flex items-center justify-center">
                  <HelpCircle size={20} />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-gray-900 m-0">
                  {editingFaq ? 'Edit FAQ' : 'Add New FAQ'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center cursor-pointer border-none bg-transparent"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveFaq} className="flex flex-col gap-4">
              {/* Question Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Question <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="E.g., How long do repairs usually take?"
                  value={modalQuestion}
                  onChange={(e) => setModalQuestion(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none focus:bg-white focus:border-[#bd00ff] focus:ring-2 focus:ring-purple-100 transition-all"
                  required
                />
              </div>

              {/* Answer Textarea */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Answer <span className="text-rose-500">*</span>
                </label>
                <textarea
                  placeholder="Provide a clear, detailed answer to assist customers..."
                  value={modalAnswer}
                  onChange={(e) => setModalAnswer(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:bg-white focus:border-[#bd00ff] focus:ring-2 focus:ring-purple-100 transition-all resize-y"
                  required
                />
              </div>

              {/* Active / Inactive Status Switch */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-900">Publish Status</span>
                  <span className="text-[11px] text-gray-500">
                    {modalIsActive ? 'Active — Visible on customer Help & Support' : 'Inactive — Hidden from customers'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setModalIsActive(!modalIsActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    modalIsActive ? 'bg-[#bd00ff]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      modalIsActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl border-none cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#bd00ff] to-[#4B0082] text-white font-extrabold text-xs rounded-xl border-none cursor-pointer shadow-md shadow-purple-500/20 hover:opacity-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save FAQ</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingFaq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-gray-100 flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center border border-rose-100">
              <Trash2 size={26} />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-black text-gray-900 m-0">
                Delete Frequently Asked Question?
              </h3>
              <p className="text-xs text-gray-500 font-medium m-0 px-2 leading-relaxed">
                Are you sure you want to delete this FAQ? This action cannot be undone.
              </p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 w-full text-left">
              <span className="text-xs font-bold text-gray-800 line-clamp-2">
                "{deletingFaq.question}"
              </span>
            </div>

            <div className="flex items-center gap-3 w-full pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl border-none cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteConfirm}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl border-none cursor-pointer shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
