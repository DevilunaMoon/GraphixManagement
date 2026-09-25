"use client";

import { useState, useEffect } from 'react';
import { 
  Building2, 
  HelpCircle, 
  FileText, 
  ChevronRight, 
  ChevronLeft,
  Phone, 
  Mail, 
  MapPin, 
  QrCode, 
  ShieldCheck, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  Sparkles, 
  Headphones, 
  Smartphone,
  CreditCard,
  Wrench,
  CheckCircle2,
  Lock
} from 'lucide-react';

export default function CashierSettings({ initialUser }: { initialUser?: any }) {
  const [activeSection, setActiveSection] = useState<'menu' | 'branch' | 'help' | 'terms'>('menu');
  
  // Data states
  const [user, setUser] = useState<any>(initialUser || null);
  const [branchDetails, setBranchDetails] = useState<any>(null);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Help & Support state
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [activeHelpTab, setActiveHelpTab] = useState<'faqs' | 'guide' | 'contact'>('faqs');

  // Terms & Privacy tab
  const [activePolicyTab, setActivePolicyTab] = useState<'terms' | 'privacy'>('terms');

  // Fetch profile if not provided
  useEffect(() => {
    if (!user) {
      fetch('/api/profile')
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setUser(data);
          }
        })
        .catch(err => console.error('Failed to fetch profile:', err));
    }
  }, [user]);

  // Fetch Branch Information
  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const res = await fetch('/api/branches');
        const data = await res.json();
        if (data && Array.isArray(data.branches)) {
          const userBranchName = user?.branch || 'Tagoloan';
          const matched = data.branches.find(
            (b: any) => b.name?.toLowerCase() === userBranchName.toLowerCase()
          );
          if (matched) {
            setBranchDetails(matched);
          } else if (data.branches.length > 0) {
            setBranchDetails(data.branches[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch branch details:', err);
      }
    };

    if (user?.branch || !branchDetails) {
      fetchBranch();
    }
  }, [user]);

  // Fetch FAQs
  useEffect(() => {
    fetch('/api/faqs')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setFaqs(data);
        }
      })
      .catch(err => console.error('Failed to fetch FAQs:', err));
  }, []);

  // Fetch Policies
  useEffect(() => {
    fetch('/api/policies')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPolicies(data);
        }
      })
      .catch(err => console.error('Failed to fetch policies:', err));
  }, []);

  const assignedBranch = user?.branch || branchDetails?.name || 'Tagoloan';

  const filteredFaqs = faqs.filter(faq => 
    faq.question?.toLowerCase().includes(faqSearch.toLowerCase()) ||
    faq.answer?.toLowerCase().includes(faqSearch.toLowerCase())
  );

  const purchasePolicy = policies.find(p => p.type === 'PURCHASE')?.content || 
    'All product purchases made through Graphix are subject to store availability and verification. Customers must inspect physical items upon delivery or in-store pickup. Warranty terms apply according to manufacturer and store standards. Returns and exchanges are accepted within 7 days of purchase with valid proof of receipt and in original packaging.';
  
  const paymentPolicy = policies.find(p => p.type === 'PAYMENT')?.content || 
    'Graphix supports cash, GCash, and verified digital payment methods. For installment and downpayment transactions, remaining balances must be settled according to the agreed schedule prior to final device release. All transactions are securely processed and recorded with corresponding official reference receipts.';
  
  const repairPolicy = policies.find(p => p.type === 'REPAIR')?.content || 
    'Devices submitted for repair undergo initial intake diagnostics. Customers will receive quotation estimates for required parts and labor. Work commences only upon customer confirmation. Graphix provides a 30-day service warranty on replaced parts and diagnostic labor, excluding subsequent liquid or accidental physical damage.';

  const privacyPolicy = policies.find(p => p.type === 'PRIVACY')?.content || 
    'Graphix values customer privacy and is committed to protecting personal data. We collect customer information including name, email, phone number, and branch preferences solely for account authentication, order fulfillment, repair tracking, and service notifications. We do not sell or disclose personal data to unauthorized third parties.';

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full font-['Inter']">
      {/* 1. Main Settings Navigation Menu */}
      {activeSection === 'menu' && (
        <>
          <div className="mb-2">
            <h2 className="text-[1.6rem] font-bold text-[#111]">Settings</h2>
            <p className="text-sm text-gray-500 font-medium mt-1">
              View your branch information, system operating guidelines, and store policies.
            </p>
          </div>

          {/* Settings Card */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border-2 border-[#BF00FF] shadow-sm py-5 w-full overflow-hidden">
            <ul className="flex flex-col list-none m-0 p-0">
              
              <SettingsItem 
                icon={<Building2 className="text-[#BF00FF] w-7 h-7" />}
                label="Branch Information"
                sublabel="View your assigned branch information and contact details."
                onClick={() => setActiveSection('branch')}
              />

              <SettingsItem 
                icon={<HelpCircle className="text-[#BF00FF] w-7 h-7" />}
                label="Help & Support"
                sublabel="Get help with Cashier functions, FAQs, and system support."
                onClick={() => setActiveSection('help')}
              />

              <SettingsItem 
                icon={<FileText className="text-[#BF00FF] w-7 h-7" />}
                label="Terms & Privacy"
                sublabel="View the current Terms & Conditions and Privacy Policy."
                onClick={() => setActiveSection('terms')}
              />

            </ul>
          </div>
        </>
      )}

      {/* 2. Branch Information Sub-View */}
      {activeSection === 'branch' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSection('menu')}
              className="p-2 bg-white hover:bg-purple-50 text-gray-700 hover:text-[#BF00FF] rounded-xl border border-gray-200 transition-colors cursor-pointer flex items-center gap-1.5 font-bold text-sm shadow-xs"
            >
              <ChevronLeft size={18} />
              Back to Settings
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border-2 border-[#BF00FF] flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#BF00FF] flex items-center justify-center">
                    <Building2 size={26} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 m-0">
                      {assignedBranch} Branch
                    </h3>
                    <p className="text-sm text-gray-500 font-medium m-0 mt-0.5">
                      Assigned store branch and operational contact information
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active Branch
                </span>
                <span className="px-3 py-1 bg-purple-50 text-[#BF00FF] text-xs font-bold rounded-full border border-purple-200">
                  Read Only
                </span>
              </div>
            </div>

            {/* Branch Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Branch Address */}
              <div className="p-5 rounded-2xl bg-gray-50/80 border border-gray-200/80 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <MapPin size={16} className="text-[#BF00FF]" />
                  Branch Address
                </div>
                <p className="text-base font-bold text-gray-900 m-0">
                  {branchDetails?.address || `${assignedBranch}, Misamis Oriental, Philippines`}
                </p>
              </div>

              {/* Branch Contact Phone */}
              <div className="p-5 rounded-2xl bg-gray-50/80 border border-gray-200/80 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <Phone size={16} className="text-[#BF00FF]" />
                  Contact Number
                </div>
                <p className="text-base font-bold text-gray-900 m-0">
                  {branchDetails?.phone || '0967 123 4567'}
                </p>
              </div>

              {/* Branch Email */}
              <div className="p-5 rounded-2xl bg-gray-50/80 border border-gray-200/80 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <Mail size={16} className="text-[#BF00FF]" />
                  Official Email
                </div>
                <p className="text-base font-bold text-gray-900 m-0">
                  {branchDetails?.email || `${assignedBranch.toLowerCase()}@graphix.com`}
                </p>
              </div>

              {/* Cashier Assignment Context */}
              <div className="p-5 rounded-2xl bg-gray-50/80 border border-gray-200/80 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <ShieldCheck size={16} className="text-[#BF00FF]" />
                  Staff Role
                </div>
                <p className="text-base font-bold text-gray-900 m-0">
                  Authorized POS Cashier • {user?.name || 'Staff Member'}
                </p>
              </div>

            </div>

            {/* GCash Payment Information Card */}
            <div className="mt-2 p-6 rounded-3xl bg-gradient-to-br from-purple-50/60 to-purple-100/30 border border-purple-200/80 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white text-[#BF00FF] border border-purple-200 flex items-center justify-center shadow-xs shrink-0">
                  <QrCode size={30} />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-[#BF00FF] uppercase tracking-wider bg-white px-2.5 py-0.5 rounded-full border border-purple-200">
                    Official Branch GCash
                  </span>
                  <h4 className="text-lg font-black text-gray-900 mt-2 m-0">
                    {branchDetails?.gcashName || 'GRAPHIX MANAGEMENT'}
                  </h4>
                  <p className="text-base font-bold text-purple-900 tracking-wide mt-1 m-0">
                    {branchDetails?.gcashNumber || '0967 123 4567'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-medium m-0">
                    Customers can scan or transfer directly for in-store purchases and repair settlements.
                  </p>
                </div>
              </div>

              {branchDetails?.gcashQrCode && (
                <div className="p-2 bg-white rounded-2xl border border-purple-200 shadow-sm shrink-0">
                  <img 
                    src={branchDetails.gcashQrCode} 
                    alt="GCash QR Code" 
                    className="w-28 h-28 object-contain rounded-xl"
                  />
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 text-xs font-semibold text-gray-500 flex items-center gap-2 border border-gray-200">
              <Lock size={14} className="text-[#BF00FF] shrink-0" />
              <span>
                Branch configuration and GCash merchant parameters are maintained by Branch Administrators. If any details need updating, please contact your store supervisor.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Help & Support Sub-View */}
      {activeSection === 'help' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSection('menu')}
              className="p-2 bg-white hover:bg-purple-50 text-gray-700 hover:text-[#BF00FF] rounded-xl border border-gray-200 transition-colors cursor-pointer flex items-center gap-1.5 font-bold text-sm shadow-xs"
            >
              <ChevronLeft size={18} />
              Back to Settings
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border-2 border-[#BF00FF] flex flex-col gap-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#BF00FF] flex items-center justify-center">
                  <HelpCircle size={26} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 m-0">Help & Support</h3>
                  <p className="text-sm text-gray-500 font-medium m-0 mt-0.5">
                    Frequently asked questions, operation guides, and management contacts
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200 self-start md:self-auto">
                <button
                  onClick={() => setActiveHelpTab('faqs')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeHelpTab === 'faqs' 
                      ? 'bg-white text-[#BF00FF] shadow-xs' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  FAQs
                </button>
                <button
                  onClick={() => setActiveHelpTab('guide')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeHelpTab === 'guide' 
                      ? 'bg-white text-[#BF00FF] shadow-xs' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Cashier Guide
                </button>
                <button
                  onClick={() => setActiveHelpTab('contact')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeHelpTab === 'contact' 
                      ? 'bg-white text-[#BF00FF] shadow-xs' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Contact Admin
                </button>
              </div>
            </div>

            {/* TAB 1: FAQs */}
            {activeHelpTab === 'faqs' && (
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                    placeholder="Search frequently asked questions..."
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-900 outline-none focus:border-[#BF00FF] transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-3 mt-2">
                  {filteredFaqs.length > 0 ? (
                    filteredFaqs.map((faq) => {
                      const isOpen = expandedFaq === faq.id;
                      return (
                        <div 
                          key={faq.id || faq.question}
                          className="border border-purple-100 rounded-2xl overflow-hidden transition-all bg-purple-50/20 hover:bg-purple-50/40"
                        >
                          <button
                            onClick={() => setExpandedFaq(isOpen ? null : (faq.id || faq.question))}
                            className="w-full p-4 text-left flex items-center justify-between gap-4 font-bold text-gray-900 cursor-pointer bg-transparent border-none"
                          >
                            <span className="text-sm md:text-base text-gray-900">{faq.question}</span>
                            {isOpen ? (
                              <ChevronUp size={18} className="text-[#BF00FF] shrink-0" />
                            ) : (
                              <ChevronDown size={18} className="text-gray-400 shrink-0" />
                            )}
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-4 pt-1 text-sm text-gray-600 font-medium leading-relaxed border-t border-purple-100/50">
                              {faq.answer}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-10 text-gray-400 font-semibold text-sm">
                      No frequently asked questions matched your search.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Cashier Operations Guide */}
            {activeHelpTab === 'guide' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#BF00FF]">
                    <Smartphone size={18} />
                    1. POS Sale & Device Checkout
                  </div>
                  <p className="text-xs text-gray-600 font-medium leading-relaxed m-0">
                    Scan device barcodes or select items from the inventory catalog. Confirm storage and color options, choose Cash or GCash payment, input customer details, and generate the digital receipt upon full payment.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#BF00FF]">
                    <CreditCard size={18} />
                    2. Downpayment & Layaways
                  </div>
                  <p className="text-xs text-gray-600 font-medium leading-relaxed m-0">
                    For reservation downpayments, accept the required deposit amount. Once the customer visits for item pickup, navigate to Order History or Verify Pickup to settle remaining balance.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#BF00FF]">
                    <Wrench size={18} />
                    3. Gadget Repair Intake & Status
                  </div>
                  <p className="text-xs text-gray-600 font-medium leading-relaxed m-0">
                    Log repair tickets with device brand, model, defect description, and customer contact. Update job statuses as technicians progress through Diagnostic, In-Repair, and Ready for Pickup.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#BF00FF]">
                    <CheckCircle2 size={18} />
                    4. Verify Customer Pickups
                  </div>
                  <p className="text-xs text-gray-600 font-medium leading-relaxed m-0">
                    Always cross-check customer valid IDs or purchase Reference IDs using the Verify Pickup tool on the POS top bar before releasing physical devices.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: Contact Admin / Management */}
            {activeHelpTab === 'contact' && (
              <div className="flex flex-col gap-4">
                <div className="p-6 rounded-2xl bg-purple-50/50 border border-purple-200 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white text-[#BF00FF] border border-purple-200 flex items-center justify-center shrink-0">
                      <Headphones size={24} />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-gray-900 m-0">Store Supervisor & Branch Admin</h4>
                      <p className="text-xs text-gray-500 font-medium mt-0.5 m-0">
                        For inventory discrepancies, product transfers, price overrides, or staff shifts.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <span className="px-3 py-1.5 bg-white text-[#BF00FF] font-bold text-xs rounded-xl border border-purple-200 shadow-2xs">
                      {branchDetails?.phone || '0967 123 4567'}
                    </span>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white text-gray-700 border border-gray-200 flex items-center justify-center shrink-0">
                      <Sparkles size={24} className="text-[#BF00FF]" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-gray-900 m-0">Graphix IT & Technical Desk</h4>
                      <p className="text-xs text-gray-500 font-medium mt-0.5 m-0">
                        For system outages, printer configuration, or POS synchronization support.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <span className="px-3 py-1.5 bg-white text-gray-700 font-bold text-xs rounded-xl border border-gray-200">
                      support@graphix.com
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 4. Terms & Privacy Sub-View */}
      {activeSection === 'terms' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSection('menu')}
              className="p-2 bg-white hover:bg-purple-50 text-gray-700 hover:text-[#BF00FF] rounded-xl border border-gray-200 transition-colors cursor-pointer flex items-center gap-1.5 font-bold text-sm shadow-xs"
            >
              <ChevronLeft size={18} />
              Back to Settings
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border-2 border-[#BF00FF] flex flex-col gap-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#BF00FF] flex items-center justify-center">
                  <FileText size={26} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 m-0">Terms & Privacy</h3>
                  <p className="text-sm text-gray-500 font-medium m-0 mt-0.5">
                    Official Graphix store policies, warranty specifications, and customer privacy protocols
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200 self-start md:self-auto">
                <button
                  onClick={() => setActivePolicyTab('terms')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activePolicyTab === 'terms' 
                      ? 'bg-white text-[#BF00FF] shadow-xs' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Terms & Conditions
                </button>
                <button
                  onClick={() => setActivePolicyTab('privacy')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activePolicyTab === 'privacy' 
                      ? 'bg-white text-[#BF00FF] shadow-xs' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Privacy Policy
                </button>
              </div>
            </div>

            {/* TAB 1: Terms & Conditions */}
            {activePolicyTab === 'terms' && (
              <div className="flex flex-col gap-5">
                <div className="p-5 rounded-2xl bg-purple-50/40 border border-purple-100">
                  <h4 className="text-sm font-bold text-[#BF00FF] mb-1.5 m-0">1. Purchase & Warranty Terms</h4>
                  <p className="text-sm text-gray-700 leading-relaxed font-medium m-0">
                    {purchasePolicy}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-purple-50/40 border border-purple-100">
                  <h4 className="text-sm font-bold text-[#BF00FF] mb-1.5 m-0">2. Payment & Settlement Guidelines</h4>
                  <p className="text-sm text-gray-700 leading-relaxed font-medium m-0">
                    {paymentPolicy}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-purple-50/40 border border-purple-100">
                  <h4 className="text-sm font-bold text-[#BF00FF] mb-1.5 m-0">3. Repair Service Terms & Diagnostic Coverage</h4>
                  <p className="text-sm text-gray-700 leading-relaxed font-medium m-0">
                    {repairPolicy}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: Privacy Policy */}
            {activePolicyTab === 'privacy' && (
              <div className="flex flex-col gap-4">
                <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#BF00FF] mb-3">
                    <ShieldCheck size={20} />
                    Customer Data Confidentiality
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed font-medium m-0">
                    {privacyPolicy}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-purple-50/30 border border-purple-100">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 m-0">Staff Compliance Notice</h4>
                  <p className="text-xs text-gray-600 leading-relaxed font-medium m-0">
                    Cashiers must handle customer phone numbers, receipts, and device credentials with strict confidentiality. Do not store customer payment screenshots on personal devices.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-2xl p-4 text-xs font-semibold text-gray-500 flex items-center justify-between border border-gray-200">
              <span className="flex items-center gap-2">
                <Lock size={14} className="text-[#BF00FF]" />
                View-Only Document • Governed by Graphix Management
              </span>
              <span>Updated {new Date().getFullYear()}</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

function SettingsItem({ 
  icon, 
  label, 
  sublabel, 
  badge, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  sublabel?: string; 
  badge?: string; 
  onClick: () => void;
}) {
  return (
    <li 
      onClick={onClick}
      className="flex justify-between items-center px-8 md:px-10 py-5 md:py-6 hover:bg-[#8100FF]/5 transition-colors cursor-pointer group border-b border-gray-100 last:border-b-0"
    >
      <div className="flex items-center gap-5 md:gap-6">
        <div className="shrink-0">{icon}</div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2.5">
            <span className="text-[1.05rem] md:text-[1.1rem] font-bold text-[#111] group-hover:text-[#BF00FF] transition-colors">{label}</span>
            {badge && (
              <span className="px-2.5 py-0.5 bg-purple-50 text-[#bd00ff] font-extrabold text-[11px] rounded-full border border-purple-200 shadow-2xs">
                {badge}
              </span>
            )}
          </div>
          {sublabel && (
            <span className="text-xs text-gray-500 font-normal mt-0.5">{sublabel}</span>
          )}
        </div>
      </div>
      <div>
        <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-gray-400 group-hover:text-[#BF00FF] group-hover:translate-x-1 transition-all" />
      </div>
    </li>
  );
}
