"use client";

import { useState, useEffect } from 'react';
import { Save, CheckCircle2, ShieldCheck, FileText, Lock, Plus, Trash2, HelpCircle } from 'lucide-react';
import { useBranch } from '../../context/BranchContext';

interface CustomPolicy {
  id?: string;
  type: string;
  title: string;
  content: string;
}

export default function AdminTermsConditions() {
  const { isSuperAdmin } = useBranch();

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
          else {
            // Custom policy
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
      // keep type clean
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
        ...customPolicies.map(cp => ({
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
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[1.6rem] font-bold text-[#111]">General Terms & Conditions</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {isSuperAdmin 
              ? 'Manage and publish customer agreements, purchase rules, repair terms, and privacy policy.'
              : 'View system-wide terms, conditions, and privacy policies managed by the Super Admin.'}
          </p>
        </div>

        {/* Status Badge */}
        {!isSuperAdmin && (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-purple-50 border border-purple-200 text-[#BF00FF] font-bold text-xs rounded-xl self-start sm:self-auto shadow-xs">
            <ShieldCheck size={16} />
            <span>Read Only — Managed by Super Admin</span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-200">
          {errorMsg}
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border-2 border-[#BF00FF]/40 shadow-sm p-6 md:p-10 w-full flex flex-col gap-8">
        
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-purple-100 border-t-[#BF00FF] rounded-full animate-spin"></div>
            <p className="text-gray-500 font-bold animate-pulse text-sm">Loading policies...</p>
          </div>
        ) : (
          <>
            {/* 1. Purchase Policy */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-[1.1rem] font-bold text-[#111] flex items-center gap-2">
                  <FileText size={20} className="text-[#BF00FF]" />
                  <span>Purchase Policy</span>
                </label>
                <span className="text-xs text-gray-400 font-medium">Customer store & item purchase rules</span>
              </div>
              {isSuperAdmin ? (
                <textarea 
                  className="w-full h-36 p-4 rounded-xl border-2 border-[#BF00FF] bg-transparent outline-none resize-y font-['Inter'] text-[#222] text-sm leading-relaxed focus:ring-2 focus:ring-[#BF00FF]/20 transition-all"
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
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-[1.1rem] font-bold text-[#111] flex items-center gap-2">
                  <FileText size={20} className="text-[#BF00FF]" />
                  <span>Payment Policy</span>
                </label>
                <span className="text-xs text-gray-400 font-medium">GCash, downpayments, and settlement guidelines</span>
              </div>
              {isSuperAdmin ? (
                <textarea 
                  className="w-full h-36 p-4 rounded-xl border-2 border-[#BF00FF] bg-transparent outline-none resize-y font-['Inter'] text-[#222] text-sm leading-relaxed focus:ring-2 focus:ring-[#BF00FF]/20 transition-all"
                  value={paymentPolicy}
                  onChange={(e) => setPaymentPolicy(e.target.value)}
                  placeholder="Enter payment policies, accepted payment methods, downpayment terms..."
                />
              ) : (
                <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-4 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {paymentPolicy || <span className="italic text-gray-400">No payment policy defined.</span>}
                </div>
              )}
            </div>

            {/* 3. Repair Policy */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-[1.1rem] font-bold text-[#111] flex items-center gap-2">
                  <FileText size={20} className="text-[#BF00FF]" />
                  <span>Repair Policy</span>
                </label>
                <span className="text-xs text-gray-400 font-medium">Device diagnostic, service warranty & repair terms</span>
              </div>
              {isSuperAdmin ? (
                <textarea 
                  className="w-full h-36 p-4 rounded-xl border-2 border-[#BF00FF] bg-transparent outline-none resize-y font-['Inter'] text-[#222] text-sm leading-relaxed focus:ring-2 focus:ring-[#BF00FF]/20 transition-all"
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

            {/* 4. Privacy Policy (New Section) */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-[1.1rem] font-bold text-[#111] flex items-center gap-2">
                  <FileText size={20} className="text-[#BF00FF]" />
                  <span>Privacy Policy</span>
                </label>
                <span className="text-xs text-gray-400 font-medium">Customer personal data, security & disclosure rules</span>
              </div>
              {isSuperAdmin ? (
                <textarea 
                  className="w-full h-36 p-4 rounded-xl border-2 border-[#BF00FF] bg-transparent outline-none resize-y font-['Inter'] text-[#222] text-sm leading-relaxed focus:ring-2 focus:ring-[#BF00FF]/20 transition-all"
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

            {/* 5. Custom Additional Policies (if added) */}
            {customPolicies.map((cp, idx) => (
              <div key={idx} className="flex flex-col gap-3 pt-4 border-t border-purple-100">
                <div className="flex items-center justify-between gap-3">
                  {isSuperAdmin ? (
                    <input
                      type="text"
                      value={cp.title}
                      onChange={(e) => handleCustomPolicyChange(idx, 'title', e.target.value)}
                      placeholder="Policy Section Title"
                      className="text-[1.1rem] font-bold text-[#111] bg-transparent border-b-2 border-purple-200 focus:border-[#BF00FF] outline-none pb-0.5"
                    />
                  ) : (
                    <label className="text-[1.1rem] font-bold text-[#111] flex items-center gap-2">
                      <FileText size={20} className="text-[#BF00FF]" />
                      <span>{cp.title}</span>
                    </label>
                  )}

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomPolicy(idx)}
                      className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 p-1 bg-red-50 rounded-lg border border-red-200 cursor-pointer"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  )}
                </div>

                {isSuperAdmin ? (
                  <textarea 
                    className="w-full h-32 p-4 rounded-xl border-2 border-[#BF00FF] bg-transparent outline-none resize-y font-['Inter'] text-[#222] text-sm leading-relaxed focus:ring-2 focus:ring-[#BF00FF]/20 transition-all"
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

            {/* Action Buttons for Super Admin */}
            {isSuperAdmin && (
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-purple-100 mt-2">
                <button
                  type="button"
                  onClick={handleAddCustomPolicy}
                  className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-[#BF00FF] font-bold text-sm rounded-xl border border-purple-200 transition-colors cursor-pointer"
                >
                  <Plus size={16} /> Add Custom Policy Section
                </button>

                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-gradient-to-r from-[#BF00FF] to-[#6B21A8] text-white hover:opacity-95 px-8 py-3 rounded-xl font-bold shadow-md transition-all disabled:opacity-50 border-none cursor-pointer text-sm"
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
