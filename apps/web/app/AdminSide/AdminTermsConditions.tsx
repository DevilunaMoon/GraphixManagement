"use client";

import { useState, useEffect } from 'react';
import { Save, CheckCircle2, ShieldCheck, FileText, Plus, Trash2, Sparkles, Lock } from 'lucide-react';
import { useBranch } from '../../context/BranchContext';

interface CustomPolicy {
  id?: string;
  type: string;
  title: string;
  content: string;
}

export default function AdminTermsConditions() {
  const { isSuperAdmin } = useBranch();

  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');

  const [purchasePolicy, setPurchasePolicy] = useState('');
  const [paymentPolicy, setPaymentPolicy] = useState('');
  const [repairPolicy, setRepairPolicy] = useState('');
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [customPolicies, setCustomPolicies] = useState<CustomPolicy[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPolicies = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/policies');
      const data = await res.json();
      if (Array.isArray(data)) {
        const customs: CustomPolicy[] = [];
        data.forEach(policy => {
          const pType = (policy.type || '').toUpperCase();
          if (pType === 'PURCHASE') setPurchasePolicy(policy.content || '');
          else if (pType === 'PAYMENT') setPaymentPolicy(policy.content || '');
          else if (pType === 'REPAIR') setRepairPolicy(policy.content || '');
          else if (pType === 'PRIVACY') setPrivacyPolicy(policy.content || '');
          else if (pType.startsWith('ABOUT_')) {
            // Exclude About page dedicated policies managed under about-editor
            return;
          } else {
            customs.push({
              id: policy.id,
              type: pType,
              title: policy.type.replace(/_/g, ' '),
              content: policy.content || ''
            });
          }
        });
        setCustomPolicies(customs);
      }
    } catch (err) {
      console.error('Failed to load policies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleAddCustomPolicy = () => {
    const newIndex = customPolicies.length + 1;
    setCustomPolicies([
      ...customPolicies,
      {
        type: `CUSTOM_POLICY_${Date.now()}`,
        title: `Additional Policy #${newIndex}`,
        content: ''
      }
    ]);
  };

  const handleRemoveCustomPolicy = (index: number) => {
    setCustomPolicies(customPolicies.filter((_, i) => i !== index));
  };

  const handleCustomPolicyChange = (index: number, field: 'title' | 'content', value: string) => {
    const updated = [...customPolicies];
    const target = updated[index];
    if (!target) return;
    if (field === 'title') {
      target.title = value;
      target.type = value.trim().toUpperCase().replace(/\s+/g, '_') || target.type;
    } else {
      target.content = value;
    }
    setCustomPolicies(updated);
  };

  const handleSave = async () => {
    if (!isSuperAdmin) return;
    setIsSaving(true);
    setErrorMsg('');
    try {
      const payloads = [
        { type: 'PURCHASE', content: purchasePolicy },
        { type: 'PAYMENT', content: paymentPolicy },
        { type: 'REPAIR', content: repairPolicy },
        { type: 'PRIVACY', content: privacyPolicy },
        ...customPolicies
          .filter(cp => !cp.type.toUpperCase().startsWith('ABOUT_'))
          .map(cp => ({
            type: cp.type.toUpperCase().replace(/\s+/g, '_'),
            content: cp.content
          }))
      ];

      const res = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policies: payloads })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessModalOpen(true);
      } else {
        setErrorMsg(data.error || 'Failed to save policies');
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Error saving policies.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl font-['Inter']">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[1.6rem] font-bold text-[#111]">Terms & Privacy</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {isSuperAdmin 
              ? 'Manage, customize, and publish customer agreements, purchase rules, repair terms, and privacy policies.'
              : 'View system-wide terms, conditions, and privacy policies managed by the Super Admin.'}
          </p>
        </div>

        {/* Status Badge */}
        {isSuperAdmin ? (
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-50 border border-purple-200 text-[#BF00FF] font-bold text-xs rounded-full self-start sm:self-auto shadow-2xs">
            <Sparkles size={14} />
            <span>Super Admin • Full Edit Access</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs rounded-full self-start sm:self-auto shadow-2xs">
            <Lock size={14} className="text-[#BF00FF]" />
            <span>Branch Admin • Read Only</span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-200">
          {errorMsg}
        </div>
      )}

      {/* Main Container Card */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border-2 border-[#BF00FF] shadow-sm p-6 md:p-8 w-full flex flex-col gap-6">
        
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-100 text-[#BF00FF] flex items-center justify-center shrink-0">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 m-0">Official Store Policies</h3>
              <p className="text-xs text-gray-500 font-medium m-0 mt-0.5">
                Official Graphix store policies, warranty specifications, and customer privacy protocols
              </p>
            </div>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200 self-start sm:self-auto shrink-0">
            <button
              onClick={() => setActiveTab('terms')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'terms' 
                  ? 'bg-white text-[#BF00FF] shadow-xs' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Terms & Conditions
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'privacy' 
                  ? 'bg-white text-[#BF00FF] shadow-xs' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Privacy Policy
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-purple-100 border-t-[#BF00FF] rounded-full animate-spin"></div>
            <p className="text-gray-500 font-bold animate-pulse text-sm">Loading policies...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: TERMS & CONDITIONS */}
            {activeTab === 'terms' && (
              <div className="flex flex-col gap-6">
                
                {/* 1. Purchase Policy */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[1.05rem] font-bold text-[#111] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#BF00FF]"></span>
                      <span>1. Purchase & Warranty Terms</span>
                    </label>
                    <span className="text-xs text-gray-400 font-medium">Store purchases, warranties, and exchanges</span>
                  </div>
                  {isSuperAdmin ? (
                    <textarea 
                      className="w-full h-32 p-4 rounded-xl border-2 border-purple-200 focus:border-[#BF00FF] bg-white outline-none resize-y font-['Inter'] text-[#222] text-sm leading-relaxed transition-all"
                      value={purchasePolicy}
                      onChange={(e) => setPurchasePolicy(e.target.value)}
                      placeholder="Enter purchase policy details, returns, and warranty rules..."
                    />
                  ) : (
                    <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-4 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                      {purchasePolicy || <span className="italic text-gray-400">No purchase policy defined.</span>}
                    </div>
                  )}
                </div>

                {/* 2. Payment Policy */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[1.05rem] font-bold text-[#111] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#BF00FF]"></span>
                      <span>2. Payment & Settlement Guidelines</span>
                    </label>
                    <span className="text-xs text-gray-400 font-medium">Cash, GCash, downpayments, and layaways</span>
                  </div>
                  {isSuperAdmin ? (
                    <textarea 
                      className="w-full h-32 p-4 rounded-xl border-2 border-purple-200 focus:border-[#BF00FF] bg-white outline-none resize-y font-['Inter'] text-[#222] text-sm leading-relaxed transition-all"
                      value={paymentPolicy}
                      onChange={(e) => setPaymentPolicy(e.target.value)}
                      placeholder="Enter payment policies, accepted methods, downpayment terms..."
                    />
                  ) : (
                    <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-4 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                      {paymentPolicy || <span className="italic text-gray-400">No payment policy defined.</span>}
                    </div>
                  )}
                </div>

                {/* 3. Repair Policy */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[1.05rem] font-bold text-[#111] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#BF00FF]"></span>
                      <span>3. Repair Service Terms & Diagnostic Coverage</span>
                    </label>
                    <span className="text-xs text-gray-400 font-medium">Device diagnostics, part warranties & service terms</span>
                  </div>
                  {isSuperAdmin ? (
                    <textarea 
                      className="w-full h-32 p-4 rounded-xl border-2 border-purple-200 focus:border-[#BF00FF] bg-white outline-none resize-y font-['Inter'] text-[#222] text-sm leading-relaxed transition-all"
                      value={repairPolicy}
                      onChange={(e) => setRepairPolicy(e.target.value)}
                      placeholder="Enter repair terms, diagnostic procedures, parts warranty..."
                    />
                  ) : (
                    <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-4 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                      {repairPolicy || <span className="italic text-gray-400">No repair policy defined.</span>}
                    </div>
                  )}
                </div>

                {/* 4. Custom Additional Policies */}
                {customPolicies.map((cp, idx) => (
                  <div key={idx} className="flex flex-col gap-2.5 pt-4 border-t border-purple-100">
                    <div className="flex items-center justify-between gap-3">
                      {isSuperAdmin ? (
                        <input
                          type="text"
                          value={cp.title}
                          onChange={(e) => handleCustomPolicyChange(idx, 'title', e.target.value)}
                          placeholder="Policy Section Title"
                          className="text-[1.05rem] font-bold text-[#111] bg-transparent border-b-2 border-purple-200 focus:border-[#BF00FF] outline-none pb-0.5 flex-1 max-w-md"
                        />
                      ) : (
                        <label className="text-[1.05rem] font-bold text-[#111] flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#BF00FF]"></span>
                          <span>{cp.title}</span>
                        </label>
                      )}

                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomPolicy(idx)}
                          className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 p-1.5 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 cursor-pointer transition-colors"
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      )}
                    </div>

                    {isSuperAdmin ? (
                      <textarea 
                        className="w-full h-28 p-4 rounded-xl border-2 border-purple-200 focus:border-[#BF00FF] bg-white outline-none resize-y font-['Inter'] text-[#222] text-sm leading-relaxed transition-all"
                        value={cp.content}
                        onChange={(e) => handleCustomPolicyChange(idx, 'content', e.target.value)}
                        placeholder={`Enter policy content for ${cp.title}...`}
                      />
                    ) : (
                      <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-4 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                        {cp.content || <span className="italic text-gray-400">No policy content defined.</span>}
                      </div>
                    )}
                  </div>
                ))}

              </div>
            )}

            {/* TAB 2: PRIVACY POLICY */}
            {activeTab === 'privacy' && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[1.05rem] font-bold text-[#111] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#BF00FF]"></span>
                      <span>Customer Data Confidentiality & Security</span>
                    </label>
                    <span className="text-xs text-gray-400 font-medium">Customer personal data, privacy & disclosure rules</span>
                  </div>
                  {isSuperAdmin ? (
                    <textarea 
                      className="w-full h-40 p-4 rounded-xl border-2 border-purple-200 focus:border-[#BF00FF] bg-white outline-none resize-y font-['Inter'] text-[#222] text-sm leading-relaxed transition-all"
                      value={privacyPolicy}
                      onChange={(e) => setPrivacyPolicy(e.target.value)}
                      placeholder="Enter privacy policy, data collection, and customer information protection..."
                    />
                  ) : (
                    <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-4 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                      {privacyPolicy || <span className="italic text-gray-400">No privacy policy defined.</span>}
                    </div>
                  )}
                </div>

                {/* Staff Compliance Notice Card */}
                <div className="p-5 rounded-2xl bg-purple-50/40 border border-purple-200 flex flex-col gap-1.5">
                  <h4 className="text-xs font-bold text-[#BF00FF] uppercase tracking-wider m-0">Staff Compliance Notice</h4>
                  <p className="text-xs text-gray-600 leading-relaxed font-medium m-0">
                    Administrators and Cashiers must handle customer phone numbers, receipts, and device credentials with strict confidentiality. Storing customer personal information or payment screenshots on unauthorized devices is strictly prohibited.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons for Super Admin */}
            {isSuperAdmin ? (
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-purple-100 mt-2">
                {activeTab === 'terms' ? (
                  <button
                    type="button"
                    onClick={handleAddCustomPolicy}
                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-[#BF00FF] font-bold text-sm rounded-xl border border-purple-200 transition-colors cursor-pointer"
                  >
                    <Plus size={16} /> Add Custom Policy Section
                  </button>
                ) : (
                  <div></div>
                )}

                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-gradient-to-r from-[#BF00FF] to-[#6B21A8] text-white hover:opacity-95 px-8 py-3 rounded-xl font-bold shadow-md transition-all disabled:opacity-50 border-none cursor-pointer text-sm ml-auto"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Save All Changes</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-2xl p-4 text-xs font-semibold text-gray-500 flex items-center justify-between border border-gray-200 mt-2">
                <span className="flex items-center gap-2">
                  <Lock size={14} className="text-[#BF00FF]" />
                  View-Only Document • Governed by Graphix Super Admin
                </span>
                <span>Synchronized across all branches</span>
              </div>
            )}
          </>
        )}

      </div>

      {/* Success Modal */}
      {successModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 flex flex-col items-center border-2 border-emerald-500">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-2xl font-black mb-2 text-gray-900">Policies Saved!</h3>
            <p className="text-gray-600 mb-6 font-medium text-sm leading-relaxed">
              Your Terms & Conditions and Privacy Policy have been updated and synchronized in real-time across the entire system.
            </p>
            <button 
              onClick={() => setSuccessModalOpen(false)}
              className="px-8 py-3 bg-gradient-to-r from-[#BF00FF] to-[#6B21A8] text-white rounded-xl font-bold hover:opacity-95 transition-opacity w-full cursor-pointer border-none shadow-md"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
