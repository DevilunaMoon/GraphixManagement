"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Building2, 
  FileText, 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft, 
  Lock, 
  ShieldCheck, 
  Phone, 
  Mail, 
  MapPin, 
  Search, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';

export default function TechnicianSettings() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<'menu' | 'branch' | 'terms' | 'faqs'>('menu');

  // Technician & Branch state
  const [profile, setProfile] = useState<any>(null);
  const [branchDetails, setBranchDetails] = useState<any>(null);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [activePolicyTab, setActivePolicyTab] = useState<'repair' | 'terms' | 'privacy'>('repair');

  useEffect(() => {
    // 1. Fetch Profile
    fetch('/api/profile')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setProfile(data);
        }
      })
      .catch(err => console.error('Failed to fetch profile:', err));

    // 2. Fetch FAQs
    fetch('/api/faqs')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setFaqs(data);
      })
      .catch(err => console.error('Failed to fetch FAQs:', err));

    // 3. Fetch Policies
    fetch('/api/policies')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPolicies(data);
      })
      .catch(err => console.error('Failed to fetch policies:', err));
  }, []);

  // Fetch branch details based on profile branch
  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const res = await fetch('/api/branches');
        const data = await res.json();
        if (data && Array.isArray(data.branches)) {
          const userBranchName = profile?.branch || 'Tagoloan';
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

    if (profile?.branch || !branchDetails) {
      fetchBranch();
    }
  }, [profile]);

  const assignedBranch = profile?.branch || branchDetails?.name || 'Tagoloan';
  const branchDisplayName = assignedBranch.toLowerCase().includes('branch') ? assignedBranch : `${assignedBranch} Branch`;

  const filteredFaqs = faqs.filter(faq => 
    faq.question?.toLowerCase().includes(faqSearch.toLowerCase()) ||
    faq.answer?.toLowerCase().includes(faqSearch.toLowerCase())
  );

  const repairPolicy = policies.find(p => p.type === 'REPAIR')?.content || 
    'Devices submitted for repair undergo initial intake diagnostics. Customers receive quotation estimates for required parts and labor. Work commences only upon customer confirmation. Graphix provides a 30-day service warranty on replaced parts and diagnostic labor, excluding subsequent liquid or accidental physical damage.';

  const termsPolicy = policies.find(p => p.type === 'PURCHASE')?.content || 
    'All parts, accessories, and replacement components are subject to store warranty standards. Technicians must document device condition prior to commencing repairs and confirm part authenticity before bench installation.';

  const privacyPolicy = policies.find(p => p.type === 'PRIVACY')?.content || 
    'Graphix values customer privacy and is committed to protecting personal data stored on submitted devices. Technicians must safeguard all customer information and are strictly prohibited from accessing, copying, or modifying personal files on customer devices.';

  return (
    <main className="flex-1 p-3.5 sm:p-6 md:p-8 flex flex-col max-w-7xl w-full mx-auto font-['Inter']">
      
      {/* 1. Main Settings List Menu */}
      {activeSection === 'menu' && (
        <div className="flex flex-col gap-5 sm:gap-6 w-full pb-10 animate-in fade-in duration-150">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 m-0 tracking-tight">
              Technician Settings
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 font-medium m-0 mt-1 leading-relaxed">
              Manage your technician credentials, branch assignment, security preferences, and store policies.
            </p>
          </div>

          {/* Settings Card */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-200/80 shadow-xs py-2 sm:py-3 w-full overflow-hidden">
            <ul className="flex flex-col list-none m-0 p-0">
              
              <SettingsItem 
                icon={<Building2 className="text-[#BF00FF] w-6 h-6 sm:w-7 sm:h-7" />}
                label="Branch Information"
                sublabel="View your assigned store branch location, address, and contact details"
                onClick={() => setActiveSection('branch')}
              />

              <SettingsItem 
                icon={<FileText className="text-[#BF00FF] w-6 h-6 sm:w-7 sm:h-7" />}
                label="Terms & Privacy Policies"
                badge="View Only"
                sublabel="View store repair policies, service warranties, and privacy guidelines"
                onClick={() => setActiveSection('terms')}
              />

              <SettingsItem 
                icon={<HelpCircle className="text-[#BF00FF] w-6 h-6 sm:w-7 sm:h-7" />}
                label="Frequently Asked Questions & Support"
                badge="View Only"
                sublabel="View repair intake FAQs, diagnostic procedures, and help contacts"
                onClick={() => setActiveSection('faqs')}
              />

            </ul>
          </div>
        </div>
      )}

      {/* 3. Branch Information Sub-View */}
      {activeSection === 'branch' && (
        <div className="flex flex-col gap-5 sm:gap-6 w-full pb-10 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveSection('menu')}
              className="text-black hover:text-[#bd00ff] transition-colors border-none bg-transparent cursor-pointer p-1 -ml-1 shrink-0 flex items-center gap-1 font-bold text-sm"
              title="Back to Settings"
            >
              <ChevronLeft size={24} />
              <span>Back to Settings</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 border border-purple-200/80 shadow-xs flex flex-col gap-6 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 text-[#BF00FF] flex items-center justify-center shrink-0">
                  <Building2 size={28} />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 m-0">
                    {branchDisplayName}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium m-0 mt-0.5">
                    Your assigned store branch and operational contact details
                  </p>
                </div>
              </div>
              <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 flex items-center gap-1.5 self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Active Branch
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-start gap-3.5">
                <MapPin className="text-[#BF00FF] shrink-0 mt-0.5" size={20} />
                <div>
                  <span className="font-bold text-gray-900 block mb-0.5 text-sm">Store Location Address</span>
                  <span className="text-gray-600 leading-relaxed">
                    {branchDetails?.address || `${assignedBranch}, Misamis Oriental, Philippines`}
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-start gap-3.5">
                <Phone className="text-[#BF00FF] shrink-0 mt-0.5" size={20} />
                <div>
                  <span className="font-bold text-gray-900 block mb-0.5 text-sm">Contact Hotline</span>
                  <span className="text-gray-600">
                    {branchDetails?.phone || '+63 912 345 6789'}
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-start gap-3.5">
                <Mail className="text-[#BF00FF] shrink-0 mt-0.5" size={20} />
                <div>
                  <span className="font-bold text-gray-900 block mb-0.5 text-sm">Official Email</span>
                  <span className="text-gray-600">
                    {branchDetails?.email || `support.${assignedBranch.toLowerCase()}@graphix.com`}
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-start gap-3.5">
                <ShieldCheck className="text-[#BF00FF] shrink-0 mt-0.5" size={20} />
                <div>
                  <span className="font-bold text-gray-900 block mb-0.5 text-sm">Branch Code</span>
                  <span className="text-gray-600 font-bold uppercase tracking-wider">
                    {assignedBranch.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Terms & Privacy Policies Sub-View */}
      {activeSection === 'terms' && (
        <div className="flex flex-col gap-5 sm:gap-6 w-full pb-10 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveSection('menu')}
              className="text-black hover:text-[#bd00ff] transition-colors border-none bg-transparent cursor-pointer p-1 -ml-1 shrink-0 flex items-center gap-1 font-bold text-sm"
              title="Back to Settings"
            >
              <ChevronLeft size={24} />
              <span>Back to Settings</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 border border-purple-200/80 shadow-xs flex flex-col gap-6 w-full">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 m-0">Store Terms & Policies</h3>
                <p className="text-xs sm:text-sm text-gray-500 m-0 mt-0.5">Technician operating standards, repair policies, and warranties</p>
              </div>
              <span className="px-3.5 py-1 bg-purple-50 text-[#bd00ff] font-extrabold text-[11px] rounded-full border border-purple-200 flex items-center gap-1">
                <Lock size={11} /> View Only
              </span>
            </div>

            <div className="flex gap-2 border-b border-gray-100 pb-3 flex-wrap">
              <button
                onClick={() => setActivePolicyTab('repair')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border cursor-pointer ${
                  activePolicyTab === 'repair'
                    ? 'bg-[#8b00cc] text-white border-[#8b00cc]'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                Repair Policy
              </button>
              <button
                onClick={() => setActivePolicyTab('terms')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border cursor-pointer ${
                  activePolicyTab === 'terms'
                    ? 'bg-[#8b00cc] text-white border-[#8b00cc]'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                Parts & Warranty
              </button>
              <button
                onClick={() => setActivePolicyTab('privacy')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border cursor-pointer ${
                  activePolicyTab === 'privacy'
                    ? 'bg-[#8b00cc] text-white border-[#8b00cc]'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                Privacy & Data
              </button>
            </div>

            <div className="p-5 sm:p-7 rounded-2xl bg-purple-50/30 border border-purple-100 text-xs sm:text-sm text-gray-700 leading-relaxed font-medium">
              {activePolicyTab === 'repair' && repairPolicy}
              {activePolicyTab === 'terms' && termsPolicy}
              {activePolicyTab === 'privacy' && privacyPolicy}
            </div>
          </div>
        </div>
      )}

      {/* 5. FAQs Sub-View */}
      {activeSection === 'faqs' && (
        <div className="flex flex-col gap-5 sm:gap-6 w-full pb-10 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveSection('menu')}
              className="text-black hover:text-[#bd00ff] transition-colors border-none bg-transparent cursor-pointer p-1 -ml-1 shrink-0 flex items-center gap-1 font-bold text-sm"
              title="Back to Settings"
            >
              <ChevronLeft size={24} />
              <span>Back to Settings</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 border border-purple-200/80 shadow-xs flex flex-col gap-6 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 m-0">Frequently Asked Questions</h3>
                <p className="text-xs sm:text-sm text-gray-500 m-0 mt-0.5">Common repair intake workflows, diagnostic rules, and troubleshooting</p>
              </div>
              
              <div className="flex items-center border border-gray-200 rounded-xl px-3.5 py-2 bg-gray-50 w-full sm:w-72">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs ml-2 w-full text-gray-900 font-medium"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq, idx) => {
                  const isExpanded = expandedFaq === (faq.id || idx.toString());
                  return (
                    <div 
                      key={faq.id || idx}
                      className="border border-purple-100 rounded-2xl overflow-hidden transition-all bg-purple-50/20"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedFaq(isExpanded ? null : (faq.id || idx.toString()))}
                        className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-bold text-xs sm:text-sm text-gray-900 hover:text-[#8b00cc] transition-colors border-none bg-transparent cursor-pointer"
                      >
                        <span>{faq.question}</span>
                        {isExpanded ? <ChevronUp size={16} className="text-[#8b00cc] shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                      </button>
                      {isExpanded && (
                        <div className="p-4 sm:p-5 pt-0 text-xs sm:text-sm text-gray-600 leading-relaxed font-medium border-t border-purple-100/50">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-gray-400 font-semibold">
                  No FAQs matching your query.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </main>
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
      className="flex justify-between items-center px-4 sm:px-6 md:px-8 py-3.5 sm:py-4.5 md:py-5 hover:bg-purple-50/50 transition-colors cursor-pointer group border-b border-gray-100 last:border-b-0 gap-3"
    >
      <div className="flex items-center gap-3.5 sm:gap-5 md:gap-6 flex-1 min-w-0">
        <div className="shrink-0">{icon}</div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-sm sm:text-[1.05rem] md:text-[1.1rem] font-bold text-gray-900 group-hover:text-[#BF00FF] transition-colors leading-snug">
              {label}
            </span>
            {badge && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-[#bd00ff] font-extrabold text-[10px] sm:text-[11px] rounded-full border border-purple-200 shrink-0 whitespace-nowrap shadow-2xs">
                <Lock size={10} className="text-[#bd00ff]" />
                {badge}
              </span>
            )}
          </div>
          {sublabel && (
            <span className="text-xs text-gray-500 font-normal mt-0.5 line-clamp-2 leading-relaxed">
              {sublabel}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0">
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#BF00FF] group-hover:translate-x-1 transition-all" />
      </div>
    </li>
  );
}
