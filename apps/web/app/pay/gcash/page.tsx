"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Copy, Check, ExternalLink, ArrowLeft, ShieldCheck, Smartphone, QrCode } from 'lucide-react';
import Link from 'next/link';

function GcashPayRedirectContent() {
  const searchParams = useSearchParams();
  const branch = searchParams.get('branch') || 'Graphix Store';
  const name = searchParams.get('name') || 'GRAPHIX MANAGEMENT';
  const number = searchParams.get('number') || '0967 123 4567';
  const amount = searchParams.get('amount') || '';

  const cleanNumber = number.replace(/\s+/g, '');
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  useEffect(() => {
    // Attempt auto-launching GCash if on mobile device
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      const timer = setTimeout(() => {
        try {
          window.location.href = "gcash://app";
        } catch (e) {
          console.warn("Could not trigger gcash:// app link automatically:", e);
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(cleanNumber);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const handleCopyAmount = () => {
    if (!amount) return;
    navigator.clipboard.writeText(amount.replace(/[^0.9.]/g, ''));
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 via-blue-700 to-blue-900 flex flex-col items-center justify-center p-4 font-['Inter'] text-gray-800">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-blue-100 flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* GCash Styled Header */}
        <div className="bg-[#005ce6] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white text-[#005ce6] flex items-center justify-center font-black text-xl shadow-md">
              G
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-wide m-0">GCash Transfer</h1>
              <p className="text-[11px] text-blue-100 font-medium m-0 flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-300" />
                Verified Merchant Payment
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-white/20 font-bold px-2 py-0.5 rounded-full">
            {branch}
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-4">

          {/* Amount Box if provided */}
          {amount && (
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex flex-col items-center text-center">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Amount to Transfer</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-black text-blue-900">₱{amount}</span>
                <button
                  onClick={handleCopyAmount}
                  type="button"
                  className="p-1.5 text-blue-600 hover:bg-blue-100/80 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                  title="Copy amount"
                >
                  {copiedAmount ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Account Details Box */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Account Name</span>
              <span className="text-sm font-extrabold text-gray-900">{name}</span>
            </div>

            <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Account Number</span>
                <span className="text-base font-mono font-black text-[#005ce6] tracking-wider">{number}</span>
              </div>
              <button
                onClick={handleCopyNumber}
                type="button"
                className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-[#005ce6] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-none"
              >
                {copiedNumber ? (
                  <>
                    <Check size={14} className="text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Button to Launch GCash */}
          <a
            href="gcash://app"
            className="w-full py-3.5 bg-[#005ce6] hover:bg-blue-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all no-underline text-center active:scale-98"
          >
            <Smartphone size={18} />
            <span>Open in GCash App</span>
          </a>

          {/* Instructions */}
          <div className="text-[11px] text-gray-500 bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex flex-col gap-1 leading-relaxed">
            <strong>How to complete payment:</strong>
            <ol className="list-decimal pl-4 m-0 space-y-0.5">
              <li>Tap <strong>Open in GCash App</strong> above (or open GCash manually).</li>
              <li>Select <strong>Send Money</strong> → <strong>Express Send</strong>.</li>
              <li>Paste the Account Number <strong>{cleanNumber}</strong>.</li>
              {amount && <li>Enter the exact amount <strong>₱{amount}</strong>.</li>}
              <li>Take a screenshot of your transfer receipt.</li>
            </ol>
          </div>

          <div className="text-center pt-2">
            <Link href="/customer/payment" className="text-xs text-gray-400 hover:text-gray-600 font-semibold no-underline inline-flex items-center gap-1">
              <ArrowLeft size={13} />
              Return to Checkout
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GcashPayRedirect() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-blue-600 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    }>
      <GcashPayRedirectContent />
    </Suspense>
  );
}
