"use client";

import { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Bell, 
  CheckCheck, 
  MessageSquare, 
  Receipt,
  Wrench,
  HelpCircle,
  X,
  Copy,
  Check,
  ArrowRight,
  Building2,
  Tag
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  title: string;
  message: string;
  type?: string;
  branch?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface ParsedNotification {
  category: string;
  categoryBadgeClass: string;
  iconBgClass: string;
  iconType: 'order' | 'repair' | 'support' | 'review' | 'reservation' | 'system';
  actionLabel: string;
  actionUrl: string;
  claimCode: string | null;
  orderId: string | null;
  cleanMessage: string;
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timePart = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart} • ${timePart}`;
};

const parseNotification = (notif: Notification): ParsedNotification => {
  const rawMsg = notif.message || '';
  const title = notif.title || '';
  const type = (notif.type || '').toUpperCase();

  // Extract Product Link if present
  const productLinkMatch = rawMsg.match(/\[ProductLink:\s*([^\]]+)\]/i);
  const productLink = productLinkMatch?.[1]
    ? (productLinkMatch[1].includes('#') ? productLinkMatch[1] : `${productLinkMatch[1]}#reviews`)
    : null;

  // Extract Claim Code / Order Reference
  const claimCodeMatch = rawMsg.match(/\[ClaimCode:\s*([^\]]+)\]/i) || rawMsg.match(/Claim Code:\s*([A-Za-z0-9#-]+)/i);
  const orderIdMatch = title.match(/Order\s+([A-Za-z0-9#-]+)/i) || rawMsg.match(/Order\s+([A-Za-z0-9#-]+)/i);

  const extractedClaimCode = claimCodeMatch?.[1]?.trim() || null;
  const extractedOrderId = orderIdMatch?.[1]?.replace(/^#/, '').trim() || null;
  const refCode = extractedOrderId || (extractedClaimCode ? extractedClaimCode.replace(/^#/, '') : null);

  // Clean raw message of internal bracket tags
  const cleanMessage = rawMsg
    .replace(/\[ProductLink:\s*[^\]]+\]/gi, '')
    .replace(/\[ClaimCode:\s*[^\]]+\]/gi, '')
    .replace(/\[Deadline:\s*[^\]]+\]/gi, '')
    .replace(/\[CustomerId:\s*[^\]]+\]/gi, '')
    .trim();

  // 1. Review Replies
  if (type === 'REVIEW_REPLY' || title.toLowerCase().includes('replied to your review')) {
    return {
      category: 'Product Feedback',
      categoryBadgeClass: 'bg-purple-100 text-[#8b00cc] border-purple-200',
      iconBgClass: 'bg-purple-100 text-[#8b00cc]',
      iconType: 'review',
      actionLabel: 'View Product Review',
      actionUrl: productLink || '/customer/products',
      claimCode: null,
      orderId: null,
      cleanMessage,
    };
  }

  // 2. Repair Monitoring
  if (type === 'REPAIR' || type === 'REPAIR_REQUEST' || title.toLowerCase().includes('repair')) {
    return {
      category: 'Repair Monitoring',
      categoryBadgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
      iconBgClass: 'bg-blue-100 text-blue-600',
      iconType: 'repair',
      actionLabel: 'Track Repair Status',
      actionUrl: '/customer/monitoring',
      claimCode: null,
      orderId: null,
      cleanMessage,
    };
  }

  // 3. Customer Support Inquiries
  if (type === 'SUPPORT' || title.toLowerCase().includes('answered your question') || title.toLowerCase().includes('support')) {
    return {
      category: 'Customer Support',
      categoryBadgeClass: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      iconBgClass: 'bg-indigo-100 text-indigo-600',
      iconType: 'support',
      actionLabel: 'Open Help & Support',
      actionUrl: '/customer/settings/help',
      claimCode: null,
      orderId: null,
      cleanMessage,
    };
  }

  // 4. Cash on Pickup & In-Store Reservations
  if (type === 'CASH_RESERVATION' || title.toLowerCase().includes('cash on pickup') || title.toLowerCase().includes('reservation')) {
    const isExpired = title.toLowerCase().includes('expired');
    return {
      category: 'Store Reservation',
      categoryBadgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      iconBgClass: 'bg-amber-100 text-amber-700',
      iconType: 'reservation',
      actionLabel: isExpired ? 'Browse Store Products' : (refCode ? 'View Order & Receipt' : 'View My Receipts'),
      actionUrl: isExpired ? '/customer/products' : (refCode ? `/customer/receipt-view/${refCode}` : '/customer/digital-receipt'),
      claimCode: extractedClaimCode,
      orderId: extractedOrderId,
      cleanMessage,
    };
  }

  // 5. Orders & Payments & Digital Receipts
  if (
    type === 'PAYMENT' || 
    type === 'ORDER' || 
    title.toLowerCase().includes('gcash') || 
    title.toLowerCase().includes('receipt') || 
    title.toLowerCase().includes('downpayment') || 
    title.toLowerCase().includes('payment') ||
    title.toLowerCase().includes('device handed over')
  ) {
    return {
      category: 'Order & Payment',
      categoryBadgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      iconBgClass: 'bg-emerald-100 text-emerald-700',
      iconType: 'order',
      actionLabel: refCode ? 'View Digital Receipt' : 'View My Receipts',
      actionUrl: refCode ? `/customer/receipt-view/${refCode}` : '/customer/digital-receipt',
      claimCode: extractedClaimCode,
      orderId: extractedOrderId,
      cleanMessage,
    };
  }

  // 6. Default System Notice
  return {
    category: 'System Notice',
    categoryBadgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
    iconBgClass: 'bg-gray-100 text-gray-600',
    iconType: 'system',
    actionLabel: 'Go to Dashboard',
    actionUrl: '/customer/dashboard',
    claimCode: null,
    orderId: null,
    cleanMessage,
  };
};

const renderNotificationIcon = (iconType: string, className = "w-4 h-4") => {
  switch (iconType) {
    case 'order':
      return <Receipt className={className} />;
    case 'repair':
      return <Wrench className={className} />;
    case 'support':
      return <HelpCircle className={className} />;
    case 'review':
      return <MessageSquare className={className} />;
    case 'reservation':
      return <Clock className={className} />;
    default:
      return <Bell className={className} />;
  }
};

export default function CustomerNotifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isMarking, setIsMarking] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNotification(null);
      }
    };
    if (selectedNotification) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNotification]);

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
    setSelectedNotification(notif);
    setCopiedCode(false);

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
  };

  const handleCopyClaimCode = (code: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleModalAction = (url: string) => {
    setSelectedNotification(null);
    router.push(url);
  };

  return (
    <main className="flex-1 p-3.5 sm:p-6 md:p-8 font-['Inter'] flex justify-center overflow-y-auto w-full">
      <div className="w-full max-w-7xl flex flex-col gap-5 sm:gap-6">
        
        <section className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-10 shadow-sm border border-purple-100/90 flex flex-col min-h-[500px] w-full">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 sm:gap-4 border-b border-purple-100/80 pb-4 sm:pb-5 mb-5 sm:mb-6">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center bg-purple-50 text-[#8b00cc] border border-purple-100/80 shadow-sm shrink-0">
                <Bell size={20} className="sm:w-[22px] sm:h-[22px]" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-gray-900 uppercase tracking-wide m-0 border-none">
                  Notifications
                </h2>
                <p className="text-[11px] sm:text-xs md:text-sm text-gray-500 font-medium m-0 mt-0.5">
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
              className={`px-3.5 sm:px-4 py-2 text-xs sm:text-sm border rounded-xl font-bold transition-all w-full sm:w-auto flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
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

          <div className="flex flex-col gap-3 sm:gap-3.5 flex-1">
            {loading ? (
              <div className="flex flex-col gap-4 w-full h-[300px] justify-center items-center">
                <div className="w-10 h-10 border-4 border-purple-100 border-t-[#8b00cc] rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium text-sm">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-3 text-gray-400 my-auto bg-purple-50/40 rounded-2xl border border-dashed border-purple-200">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white flex items-center justify-center text-[#8b00cc] shadow-sm border border-purple-100">
                  <Bell size={24} className="sm:w-7 sm:h-7" strokeWidth={1.75} />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-gray-700 m-0 border-none">No notifications yet</h3>
                <p className="text-[11px] sm:text-xs text-gray-500 m-0">You&apos;re completely caught up! Updates about your account will show up here.</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const parsed = parseNotification(notif);

                return (
                  <div 
                    key={notif.id} 
                    onClick={() => handleNotificationClick(notif)}
                    className={`group p-3.5 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 active:scale-[0.99] ${
                      !notif.isRead 
                        ? 'bg-gradient-to-r from-purple-50/70 via-purple-50/20 to-white border-l-4 border-l-[#8b00cc] border-purple-100 shadow-sm hover:shadow-md hover:border-purple-300' 
                        : 'bg-white border-gray-100 hover:border-purple-200 hover:shadow-sm opacity-90 hover:opacity-100'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 ${parsed.iconBgClass}`}>
                          {renderNotificationIcon(parsed.iconType, "w-3.5 h-3.5 sm:w-4 sm:h-4")}
                        </div>
                        <h4 className={`text-xs sm:text-base m-0 border-none truncate font-bold ${!notif.isRead ? 'text-gray-950' : 'text-gray-800'}`}>
                          {notif.title}
                        </h4>
                        {!notif.isRead && (
                          <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-rose-500"></span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-gray-500 font-medium bg-gray-50 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-gray-100 shrink-0 self-start sm:self-auto">
                        <Clock size={11} className="text-[#8b00cc]" />
                        <span>{formatDateTime(notif.createdAt)}</span>
                      </div>
                    </div>

                    <p className={`m-0 leading-relaxed text-xs sm:text-sm line-clamp-2 sm:line-clamp-none ${!notif.isRead ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
                      {parsed.cleanMessage}
                    </p>

                    {/* Interactive Action Bar on Card */}
                    <div className="flex items-center justify-between pt-1 border-t border-purple-50/80 text-xs">
                      <span className="text-[11px] text-gray-400 font-medium">Click to view details</span>
                      <span className="inline-flex items-center gap-1 font-bold text-[#8b00cc] group-hover:translate-x-0.5 transition-transform">
                        <span>{parsed.actionLabel}</span>
                        <ArrowRight size={13} />
                      </span>
                    </div>
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

      {/* Interactive Notification Details Modal */}
      {selectedNotification && (() => {
        const parsed = parseNotification(selectedNotification);
        const displayCode = parsed.claimCode || parsed.orderId;

        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedNotification(null);
            }}
          >
            <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-purple-100 max-w-lg w-full flex flex-col gap-4 sm:gap-5 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              
              {/* Header Tags & Close Button */}
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${parsed.categoryBadgeClass}`}>
                    {renderNotificationIcon(parsed.iconType, "w-3.5 h-3.5")}
                    <span>{parsed.category}</span>
                  </span>
                  {selectedNotification.branch && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-gray-600 bg-gray-100 border border-gray-200">
                      <Building2 size={12} className="text-gray-500" />
                      <span>{selectedNotification.branch} Branch</span>
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                  aria-label="Close details"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Title & Timestamp */}
              <div className="flex items-start gap-3.5">
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${parsed.iconBgClass}`}>
                  {renderNotificationIcon(parsed.iconType, "w-5 h-5 sm:w-6 sm:h-6")}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-gray-950 leading-snug m-0">
                    {selectedNotification.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mt-1">
                    <Clock size={13} className="text-[#8b00cc]" />
                    <span>{formatDateTime(selectedNotification.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Highlight Card for Claim Code / Order Reference if available */}
              {displayCode && (
                <div className="bg-gradient-to-r from-purple-50/90 to-purple-50/40 border border-purple-200/90 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-100/80 text-[#8b00cc] flex items-center justify-center shrink-0">
                      <Tag size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        Reference / Claim Code
                      </span>
                      <span className="text-sm sm:text-base font-black text-[#5c0099] font-mono">
                        {displayCode.startsWith('#') ? displayCode : `#${displayCode}`}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopyClaimCode(displayCode.replace(/^#/, ''))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-purple-50 text-[#8b00cc] border border-purple-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    {copiedCode ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}

              {/* Message Content */}
              <div className="bg-gray-50/90 border border-gray-100 rounded-2xl p-4 sm:p-4.5">
                <p className="m-0 text-xs sm:text-sm text-gray-800 leading-relaxed font-medium whitespace-pre-line">
                  {parsed.cleanMessage}
                </p>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 font-bold text-xs sm:text-sm transition-colors cursor-pointer text-center"
                >
                  Close
                </button>
                {parsed.actionUrl && (
                  <button
                    onClick={() => handleModalAction(parsed.actionUrl)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] hover:from-[#7700af] hover:to-[#a700e0] text-white rounded-xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span>{parsed.actionLabel}</span>
                    <ArrowRight size={15} />
                  </button>
                )}
              </div>

            </div>
          </div>
        );
      })()}
    </main>
  );
}
