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
  const [isMarking, setIsMarking] = useState(false);
  const itemsPerPage = 10;

  const hasUnread = notifications.some(n => !n.isRead);

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
    if (isMarking || !hasUnread) return;
    setIsMarking(true);
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
    } finally {
      setIsMarking(false);
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
        
        <section className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-purple-100/90 flex flex-col min-h-[650px] w-full">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-purple-100/80 pb-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-purple-50 text-[#8b00cc] border border-purple-100/80 shadow-sm">
                <Bell size={22} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-wide m-0 border-none">
                  Notifications
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 font-medium m-0 mt-0.5">
                  Stay updated on your orders, payments, and repair progress
                </p>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.currentTarget.blur();
                handleMarkAllRead();
              }}
              disabled={!hasUnread || isMarking}
              className={`px-4 py-2 text-xs sm:text-sm border rounded-xl font-bold transition-all w-full sm:w-auto flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
                hasUnread
                  ? 'border-purple-100/90 text-[#8b00cc] bg-purple-50 hover:bg-gradient-to-r hover:from-[#8b00cc] hover:to-[#bd00ff] hover:text-white cursor-pointer'
                  : 'border-gray-200 text-gray-400 bg-gray-50/80 cursor-default opacity-70'
              }`}
            >
              {isMarking ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  <span>Marking...</span>
                </>
              ) : (
                <>
                  <CheckCheck size={16} />
                  <span>{hasUnread ? 'Mark All as Read' : 'All Read'}</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-col gap-3.5 flex-1">
            {loading ? (
              <div className="flex flex-col gap-4 w-full h-[300px] justify-center items-center">
                <div className="w-10 h-10 border-4 border-purple-100 border-t-[#8b00cc] rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium text-sm">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-gray-400 my-auto bg-purple-50/40 rounded-2xl border border-dashed border-purple-200">
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-[#8b00cc] shadow-sm border border-purple-100">
                  <Bell size={28} strokeWidth={1.75} />
                </div>
                <h3 className="text-base font-bold text-gray-700 m-0 border-none">No notifications yet</h3>
                <p className="text-xs text-gray-500 m-0">You're completely caught up! Updates about your account will show up here.</p>
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
                    className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                      !notif.isRead 
                        ? 'bg-gradient-to-r from-purple-50/70 via-purple-50/20 to-white border-l-4 border-l-[#8b00cc] border-purple-100 shadow-sm hover:shadow-md' 
                        : 'bg-white border-gray-100 hover:border-purple-200 hover:shadow-sm opacity-90 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {notif.type === 'REVIEW_REPLY' ? (
                          <div className="w-7 h-7 rounded-lg bg-purple-100 text-[#8b00cc] flex items-center justify-center shrink-0">
                            <MessageSquare size={14} />
                          </div>
                        ) : null}
                        <h4 className={`text-sm sm:text-base m-0 border-none truncate ${!notif.isRead ? 'font-bold text-gray-950' : 'font-semibold text-gray-800'}`}>
                          {notif.title}
                        </h4>
                        {!notif.isRead && (
                          <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100 shrink-0">
                        <Clock size={12} className="text-[#8b00cc]" />
                        <span>{formatDateTime(notif.createdAt)}</span>
                      </div>
                    </div>

                    <p className={`m-0 leading-relaxed text-xs sm:text-sm ${!notif.isRead ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
                      {cleanMessage}
                    </p>

                    {hasLink && (
                      <div className="text-xs font-bold text-[#8b00cc] hover:underline flex items-center gap-1 pt-1">
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
            <div className="flex justify-center items-center mt-8 gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-9 h-9 flex justify-center items-center rounded-xl border border-purple-100 bg-white text-gray-600 cursor-pointer disabled:opacity-40 hover:text-[#8b00cc] hover:border-purple-200 transition-colors shadow-xs"
                aria-label="Previous page"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="flex gap-1.5">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-9 h-9 flex justify-center items-center rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer border ${
                      currentPage === i + 1 
                        ? 'bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white border-transparent shadow-sm' 
                        : 'bg-white text-gray-700 border-purple-100 hover:border-purple-300'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-9 h-9 flex justify-center items-center rounded-xl border border-purple-100 bg-white text-gray-600 cursor-pointer disabled:opacity-40 hover:text-[#8b00cc] hover:border-purple-200 transition-colors shadow-xs"
                aria-label="Next page"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}

        </section>

      </div>
    </main>
  );
}
