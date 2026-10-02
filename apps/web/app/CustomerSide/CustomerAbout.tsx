"use client";

import { useState, useEffect } from 'react';
import { Info, ShoppingBag, Store, CreditCard, Facebook, ExternalLink, Building2 } from 'lucide-react';

interface FacebookBranch {
  id: string;
  branch?: string;
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
    branch: 'Tagoloan',
    title: 'Tagoloan Branch',
    link: 'https://www.facebook.com/Graphixtagoloan',
    image: '/Images/storefront-bg.jpg'
  },
  {
    id: 'branch-2',
    branch: 'Jasaan',
    title: 'Jasaan Branch',
    link: 'https://www.facebook.com/profile.php?id=61587565422103',
    image: '/Images/storefront-bg.jpg'
  },
  {
    id: 'branch-3',
    branch: 'Villanueva',
    title: 'Villanueva Branch',
    link: 'https://www.facebook.com/GraceGeraldizoSaludares',
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
                } else {
                  setBranches(INITIAL_BRANCHES);
                }
              } catch (e) {
                console.error('Error parsing branches JSON, defaulting to initial branches:', e);
                setBranches(INITIAL_BRANCHES);
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
              } else {
                setBranches(INITIAL_BRANCHES);
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
        <section className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-purple-100/90 flex flex-col gap-6">
          
          <div className="flex items-center gap-3 border-b border-purple-100/80 pb-5">
            <div className="w-11 h-11 bg-purple-50 rounded-2xl flex justify-center items-center border border-purple-100/80 text-[#8b00cc] shadow-sm shrink-0">
              <Info size={22} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-wide m-0 border-none">
                About this website
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 font-medium m-0 mt-0.5">
                Overview of Graphix electronics management and transparent repair ecosystem
              </p>
            </div>
          </div>
          
          <div className="bg-purple-50/25 rounded-2xl p-5 sm:p-7 md:p-8 border border-purple-100/80 relative overflow-hidden">
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed m-0 font-normal text-left whitespace-pre-wrap">
              {mainText}
            </p>
          </div>

        </section>

        {/* Purchase Policy Section */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-purple-100/90 flex flex-col gap-6">
          
          <div className="flex items-center gap-3 border-b border-purple-100/80 pb-5">
            <div className="w-11 h-11 bg-purple-50 rounded-2xl flex justify-center items-center border border-purple-100/80 text-[#8b00cc] shadow-sm shrink-0">
              <ShoppingBag size={22} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-wide m-0 border-none">
                Purchase & Downpayment Policy
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 font-medium m-0 mt-0.5">
                Important guidelines regarding online purchases and in-store downpayment transactions
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-purple-100/90 shadow-xs flex flex-col sm:flex-row items-start gap-4 hover:border-purple-200 transition-all">
              <div className="p-3 bg-purple-50 rounded-xl shadow-xs border border-purple-100 text-[#8b00cc] shrink-0">
                <CreditCard size={24} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 m-0">Full Online Purchase Policy</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed m-0 font-normal whitespace-pre-wrap">
                  {purchasePolicy}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-amber-200/80 shadow-xs flex flex-col sm:flex-row items-start gap-4 hover:border-amber-300 transition-all">
              <div className="p-3 bg-amber-50 rounded-xl shadow-xs border border-amber-200 text-amber-600 shrink-0">
                <Store size={24} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 m-0">Downpayment Information Notice</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed m-0 font-normal whitespace-pre-wrap">
                  {downpaymentPolicy}
                </p>
              </div>
            </div>
          </div>

        </section>

        {/* Facebook Page & Store Branches Section */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-purple-100/90 flex flex-col gap-6">
          
          <div className="flex items-center gap-3 border-b border-purple-100/80 pb-5">
            <div className="w-11 h-11 bg-blue-50 rounded-2xl flex justify-center items-center border border-blue-100 text-blue-600 shadow-sm shrink-0">
              <Facebook size={22} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-wide m-0 border-none">
                Our Facebook Store Branches
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 font-medium m-0 mt-0.5">Select a branch below to visit its official Facebook page</p>
            </div>
          </div>

          <div className={`grid grid-cols-1 ${branches.length > 2 ? 'md:grid-cols-2 lg:grid-cols-3' : branches.length > 1 ? 'md:grid-cols-2' : ''} gap-5 sm:gap-6`}>
            {branches.map((branch) => (
              <div key={branch.id} className="border border-purple-100/90 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-purple-300 transition-all duration-300 bg-white flex flex-col justify-between group">
                <a
                  href={branch.link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative w-full h-52 overflow-hidden block cursor-pointer"
                >
                  <img
                    src={branch.image || '/Images/storefront-bg.jpg'}
                    alt={branch.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLElement).setAttribute('src', '/Images/storefront-bg.jpg');
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-5 text-white">
                    <div className="flex items-center gap-1.5 bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full w-max mb-2 shadow-sm">
                      <Building2 size={12} /> Store Branch
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white tracking-tight drop-shadow-md group-hover:underline flex items-center gap-1.5 m-0 border-none">
                      {branch.title} <ExternalLink size={16} />
                    </h3>
                    <p className="text-[11px] text-gray-200 font-medium mt-0.5 m-0 truncate">
                      {branch.link}
                    </p>
                  </div>
                </a>

                <div className="p-3.5 sm:p-4 bg-gray-50/70 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                    <Facebook size={15} className="text-blue-600" /> Graphix Official Page
                  </span>
                  <a
                    href={branch.link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs rounded-xl shadow-xs transition-all no-underline flex items-center gap-1"
                  >
                    Visit Page <ExternalLink size={12} />
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
