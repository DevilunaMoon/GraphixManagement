"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  Search, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  X, 
  Building2, 
  User, 
  ShieldCheck, 
  Crown, 
  Clock, 
  Filter, 
  Loader2,
  Lock,
  RefreshCw,
  ShoppingBag,
  Check
} from 'lucide-react';
import { useBranch } from '../../context/BranchContext';

interface QuestionReply {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderImage?: string | null;
  message: string;
  createdAt: string;
}

interface SupportQuestion {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  branchName: string;
  subject: string;
  question: string;
  orderId?: string | null;
  status: 'Pending' | 'Answered' | 'Closed';
  createdAt: string;
  updatedAt: string;
  replies: QuestionReply[];
}

export default function AdminSupportQuestions() {
  const router = useRouter();
  const { isSuperAdmin } = useBranch();

  const [questions, setQuestions] = useState<SupportQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active question conversation modal
  const [activeQuestion, setActiveQuestion] = useState<SupportQuestion | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/support/questions', window.location.origin);
      if (selectedBranchFilter !== 'all') {
        url.searchParams.set('branch', selectedBranchFilter);
      }
      if (selectedStatusFilter !== 'all') {
        url.searchParams.set('status', selectedStatusFilter);
      }
      if (searchQuery.trim()) {
        url.searchParams.set('search', searchQuery.trim());
      }

      const res = await fetch(url.toString(), { cache: 'no-store' });
      const data = await res.json();
      if (data && Array.isArray(data.questions)) {
        setQuestions(data.questions);
      }
    } catch (err) {
      console.error('Failed to load support questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [selectedBranchFilter, selectedStatusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuestions();
  };

  const handleOpenQuestion = async (q: SupportQuestion) => {
    setActiveQuestion(q);
    setReplyText('');
    try {
      const res = await fetch(`/api/support/questions/${q.id}`);
      const data = await res.json();
      if (data && !data.error) {
        setActiveQuestion(data);
      }
    } catch (err) {
      console.error('Failed to fetch full question details:', err);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestion || !replyText.trim()) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/support/questions/${activeQuestion.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        setReplyText('');
        // Refresh active question details
        const updatedRes = await fetch(`/api/support/questions/${activeQuestion.id}`);
        const updatedData = await updatedRes.json();
        setActiveQuestion(updatedData);
        fetchQuestions();
      } else {
        alert(data.error || 'Failed to send answer');
      }
    } catch (err) {
      console.error('Send reply error:', err);
      alert('Failed to send answer');
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleStatus = async (newStatus: 'Pending' | 'Answered' | 'Closed') => {
    if (!activeQuestion) return;

    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/support/questions/${activeQuestion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        setActiveQuestion(prev => prev ? { ...prev, status: newStatus } : null);
        fetchQuestions();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update status');
      }
    } catch (err) {
      console.error('Update status error:', err);
      alert('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-['Inter'] max-w-7xl mx-auto w-full pb-10">
      
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
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 m-0">Customer Support Inquiries</h2>
              <span className="px-3 py-0.5 bg-purple-50 text-[#bd00ff] font-extrabold text-xs rounded-full border border-purple-200 shadow-2xs">
                {isSuperAdmin ? 'All Branches View' : 'Assigned Branch Questions'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 font-medium m-0 mt-0.5">
              {isSuperAdmin
                ? 'Review, monitor, and answer customer support questions submitted across all store branches.'
                : 'Review and answer customer support questions submitted to your assigned branch.'}
            </p>
          </div>
        </div>

        <button
          onClick={fetchQuestions}
          className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-[#bd00ff] font-bold text-xs rounded-xl border border-purple-200 cursor-pointer transition-all flex items-center gap-1.5 self-start sm:self-auto shrink-0"
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer name or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-800 outline-none focus:border-[#bd00ff] focus:ring-2 focus:ring-purple-100 transition-all shadow-xs"
          />
        </form>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Branch Filter (Super Admin Only) */}
          {isSuperAdmin && (
            <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-xs text-xs font-bold text-gray-700">
              <Building2 size={15} className="text-[#bd00ff]" />
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="bg-transparent border-none outline-none font-bold text-gray-800 cursor-pointer"
              >
                <option value="all">All Branches</option>
                <option value="Tagoloan">Tagoloan Branch</option>
                <option value="Villanueva">Villanueva Branch</option>
                <option value="Jasaan">Jasaan Branch</option>
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-xs text-xs font-bold text-gray-700">
            <Filter size={15} className="text-[#bd00ff]" />
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-transparent border-none outline-none font-bold text-gray-800 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Answered">Answered</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Questions List Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 size={32} className="animate-spin text-[#bd00ff]" />
            <span className="text-sm font-bold">Loading support questions...</span>
          </div>
        ) : questions.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-center px-4">
            <div className="w-16 h-16 bg-purple-50 text-[#bd00ff] rounded-full flex items-center justify-center mb-1">
              <MessageSquare size={30} />
            </div>
            <h4 className="text-lg font-extrabold text-gray-800 m-0">No Questions Found</h4>
            <p className="text-xs sm:text-sm text-gray-500 max-w-sm m-0">
              {searchQuery ? `No customer questions matched "${searchQuery}".` : 'There are currently no customer support questions for this filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-black text-gray-500 uppercase tracking-wider">
                  <th className="py-4 px-5">Customer</th>
                  <th className="py-4 px-5">Subject</th>
                  <th className="py-4 px-5">Branch</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5">Submitted Date</th>
                  <th className="py-4 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm font-medium text-gray-700">
                {questions.map((q) => (
                  <tr 
                    key={q.id}
                    onClick={() => handleOpenQuestion(q)}
                    className="hover:bg-purple-50/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-purple-100 text-[#bd00ff] flex items-center justify-center font-bold text-xs shrink-0">
                          {q.customerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 group-hover:text-[#bd00ff] transition-colors">
                            {q.customerName}
                          </span>
                          <span className="text-xs text-gray-400">{q.customerEmail}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="flex flex-col max-w-xs sm:max-w-md">
                        <span className="font-bold text-gray-900 line-clamp-1">{q.subject}</span>
                        <span className="text-xs text-gray-500 line-clamp-1 font-normal">{q.question}</span>
                      </div>
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg border border-gray-200">
                        {q.branchName} Branch
                      </span>
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full border inline-flex items-center gap-1.5 ${
                        q.status === 'Answered'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : q.status === 'Closed'
                          ? 'bg-gray-100 text-gray-500 border-gray-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          q.status === 'Answered' ? 'bg-emerald-500' : q.status === 'Closed' ? 'bg-gray-400' : 'bg-amber-500 animate-pulse'
                        }`} />
                        {q.status}
                      </span>
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap text-xs text-gray-500">
                      {new Date(q.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenQuestion(q);
                        }}
                        className="px-3.5 py-1.5 bg-purple-50 hover:bg-[#bd00ff] text-[#bd00ff] hover:text-white font-bold text-xs rounded-xl border border-purple-200 transition-all cursor-pointer shadow-2xs"
                      >
                        Open Thread
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Conversation Thread Modal */}
      {activeQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-gray-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div className="flex flex-col gap-1 min-w-0 pr-4">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-xl font-black text-gray-900 m-0">
                    {activeQuestion.subject}
                  </h3>
                  <span className="px-2.5 py-0.5 bg-purple-50 text-[#bd00ff] text-xs font-bold rounded-full border border-purple-200">
                    {activeQuestion.branchName} Branch
                  </span>
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                    activeQuestion.status === 'Answered'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : activeQuestion.status === 'Closed'
                      ? 'bg-gray-100 text-gray-500 border-gray-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {activeQuestion.status}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500 font-medium flex-wrap mt-0.5">
                  <span className="font-bold text-gray-800">Customer: {activeQuestion.customerName}</span>
                  <span>•</span>
                  <span>{activeQuestion.customerEmail}</span>
                  {activeQuestion.orderId && (
                    <>
                      <span>•</span>
                      <span className="text-[#bd00ff] font-bold">Related Order ID: {activeQuestion.orderId}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>Submitted {new Date(activeQuestion.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Status Toggle Button */}
                {activeQuestion.status !== 'Closed' ? (
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleToggleStatus('Closed')}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 cursor-pointer transition-colors"
                  >
                    Close Inquiry
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleToggleStatus('Answered')}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 cursor-pointer transition-colors"
                  >
                    Reopen
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveQuestion(null)}
                  className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center cursor-pointer border-none bg-transparent"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Conversation History Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-gray-50/60 rounded-2xl border border-gray-200 max-h-[420px]">
              {activeQuestion.replies && activeQuestion.replies.length > 0 ? (
                activeQuestion.replies.map((msg, idx) => {
                  const isCustomer = msg.senderRole === 'CUSTOMER';
                  const isSuper = msg.senderRole === 'SUPER_ADMIN';
                  const isAdmin = msg.senderRole === 'ADMIN';

                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex flex-col gap-1 max-w-[88%] ${
                        isCustomer ? 'self-start' : 'self-end items-end'
                      }`}
                    >
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-xs font-bold text-gray-800">
                          {isCustomer ? `${activeQuestion.customerName} (Customer)` : msg.senderName}
                        </span>

                        {isSuper && (
                          <span className="px-2 py-0.5 bg-purple-600 text-white text-[10px] font-black rounded-md flex items-center gap-1 shadow-2xs">
                            <Crown size={11} /> SUPER ADMIN
                          </span>
                        )}

                        {isAdmin && (
                          <span className="px-2 py-0.5 bg-purple-100 text-[#bd00ff] text-[10px] font-black rounded-md flex items-center gap-1">
                            <ShieldCheck size={11} /> {activeQuestion.branchName} BRANCH ADMIN
                          </span>
                        )}

                        {isCustomer && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] font-bold rounded-md">
                            CUSTOMER
                          </span>
                        )}

                        <span className="text-[11px] text-gray-400">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        isCustomer 
                          ? 'bg-white border border-gray-200 text-gray-900 shadow-xs' 
                          : isSuper
                          ? 'bg-gradient-to-r from-[#8B008B] to-[#4B0082] text-white shadow-sm'
                          : 'bg-gradient-to-r from-[#bd00ff] to-[#7e22ce] text-white shadow-sm'
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 bg-white rounded-xl border text-sm text-gray-700">
                  {activeQuestion.question}
                </div>
              )}
            </div>

            {/* Answer Input Box */}
            {activeQuestion.status !== 'Closed' ? (
              <form onSubmit={handleSendReply} className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                <div className="flex gap-2">
                  <textarea
                    rows={3}
                    placeholder={`Type response as ${isSuperAdmin ? 'Super Admin' : `${activeQuestion.branchName} Branch Admin`}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:bg-white focus:border-[#bd00ff] transition-all resize-y"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSending || !replyText.trim()}
                    className="px-6 bg-gradient-to-r from-[#bd00ff] to-[#6B21A8] hover:opacity-95 text-white rounded-xl font-bold text-sm border-none cursor-pointer flex flex-col items-center justify-center gap-1 disabled:opacity-50 shadow-md self-stretch"
                  >
                    {isSending ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <Send size={18} />
                        <span>Send Answer</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3 bg-gray-100 rounded-xl text-center text-xs font-bold text-gray-500">
                This question inquiry is closed. Click &quot;Reopen&quot; at the top if you need to continue the conversation.
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
