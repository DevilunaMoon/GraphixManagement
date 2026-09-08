"use client";

import { useState, useEffect } from 'react';
import { Bell, Check, Clock, ShoppingCart, X, AlertTriangle, AlertCircle, Package, ArrowRight, CheckCheck, RotateCcw } from 'lucide-react';
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

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timePart = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart} • ${timePart}`;
};

export default function CashierNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Update clock every 30 seconds for live 8-hour countdown and auto-expiration
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

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
    const interval = setInterval(() => fetchNotifications(page), 10000);
    return () => clearInterval(interval);
  }, [page]);

  const handleAction = async (id: string, action: 'PAID' | 'UNPAID' | 'READ' | 'RELEASE_STOCK') => {
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
        if (action === 'PAID') {
          setFeedbackMessage('Transaction marked as PAID successfully!');
        } else if (action === 'UNPAID') {
          setFeedbackMessage('Unpaid pending notification sent to customer successfully!');
        } else if (action === 'RELEASE_STOCK') {
          setFeedbackMessage('Stock released back to inventory and customer notified successfully!');
        } else {
          setFeedbackMessage('Notification marked as read.');
        }
        setTimeout(() => setFeedbackMessage(null), 3000);
      }
    } catch (error) {
      console.error(`Failed to mark notification:`, error);
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
      case 'CASH_RESERVATION':
        return <Clock size={20} className="text-white" />;
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
      {feedbackMessage && (
        <div className="bg-green-600 text-white font-bold px-6 py-4 rounded-xl shadow-lg flex items-center justify-between transition-all duration-300 animate-in fade-in slide-in-from-top-4 duration-300">
          <span className="text-sm tracking-wide">{feedbackMessage}</span>
          <button onClick={() => setFeedbackMessage(null)} className="text-white hover:text-gray-200 bg-transparent border-none outline-none font-black ml-4 cursor-pointer">✕</button>
        </div>
      )}

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
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl border border-purple-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <CheckCheck size={16} /> Mark All as Read
          </button>
        )}
      </div>

      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)] overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-4 text-gray-400">
            <Bell size={48} strokeWidth={1} />
            <p className="text-lg font-medium">No notifications yet. You're all caught up!</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {notifications.map((notification) => {
              const isStockOut = notification.type === 'STOCK_OUT';
              const isStockLow = notification.type === 'STOCK_LOW';
              const isStockAlert = isStockOut || isStockLow;

              const isCashReservation = notification.type === 'CASH_RESERVATION' || 
                notification.title.toLowerCase().includes('cash on pickup') || 
                notification.title.toLowerCase().includes('cash reservation');

              const isPaid = notification.title.toLowerCase().includes('paid') && !notification.title.toLowerCase().includes('unpaid');
              const isUnpaid = notification.title.toLowerCase().includes('unpaid');
              const isStockReleased = notification.title.toLowerCase().includes('stock released') || notification.title.toLowerCase().includes('released');

              // Strict 8-hour claim deadline calculation
              const createdAtMs = new Date(notification.createdAt).getTime();
              const expiresAtMs = createdAtMs + (8 * 60 * 60 * 1000);
              const is8HoursPassed = now >= expiresAtMs;

              const diffMs = Math.max(0, expiresAtMs - now);
              const remainingHrs = Math.floor(diffMs / (1000 * 60 * 60));
              const remainingMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

              let iconBg = !notification.isRead ? 'bg-[#bd00ff]' : 'bg-gray-300';
              if (isStockOut) iconBg = !notification.isRead ? 'bg-rose-500' : 'bg-gray-400';
              if (isStockLow) iconBg = !notification.isRead ? 'bg-amber-500' : 'bg-gray-400';
              if (isCashReservation) {
                if (isPaid) iconBg = !notification.isRead ? 'bg-emerald-600' : 'bg-gray-400';
                else if (isStockReleased) iconBg = 'bg-gray-400';
                else if (is8HoursPassed) iconBg = !notification.isRead ? 'bg-red-600' : 'bg-gray-400';
                else iconBg = !notification.isRead ? 'bg-amber-500' : 'bg-gray-400';
              }

              let cardBg = 'hover:bg-gray-50';
              if (!notification.isRead) {
                if (isStockOut) cardBg = 'bg-rose-50/40 hover:bg-rose-50/60';
                else if (isStockLow) cardBg = 'bg-amber-50/40 hover:bg-amber-50/60';
                else if (isCashReservation) {
                  if (is8HoursPassed && !isPaid && !isStockReleased) cardBg = 'bg-red-50/40 hover:bg-red-50/60';
                  else cardBg = 'bg-amber-50/30 hover:bg-amber-50/50';
                } else {
                  cardBg = 'bg-purple-50/50 hover:bg-purple-50';
                }
              }

              return (
                <div 
                  key={notification.id} 
                  className={`p-6 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors ${cardBg}`}
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
                      {isCashReservation && !isPaid && !isStockReleased && is8HoursPassed && (
                        <span className="shrink-0 bg-red-100 text-red-800 text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm border border-red-300">
                          EXPIRED (8-HOUR LIMIT PASSED)
                        </span>
                      )}
                      {isCashReservation && !isPaid && !isStockReleased && !is8HoursPassed && (
                        <span className="shrink-0 bg-amber-100 text-amber-900 text-xs font-extrabold px-2.5 py-0.5 rounded-full shadow-sm border border-amber-300">
                          RESERVED (8H WINDOW)
                        </span>
                      )}
                      {isStockReleased && (
                        <span className="shrink-0 bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm border border-gray-300">
                          EXPIRED & RELEASED
                        </span>
                      )}
                      {isPaid && (
                        <span className="shrink-0 bg-green-100 text-green-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full shadow-sm">
                          PAID
                        </span>
                      )}
                      {isUnpaid && (
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

                    {/* Cash on Pickup 8-Hour Status Banner */}
                    {isCashReservation && !isPaid && !isStockReleased && (
                      is8HoursPassed ? (
                        <div className="mt-2.5 p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-800 font-semibold gap-2">
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-red-600 shrink-0" />
                            <span>8-hour physical store claim window has expired. Reservation is automatically expired.</span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 font-semibold gap-2">
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-amber-600 shrink-0 animate-pulse" />
                            <span>In-Store Claim Window: <strong>{remainingHrs}h {remainingMins}m remaining</strong> before automatic expiration</span>
                          </div>
                        </div>
                      )
                    )}

                    <div className="flex items-center gap-1.5 mt-2.5 text-xs text-gray-500 font-semibold bg-gray-50 w-max px-2.5 py-1 rounded-full border border-gray-200/60 shadow-sm">
                      <Clock size={12} className="text-[#bd00ff]" />
                      <span>{formatDateTime(notification.createdAt)}</span>
                      {notification.branch && (
                        <span className="ml-1 text-[#bd00ff]">• {notification.branch}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {isStockAlert ? (
                    <div className="flex items-center gap-2 sm:self-center">
                      <Link 
                        href="/cashier/devices"
                        className="shrink-0 px-3.5 py-2 bg-purple-100 text-purple-800 hover:bg-purple-200 font-bold text-xs rounded-lg transition-all shadow-sm flex items-center gap-1.5 no-underline"
                      >
                        <Package size={14} /> Restock
                      </Link>
                      {!notification.isRead && (
                        <button 
                          onClick={() => handleAction(notification.id, 'READ')}
                          className="shrink-0 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-lg transition-all shadow-sm flex items-center gap-1 cursor-pointer border-none"
                        >
                          <Check size={14} /> Read
                        </button>
                      )}
                    </div>
                  ) : isCashReservation ? (
                    !isPaid && !isStockReleased && (
                      <div className="flex items-center gap-2 sm:self-center">
                        {is8HoursPassed ? (
                          // Automatically expired: Cashier only needs the "Release Stock" button to return stock to store
                          <button 
                            onClick={() => handleAction(notification.id, 'RELEASE_STOCK')}
                            className="shrink-0 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer border-none"
                            title="Release reserved stock back to store inventory"
                          >
                            <RotateCcw size={15} strokeWidth={2.5} /> Release Stock
                          </button>
                        ) : (
                          // Within 8 hours: Cashier can confirm payment or release early
                          <>
                            <button 
                              onClick={() => handleAction(notification.id, 'PAID')}
                              className="shrink-0 px-4 py-2 bg-green-50 border border-green-200 text-green-700 font-bold text-sm rounded-lg hover:bg-green-100 hover:border-green-300 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                            >
                              <Check size={16} strokeWidth={3} /> Paid
                            </button>
                            <button 
                              onClick={() => handleAction(notification.id, 'RELEASE_STOCK')}
                              className="shrink-0 px-3.5 py-2 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 font-bold text-xs rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                              title="Cancel reservation and return stock to inventory"
                            >
                              <RotateCcw size={14} strokeWidth={2.5} /> Release Stock
                            </button>
                          </>
                        )}
                      </div>
                    )
                  ) : (
                    !(notification.title.toLowerCase().includes('paid') || notification.title.toLowerCase().includes('unpaid')) && (
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
                    )
                  )}
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
