"use client";

import { Info, ShoppingBag, Store, CreditCard } from 'lucide-react';

export default function CustomerAbout() {
  return (
    <main className="flex-1 p-3 sm:p-6 md:p-10 font-['Inter'] flex justify-center items-start overflow-y-auto bg-[#f4f5f7]">
      <div className="w-full max-w-4xl my-4 sm:my-8 flex flex-col gap-6">
        
        {/* About Main Section */}
        <section className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-10 shadow-md border-t-8 border-[#bd00ff]">
          
          <div className="flex items-center gap-3 sm:gap-4 mb-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-50 rounded-full flex justify-center items-center border-2 border-purple-100 shrink-0">
              <Info size={24} className="text-[#bd00ff] sm:w-[32px] sm:h-[32px]" />
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold m-0 text-gray-900 border-none tracking-tight">About this website</h2>
          </div>
          
          <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-[#bd00ff] to-transparent opacity-5 rounded-bl-[100px]"></div>
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed m-0 font-medium relative z-10 text-left sm:text-justify">
              This website revolutionizes the traditional e-commerce model by seamlessly integrating online
              retail with a transparent, service-based repair platform. Unlike standard online stores that
              simply sell products, this site offers a unique device monitoring feature that empowers
              customers by providing real-time, visual updates on their phone's repair progress. This level of
              transparency bridges the trust gap often found in service industries, allowing users to see
              their device being worked on from anywhere. By combining the convenience of purchasing
              accessories or repair parts with the peace of mind that comes from complete visibility into the
              service process, this site creates a customer-centric ecosystem that prioritizes both
              convenience and trust in the tech repair space.
            </p>
          </div>

        </section>

        {/* Purchase Policy Section */}
        <section className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-10 shadow-md border-t-8 border-purple-600">
          
          <div className="flex items-center gap-3 sm:gap-4 mb-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-50 rounded-full flex justify-center items-center border-2 border-purple-100 shrink-0">
              <ShoppingBag size={24} className="text-[#bd00ff] sm:w-[32px] sm:h-[32px]" />
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold m-0 text-gray-900 border-none tracking-tight">Purchase & Downpayment Policy</h2>
          </div>

          <div className="flex flex-col gap-5">
            <div className="bg-purple-50/60 rounded-xl sm:rounded-2xl p-5 sm:p-7 border border-purple-100 flex flex-col sm:flex-row items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm border border-purple-100 text-[#bd00ff] shrink-0">
                <CreditCard size={28} />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-lg font-bold text-gray-900 m-0">Full Online Purchase Policy</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed m-0 font-medium">
                  Customers can purchase items directly through this website. All online transactions require <strong className="text-gray-900 font-extrabold">Full Purchase payment</strong> to complete your online order.
                </p>
              </div>
            </div>

            <div className="bg-amber-50/60 rounded-xl sm:rounded-2xl p-5 sm:p-7 border border-amber-200/70 flex flex-col sm:flex-row items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm border border-amber-200 text-amber-600 shrink-0">
                <Store size={28} />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-lg font-bold text-gray-900 m-0">Downpayment Information Notice</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed m-0 font-medium">
                  <strong className="text-gray-900 font-extrabold">Online downpayments are not accepted on this website.</strong> Downpayment features and QR details displayed on product pages are strictly provided to show <strong className="text-amber-800 font-extrabold">downpayment information and requirements</strong> for customers planning to visit our physical store. Actual downpayment processing is available exclusively for in-store walk-in transactions at our physical store POS terminal.
                </p>
              </div>
            </div>
          </div>

        </section>

      </div>
    </main>
  );
}
