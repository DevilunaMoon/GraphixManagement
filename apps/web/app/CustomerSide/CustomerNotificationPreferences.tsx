"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function CustomerNotificationPreferences() {
  const router = useRouter();
  const navigate = router.push;

  const [preferences, setPreferences] = useState({
    orderUpdates: true,
    paymentReminders: true,
    deviceRepairStatus: true,
    promotionsAndOffers: false
  });

  const togglePreference = (key: keyof typeof preferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <main className="flex-1 p-3 sm:p-6 md:p-10 font-['Signika'] flex justify-center overflow-y-auto">
      <div className="w-full max-w-4xl bg-white border-2 border-[#5c0099] rounded-2xl p-4 sm:p-6 md:p-10 flex flex-col shadow-sm relative">
        
        <button 
          onClick={() => navigate('/customer/settings')}
          className="absolute top-4 left-4 sm:top-6 sm:left-6 md:top-10 md:left-10 flex items-center gap-2 text-gray-500 hover:text-[#bd00ff] transition-colors border-none bg-transparent cursor-pointer font-semibold"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        <div className="border-b border-gray-200 pb-4 mb-6 sm:pb-5 sm:mb-8 text-center mt-8 sm:mt-10 md:mt-2">
          <h2 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-[#bd00ff] m-0 border-none leading-tight sm:leading-normal px-2">Notification Preferences</h2>
          <p className="text-gray-500 m-0 mt-2 font-medium text-sm sm:text-base">Control what alerts you receive and how often.</p>
        </div>

        <div className="flex flex-col gap-0 w-full max-w-2xl mx-auto rounded-2xl border border-gray-200 overflow-hidden">
          
          <div className="flex items-center justify-between p-4 sm:p-6 bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="flex flex-col gap-0.5 sm:gap-1 pr-4 sm:pr-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 m-0 border-none">Order Updates</h3>
              <p className="text-gray-500 m-0 text-xs sm:text-sm font-medium">Receive notifications about your order status</p>
            </div>
            <button 
              onClick={() => togglePreference('orderUpdates')}
              className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors shrink-0 border-none ${preferences.orderUpdates ? 'bg-[#bd00ff]' : 'bg-gray-300'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${preferences.orderUpdates ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 sm:p-6 bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="flex flex-col gap-0.5 sm:gap-1 pr-4 sm:pr-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 m-0 border-none leading-tight sm:leading-normal">Payment Reminders</h3>
              <p className="text-gray-500 m-0 text-xs sm:text-sm font-medium mt-0.5 sm:mt-0">Get alerted before a payment is due</p>
            </div>
            <button 
              onClick={() => togglePreference('paymentReminders')}
              className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors shrink-0 border-none ${preferences.paymentReminders ? 'bg-[#bd00ff]' : 'bg-gray-300'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${preferences.paymentReminders ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 sm:p-6 bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="flex flex-col gap-0.5 sm:gap-1 pr-4 sm:pr-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 m-0 border-none leading-tight sm:leading-normal">Device Repair Status</h3>
              <p className="text-gray-500 m-0 text-xs sm:text-sm font-medium mt-0.5 sm:mt-0">Updates on your devices currently in repair</p>
            </div>
            <button 
              onClick={() => togglePreference('deviceRepairStatus')}
              className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors shrink-0 border-none ${preferences.deviceRepairStatus ? 'bg-[#bd00ff]' : 'bg-gray-300'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${preferences.deviceRepairStatus ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 sm:p-6 bg-white hover:bg-gray-50 transition-colors">
            <div className="flex flex-col gap-0.5 sm:gap-1 pr-4 sm:pr-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 m-0 border-none leading-tight sm:leading-normal">Promotions & Offers</h3>
              <p className="text-gray-500 m-0 text-xs sm:text-sm font-medium mt-0.5 sm:mt-0">Receive exclusive deals and product discounts</p>
            </div>
            <button 
              onClick={() => togglePreference('promotionsAndOffers')}
              className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors shrink-0 border-none ${preferences.promotionsAndOffers ? 'bg-[#bd00ff]' : 'bg-gray-300'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${preferences.promotionsAndOffers ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

        </div>

      </div>
    </main>
  );
}
