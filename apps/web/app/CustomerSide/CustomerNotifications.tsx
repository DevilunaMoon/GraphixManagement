"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function CustomerNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 5;

  const fetchNotifications = async (pageToFetch = currentPage) => {
    try {
      const res = await fetch(`/api/notifications?page=${pageToFetch}&limit=${itemsPerPage}`);
      const data = await res.json();
      if (data && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(currentPage);
  }, [currentPage]);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  return (
    <main className="flex-1 p-3 sm:p-6 md:p-10 font-['Inter'] flex justify-center overflow-y-auto">
      <div className="w-full max-w-5xl flex flex-col gap-4 sm:gap-6">
        
        <section className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10 shadow-sm border border-gray-100 flex flex-col min-h-[600px]">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 border-b border-gray-200 pb-4 mb-4 sm:mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-[#bd00ff] m-0 border-none">Notification</h2>
            <button 
              onClick={handleMarkAllRead}
              className="px-4 py-2 border-2 text-sm sm:text-base border-[#bd00ff] text-[#bd00ff] font-bold rounded-xl bg-purple-50 hover:bg-[#bd00ff] hover:text-white transition-colors cursor-pointer w-full sm:w-auto"
            >
              Mark as Read
            </button>
          </div>

          <div className="flex flex-col gap-4 flex-1">
            {loading ? (
              <div className="flex flex-col gap-4 w-full h-[300px] justify-center items-center">
                <div className="w-10 h-10 border-4 border-purple-200 border-t-[#bd00ff] rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium">Loading Notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-4 text-gray-400 my-auto">
                <p className="text-lg font-medium">No notifications yet. You're all caught up!</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-4 sm:p-6 rounded-2xl border transition-all md:hover:translate-x-1 ${
                    !notif.isRead 
                      ? 'bg-gradient-to-r from-purple-50 to-white border-l-4 border-[#bd00ff] border-y-gray-200 border-r-gray-200 shadow-sm' 
                      : 'bg-white border-gray-200 hover:border-[#bd00ff]'
                  }`}
                >
                  <h4 className={`text-lg m-0 mb-2 border-none ${!notif.isRead ? 'font-extrabold text-black' : 'font-bold text-gray-800'}`}>
                    {notif.title}
                  </h4>
                  <p className={`m-0 leading-relaxed ${!notif.isRead ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
                    {notif.message}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex justify-center items-center mt-8 gap-3">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 flex justify-center items-center rounded-full border-none bg-gray-100 text-black cursor-pointer disabled:opacity-50 hover:bg-gray-200 transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex gap-2">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-10 h-10 flex justify-center items-center rounded-xl font-bold transition-colors cursor-pointer border ${
                      currentPage === i + 1 
                        ? 'bg-[#bd00ff] text-white border-[#bd00ff] shadow-md' 
                        : 'bg-white text-black border-gray-200 hover:border-[#bd00ff]'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-10 h-10 flex justify-center items-center rounded-full border-none bg-gray-100 text-black cursor-pointer disabled:opacity-50 hover:bg-gray-200 transition-colors"
                aria-label="Next page"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}

        </section>

      </div>
    </main>
  );
}
