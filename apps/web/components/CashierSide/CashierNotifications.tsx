"use client";

import { useState, useEffect } from 'react';
import { Bell, Check, Clock, ShoppingCart } from 'lucide-react';

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

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh every 10 seconds to act as a pseudo-realtime polling system
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
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

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-purple-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex justify-between items-center">
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
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`text-base font-bold truncate ${!notification.isRead ? 'text-[#111]' : 'text-gray-600'}`}>
                      {notification.title}
                    </h3>
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

                {!notification.isRead && (
                  <button 
                    onClick={() => markAsRead(notification.id)}
                    className="shrink-0 mt-3 sm:mt-0 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-semibold text-sm rounded-lg hover:bg-gray-50 hover:text-[#bd00ff] hover:border-[#bd00ff]/30 transition-all shadow-sm flex items-center gap-2"
                  >
                    <Check size={16} /> Mark as Read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
