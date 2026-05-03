"use client";

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Notification {
  id: number;
  title: string;
  message: string;
  unread: boolean;
}

export default function CustomerNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      title: 'Successfully Place Order',
      message: 'Your Order Ipad has been successfully ordered please present the digital receipt into the store as your proof',
      unread: true
    },
    {
      id: 2,
      title: 'Reminder: Pay the remaining amount',
      message: 'Pay the remaining amount in 1/1/2026 further delay of the payment will increase the interest',
      unread: true
    },
    {
      id: 3,
      title: 'Your Device is completely repaired',
      message: 'Your device Oppo is now completed its repair',
      unread: false
    },
    {
      id: 4,
      title: 'System Update Scheduled',
      message: 'A system update is scheduled for 15/1/2026 from 2:00 AM to 4:00 AM. Services may be disrupted.',
      unread: false
    },
    {
      id: 5,
      title: 'Welcome to Graphix!',
      message: 'Thank you for joining our community. Check out our getting started guide.',
      unread: false
    },
    {
      id: 6,
      title: 'New Product Alert',
      message: 'The new Samsung Galaxy S26 is now available for pre-order in our shop.',
      unread: false
    },
    {
      id: 7,
      title: 'Password Changed Successfully',
      message: 'Your account password was recently updated. If you did not make this change, please contact support.',
      unread: false
    },
    {
      id: 8,
      title: 'Order #10294 Shipped',
      message: 'Your order for the Aula F75 Keyboard has been shipped and is on its way!',
      unread: false
    }
  ]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const totalPages = Math.ceil(notifications.length / itemsPerPage);
  const currentItems = notifications.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
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
            {currentItems.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-4 sm:p-6 rounded-2xl border transition-all md:hover:translate-x-1 ${
                  notif.unread 
                    ? 'bg-gradient-to-r from-purple-50 to-white border-l-4 border-[#bd00ff] border-y-gray-200 border-r-gray-200 shadow-sm' 
                    : 'bg-white border-gray-200 hover:border-[#bd00ff]'
                }`}
              >
                <h4 className={`text-lg m-0 mb-2 border-none ${notif.unread ? 'font-extrabold text-black' : 'font-bold text-gray-800'}`}>
                  {notif.title}
                </h4>
                <p className={`m-0 leading-relaxed ${notif.unread ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
                  {notif.message}
                </p>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
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
