"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Radio, Smartphone, CheckCircle2, AlertCircle, RefreshCw, Send, 
  ArrowLeft, ShieldCheck, Clock, Sparkles, Info, Check, Copy, ChevronDown, ChevronUp
} from 'lucide-react';
import { detectTelcoNetwork, normalizePhilippineNumber } from '../../lib/sms';

export default function AdminSmsGateway() {
  const [status, setStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Test form state
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('Graphix SMS Test: Semaphore API gateway connection is working properly!');
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  // Live telco detection
  const normalizedInputPhone = normalizePhilippineNumber(phone);
  const detectedNetwork = detectTelcoNetwork(normalizedInputPhone);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/admin/sms/status', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      } else {
        const err = await res.json();
        setStatus({ configured: false, error: err.error || 'Failed to fetch status' });
      }
    } catch (err: any) {
      setStatus({ configured: false, error: err.message || 'Network error' });
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !message.trim()) return;

    setIsSending(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message })
      });

      const data = await res.json();
      setTestResult(data);

      // Refresh credit balance
      fetchStatus();
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Failed to communicate with test endpoint'
      });
    } finally {
      setIsSending(false);
    }
  };

  const setPresetMessage = (msg: string) => {
    setMessage(msg);
  };

  const copyRaw = () => {
    if (!testResult) return;
    navigator.clipboard.writeText(JSON.stringify(testResult, null, 2));
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  const charCount = message.length;
  const smsSegments = Math.max(1, Math.ceil(charCount / 160));

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-16 font-['Inter']">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-purple-100 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/settings"
              className="p-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer"
              title="Back to Settings"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight m-0">
                  Semaphore SMS Gateway
                </h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-[#8b00cc] border border-purple-200">
                  v4 API
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium m-0 mt-0.5">
                Monitor Semaphore SMS credits, telco network routing, and test live DITO / Globe / Smart delivery.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loadingStatus}
          className="px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-2xs transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loadingStatus ? 'animate-spin text-[#8b00cc]' : ''} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* 1. Status Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Connection Status */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-purple-100 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gateway Status</span>
            <div className={`p-2 rounded-xl ${status?.configured && !status?.error ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <Radio size={16} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${status?.configured && !status?.error ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-base font-extrabold text-gray-900">
                {status?.configured ? (status?.error ? 'Connection Issue' : 'Connected') : 'Key Not Configured'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 m-0 mt-1 truncate">
              {status?.accountName ? `Account: ${status.accountName}` : 'Requires SEMAPHORE_API_KEY in Coolify'}
            </p>
          </div>
        </div>

        {/* Credit Balance */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-purple-100 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">SMS Balance</span>
            <div className="p-2 rounded-xl bg-purple-50 text-[#8b00cc]">
              <Sparkles size={16} />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-gray-900">
              {status?.creditBalance !== undefined ? `${status.creditBalance}` : '—'}
            </span>
            <span className="text-xs font-bold text-gray-500 ml-1.5">Credits</span>
            <p className="text-[11px] text-gray-500 m-0 mt-1">
              {status?.status ? `Account Status: ${status.status}` : '1 credit = 1 SMS (160 chars)'}
            </p>
          </div>
        </div>

        {/* Custom Sender ID */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-purple-100 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Approved Sender Name</span>
            <div className="p-2 rounded-xl bg-purple-50 text-[#8b00cc]">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div>
            <span className="font-mono text-lg font-black text-purple-900 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200 inline-block">
              {status?.customSenderName || 'GRAPHIX'}
            </span>
            <p className="text-[11px] text-gray-500 m-0 mt-1">
              Active for Globe & Smart recipients
            </p>
          </div>
        </div>

        {/* DITO 10-Day Route */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-purple-100 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">DITO Telco Route</span>
            <div className="p-2 rounded-xl bg-purple-50 text-[#8b00cc]">
              <Clock size={16} />
            </div>
          </div>
          <div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
              status?.ditoApproved 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {status?.ditoApproved ? 'Approved (Direct)' : '10-Day Bypassed'}
            </span>
            <p className="text-[11px] text-gray-500 m-0 mt-1">
              {status?.ditoApproved 
                ? 'Using custom sender for DITO' 
                : 'Auto-fallback to default pool to guarantee delivery'}
            </p>
          </div>
        </div>
      </div>

      {/* Warning if API key is not configured */}
      {status && !status.configured && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs leading-relaxed">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block mb-0.5">Semaphore API Key is not set yet!</strong>
            Please add <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-900 font-mono font-bold">SEMAPHORE_API_KEY</code> and <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-900 font-mono font-bold">SEMAPHORE_SENDER_NAME=GRAPHIX</code> to your Coolify environment variables on your Contabo server and click Redeploy.
          </div>
        </div>
      )}

      {/* 2. Interactive Live SMS Tester Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-3xl border border-purple-100 p-5 sm:p-7 shadow-sm flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#8b00cc] flex items-center justify-center">
                <Send size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 m-0">Live SMS Tester</h3>
                <p className="text-xs text-gray-500 m-0">Test delivery to your Globe, Smart, or DITO test phone numbers</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSendTestSms} className="flex flex-col gap-4">
            
            {/* Phone Input with live Telco detection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700">
                  Recipient Mobile Number <span className="text-red-500">*</span>
                </label>
                {/* Telco detection badge */}
                {normalizedInputPhone.length >= 4 && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    detectedNetwork === 'DITO'
                      ? 'bg-purple-100 text-[#8b00cc] border border-purple-200'
                      : detectedNetwork === 'GLOBE'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : detectedNetwork === 'SMART'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Smartphone size={11} />
                    <span>
                      {detectedNetwork === 'DITO' && 'DITO Telecommunity (Bypass Active)'}
                      {detectedNetwork === 'GLOBE' && 'Globe / TM (Using GRAPHIX)'}
                      {detectedNetwork === 'SMART' && 'Smart / TNT (Using GRAPHIX)'}
                      {detectedNetwork === 'UNKNOWN' && 'Other / Unknown Network'}
                    </span>
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900 placeholder-gray-400 font-mono"
                />
              </div>
              <p className="text-[11px] text-gray-400 m-0 mt-1">
                Accepts any format (e.g. 09171234567, +639171234567, or DITO 0991...).
              </p>
            </div>

            {/* Preset Message Templates */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Quick Message Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setPresetMessage('Graphix SMS Test: Semaphore API gateway connection is working properly!')}
                  className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-purple-50 text-gray-700 hover:text-purple-700 text-xs font-medium border border-gray-200 cursor-pointer transition-colors"
                >
                  ⚡ Gateway Test
                </button>
                <button
                  type="button"
                  onClick={() => setPresetMessage('Hi Juan! Your iPhone 13 (GRPX-TAG-A1) is now ready for pickup at Graphix Tagoloan Branch. Balance: P500. Claim Code: GRPX-TAG-A1. Thank you!')}
                  className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-purple-50 text-gray-700 hover:text-purple-700 text-xs font-medium border border-gray-200 cursor-pointer transition-colors"
                >
                  🔧 Repair Ready
                </button>
                <button
                  type="button"
                  onClick={() => setPresetMessage('Graphix Receipt: Downpayment of P1,000 received for order GRPX-TAG-B4 at Tagoloan Branch. Thank you for trusting Graphix Tech!')}
                  className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-purple-50 text-gray-700 hover:text-purple-700 text-xs font-medium border border-gray-200 cursor-pointer transition-colors"
                >
                  🧾 Downpayment Receipt
                </button>
              </div>
            </div>

            {/* Message Body */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700">
                  SMS Message Body <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] font-mono font-semibold text-gray-400">
                  {charCount} / 160 chars ({smsSegments} SMS)
                </span>
              </div>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type SMS message..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900 placeholder-gray-400 leading-relaxed resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSending || !phone}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] hover:brightness-110 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Sending via Semaphore API...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Send Live Test SMS</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* 3. Live Test Result Card */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="bg-white rounded-3xl border border-purple-100 p-5 sm:p-7 shadow-sm flex flex-col gap-4">
            <h3 className="text-base font-bold text-gray-900 m-0 border-b border-purple-100 pb-3 flex items-center gap-2">
              <span>API Response Inspector</span>
            </h3>

            {testResult ? (
              <div className="flex flex-col gap-3">
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  testResult.success 
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                    : 'bg-red-50/70 border-red-200 text-red-900'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <span className="font-bold text-sm block">
                      {testResult.success ? 'Message Sent / Queued!' : 'Failed to Send'}
                    </span>
                    <p className="text-xs m-0 mt-0.5 leading-relaxed">
                      {testResult.success 
                        ? 'Semaphore accepted the message and queued it for delivery to the telco network.' 
                        : (testResult.error || 'Unknown error occurred')}
                    </p>
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-100 flex flex-col gap-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">Recipient:</span>
                    <span className="font-mono font-bold text-gray-900">{testResult.recipient || phone}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">Network Detected:</span>
                    <span className="font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-[11px]">
                      {testResult.network || 'UNKNOWN'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">Sender ID Route:</span>
                    <span className="font-bold text-gray-900">
                      {testResult.senderNameUsed ? testResult.senderNameUsed : 'Default Pool (DITO bypass)'}
                    </span>
                  </div>
                  {testResult.messageId && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-medium">Semaphore Message ID:</span>
                      <span className="font-mono text-gray-700">{testResult.messageId}</span>
                    </div>
                  )}
                  {testResult.status && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-medium">Delivery Status:</span>
                      <span className="font-bold text-emerald-700">{testResult.status}</span>
                    </div>
                  )}
                </div>

                {/* Raw Response Collapsible */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowRawResponse(!showRawResponse)}
                    className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-purple-700 font-bold py-1 bg-transparent border-none cursor-pointer"
                  >
                    <span>{showRawResponse ? 'Hide Raw API JSON' : 'View Raw API JSON'}</span>
                    {showRawResponse ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {showRawResponse && (
                    <div className="relative mt-2 p-3 bg-gray-900 text-gray-100 rounded-xl font-mono text-[11px] overflow-x-auto max-h-56">
                      <button
                        type="button"
                        onClick={copyRaw}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 cursor-pointer border-none"
                        title="Copy JSON"
                      >
                        {copiedRaw ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                      <pre className="m-0 leading-tight">
                        {JSON.stringify(testResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-gray-400">
                <Smartphone size={32} className="text-gray-300" />
                <p className="text-xs m-0 font-medium">
                  Enter a mobile number on the left and click <strong>Send Live Test SMS</strong> to inspect the result here.
                </p>
              </div>
            )}
          </div>

          {/* DITO 10-Day Info Box */}
          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 text-xs text-purple-900 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-purple-950">
              <Info size={15} className="text-[#8b00cc]" />
              <span>How the DITO 10-Day Fallback Works</span>
            </div>
            <p className="m-0 leading-relaxed text-[11px] text-purple-800">
              Because DITO Telecommunity takes up to 10 business days to approve custom sender IDs like <span className="font-mono font-bold">GRAPHIX</span>, our system automatically routes DITO numbers through Semaphore's standard pooled sender. This guarantees <strong>immediate SMS delivery</strong> without awaiting telco approval!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

