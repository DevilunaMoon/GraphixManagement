"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Bell, CheckCheck, MessageSquare, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  title: string;
  message: string;
  type?: string;
  isRead: boolean;
  createdAt: string;
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timePart = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart} • ${timePart}`;
};

export default function CustomerNotifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  const fetchNotifications = async (pageToFetch = currentPage) => {
    try {
      const res = await fetch(`/api/notifications?page=${pageToFetch}&limit=${itemsPerPage}`);
      const data = await res.json();
      if (data && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        setTotalPages(data.totalPages || 1);
        window.dispatchEvent(new Event('notificationsUpdated'));
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
        window.dispatchEvent(new Event('notificationsUpdated'));
      }
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      try {
        await fetch('/api/notifications/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: notif.id })
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
        window.dispatchEvent(new Event('notificationsUpdated'));
      } catch (e) {
        console.error('Failed to mark notification as read:', e);
      }
    }

    // Extract product link if present
    const linkMatch = notif.message.match(/\[ProductLink:\s*([^\]]+)\]/i);
    if (linkMatch?.[1]) {
      const targetUrl = linkMatch[1].includes('#') ? linkMatch[1] : `${linkMatch[1]}#reviews`;
      router.push(targetUrl);
    }
  };

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-8 font-['Inter'] flex justify-center overflow-y-auto w-full">
      <div className="w-full max-w-7xl flex flex-col gap-6">
        
        <section className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-gray-200/70 flex flex-col min-h-[650px] w-full">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 border-b border-gray-200 pb-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-100 text-[#bd00ff]">
                <Bell size={22} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-[#bd00ff] m-0 border-none">Notifications</h2>
            </div>
            <button 
              onClick={handleMarkAllRead}
              className="px-4 py-2 border-2 text-sm sm:text-base border-[#bd00ff] text-[#bd00ff] font-bold rounded-xl bg-purple-50 hover:bg-[#bd00ff] hover:text-white transition-colors cursor-pointer w-full sm:w-auto flex items-center justify-center gap-1.5"
            >
              <CheckCheck size={18} /> Mark All as Read
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
                <Bell size={44} strokeWidth={1.5} />
                <p className="text-lg font-medium">No notifications yet. You're all caught up!</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const linkMatch = notif.message.match(/\[ProductLink:\s*([^\]]+)\]/i);
                const hasLink = Boolean(linkMatch?.[1]);
                const cleanMessage = notif.message.replace(/\[ProductLink:\s*[^\]]+\]/gi, '').trim();

                return (
                  <div 
                    key={notif.id} 
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 sm:p-6 rounded-2xl border transition-all cursor-pointer ${
                      hasLink ? 'hover:shadow-md hover:border-[#bd00ff]' : ''
                    } ${
                      !notif.isRead 
                        ? 'bg-gradient-to-r from-purple-50/70 to-white border-l-4 border-[#bd00ff] border-y-purple-100 border-r-purple-100 shadow-sm' 
                        : 'bg-white border-gray-200 hover:border-purple-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2 flex-wrap justify-between">
                      <div className="flex items-center gap-2">
                        {notif.type === 'REVIEW_REPLY' ? (
                          <div className="w-7 h-7 rounded-lg bg-purple-100 text-[#bd00ff] flex items-center justify-center shrink-0">
                            <MessageSquare size={15} />
                          </div>
                        ) : null}
                        <h4 className={`text-base sm:text-lg m-0 border-none ${!notif.isRead ? 'font-black text-gray-900' : 'font-bold text-gray-800'}`}>
                          {notif.title}
                        </h4>
                        {!notif.isRead && (
                          <span className="bg-red-500 w-2.5 h-2.5 rounded-full shadow-sm"></span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200/60 shadow-sm">
                        <Clock size={12} className="text-[#bd00ff]" />
                        <span>{formatDateTime(notif.createdAt)}</span>
                      </div>
                    </div>
                    <p className={`m-0 leading-relaxed text-sm sm:text-base ${!notif.isRead ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
                      {cleanMessage}
                    </p>
                    {hasLink && (
                      <div className="mt-2 text-xs font-bold text-[#bd00ff] hover:underline flex items-center gap-1">
                        <span>View Product Reviews</span>
                        <ExternalLink size={12} />
                      </div>
                    )}
                  </div>
                );
              })
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
