"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Radio, Smartphone, CheckCircle2, AlertCircle, RefreshCw, Send, 
  ArrowLeft, ShieldCheck, Clock, Sparkles, Info, Check, Copy, ChevronDown, ChevronUp,
  History, Search, Filter, MessageSquare, ChevronLeft, ChevronRight, User, Phone, CheckCircle, XCircle
} from 'lucide-react';
import { detectTelcoNetwork, normalizePhilippineNumber } from '../../lib/sms-utils';

export default function AdminSmsGateway() {
  const [activeTab, setActiveTab] = useState<'gateway' | 'history'>('gateway');

  // Gateway status state
  const [status, setStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Test form state
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('Graphix SMS Test: Semaphore API gateway connection is working properly!');
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  // History state
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [historyStats, setHistoryStats] = useState({ total: 0, submitted: 0, failed: 0 });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyBranch, setHistoryBranch] = useState('All');
  const [historyStatus, setHistoryStatus] = useState('All');
  const [historySearch, setHistorySearch] = useState('');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [selectedMessageLog, setSelectedMessageLog] = useState<any | null>(null);

  // Live telco detection for test input
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

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams({
        page: historyPage.toString(),
        limit: '15',
        branch: historyBranch,
        status: historyStatus,
        q: historySearch
      });
      const res = await fetch(`/api/repairs/sms-history?${params.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setHistoryItems(data.history || []);
        setHistoryTotalPages(data.totalPages || 1);
        setHistoryStats(data.stats || { total: 0, submitted: 0, failed: 0 });
      }
    } catch (err) {
      console.error('Failed to load SMS history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, historyPage, historyBranch, historyStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHistoryPage(1);
    fetchHistory();
  };

  const handleRetrySms = async (id: string) => {
    setRetryingId(id);
    try {
      const res = await fetch(`/api/repairs/sms-history/${id}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchHistory();
      } else {
        alert(data.error || 'Failed to retry SMS');
      }
    } catch (err: any) {
      alert(err?.message || 'Network error while retrying');
    } finally {
      setRetryingId(null);
    }
  };

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
              className="p-2 rounded-xl text-gray-500 hover:text-purple-700 hover:bg-purple-50 transition-colors"
              title="Back to Settings"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                Semaphore SMS Management
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-[#8b00cc] font-bold">
                  Philippine Telco Gateway
                </span>
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Automated customer repair progress notifications & live gateway diagnostics.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-gray-100 p-1 rounded-2xl border border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('gateway')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border-none cursor-pointer ${
              activeTab === 'gateway'
                ? 'bg-white text-purple-900 shadow-xs'
                : 'bg-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Radio size={14} className={activeTab === 'gateway' ? 'text-purple-600' : 'text-gray-400'} />
            Gateway & Tester
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border-none cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-purple-900 shadow-xs'
                : 'bg-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <History size={14} className={activeTab === 'history' ? 'text-purple-600' : 'text-gray-400'} />
            SMS Notification History
            {historyStats.total > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-800 font-extrabold">
                {historyStats.total}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: GATEWAY & TESTER */}
      {activeTab === 'gateway' && (
        <div className="flex flex-col gap-6">
          {/* Status Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. API Connection Status */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Gateway Status</span>
                {loadingStatus ? (
                  <RefreshCw size={16} className="text-purple-500 animate-spin" />
                ) : status?.configured ? (
                  <CheckCircle2 size={18} className="text-emerald-500" />
                ) : (
                  <AlertCircle size={18} className="text-rose-500" />
                )}
              </div>
              <div className="mt-3">
                <div className="text-xl font-black text-gray-900 flex items-center gap-2">
                  {loadingStatus ? 'Checking...' : status?.configured ? 'Connected' : 'Not Configured'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {status?.configured ? `Account: ${status.accountName || 'Graphix Store'}` : 'Requires SEMAPHORE_API_KEY'}
                </p>
              </div>
            </div>

            {/* 2. Semaphore Credit Balance */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Remaining Credits</span>
                <Sparkles size={16} className="text-amber-500" />
              </div>
              <div className="mt-3">
                <div className="text-xl font-black text-gray-900">
                  {loadingStatus ? '...' : (status?.creditBalance ?? 'N/A')}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  1 credit = 1 SMS part (160 standard chars)
                </p>
              </div>
            </div>

            {/* 3. Sender Name / Sender ID */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Sender ID (Globe/Smart)</span>
                <Radio size={16} className="text-[#8b00cc]" />
              </div>
              <div className="mt-3">
                <div className="text-xl font-black text-purple-950 font-mono">
                  {status?.customSenderName || 'GRAPHIX'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Approved branding sender for major networks
                </p>
              </div>
            </div>

            {/* 4. DITO 10-day Approval Fallback */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">DITO Fallback Routing</span>
                <ShieldCheck size={16} className="text-blue-500" />
              </div>
              <div className="mt-3">
                <div className="text-xl font-black text-blue-950">
                  {status?.ditoApproved ? 'Direct ID' : 'Pooled Safe Mode'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {status?.ditoApproved ? 'Direct custom sender enabled' : 'Bypasses 10-day telco approval lock'}
                </p>
              </div>
            </div>
          </div>

          {/* Configuration Warning Alert if API Key is Missing */}
          {!loadingStatus && !status?.configured && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
              <AlertCircle size={20} className="text-rose-600 mt-0.5 shrink-0" />
              <div className="text-xs space-y-1">
                <span className="font-bold text-sm block">Semaphore API Key Not Detected</span>
                <p className="m-0 leading-relaxed text-rose-800">
                  The system requires <code className="bg-rose-100 px-1 py-0.5 rounded font-mono text-rose-900">SEMAPHORE_API_KEY</code> in your environment variables.
                  Add this variable in Coolify or your server environment to activate live SMS delivery.
                </p>
              </div>
            </div>
          )}

          {/* Main Grid: Interactive Tester & Live Telco Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Test Dispatch Form */}
            <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#8b00cc] flex items-center justify-center font-bold">
                    <Send size={16} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 m-0">Send Test SMS</h2>
                    <p className="text-xs text-gray-500 m-0">Test delivery to Globe, Smart, TNT, TM, or DITO numbers</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchStatus}
                  className="p-2 text-gray-400 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-all cursor-pointer border-none bg-transparent"
                  title="Refresh Balance & Status"
                >
                  <RefreshCw size={15} />
                </button>
              </div>

              <form onSubmit={handleSendTestSms} className="flex flex-col gap-4">
                
                {/* Mobile Number Input with Live Telco Badge */}
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                    Philippine Mobile Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 09171234567, 09911234567, +63917..."
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#8b00cc] font-mono tracking-wide"
                    />
                    {normalizedInputPhone && (
                      <div className="absolute right-3 top-2.5 flex items-center gap-1.5">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                          detectedNetwork === 'DITO' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          detectedNetwork === 'GLOBE' ? 'bg-sky-100 text-sky-800 border border-sky-200' :
                          detectedNetwork === 'SMART' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {detectedNetwork}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1.5">
                    <span>Formats: 09XXXXXXXXX or +639XXXXXXXXX</span>
                    {detectedNetwork === 'DITO' && (
                      <span className="text-blue-600 font-semibold flex items-center gap-1">
                        <ShieldCheck size={12} />
                        DITO prefix detected: will use fallback shortcode
                      </span>
                    )}
                  </div>
                </div>

                {/* Message Templates Quick Select */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Quick Message Templates
                    </label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setPresetMessage("GraphiX Store: Hello Valued Customer, your gadget (iPhone 13) is currently undergoing diagnostic evaluation. Reference: GRPX-TAG-A001.")}
                      className="px-2.5 py-1.5 text-left rounded-xl bg-purple-50/70 hover:bg-purple-100/80 text-purple-900 text-xs font-semibold border border-purple-100 transition-all cursor-pointer"
                    >
                      Diagnostic
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetMessage("GraphiX Store: Hello Valued Customer, your gadget (iPhone 13) is now undergoing repair. Our technician is currently working on your device. Reference: GRPX-TAG-A001.")}
                      className="px-2.5 py-1.5 text-left rounded-xl bg-purple-50/70 hover:bg-purple-100/80 text-purple-900 text-xs font-semibold border border-purple-100 transition-all cursor-pointer"
                    >
                      Repairing
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetMessage("GraphiX Store: Good news, Valued Customer! Your gadget repair (GRPX-TAG-A001) has been completed. Please coordinate with our Tagoloan Branch regarding device pickup. Thank you for choosing GraphiX Store!")}
                      className="px-2.5 py-1.5 text-left rounded-xl bg-purple-50/70 hover:bg-purple-100/80 text-purple-900 text-xs font-semibold border border-purple-100 transition-all cursor-pointer"
                    >
                      Completed
                    </button>
                    <button
                      type="button"
                      onClick={() => setPresetMessage("GraphiX Store: Hello Valued Customer, your gadget repair request (GRPX-TAG-A001) has been cancelled. For further information, please contact our Tagoloan Branch. Thank you.")}
                      className="px-2.5 py-1.5 text-left rounded-xl bg-purple-50/70 hover:bg-purple-100/80 text-purple-900 text-xs font-semibold border border-purple-100 transition-all cursor-pointer"
                    >
                      Cancelled
                    </button>
                  </div>
                </div>

                {/* Message Body Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Message Content
                    </label>
                    <span className="text-[11px] text-gray-400 font-mono">
                      {charCount} chars ({smsSegments} segment{smsSegments > 1 ? 's' : ''})
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter message text..."
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#8b00cc] leading-relaxed resize-none"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={13} />
                    <span>Instant dispatch to telco gateway</span>
                  </div>
                  <button
                    type="submit"
                    disabled={isSending || !phone || !message.trim()}
                    className="px-6 py-2.5 bg-[#8b00cc] hover:bg-[#7200a8] text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer border-none"
                  >
                    {isSending ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Sending SMS...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Send Live Test SMS</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Live Dispatch Result & Raw Inspector */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              
              {/* Result Card */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 m-0 flex items-center gap-2">
                    <Smartphone size={16} className="text-[#8b00cc]" />
                    <span>Live Dispatch Result</span>
                  </h3>
                  {testResult && (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      testResult.success ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {testResult.success ? 'Submitted' : 'Failed'}
                    </span>
                  )}
                </div>

                {testResult ? (
                  <div className="flex flex-col gap-3">
                    {testResult.success ? (
                      <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
                        <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold block">SMS Accepted by Semaphore Gateway</span>
                          <span className="text-[11px] text-emerald-800">
                            The message has been queued for immediate telco delivery.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
                        <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold block">SMS Submission Failed</span>
                          <span className="text-[11px] text-rose-800">
                            {testResult.error || 'Failed to communicate with Semaphore API'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Metadata breakdown */}
                    <div className="bg-gray-50 p-3.5 rounded-2xl text-xs space-y-2 border border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">Recipient Telco:</span>
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
      )}

      {/* TAB 2: REPAIR SMS NOTIFICATION HISTORY */}
      {activeTab === 'history' && (
        <div className="flex flex-col gap-5">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase">Total Messages</span>
                <div className="text-2xl font-black text-gray-900 mt-1">{historyStats.total}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <MessageSquare size={18} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase">Submitted Successfully</span>
                <div className="text-2xl font-black text-emerald-700 mt-1">{historyStats.submitted}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle size={18} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-600 uppercase">Failed / Pending Retry</span>
                <div className="text-2xl font-black text-rose-700 mt-1">{historyStats.failed}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle size={18} />
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search by customer, phone, reference, technician..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-purple-600"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs border-none cursor-pointer"
              >
                Search
              </button>
            </form>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Branch Filter */}
              <div className="flex items-center gap-1 text-xs">
                <Filter size={13} className="text-gray-400" />
                <span className="font-bold text-gray-600">Branch:</span>
                <select
                  value={historyBranch}
                  onChange={(e) => {
                    setHistoryBranch(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none"
                >
                  <option value="All">All Branches</option>
                  <option value="Tagoloan">Tagoloan</option>
                  <option value="Villanueva">Villanueva</option>
                  <option value="Jasaan">Jasaan</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="font-bold text-gray-600">Status:</span>
                <select
                  value={historyStatus}
                  onChange={(e) => {
                    setHistoryStatus(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>

              <button
                type="button"
                onClick={fetchHistory}
                className="p-2 text-gray-500 hover:text-purple-700 rounded-lg bg-gray-50 border border-gray-200 cursor-pointer"
                title="Refresh History"
              >
                <RefreshCw size={13} className={loadingHistory ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* SMS History Table */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Repair Ref</th>
                    <th className="py-3 px-4">Customer & Phone</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Progress Transition</th>
                    <th className="py-3 px-4">Delivery Status</th>
                    <th className="py-3 px-4">Technician</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingHistory ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400">
                        <RefreshCw size={18} className="animate-spin inline mr-2 text-purple-600" />
                        Loading SMS notification history...
                      </td>
                    </tr>
                  ) : historyItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400 italic">
                        No SMS notification records match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    historyItems.map((item) => (
                      <tr key={item.id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                          {new Date(item.sentAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-900 font-mono">
                          {item.repairReference || 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900">{item.customerName || 'Customer'}</div>
                          <div className="text-[11px] text-gray-500 font-mono flex items-center gap-1">
                            <span>{item.recipientNumber}</span>
                            {item.network && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-700 font-sans font-bold">
                                {item.network}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700 font-medium">
                          {item.branch}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 font-semibold border border-purple-200 whitespace-nowrap text-[11px]">
                            {item.previousStatus} &rarr; {item.newStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-block whitespace-nowrap ${
                            item.sendingStatus === 'Submitted'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {item.sendingStatus}
                          </span>
                          {item.errorMessage && (
                            <div className="text-[10px] text-rose-600 font-medium truncate max-w-[140px]" title={item.errorMessage}>
                              {item.errorMessage}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-[11px]">
                          {item.technicianName || 'Technician'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedMessageLog(item)}
                              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold border-none cursor-pointer"
                              title="View full SMS content"
                            >
                              View
                            </button>
                            {item.sendingStatus === 'Failed' && (
                              <button
                                type="button"
                                onClick={() => handleRetrySms(item.id)}
                                disabled={retryingId === item.id}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold border-none cursor-pointer disabled:opacity-50 flex items-center gap-1"
                              >
                                <Send size={10} />
                                {retryingId === item.id ? 'Retrying...' : 'Retry'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {historyTotalPages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>Page {historyPage} of {historyTotalPages}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                    disabled={historyPage === historyTotalPages}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Message Modal Preview */}
      {selectedMessageLog && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedMessageLog(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-purple-600" />
                <h3 className="text-base font-bold text-gray-900 m-0">SMS Message Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMessageLog(null)}
                className="text-gray-400 hover:text-gray-700 bg-transparent border-none text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-2xl">
                <div>
                  <span className="text-gray-400 font-medium block">Repair Reference:</span>
                  <span className="font-bold text-gray-900 font-mono">{selectedMessageLog.repairReference || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Branch:</span>
                  <span className="font-bold text-gray-900">{selectedMessageLog.branch}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Customer:</span>
                  <span className="font-bold text-gray-900">{selectedMessageLog.customerName || 'Customer'}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Recipient Phone:</span>
                  <span className="font-bold text-gray-900 font-mono">{selectedMessageLog.recipientNumber}</span>
                </div>
              </div>

              <div>
                <span className="text-gray-500 font-bold uppercase tracking-wider block mb-1">
                  Message Content Sent to Customer
                </span>
                <p className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-purple-950 font-mono leading-relaxed text-xs m-0">
                  {selectedMessageLog.message}
                </p>
              </div>

              {selectedMessageLog.errorMessage && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs">
                  <span className="font-bold block">Error Info:</span>
                  <span>{selectedMessageLog.errorMessage}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedMessageLog(null)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs border-none cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
