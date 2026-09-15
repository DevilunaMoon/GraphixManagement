"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, Mail, Phone, MapPin, Store, Building2 } from 'lucide-react';

interface BranchContact {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gcashNumber?: string | null;
}

const FAQS = [
  {
    id: 1,
    question: "How long do repairs usually take?",
    answer: "Standard diagnostics and simple repairs usually take 2-3 business days. More complex hardware issues may take up to a week. We will notify you at every step."
  },
  {
    id: 2,
    question: "What payment methods do you accept?",
    answer: "Currently, our system accepts Cash and GCash payments for products, reservations, and repair services."
  }
];

const DEFAULT_BRANCHES: BranchContact[] = [
  {
    id: 'tagoloan',
    name: 'Tagoloan Branch',
    address: 'Tagoloan, Misamis Oriental',
    phone: '0967 123 4567',
    email: 'tagoloan@graphix.com'
  },
  {
    id: 'villanueva',
    name: 'Villanueva Branch',
    address: 'Villanueva, Misamis Oriental',
    phone: '0967 123 4567',
    email: 'villanueva@graphix.com'
  },
  {
    id: 'jasaan',
    name: 'Jasaan Branch',
    address: 'Jasaan, Misamis Oriental',
    phone: '0967 123 4567',
    email: 'jasaan@graphix.com'
  }
];

export default function CustomerHelpSupport() {
  const router = useRouter();
  const navigate = router.push;
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [branches, setBranches] = useState<BranchContact[]>(DEFAULT_BRANCHES);

  useEffect(() => {
    fetch('/api/branches')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.branches) && data.branches.length > 0) {
          const mapped: BranchContact[] = data.branches.map((b: any) => {
            const cleanName = b.name.replace(/\s*Branch$/i, '').trim();
            return {
              id: b.id || cleanName.toLowerCase(),
              name: `${cleanName} Branch`,
              address: b.address || `${cleanName}, Misamis Oriental`,
              phone: b.phone || b.gcashNumber || '0967 123 4567',
              email: b.email || `${cleanName.toLowerCase()}@graphix.com`,
              gcashNumber: b.gcashNumber
            };
          });
          setBranches(mapped);
        }
      })
      .catch(err => {
        console.error('Failed to load branches for contact info:', err);
      });
  }, []);

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-8 font-['Inter'] flex justify-center overflow-y-auto w-full">
      <div className="w-full max-w-7xl bg-white border-2 border-[#5c0099] rounded-3xl p-6 sm:p-8 md:p-10 flex flex-col gap-6 sm:gap-10 shadow-sm relative">
        
        <button 
          onClick={() => navigate('/customer/settings')}
          className="absolute top-4 left-4 sm:top-6 sm:left-6 md:top-10 md:left-10 flex items-center gap-2 text-gray-500 hover:text-[#bd00ff] transition-colors border-none bg-transparent cursor-pointer font-semibold"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        <div className="border-b border-gray-200 pb-4 sm:pb-5 text-center mt-8 sm:mt-10 md:mt-2">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-[#bd00ff] m-0 border-none">Help & Support</h2>
          <p className="text-gray-500 m-0 mt-2 font-medium text-sm sm:text-base px-2">Find answers to common questions or reach out directly to our store branches.</p>
        </div>

        {/* FAQs Section */}
        <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-3xl mx-auto">
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

        <hr className="border-gray-200 w-full max-w-3xl mx-auto" />

        {/* Branch-Specific Contact Us Section */}
        <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-bold text-gray-900 border-none m-0 flex items-center gap-2">
              <Building2 className="text-[#bd00ff]" size={22} />
              Contact Us
            </h3>
            <p className="text-sm text-gray-500 m-0">Contact our branch support teams for direct assistance, product availability, or repair inquiries.</p>
          </div>
          
          <div className="flex flex-col gap-4 sm:gap-5">
            {branches.map((branch) => (
              <div 
                key={branch.id} 
                className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-purple-200 transition-all flex flex-col gap-4"
              >
                {/* Branch Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-gray-100 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 text-[#bd00ff] flex items-center justify-center font-black text-sm shrink-0">
                      <Store size={18} />
                    </div>
                    <div className="flex flex-col">
                      <h4 className="font-extrabold text-gray-900 text-base sm:text-lg m-0 border-none">
                        {branch.name}
                      </h4>
                      <span className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="text-[#bd00ff]" />
                        {branch.address}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 w-fit self-start sm:self-center">
                    Official Branch
                  </span>
                </div>

                {/* Email Support & Call Us Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  
                  {/* Email Support Card */}
                  <a 
                    href={`mailto:${branch.email}`} 
                    className="flex items-center p-3.5 sm:p-4 rounded-xl border border-gray-200 hover:border-[#bd00ff] hover:bg-purple-50/40 transition-all group bg-gray-50/50 cursor-pointer no-underline text-inherit"
                  >
                    <div className="w-10 h-10 bg-white rounded-xl shadow-xs border border-gray-200 flex justify-center items-center mr-3 shrink-0 group-hover:bg-[#bd00ff] group-hover:border-[#bd00ff] transition-colors">
                      <Mail size={18} className="text-[#bd00ff] group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-gray-800 text-xs uppercase tracking-wider group-hover:text-[#bd00ff] transition-colors">
                        Email Support
                      </span>
                      <span className="text-gray-600 text-xs sm:text-sm font-semibold truncate mt-0.5">
                        {branch.email}
                      </span>
                    </div>
                  </a>

                  {/* Call Us Card */}
                  <a 
                    href={`tel:${(branch.phone || '0967 123 4567').replace(/[^0-9+]/g, '')}`} 
                    className="flex items-center p-3.5 sm:p-4 rounded-xl border border-gray-200 hover:border-[#bd00ff] hover:bg-purple-50/40 transition-all group bg-gray-50/50 cursor-pointer no-underline text-inherit"
                  >
                    <div className="w-10 h-10 bg-white rounded-xl shadow-xs border border-gray-200 flex justify-center items-center mr-3 shrink-0 group-hover:bg-[#bd00ff] group-hover:border-[#bd00ff] transition-colors">
                      <Phone size={18} className="text-[#bd00ff] group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-gray-800 text-xs uppercase tracking-wider group-hover:text-[#bd00ff] transition-colors">
                        Call Us
                      </span>
                      <span className="text-gray-600 text-xs sm:text-sm font-semibold truncate mt-0.5">
                        {branch.phone}
                      </span>
                    </div>
                  </a>

                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
