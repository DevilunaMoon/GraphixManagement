"use client";

import { useState, useEffect } from 'react';
import { Bell, Check, Clock, ShoppingCart, X, AlertTriangle, AlertCircle, Package, CheckCheck, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  branch?: string;
  isRead: boolean;
  createdAt: string;
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      console.error('Failed to fetch admin notifications:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications(page);
    const interval = setInterval(() => fetchNotifications(page), 10000);
    return () => clearInterval(interval);
  }, [page]);

  const handleAction = async (id: string, action: 'READ' | 'PAID' | 'UNPAID') => {
    try {
      const res = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      });
      if (res.ok) {
        const updated = await res.json();
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, isRead: true, title: updated.title || n.title } : n)
        );
        setUnreadCount(prev => Math.max(prev - 1, 0));
        setFeedbackMessage('Notification marked as read.');
        setTimeout(() => setFeedbackMessage(null), 3000);
      }
    } catch (error) {
      console.error('Failed to mark notification:', error);
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
        setFeedbackMessage('All notifications marked as read.');
        setTimeout(() => setFeedbackMessage(null), 3000);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'STOCK_OUT':
        return <AlertTriangle size={20} className="text-white" />;
      case 'STOCK_LOW':
        return <AlertCircle size={20} className="text-white" />;
      case 'PAYMENT':
        return <ShoppingCart size={20} className="text-white" />;
      default:
        return <Bell size={20} className="text-white" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 w-full h-[60vh] justify-center items-center">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-[#5c0099] rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium tracking-wide">Loading Notifications...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full font-['Inter']">
      {feedbackMessage && (
        <div className="bg-emerald-600 text-white font-bold px-6 py-4 rounded-xl shadow-lg flex items-center justify-between transition-all duration-300 animate-in fade-in slide-in-from-top-4">
          <span className="text-sm tracking-wide">{feedbackMessage}</span>
          <button onClick={() => setFeedbackMessage(null)} className="text-white hover:text-gray-200 bg-transparent border-none outline-none font-black ml-4 cursor-pointer">✕</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-100 text-[#5c0099]">
            <Bell size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#111] uppercase tracking-wide">System Notifications</h2>
            <p className="text-sm font-semibold text-gray-500">
              {unreadCount > 0 ? `You have ${unreadCount} unread alert${unreadCount !== 1 ? 's' : ''}` : "You're all caught up with your alerts"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchNotifications(page);
            }}
            title="Refresh"
            className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-xl border border-gray-200 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-[#5c0099] font-bold text-xs rounded-xl border border-purple-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <CheckCheck size={16} /> Mark All as Read
            </button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)] overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-4 text-gray-400">
            <Bell size={48} strokeWidth={1} />
            <p className="text-lg font-medium">No notifications yet. Everything is in good order!</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {notifications.map((notification) => {
              const isStockOut = notification.type === 'STOCK_OUT';
              const isStockLow = notification.type === 'STOCK_LOW';
              const isStockAlert = isStockOut || isStockLow;

              let iconBg = !notification.isRead ? 'bg-[#5c0099]' : 'bg-gray-300';
              if (isStockOut) iconBg = !notification.isRead ? 'bg-rose-500' : 'bg-gray-400';
              if (isStockLow) iconBg = !notification.isRead ? 'bg-amber-500' : 'bg-gray-400';

              return (
                <div 
                  key={notification.id} 
                  className={`p-6 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors ${
                    !notification.isRead 
                      ? isStockOut 
                        ? 'bg-rose-50/40 hover:bg-rose-50/60' 
                        : isStockLow 
                          ? 'bg-amber-50/40 hover:bg-amber-50/60' 
                          : 'bg-purple-50/50 hover:bg-purple-50' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${iconBg}`}>
                    {getIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                      <h3 className={`text-base font-bold truncate ${!notification.isRead ? 'text-[#111]' : 'text-gray-600'}`}>
                        {notification.title}
                      </h3>
                      {isStockOut && (
                        <span className="shrink-0 bg-rose-100 text-rose-800 text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm border border-rose-200">
                          OUT OF STOCK
                        </span>
                      )}
                      {isStockLow && (
                        <span className="shrink-0 bg-amber-100 text-amber-800 text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm border border-amber-200">
                          LOW STOCK
                        </span>
                      )}
                      {notification.branch && (
                        <span className="shrink-0 bg-purple-100 text-[#5c0099] text-xs font-bold px-2 py-0.5 rounded-md border border-purple-200">
                          {notification.branch}
                        </span>
                      )}
                      {!notification.isRead && (
                        <span className="shrink-0 bg-rose-500 w-2.5 h-2.5 rounded-full shadow-sm animate-pulse"></span>
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

                  {/* Actions */}
                  <div className="flex items-center gap-2 sm:self-center">
                    {isStockAlert && (
                      <Link 
                        href="/admin/inventory"
                        className="shrink-0 px-3.5 py-2 bg-purple-100 text-[#5c0099] hover:bg-purple-200 font-bold text-xs rounded-lg transition-all shadow-sm flex items-center gap-1.5 no-underline"
                      >
                        <Package size={14} /> Restock Device
                      </Link>
                    )}
                    {!notification.isRead && (
                      <button 
                        onClick={() => handleAction(notification.id, 'READ')}
                        className="shrink-0 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-lg transition-all shadow-sm flex items-center gap-1 cursor-pointer border-none"
                      >
                        <Check size={14} /> Mark Read
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
          <button
            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-purple-50 text-[#5c0099] hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm rounded-xl border border-purple-100 transition-all cursor-pointer select-none"
          >
            Previous
          </button>
          
          <div className="flex items-center gap-1.5 px-3">
            <span className="text-sm font-semibold text-gray-500">Page</span>
            <span className="px-3 py-1 bg-purple-100 text-[#5c0099] font-extrabold text-sm rounded-lg shadow-sm">
              {page}
            </span>
            <span className="text-sm font-semibold text-gray-500">of {totalPages}</span>
          </div>

          <button
            onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-purple-50 text-[#5c0099] hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm rounded-xl border border-purple-100 transition-all cursor-pointer select-none"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
