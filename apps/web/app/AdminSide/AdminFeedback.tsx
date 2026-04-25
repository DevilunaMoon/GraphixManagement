"use client";

import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface FeedbackEntry {
  id: string;
  customerName: string;
  technicianName?: string;
  feedbackText: string;
  sentiment: string;
  createdAt: string;
}

export default function AdminFeedback() {
  const [modalState, setModalState] = useState<'none' | 'reply' | 'success' | 'error'>('none');
  const [activeCustomer, setActiveCustomer] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const ITEMS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetch('/api/feedback')
      .then(res => res.json())
      .then(data => setFeedbacks(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const totalPages = Math.ceil(feedbacks.length / ITEMS_PER_PAGE) || 1;
  const paginatedFeedbacks = feedbacks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleOpenReply = (name: string) => {
    setActiveCustomer(name);
    setReplyMessage('');
    setModalState('reply');
  };

  const handleSendReply = () => {
    if (replyMessage.trim() === '') {
      setModalState('error');
      return;
    }
    setModalState('success');
  };

  return (
    <div className="flex flex-col gap-6 relative">
      <div className="mb-2">
        <h2 className="text-[1.6rem] font-bold text-[#111]">Customers Feedback</h2>
      </div>

      <div className="bg-white/95 backdrop-blur-md rounded-2xl border-2 border-[#BF00FF] shadow-sm p-6 md:p-10 w-full flex flex-col gap-8">
        
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 border-b border-black/10">
            <div className="w-12 h-12 border-4 border-purple-100 border-t-[#BF00FF] rounded-full animate-spin"></div>
            <p className="text-[#666] font-semibold animate-pulse text-lg">Loading feedback...</p>
          </div>
        ) : paginatedFeedbacks.length > 0 ? (
          paginatedFeedbacks.map((fb, idx) => (
            <div key={fb.id} className={`flex flex-col md:flex-row gap-6 pb-8 ${idx < paginatedFeedbacks.length - 1 ? 'border-b border-black/10' : ''}`}>
              <div className="flex items-center gap-4 min-w-[250px]">
                <div className="w-[60px] h-[60px] rounded-full border-2 border-[#BF00FF] bg-purple-50 flex items-center justify-center text-[#BF00FF] font-bold text-2xl uppercase">
                  {fb.customerName.charAt(0)}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-[#111] text-lg">{fb.customerName}</span>
                  {fb.technicianName && (
                    <span className="text-sm font-medium text-[#bd00ff]">
                      Handled by: {fb.technicianName}
                    </span>
                  )}
                  {fb.sentiment === 'Positive' ? (
                    <span className="flex items-center gap-2 text-green-600 font-semibold bg-green-50 px-3 py-1 rounded-full text-sm w-fit">
                      <ThumbsUp size={14} /> Positive
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-red-600 font-semibold bg-red-50 px-3 py-1 rounded-full text-sm w-fit">
                      <ThumbsDown size={14} /> Negative
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-4">
                <p className="text-[#444] leading-relaxed whitespace-pre-wrap">
                  {fb.feedbackText}
                </p>
                <div className="flex justify-between items-center text-sm w-full mt-2">
                  <button 
                    onClick={() => handleOpenReply(fb.customerName)}
                    className="self-start text-[#BF00FF] font-semibold hover:underline border-none bg-transparent cursor-pointer m-0 p-0"
                  >
                    Reply to this feedback
                  </button>
                  <span className="text-gray-400 font-medium">
                    {new Date(fb.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-10 text-center text-gray-500 font-bold border-b border-black/10">No customer feedback available yet.</div>
        )}

        {/* Pagination */}
        {feedbacks.length > ITEMS_PER_PAGE && (
          <div className="flex justify-center items-center gap-4 mt-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="text-[#111] hover:scale-125 transition-transform cursor-pointer bg-transparent border-none disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed flex justify-center items-center p-0"
            >
              <ChevronLeft size={24} />
            </button>
            <span className="text-[1.1rem] font-semibold text-[#111]">{currentPage} / {totalPages}</span>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="text-[#111] hover:scale-125 transition-transform cursor-pointer bg-transparent border-none disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed flex justify-center items-center p-0"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        )}

      </div>

      {/* Modals Overlay */}
      {modalState !== 'none' && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          
          {/* Reply Modal */}
          {modalState === 'reply' && (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border-2 border-[#BF00FF] shadow-xl w-full max-w-lg p-6 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-bold text-[#111]">Reply to Feedback</h3>
                <button onClick={() => setModalState('none')} className="text-gray-500 hover:text-black hover:bg-black/5 p-1 rounded-md">
                  <X size={20} />
                </button>
              </div>
              <p className="mb-4 text-gray-500">To: <strong className="text-black">{activeCustomer}</strong></p>
              <textarea 
                rows={5} 
                placeholder="Write your reply here..." 
                className="w-full p-4 rounded-xl border border-purple-500/30 font-['Inter'] resize-y outline-none focus:border-[#BF00FF] focus:ring-1 focus:ring-[#BF00FF] mb-5 bg-white"
                value={replyMessage}
                onChange={e => setReplyMessage(e.target.value)}
              ></textarea>
              <div className="flex gap-4 justify-end">
                <button onClick={() => setModalState('none')} className="px-5 py-2.5 bg-transparent border border-gray-400 text-gray-600 rounded-lg hover:bg-gray-50 font-medium transition-colors">Cancel</button>
                <button onClick={handleSendReply} className="px-5 py-2.5 bg-gradient-to-b from-[#BF00FF] to-[#4B0082] text-white rounded-lg hover:opacity-90 font-medium transition-opacity">Send Reply</button>
              </div>
            </div>
          )}

          {/* Success Modal */}
          {modalState === 'success' && (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-green-500 shadow-xl w-full max-w-sm p-8 flex flex-col items-center text-center animate-in zoom-in-95">
              <CheckCircle2 className="text-green-500 w-16 h-16 mb-5" />
              <h3 className="text-2xl font-bold text-[#111] mb-3">Reply Sent!</h3>
              <p className="text-gray-500 mb-6">Your reply to <strong className="text-black">{activeCustomer}</strong> has been delivered successfully.</p>
              <button onClick={() => setModalState('none')} className="px-8 py-2.5 bg-gradient-to-b from-[#BF00FF] to-[#4B0082] text-white rounded-lg hover:opacity-90 font-medium transition-opacity w-full">Okay</button>
            </div>
          )}

          {/* Error Modal */}
          {modalState === 'error' && (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-red-500 shadow-xl w-full max-w-sm p-8 flex flex-col items-center text-center animate-in zoom-in-95">
              <AlertCircle className="text-red-500 w-16 h-16 mb-5" />
              <h3 className="text-2xl font-bold text-[#111] mb-3">Oops!</h3>
              <p className="text-gray-500 mb-6">Please enter a message before sending your reply.</p>
              <button onClick={() => setModalState('reply')} className="px-8 py-2.5 bg-transparent border border-gray-400 text-gray-600 rounded-lg hover:bg-gray-50 font-medium transition-colors w-full">Go Back</button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
