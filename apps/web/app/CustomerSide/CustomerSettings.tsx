"use client";

import { Palette, HelpCircle, ChevronRight, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CustomerSettings() {
  const router = useRouter();
  const navigate = router.push;

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-8 font-['Inter'] flex justify-center w-full overflow-y-auto">
      <div className="w-full max-w-7xl flex flex-col gap-6">
        
        <section className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-purple-100/90 flex flex-col w-full">
          
          <div className="flex items-center gap-3 border-b border-purple-100/80 pb-5 mb-6">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-purple-50 text-[#8b00cc] border border-purple-100/80 shadow-sm shrink-0">
              <Settings size={22} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-wide m-0 border-none">
                Settings
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 font-medium m-0 mt-0.5">
                Manage your account preferences and application settings
              </p>
            </div>
          </div>
          
          <div className="flex flex-col gap-3.5">
            
            {/* Themes Row */}
            <button 
              onClick={() => navigate('/customer/settings/themes')}
              className="flex items-center p-4 sm:p-5 rounded-2xl border border-purple-100/90 hover:border-purple-300 hover:shadow-md transition-all group bg-white cursor-pointer w-full text-left"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100/80 flex justify-center items-center mr-4 sm:mr-5 shrink-0 group-hover:bg-gradient-to-r group-hover:from-[#8b00cc] group-hover:to-[#bd00ff] transition-all shadow-xs">
                <Palette size={22} className="text-[#8b00cc] group-hover:text-white transition-colors" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 m-0 mb-0.5 group-hover:text-[#8b00cc] transition-colors border-none truncate">
                  Themes
                </h3>
                <p className="text-gray-500 m-0 text-xs sm:text-sm font-medium">
                  Customize the appearance, layout, and colors
                </p>
              </div>
              <ChevronRight size={20} className="text-gray-400 group-hover:text-[#8b00cc] group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </button>
            
            {/* Help & Support Row */}
            <button 
              onClick={() => navigate('/customer/settings/help')}
              className="flex items-center p-4 sm:p-5 rounded-2xl border border-purple-100/90 hover:border-purple-300 hover:shadow-md transition-all group bg-white cursor-pointer w-full text-left"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100/80 flex justify-center items-center mr-4 sm:mr-5 shrink-0 group-hover:bg-gradient-to-r group-hover:from-[#8b00cc] group-hover:to-[#bd00ff] transition-all shadow-xs">
                <HelpCircle size={22} className="text-[#8b00cc] group-hover:text-white transition-colors" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 m-0 mb-0.5 group-hover:text-[#8b00cc] transition-colors border-none truncate">
                  Help & Support
                </h3>
                <p className="text-gray-500 m-0 text-xs sm:text-sm font-medium">
                  View FAQs, manuals, or contact our support team
                </p>
              </div>
              <ChevronRight size={20} className="text-gray-400 group-hover:text-[#8b00cc] group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </button>

          </div>

        </section>

      </div>
    </main>
  );
}
