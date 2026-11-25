"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft, CheckCircle2, ShieldCheck, AlertCircle, RefreshCw, Send } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Email format validation
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send reset link");
      }

      setSuccess(true);
      setCooldown(60);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending || !email) return;

    setIsResending(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to resend reset link");
      }

      setCooldown(60);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to resend reset link.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div 
      className="min-h-[100dvh] w-full flex items-center justify-center p-4 sm:p-8 font-['Inter'] relative overflow-y-auto bg-cover bg-center"
      style={{ backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.65)), url('/Images/storefront-bg.jpg')" }}
    >
      {/* Floating Top-Left Back Button */}
      <button
        type="button"
        onClick={() => router.push('/login')}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-40 flex items-center gap-2 text-[#8b00cc] font-extrabold hover:text-[#bd00ff] bg-white/95 hover:bg-white backdrop-blur-md px-4 py-2.5 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(139,0,204,0.25)] hover:-translate-y-0.5 active:translate-y-0 transition-all text-xs sm:text-sm cursor-pointer border border-white/80 ring-1 ring-purple-100"
      >
        <ArrowLeft size={16} />
        <span className="hidden sm:inline">Back to Login</span>
        <span className="inline sm:hidden">Login</span>
      </button>

      {/* Main Glassmorphic Porcelain Card */}
      <div className="bg-white/95 sm:bg-white/92 backdrop-blur-2xl rounded-[2.2rem] sm:rounded-[2.6rem] shadow-[0_25px_70px_-15px_rgba(25,0,55,0.45)] w-full max-w-md p-7 sm:p-10 relative border border-white/80 ring-1 ring-purple-100 z-10 my-auto overflow-hidden">
        
        {/* Ambient Decorative Glow */}
        <div className="absolute -top-12 -left-12 w-44 h-44 bg-purple-300/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-44 h-44 bg-pink-300/25 rounded-full blur-3xl pointer-events-none" />

        {!success ? (
          <>
            {/* Header / Security Badge */}
            <div className="flex flex-col items-center mb-6 relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-[#8b00cc] rounded-full text-[11px] font-black uppercase tracking-wider mb-4 border border-purple-100 shadow-2xs">
                <ShieldCheck size={13} className="text-[#8b00cc]" />
                <span>Account Recovery</span>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-100 via-purple-50 to-pink-50 text-[#8b00cc] flex items-center justify-center shadow-xs border border-purple-200/80 mb-3 group transition-transform hover:scale-105">
                <Mail className="w-8 h-8 text-[#8b00cc]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-950 mb-1.5 text-center tracking-tight">Forgot Password?</h2>
              <p className="text-gray-500 text-center text-xs sm:text-sm font-medium max-w-xs leading-relaxed">
                Enter your email address and we'll send you secure instructions to reset your password.
              </p>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="bg-rose-50 text-rose-700 p-3 rounded-2xl mb-4 text-xs sm:text-sm font-bold border border-rose-200 text-center flex items-center justify-center gap-2 animate-in fade-in shadow-xs relative z-10">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#8b00cc] transition-colors z-10">
                  <Mail size={18} strokeWidth={2.2} />
                </div>
                <input 
                  type="email" 
                  required 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-10 py-3.5 bg-white border-2 border-gray-150 hover:border-gray-300 focus:border-[#8b00cc] focus:ring-4 focus:ring-purple-100 shadow-2xs rounded-2xl transition-all text-gray-900 font-semibold placeholder-gray-400 text-sm outline-none" 
                />
                {isEmailValid && (
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none z-10 animate-in fade-in">
                    <CheckCircle2 size={18} className="text-emerald-500" strokeWidth={2.5} />
                  </div>
                )}
              </div>

              <div className="mt-1">
                <button 
                  disabled={isLoading || !email} 
                  type="submit" 
                  className="bg-gradient-to-r from-[#8b00cc] via-[#9d00e6] to-[#bd00ff] hover:from-[#7a00b3] hover:to-[#a900e6] text-white w-full py-3.5 rounded-2xl font-bold text-sm sm:text-base shadow-[0_8px_20px_rgba(139,0,204,0.3)] hover:shadow-[0_12px_28px_rgba(139,0,204,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer border-none flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending Link...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
                      <Send size={16} />
                    </>
                  )}
                </button>
              </div>

              {/* Bottom Return to Sign In */}
              <div className="text-center mt-2 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-medium">
                  Remember your password?{" "}
                  <button 
                    type="button" 
                    onClick={() => router.push('/login')} 
                    className="font-bold text-[#8b00cc] hover:text-[#bd00ff] hover:underline bg-transparent border-none p-0 cursor-pointer inline transition-colors"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          </>
        ) : (
          /* Interactive Success State */
          <div className="animate-in fade-in flex flex-col items-center relative z-10 py-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs border border-emerald-200 mb-4 animate-in zoom-in-95">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-gray-950 mb-1.5 text-center tracking-tight">Check Your Inbox</h3>
            
            <p className="text-gray-500 text-center text-xs sm:text-sm font-medium mb-3 max-w-xs leading-relaxed">
              We've dispatched password reset instructions to:
            </p>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-purple-50 text-[#8b00cc] rounded-full text-xs font-bold border border-purple-100 mb-5 max-w-full truncate shadow-2xs">
              <Mail size={14} className="shrink-0" />
              <span className="truncate">{email}</span>
            </div>

            <div className="bg-gray-50/80 rounded-2xl p-3.5 mb-6 text-xs text-gray-500 border border-gray-150 text-center leading-relaxed">
              <p className="m-0 font-medium">
                Click the secure link in the email to set a new password. If you don't see it within a couple minutes, please check your <span className="font-bold text-gray-700">Spam or Junk</span> folder.
              </p>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 text-rose-700 p-2.5 rounded-xl mb-4 text-xs font-bold border border-rose-200 text-center w-full animate-in fade-in">
                {errorMsg}
              </div>
            )}

            <button
              onClick={() => router.push('/login')}
              className="bg-gradient-to-r from-[#8b00cc] via-[#9d00e6] to-[#bd00ff] hover:from-[#7a00b3] hover:to-[#a900e6] text-white w-full py-3.5 rounded-2xl font-bold text-sm sm:text-base shadow-[0_8px_20px_rgba(139,0,204,0.3)] hover:-translate-y-0.5 active:translate-y-0 transition-all border-none cursor-pointer mb-4"
            >
              Return to Sign In
            </button>

            {/* Resend Action with Cooldown Timer */}
            <div className="text-center">
              {cooldown > 0 ? (
                <p className="text-xs text-gray-400 font-medium m-0">
                  Didn't receive email? Resend available in <span className="font-bold text-purple-700">{cooldown}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="text-xs font-bold text-[#8b00cc] hover:text-[#bd00ff] hover:underline bg-transparent border-none p-0 cursor-pointer inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={13} className={isResending ? "animate-spin" : ""} />
                  <span>Resend Reset Link</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
