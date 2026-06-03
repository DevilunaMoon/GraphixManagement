"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div 
        className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 font-['Inter'] relative overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('/Images/storefront-bg.jpg')" }}
      >
        <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Invalid Link</h2>
          <p className="text-gray-600 mb-6">This password reset link is invalid or missing the token.</p>
          <button onClick={() => router.push('/login')} className="bg-[#8b00cc] text-white px-6 py-2 rounded-full font-bold">Go to Login</button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
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
      <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden w-full max-w-md p-8 md:p-12 relative">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center shadow-inner">
            <Lock className="text-[#8b00cc] w-10 h-10" />
          </div>
        </div>

        <h2 className="text-3xl font-extrabold text-[#111] mb-2 text-center tracking-tight">Reset Password</h2>
        <p className="text-gray-500 text-center mb-8 font-medium">
          Create a new, strong password for your account.
        </p>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-sm font-bold border border-red-100 text-center animate-in fade-in">
            {errorMsg}
          </div>
        )}

        {success ? (
          <div className="animate-in fade-in flex flex-col items-center">
            <div className="bg-green-50 text-green-600 p-4 rounded-xl mb-6 text-sm font-medium border border-green-100 text-center w-full flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <span>Password successfully updated! You can now log in with your new password.</span>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white w-full py-3 rounded-full font-bold text-lg hover:shadow-lg transition-all"
            >
              Continue to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                <Lock size={22} />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                placeholder="New Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3 bg-gray-100 border border-gray-200 shadow-inner rounded-[1rem] focus:ring-2 focus:ring-[#8b00cc] focus:bg-white transition-all text-gray-800 font-bold placeholder-gray-400" 
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-500 hover:text-gray-700 focus:outline-none transition-colors">
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                <Lock size={22} />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                placeholder="Confirm New Password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3 bg-gray-100 border border-gray-200 shadow-inner rounded-[1rem] focus:ring-2 focus:ring-[#8b00cc] focus:bg-white transition-all text-gray-800 font-bold placeholder-gray-400" 
              />
            </div>

            <div className="flex justify-center mt-4">
              <button 
                disabled={isLoading} 
                type="submit" 
                className="bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white w-full py-3 rounded-full font-bold text-lg shadow-[0_8px_15px_-3px_rgba(139,0,204,0.4)] hover:shadow-[0_12px_20px_-3px_rgba(139,0,204,0.6)] hover:-translate-y-1 transition-all disabled:opacity-50"
              >
                {isLoading ? "Updating..." : "Reset Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-purple-100 border-t-[#bd00ff] rounded-full animate-spin"></div></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
