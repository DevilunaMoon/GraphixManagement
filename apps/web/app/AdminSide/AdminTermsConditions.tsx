"use client";

import { Pencil, Plus, Save, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function AdminTermsConditions() {
  const [purchasePolicy, setPurchasePolicy] = useState('');
  const [paymentPolicy, setPaymentPolicy] = useState('');
  const [repairPolicy, setRepairPolicy] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/policies')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          data.forEach(policy => {
            if (policy.type === 'PURCHASE') setPurchasePolicy(policy.content);
            if (policy.type === 'PAYMENT') setPaymentPolicy(policy.content);
            if (policy.type === 'REPAIR') setRepairPolicy(policy.content);
          });
        }
      })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payloads = [
        { type: 'PURCHASE', content: purchasePolicy },
        { type: 'PAYMENT', content: paymentPolicy },
        { type: 'REPAIR', content: repairPolicy }
      ];

      for (const payload of payloads) {
        await fetch('/api/policies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      setSuccessModalOpen(true);
    } catch (error) {
      console.error(error);
      alert('Error saving policies.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="mb-2">
        <h2 className="text-[1.6rem] font-bold text-[#111]">General Terms & Conditions</h2>
      </div>

      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-purple-500/15 shadow-sm p-6 md:p-10 w-full flex flex-col gap-8">
        
        <div className="flex flex-col gap-3">
          <label className="text-[1.1rem] font-bold text-[#111]">Purchase Policy</label>
          <textarea 
            className="w-full h-32 p-4 rounded-xl border-2 border-[#BF00FF] bg-transparent outline-none resize-none font-['Inter'] text-[#444] leading-relaxed"
            value={purchasePolicy}
            onChange={(e) => setPurchasePolicy(e.target.value)}
            placeholder="Enter purchase policy here..."
          ></textarea>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-[1.1rem] font-bold text-[#111]">Payment Policy</label>
          <textarea 
            className="w-full h-32 p-4 rounded-xl border-2 border-[#BF00FF] bg-transparent outline-none resize-none font-['Inter'] text-[#444] leading-relaxed"
            value={paymentPolicy}
            onChange={(e) => setPaymentPolicy(e.target.value)}
            placeholder="Enter payment policy here..."
          ></textarea>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-[1.1rem] font-bold text-[#111]">Repair Policy</label>
          <textarea 
            className="w-full h-32 p-4 rounded-xl border-2 border-[#BF00FF] bg-transparent outline-none resize-none font-['Inter'] text-[#444] leading-relaxed"
            value={repairPolicy}
            onChange={(e) => setRepairPolicy(e.target.value)}
            placeholder="Enter repair policy here..."
          ></textarea>
        </div>

        <div className="flex gap-4 self-start mt-2">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-[#BF00FF] text-white hover:bg-[#9c00d6] px-6 py-2.5 rounded-full font-bold transition-all disabled:opacity-50 border-none cursor-pointer"
          >
            {isSaving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
          </button>
        </div>

      </div>

      {/* Success Modal */}
      {successModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-[400px] w-full text-center shadow-2xl animate-in zoom-in-95 flex flex-col items-center">
            <CheckCircle2 className="text-green-500 w-16 h-16 mb-5" />
            <h3 className="text-xl font-bold mb-3 text-black">Success!</h3>
            <p className="text-gray-600 mb-8 font-medium">
              Your policies have been updated and synced to the public site successfully.
            </p>
            <button 
              onClick={() => setSuccessModalOpen(false)}
              className="px-8 py-2.5 bg-[#bd00ff] text-white rounded-lg font-medium hover:bg-[#9c00d6] transition-colors w-full cursor-pointer border-none"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
