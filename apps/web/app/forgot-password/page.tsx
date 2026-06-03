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
        className="absolute top-4 left-4 sm:top-8 sm:left-8 z-40 flex items-center gap-1 sm:gap-2 text-[#8b00cc] font-bold hover:text-[#bd00ff] transition-colors bg-white/80 backdrop-blur-md px-3 sm:px-4 py-2 rounded-full shadow-md text-sm sm:text-base"
      >
        <ArrowLeft size={18} className="sm:w-[20px] sm:h-[20px]" />
        <span className="hidden sm:inline">Back to Login</span>
        <span className="inline sm:hidden">Login</span>
      </button>

      <div className="bg-white/30 backdrop-blur-md rounded-[2rem] shadow-2xl overflow-hidden w-full max-w-md p-8 md:p-12 relative border border-white/50">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center shadow-inner">
            <Mail className="text-white w-10 h-10" />
          </div>
        </div>

        <h2 className="text-3xl font-extrabold text-[#111] mb-2 text-center tracking-tight">Forgot Password?</h2>
        <p className="text-gray-800 text-center mb-8 font-extrabold">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-sm font-bold border border-red-100 text-center animate-in fade-in">
            {errorMsg}
          </div>
        )}

        {success ? (
          <div className="animate-in fade-in flex flex-col items-center">
            <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-6 text-sm font-bold border border-green-100 text-center w-full flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <span>If an account exists with that email, we have sent a password reset link. Please check your inbox (and spam folder).</span>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="bg-white/80 text-gray-800 w-full py-3 rounded-full font-bold text-lg hover:bg-white transition-all shadow-md"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-600">
                <Mail size={22} />
              </div>
              <input 
                type="email" 
                required 
                placeholder="Email Address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/40 border border-white/50 shadow-sm rounded-[1rem] focus:ring-2 focus:ring-[#8b00cc] focus:bg-white/60 transition-all text-gray-900 font-bold placeholder-gray-600" 
              />
            </div>

            <div className="flex justify-center mt-2">
              <button 
                disabled={isLoading} 
                type="submit" 
                className="bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white w-full py-3 rounded-full font-bold text-lg shadow-[0_8px_15px_-3px_rgba(139,0,204,0.4)] hover:shadow-[0_12px_20px_-3px_rgba(139,0,204,0.6)] hover:-translate-y-1 transition-all disabled:opacity-50"
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
