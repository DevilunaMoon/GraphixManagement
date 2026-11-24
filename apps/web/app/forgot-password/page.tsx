"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccess(false);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send reset link");
      }

      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 font-['Inter'] relative overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('/Images/storefront-bg.jpg')" }}
    >
      <button
        onClick={() => router.push('/login')}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-40 flex items-center gap-2 text-[#8b00cc] font-extrabold hover:text-[#bd00ff] bg-white/95 hover:bg-white backdrop-blur-md px-4 py-2.5 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(139,0,204,0.25)] hover:-translate-y-0.5 active:translate-y-0 transition-all text-xs sm:text-sm cursor-pointer border border-white/80 ring-1 ring-purple-100"
      >
        <ArrowLeft size={18} />
        <span className="hidden sm:inline">Back to Login</span>
        <span className="inline sm:hidden">Login</span>
      </button>

      <div className="bg-white/95 sm:bg-white/92 backdrop-blur-2xl rounded-[2.2rem] sm:rounded-[2.6rem] shadow-[0_25px_70px_-15px_rgba(25,0,55,0.45)] overflow-hidden w-full max-w-md p-7 sm:p-10 relative border border-white/80 ring-1 ring-purple-100 z-10">
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#8b00cc] flex items-center justify-center shadow-xs border border-purple-100">
            <Mail className="w-8 h-8 text-[#8b00cc]" />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-gray-950 mb-2 text-center tracking-tight">Forgot Password?</h2>
        <p className="text-gray-500 text-center mb-6 text-xs sm:text-sm font-medium">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {errorMsg && (
          <div className="bg-rose-50 text-rose-700 p-3 rounded-2xl mb-4 text-xs sm:text-sm font-bold border border-rose-200 text-center animate-in fade-in shadow-xs">
            {errorMsg}
          </div>
        )}

        {success ? (
          <div className="animate-in fade-in flex flex-col items-center">
            <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl mb-5 text-xs sm:text-sm font-semibold border border-emerald-200 text-center w-full flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
              <span>If an account exists with that email, we have sent a password reset link. Please check your inbox (and spam folder).</span>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="bg-gradient-to-r from-[#8b00cc] via-[#9d00e6] to-[#bd00ff] hover:from-[#7a00b3] hover:to-[#a900e6] text-white w-full py-3 rounded-2xl font-bold text-sm sm:text-base shadow-[0_8px_20px_rgba(139,0,204,0.3)] hover:-translate-y-0.5 active:translate-y-0 transition-all border-none cursor-pointer"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#8b00cc] transition-colors z-10">
                <Mail size={18} strokeWidth={2.2} />
              </div>
              <input 
                type="email" 
                required 
                placeholder="Email Address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-150 hover:border-gray-300 focus:border-[#8b00cc] focus:ring-4 focus:ring-purple-100 shadow-2xs rounded-2xl transition-all text-gray-900 font-semibold placeholder-gray-400 text-sm outline-none" 
              />
            </div>

            <div className="mt-1">
              <button 
                disabled={isLoading} 
                type="submit" 
                className="bg-gradient-to-r from-[#8b00cc] via-[#9d00e6] to-[#bd00ff] hover:from-[#7a00b3] hover:to-[#a900e6] text-white w-full py-3 rounded-2xl font-bold text-sm sm:text-base shadow-[0_8px_20px_rgba(139,0,204,0.3)] hover:shadow-[0_12px_28px_rgba(139,0,204,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer border-none"
              >
                {isLoading ? "Sending Link..." : "Send Reset Link"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
