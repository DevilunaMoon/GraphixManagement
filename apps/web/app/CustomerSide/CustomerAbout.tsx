"use client";

import { useState, useEffect } from 'react';
import { Info, ShoppingBag, Store, CreditCard, Facebook, ExternalLink, Building2 } from 'lucide-react';

interface FacebookBranch {
  id: string;
  title: string;
  link: string;
  image: string;
}

const DEFAULT_MAIN = `This website revolutionizes the traditional e-commerce model by seamlessly integrating online retail with a transparent, service-based repair platform. Unlike standard online stores that simply sell products, this site offers a unique device monitoring feature that empowers customers by providing real-time, visual updates on their phone's repair progress. This level of transparency bridges the trust gap often found in service industries, allowing users to see their device being worked on from anywhere. By combining the convenience of purchasing accessories or repair parts with the peace of mind that comes from complete visibility into the service process, this site creates a customer-centric ecosystem that prioritizes both convenience and trust in the tech repair space.`;

const DEFAULT_PURCHASE = `Customers can purchase items directly through this website. All online transactions require Full Purchase payment to complete your online order.`;

const DEFAULT_DOWNPAYMENT = `Online downpayments are not accepted on this website. Downpayment features and QR details displayed on product pages are strictly provided to show downpayment information and requirements for customers planning to visit our physical store. Actual downpayment processing is available exclusively for in-store walk-in transactions at our physical store POS terminal.`;

const INITIAL_BRANCHES: FacebookBranch[] = [
  {
    id: 'branch-1',
    title: 'Graphix Main Store',
    link: 'https://www.facebook.com',
    image: '/Images/storefront-bg.jpg'
  }
];

export default function CustomerAbout() {
  const [mainText, setMainText] = useState(DEFAULT_MAIN);
  const [purchasePolicy, setPurchasePolicy] = useState(DEFAULT_PURCHASE);
  const [downpaymentPolicy, setDownpaymentPolicy] = useState(DEFAULT_DOWNPAYMENT);
  const [branches, setBranches] = useState<FacebookBranch[]>(INITIAL_BRANCHES);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const res = await fetch('/api/policies');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const mainRec = data.find((p: any) => p.type === 'ABOUT_MAIN');
            const purchRec = data.find((p: any) => p.type === 'ABOUT_PURCHASE');
            const downRec = data.find((p: any) => p.type === 'ABOUT_DOWNPAYMENT');
            const branchesRec = data.find((p: any) => p.type === 'ABOUT_FACEBOOK_BRANCHES');

            if (mainRec?.content) setMainText(mainRec.content);
            if (purchRec?.content) setPurchasePolicy(purchRec.content);
            if (downRec?.content) setDownpaymentPolicy(downRec.content);

            if (branchesRec?.content) {
              try {
                const parsed = JSON.parse(branchesRec.content);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setBranches(parsed);
                }
              } catch (e) {
                console.error('Error parsing branches JSON:', e);
              }
            } else {
              // Legacy fallback
              const fbLinkRec = data.find((p: any) => p.type === 'ABOUT_FACEBOOK_LINK');
              const fbImgRec = data.find((p: any) => p.type === 'ABOUT_FACEBOOK_IMAGE');
              const fbTitleRec = data.find((p: any) => p.type === 'ABOUT_FACEBOOK_TITLE');

              if (fbLinkRec || fbImgRec || fbTitleRec) {
                setBranches([{
                  id: 'branch-legacy',
                  title: fbTitleRec?.content || 'Graphix Main Store',
                  link: fbLinkRec?.content || 'https://www.facebook.com',
                  image: fbImgRec?.content || '/Images/storefront-bg.jpg'
                }]);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load policies:', err);
      }
    };
    fetchPolicies();
  }, []);

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-8 font-['Inter'] flex justify-center items-start overflow-y-auto w-full">
      <div className="w-full max-w-7xl flex flex-col gap-6">
        
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
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed m-0 font-medium relative z-10 text-left sm:text-justify whitespace-pre-wrap">
              {mainText}
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
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed m-0 font-medium whitespace-pre-wrap">
                  {purchasePolicy}
                </p>
              </div>
            </div>

            <div className="bg-amber-50/60 rounded-xl sm:rounded-2xl p-5 sm:p-7 border border-amber-200/70 flex flex-col sm:flex-row items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm border border-amber-200 text-amber-600 shrink-0">
                <Store size={28} />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-lg font-bold text-gray-900 m-0">Downpayment Information Notice</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed m-0 font-medium whitespace-pre-wrap">
                  {downpaymentPolicy}
                </p>
              </div>
            </div>
          </div>

        </section>

        {/* Facebook Page & Store Branches Section */}
        <section className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-10 shadow-md border-t-8 border-blue-600">
          
          <div className="flex items-center gap-3 sm:gap-4 mb-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-50 rounded-full flex justify-center items-center border-2 border-blue-100 shrink-0">
              <Facebook size={24} className="text-blue-600 sm:w-[32px] sm:h-[32px]" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold m-0 text-gray-900 border-none tracking-tight">
                Our Facebook Store Branches
              </h2>
              <p className="text-sm text-gray-500 font-medium m-0 mt-1">Select a branch below to visit its official Facebook page</p>
            </div>
          </div>

          <div className={`grid grid-cols-1 ${branches.length > 2 ? 'md:grid-cols-2 lg:grid-cols-3' : branches.length > 1 ? 'md:grid-cols-2' : ''} gap-6`}>
            {branches.map((branch) => (
              <div key={branch.id} className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all bg-white flex flex-col">
                <a
                  href={branch.link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative w-full h-56 overflow-hidden block cursor-pointer"
                >
                  <img
                    src={branch.image || '/Images/storefront-bg.jpg'}
                    alt={branch.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLElement).setAttribute('src', '/Images/storefront-bg.jpg');
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-6 text-white">
                    <div className="flex items-center gap-2 bg-blue-600 text-white font-extrabold text-xs px-3 py-1 rounded-full w-max mb-2 shadow-sm">
                      <Building2 size={14} /> Store Branch
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white tracking-tight drop-shadow-md group-hover:underline flex items-center gap-2 m-0 border-none">
                      {branch.title} <ExternalLink size={18} />
                    </h3>
                    <p className="text-xs text-gray-200 font-medium mt-1 m-0 truncate">
                      {branch.link}
                    </p>
                  </div>
                </a>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                    <Facebook size={16} className="text-blue-600" /> Graphix Official Page
                  </span>
                  <a
                    href={branch.link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all text-decoration-none flex items-center gap-1.5"
                  >
                    Visit Page <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>

        </section>

      </div>
    </main>
  );
}
