"use client";

import { useState, useEffect } from 'react';
import { Bell, Check, Clock, ShoppingCart, X } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function CashierNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async (pageToFetch = page) => {
    try {
      const res = await fetch(`/api/notifications?page=${pageToFetch}&limit=10`);
      const data = await res.json();
      if (data && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        setTotalPages(data.totalPages || 1);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(page);
    // Refresh every 10 seconds to act as a pseudo-realtime polling system
    const interval = setInterval(() => fetchNotifications(page), 10000);
    return () => clearInterval(interval);
  }, [page]);

  const handleAction = async (id: string, action: 'PAID' | 'UNPAID') => {
    try {
      const res = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      });
      if (res.ok) {
        const updated = await res.json();
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, isRead: true, title: updated.title } : n)
        );
        setUnreadCount(prev => Math.max(prev - 1, 0));
      }
    } catch (error) {
      console.error(`Failed to mark notification as ${action}:`, error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      });
      if (res.ok) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, isRead: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT':
        return <ShoppingCart size={20} className="text-white" />;
      default:
        return <Bell size={20} className="text-white" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 w-full h-[60vh] justify-center items-center">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium tracking-wide">Loading Alerts...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-100 text-purple-600">
            <Bell size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#111] uppercase tracking-wide">Notifications</h2>
            <p className="text-sm font-semibold text-gray-500">You have {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)] overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-4 text-gray-400">
            <Bell size={48} strokeWidth={1} />
            <p className="text-lg font-medium">No notifications yet. You're all caught up!</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`p-6 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors ${!notification.isRead ? 'bg-purple-50/50 hover:bg-purple-50' : 'hover:bg-gray-50'}`}
              >
                <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${!notification.isRead ? 'bg-[#bd00ff]' : 'bg-gray-300'}`}>
                  {getIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                    <h3 className={`text-base font-bold truncate ${!notification.isRead ? 'text-[#111]' : 'text-gray-600'}`}>
                      {notification.title}
                    </h3>
                    {notification.title.toLowerCase().includes('paid') && !notification.title.toLowerCase().includes('unpaid') && (
                      <span className="shrink-0 bg-green-100 text-green-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full shadow-sm">
                        PAID
                      </span>
                    )}
                    {notification.title.toLowerCase().includes('unpaid') && (
                      <span className="shrink-0 bg-red-100 text-red-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full shadow-sm">
                        UNPAID
                      </span>
                    )}
                    {!notification.isRead && (
                      <span className="shrink-0 bg-red-500 w-2.5 h-2.5 rounded-full shadow-sm animate-pulse"></span>
                    )}
                  </div>
                  <p className={`text-sm leading-relaxed ${!notification.isRead ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400 font-medium">
                    <Clock size={12} />
                    {new Date(notification.createdAt).toLocaleString(undefined, { 
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                  </div>
                </div>

                {!(notification.title.toLowerCase().includes('paid') || notification.title.toLowerCase().includes('unpaid')) && (
                  <div className="flex items-center gap-2 sm:self-center">
                    <button 
                      onClick={() => handleAction(notification.id, 'PAID')}
                      className="shrink-0 px-4 py-2 bg-green-50 border border-green-200 text-green-700 font-bold text-sm rounded-lg hover:bg-green-100 hover:border-green-300 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      <Check size={16} strokeWidth={3} /> Paid
                    </button>
                    <button 
                      onClick={() => handleAction(notification.id, 'UNPAID')}
                      className="shrink-0 px-4 py-2 bg-red-50 border border-red-200 text-red-700 font-bold text-sm rounded-lg hover:bg-red-100 hover:border-red-300 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      <X size={16} strokeWidth={3} /> Unpaid
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
          <button
            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm rounded-xl border border-purple-100 transition-all cursor-pointer select-none"
          >
            Previous
          </button>
          
          <div className="flex items-center gap-1.5 px-3">
            <span className="text-sm font-semibold text-gray-500">Page</span>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 font-extrabold text-sm rounded-lg shadow-sm">
              {page}
            </span>
            <span className="text-sm font-semibold text-gray-500">of</span>
            <span className="text-sm font-bold text-gray-700">
              {totalPages}
            </span>
          </div>

          <button
            onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm rounded-xl border border-purple-100 transition-all cursor-pointer select-none"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
