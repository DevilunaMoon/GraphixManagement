"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronLeft, Scale } from 'lucide-react';

export default function PolicyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = searchParams.get('type') || 'PURCHASE'; // Default to PURCHASE
  
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/policies')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const policy = data.find(p => p.type === type.toUpperCase());
          if (policy) {
            setContent(policy.content);
          } else {
            setContent('No policy content has been defined for this section yet.');
          }
        }
      })
      .catch(err => {
        console.error(err);
        setContent('Error loading policy. Please try again later.');
      })
      .finally(() => setIsLoading(false));
  }, [type]);

  const titles: Record<string, string> = {
    'PURCHASE': 'Purchase Policy',
    'PAYMENT': 'Payment Policy',
    'REPAIR': 'Repair Policy'
  };

  return (
    <div className="min-h-screen bg-[#f3f4f8] font-['Signika'] py-12 px-4 flex flex-col items-center">
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-[#bd00ff] transition-colors border-none bg-transparent cursor-pointer font-bold text-lg"
        >
          <ChevronLeft size={24} /> Back
        </button>
      </div>

      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden border border-[#bd00ff]/20">
        <div className="bg-[#bd00ff] p-8 text-white flex items-center gap-4">
          <Scale size={48} className="opacity-80" />
          <div>
            <h1 className="text-3xl font-black m-0 tracking-wide text-white">{titles[type.toUpperCase()] || 'Policy Details'}</h1>
            <p className="text-purple-200 mt-2 font-medium">Graphix Management System - Legal & Terms</p>
          </div>
        </div>

        <div className="p-8 md:p-12">
          {isLoading ? (
             <div className="flex justify-center items-center py-20">
               <div className="w-10 h-10 border-4 border-purple-200 border-t-[#bd00ff] rounded-full animate-spin"></div>
             </div>
          ) : (
            <div className="max-w-none text-gray-800 font-['Inter'] leading-loose whitespace-pre-wrap text-lg">
              {content}
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 border-t border-gray-100 p-6 text-center text-sm text-gray-500 font-medium">
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
