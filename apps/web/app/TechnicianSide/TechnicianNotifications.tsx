"use client";

import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Clock, Wrench, RefreshCw, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  branch?: string;
  isRead: boolean;
  createdAt: string;
}

export default function TechnicianNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Pagination states (10 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  const fetchNotifications = async (pageToFetch = currentPage) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?page=${pageToFetch}&limit=${itemsPerPage}`);
      const data = await res.json();
      if (data && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.totalCount || 0);
      } else if (Array.isArray(data)) {
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.isRead).length);
        setTotalPages(Math.ceil(data.length / itemsPerPage) || 1);
        setTotalCount(data.length);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(currentPage);
  }, [currentPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'READ' })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('notificationsUpdated'));
        }
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('notificationsUpdated'));
        }
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  return (
    <main className="flex-1 p-3.5 sm:p-6 md:p-8 flex flex-col gap-6 max-w-5xl w-full mx-auto font-['Inter']">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-purple-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8b00cc] to-[#bd00ff] text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Bell size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight m-0">
                Technician Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-purple-600 text-white">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 font-medium m-0 mt-0.5">
              Repair assignments, status updates, and customer notes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#8b00cc] font-bold text-xs transition-colors flex items-center gap-1.5 border border-purple-200 cursor-pointer"
            >
              <CheckCheck size={15} />
              <span>Mark all read</span>
            </button>
          )}
          <button
            onClick={() => fetchNotifications(currentPage)}
            disabled={loading}
            className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer border-none"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="p-16 text-center text-xs text-gray-400 font-medium">
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-[#8b00cc] flex items-center justify-center">
            <Bell size={22} />
          </div>
          <h3 className="text-sm font-bold text-gray-900 m-0">No notifications yet</h3>
          <p className="text-xs text-gray-500 m-0">You are all caught up with your notifications.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && handleMarkAsRead(n.id)}
              className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-start gap-4 cursor-pointer ${
                n.isRead 
                  ? 'bg-white border-gray-100 hover:border-purple-200' 
                  : 'bg-purple-50/50 border-purple-200 shadow-sm'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                n.isRead ? 'bg-gray-100 text-gray-500' : 'bg-purple-100 text-[#8b00cc]'
              }`}>
                <Wrench size={18} />
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-gray-900 m-0 truncate">
                    {n.title}
                  </h4>
                  <span className="text-[10px] text-gray-400 font-medium shrink-0 flex items-center gap-1">
                    <Clock size={11} />
                    {new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-gray-600 m-0 font-medium leading-relaxed">
                  {n.message}
                </p>
                {n.branch && (
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md w-fit mt-1">
                    📍 {n.branch} Branch
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-purple-100">
          <span className="text-xs font-semibold text-gray-500">
            Showing <span className="text-gray-900 font-bold">{totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of <span className="text-gray-900 font-bold">{totalCount}</span> notifications
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-3 bg-[#FAF7FF] px-3.5 py-1.5 rounded-xl border border-[#E9D8FD]">
              <button
                onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1 || loading}
                className="w-8 h-8 rounded-lg bg-white border border-[#E9D8FD] text-[#5b4a7a] hover:text-[#9333EA] hover:border-[#9333EA] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-[#5b4a7a] disabled:hover:border-[#E9D8FD] flex justify-center items-center cursor-pointer transition-all shadow-2xs"
                title="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="font-semibold text-xs text-[#5b4a7a] px-1">
                Page <span className="text-[#1F1728] font-bold">{currentPage}</span> of <span className="text-[#1F1728] font-bold">{totalPages}</span>
              </span>

              <button
                onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages || loading}
                className="w-8 h-8 rounded-lg bg-white border border-[#E9D8FD] text-[#5b4a7a] hover:text-[#9333EA] hover:border-[#9333EA] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-[#5b4a7a] disabled:hover:border-[#E9D8FD] flex justify-center items-center cursor-pointer transition-all shadow-2xs"
                title="Next Page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
