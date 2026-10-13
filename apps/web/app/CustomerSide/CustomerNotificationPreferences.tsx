"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  Bell, 
  PackageCheck, 
  CreditCard, 
  Wrench, 
  Tag, 
  CheckCircle2 
} from 'lucide-react';

interface Preferences {
  orderUpdates: boolean;
  paymentReminders: boolean;
  deviceRepairStatus: boolean;
  promotionsAndOffers: boolean;
}

const DEFAULT_PREFERENCES: Preferences = {
  orderUpdates: true,
  paymentReminders: true,
  deviceRepairStatus: true,
  promotionsAndOffers: false
};

export default function CustomerNotificationPreferences() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('customer_notification_prefs');
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.error('Failed to load notification preferences:', e);
    }
  }, []);

  const togglePreference = (key: keyof Preferences) => {
    setPreferences(prev => {
      const updated = {
        ...prev,
        [key]: !prev[key]
      };
      try {
        localStorage.setItem('customer_notification_prefs', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save notification preferences:', e);
      }
      return updated;
    });

    setShowSavedToast(true);
    setTimeout(() => {
      setShowSavedToast(false);
    }, 2500);
  };

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-8 font-['Inter'] flex justify-center w-full overflow-y-auto">
      <div className="w-full max-w-4xl flex flex-col gap-6">

        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-purple-100/90 flex flex-col gap-6 w-full">
          <div className="flex items-center gap-3.5 border-b border-purple-100/80 pb-5">
            <button
              onClick={() => router.push('/customer/settings')}
              className="w-10 h-10 rounded-2xl bg-purple-50 text-[#8b00cc] hover:bg-[#8b00cc] hover:text-white flex items-center justify-center transition-all cursor-pointer border border-purple-100/80 shadow-2xs shrink-0 active:scale-95"
              title="Back to Settings"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-wide m-0 leading-tight">
                Notification Preferences
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 font-medium m-0 mt-0.5">
                Control what alerts you receive and how GraphiX keeps you updated
              </p>
            </div>
          </div>

          {/* Toast Alert */}
          {showSavedToast && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold animate-in fade-in duration-200">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Preferences updated successfully!</span>
            </div>
          )}

          {/* Preferences List */}
          <div className="flex flex-col gap-3">
            
            {/* 1. Order Updates */}
            <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-gray-200/80 bg-gray-50/40 hover:bg-white hover:border-purple-200 hover:shadow-xs transition-all">
              <div className="flex items-center gap-3.5 sm:gap-4 pr-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#8b00cc] flex items-center justify-center shrink-0 border border-purple-100/80">
                  <PackageCheck size={20} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 m-0">Order Updates</h3>
                  <p className="text-gray-500 m-0 text-xs sm:text-sm font-medium mt-0.5">
                    Receive live notifications when orders are verified, packed, or ready for pickup
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => togglePreference('orderUpdates')}
                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ease-in-out shrink-0 border-none p-0 focus:outline-none ${
                  preferences.orderUpdates ? 'bg-[#8b00cc]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-all duration-200 ease-in-out ${
                    preferences.orderUpdates ? 'left-6.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* 2. Payment Reminders */}
            <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-gray-200/80 bg-gray-50/40 hover:bg-white hover:border-purple-200 hover:shadow-xs transition-all">
              <div className="flex items-center gap-3.5 sm:gap-4 pr-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#8b00cc] flex items-center justify-center shrink-0 border border-purple-100/80">
                  <CreditCard size={20} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 m-0">Payment Reminders</h3>
                  <p className="text-gray-500 m-0 text-xs sm:text-sm font-medium mt-0.5">
                    Get alerted before scheduled downpayment due dates and balance settlements
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => togglePreference('paymentReminders')}
                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ease-in-out shrink-0 border-none p-0 focus:outline-none ${
                  preferences.paymentReminders ? 'bg-[#8b00cc]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-all duration-200 ease-in-out ${
                    preferences.paymentReminders ? 'left-6.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* 3. Device Repair Status */}
            <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-gray-200/80 bg-gray-50/40 hover:bg-white hover:border-purple-200 hover:shadow-xs transition-all">
              <div className="flex items-center gap-3.5 sm:gap-4 pr-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#8b00cc] flex items-center justify-center shrink-0 border border-purple-100/80">
                  <Wrench size={20} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 m-0">Device Repair Progress</h3>
                  <p className="text-gray-500 m-0 text-xs sm:text-sm font-medium mt-0.5">
                    Real-time alerts on device intake diagnostics, part replacements, and completion
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => togglePreference('deviceRepairStatus')}
                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ease-in-out shrink-0 border-none p-0 focus:outline-none ${
                  preferences.deviceRepairStatus ? 'bg-[#8b00cc]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-all duration-200 ease-in-out ${
                    preferences.deviceRepairStatus ? 'left-6.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* 4. Promotions & Special Offers */}
            <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-gray-200/80 bg-gray-50/40 hover:bg-white hover:border-purple-200 hover:shadow-xs transition-all">
              <div className="flex items-center gap-3.5 sm:gap-4 pr-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#8b00cc] flex items-center justify-center shrink-0 border border-purple-100/80">
                  <Tag size={20} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 m-0">Promotions & Exclusive Deals</h3>
                  <p className="text-gray-500 m-0 text-xs sm:text-sm font-medium mt-0.5">
                    Receive announcements about seasonal sales, price drops, and branch discounts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => togglePreference('promotionsAndOffers')}
                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ease-in-out shrink-0 border-none p-0 focus:outline-none ${
                  preferences.promotionsAndOffers ? 'bg-[#8b00cc]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-all duration-200 ease-in-out ${
                    preferences.promotionsAndOffers ? 'left-6.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}
