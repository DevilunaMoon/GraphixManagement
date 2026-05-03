"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, Mail, Phone } from 'lucide-react';

const FAQS = [
  {
    id: 1,
    question: "How long do repairs usually take?",
    answer: "Standard diagnostics and simple repairs usually take 2-3 business days. More complex hardware issues may take up to a week. We will notify you at every step."
  },
  {
    id: 2,
    question: "What payment methods do you accept?",
    answer: "Currently, our system only allows payments via GCash. Payment is required upon completion of the service."
  }
];

export default function CustomerHelpSupport() {
  const router = useRouter();
  const navigate = router.push;
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="flex-1 p-3 sm:p-6 md:p-10 font-['Inter'] flex justify-center overflow-y-auto">
      <div className="w-full max-w-4xl bg-white border-2 border-[#5c0099] rounded-2xl p-4 sm:p-6 md:p-10 flex flex-col gap-6 sm:gap-10 shadow-sm relative">
        
        <button 
          onClick={() => navigate('/customer/settings')}
          className="absolute top-4 left-4 sm:top-6 sm:left-6 md:top-10 md:left-10 flex items-center gap-2 text-gray-500 hover:text-[#bd00ff] transition-colors border-none bg-transparent cursor-pointer font-semibold"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        <div className="border-b border-gray-200 pb-4 sm:pb-5 text-center mt-8 sm:mt-10 md:mt-2">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-[#bd00ff] m-0 border-none">Help & Support</h2>
          <p className="text-gray-500 m-0 mt-2 font-medium text-sm sm:text-base px-2">Find answers to common questions or reach out to us.</p>
        </div>

        <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-gray-800 border-none">Frequently Asked Questions</h3>
          
          <div className="flex flex-col gap-3 sm:gap-4">
            {FAQS.map(faq => (
              <div 
                key={faq.id} 
                className={`border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 ${openFaq === faq.id ? 'shadow-md border-[#bd00ff]' : 'hover:border-gray-300'}`}
              >
                <div 
                  className="p-4 sm:p-5 flex justify-between items-center cursor-pointer bg-white"
                  onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                >
                  <h4 className="font-bold text-gray-800 m-0 text-base sm:text-lg border-none leading-snug sm:leading-tight">{faq.question}</h4>
                  <ChevronDown className={`text-gray-400 shrink-0 ml-2 transition-transform duration-300 ${openFaq === faq.id ? 'rotate-180 text-[#bd00ff]' : ''}`} />
                </div>
                <div 
                  className={`overflow-hidden transition-all duration-300 ${openFaq === faq.id ? 'max-h-60 border-t border-gray-100 bg-gray-50' : 'max-h-0'}`}
                >
                  <p className="p-4 sm:p-5 m-0 text-gray-600 leading-relaxed font-medium text-sm sm:text-base">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-gray-200 w-full max-w-2xl mx-auto" />

        <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-gray-800 border-none">Contact Us</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            
            <a href="mailto:support@graphix.com" className="flex items-center p-4 sm:p-5 rounded-xl border border-gray-200 hover:border-[#bd00ff] hover:shadow-md transition-all group bg-white cursor-pointer no-underline text-inherit">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 rounded-full flex justify-center items-center mr-3 sm:mr-4 shrink-0 group-hover:bg-[#bd00ff] transition-colors">
                <Mail size={20} className="text-[#bd00ff] group-hover:text-white transition-colors sm:w-6 sm:h-6" />
              </div>
              <div className="flex flex-col">
                <h4 className="font-bold text-gray-800 m-0 mb-0.5 sm:mb-1 border-none group-hover:text-[#bd00ff] transition-colors text-base sm:text-lg">Email Support</h4>
                <p className="text-gray-500 m-0 text-xs sm:text-sm font-medium">support@graphix.com</p>
              </div>
            </a>

            <a href="tel:+1234567890" className="flex items-center p-4 sm:p-5 rounded-xl border border-gray-200 hover:border-[#bd00ff] hover:shadow-md transition-all group bg-white cursor-pointer no-underline text-inherit">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 rounded-full flex justify-center items-center mr-3 sm:mr-4 shrink-0 group-hover:bg-[#bd00ff] transition-colors">
                <Phone size={20} className="text-[#bd00ff] group-hover:text-white transition-colors sm:w-6 sm:h-6" />
              </div>
              <div className="flex flex-col">
                <h4 className="font-bold text-gray-800 m-0 mb-0.5 sm:mb-1 border-none group-hover:text-[#bd00ff] transition-colors text-base sm:text-lg">Call Us</h4>
                <p className="text-gray-500 m-0 text-xs sm:text-sm font-medium">+1 (234) 567-890</p>
              </div>
            </a>

          </div>
        </div>

      </div>
    </main>
  );
}
