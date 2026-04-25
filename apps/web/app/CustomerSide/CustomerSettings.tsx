"use client";

import { Palette, HelpCircle, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CustomerSettings() {
  const router = useRouter();
  const navigate = router.push;

  return (
    <main className="flex-1 p-3 sm:p-6 md:p-10 font-['Signika'] flex justify-center">
      <div className="w-full max-w-4xl flex flex-col gap-4 sm:gap-6">
        
        <section className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10 shadow-sm border border-gray-100 flex flex-col">
          
          <div className="border-b border-gray-200 pb-5 mb-8">
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-[#bd00ff] m-0 border-none">Settings</h2>
            <p className="text-gray-500 m-0 mt-2 font-medium">Manage your account preferences and application settings.</p>
          </div>
          
          <div className="flex flex-col gap-4">
            
            <button 
              onClick={() => navigate('/customer/settings/themes')}
              className="flex items-center p-4 sm:p-5 rounded-2xl border border-gray-100 hover:border-[#bd00ff] hover:shadow-md transition-all group bg-white cursor-pointer w-full text-left"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-50 rounded-full flex justify-center items-center mr-4 sm:mr-6 shrink-0 group-hover:bg-[#bd00ff] transition-colors">
                <Palette size={24} className="text-[#bd00ff] group-hover:text-white transition-colors sm:w-[28px] sm:h-[28px]" />
              </div>
              <div className="flex flex-col flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 m-0 mb-0.5 sm:mb-1 group-hover:text-[#bd00ff] transition-colors border-none">Themes</h3>
                <p className="text-gray-500 m-0 text-xs sm:text-sm font-medium">Customize the appearance, layout, and colors</p>
              </div>
              <ChevronRight size={24} className="text-gray-300 group-hover:text-[#bd00ff] transition-colors shrink-0" />
            </button>
            

            
            <button 
              onClick={() => navigate('/customer/settings/help')}
              className="flex items-center p-4 sm:p-5 rounded-2xl border border-gray-100 hover:border-[#bd00ff] hover:shadow-md transition-all group bg-white cursor-pointer w-full text-left"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-50 rounded-full flex justify-center items-center mr-4 sm:mr-6 shrink-0 group-hover:bg-[#bd00ff] transition-colors">
                <HelpCircle size={24} className="text-[#bd00ff] group-hover:text-white transition-colors sm:w-[28px] sm:h-[28px]" />
              </div>
              <div className="flex flex-col flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 m-0 mb-0.5 sm:mb-1 group-hover:text-[#bd00ff] transition-colors border-none leading-tight sm:leading-normal">Help & Support</h3>
                <p className="text-gray-500 m-0 text-xs sm:text-sm font-medium mt-0.5 sm:mt-0">View FAQs, manuals, or contact our support team</p>
              </div>
              <ChevronRight size={24} className="text-gray-300 group-hover:text-[#bd00ff] transition-colors shrink-0" />
            </button>

          </div>

        </section>

      </div>
    </main>
  );
}
