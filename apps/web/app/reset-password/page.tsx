"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Lock, CheckCircle, ArrowLeft, Eye, EyeOff, AlertCircle } from "lucide-react";
import PasswordRequirements from "../../components/PasswordRequirements";
import { validatePassword, detectInvalidPasswordChars } from "../../lib/passwordPolicy";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmFocused, setIsConfirmFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div 
        className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 font-['Inter'] relative overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('/Images/storefront-bg.jpg')" }}
      >
        <div className="bg-white/95 sm:bg-white/92 backdrop-blur-2xl rounded-[2.2rem] sm:rounded-[2.6rem] shadow-[0_25px_70px_-15px_rgba(25,0,55,0.45)] p-8 max-w-md w-full text-center border border-white/80 ring-1 ring-purple-100">
          <div className="bg-rose-50 text-rose-700 p-6 rounded-2xl border border-rose-200 text-center font-bold">
            <p className="text-lg">Invalid or missing reset token.</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white rounded-xl hover:opacity-90 transition font-bold border-none cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const val = validatePassword(password);
    if (!val.isValid) {
      setErrorMsg(val.error || "Password does not meet security requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsLoading(true);

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
      <div className="bg-white/95 sm:bg-white/92 backdrop-blur-2xl rounded-[2.2rem] sm:rounded-[2.6rem] shadow-[0_25px_70px_-15px_rgba(25,0,55,0.45)] overflow-hidden w-full max-w-md p-7 sm:p-10 relative border border-white/80 ring-1 ring-purple-100 z-10">
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#8b00cc] flex items-center justify-center shadow-xs border border-purple-100">
            <Lock className="w-8 h-8 text-[#8b00cc]" />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-gray-950 mb-2 text-center tracking-tight">Reset Password</h2>
        <p className="text-gray-500 text-center mb-6 text-xs sm:text-sm font-medium">
          Create a new, strong password for your account.
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
              <span>Password successfully updated! You can now log in with your new password.</span>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="bg-gradient-to-r from-[#8b00cc] via-[#9d00e6] to-[#bd00ff] hover:from-[#7a00b3] hover:to-[#a900e6] text-white w-full py-3 rounded-2xl font-bold text-sm sm:text-base shadow-[0_8px_20px_rgba(139,0,204,0.3)] hover:-translate-y-0.5 active:translate-y-0 transition-all border-none cursor-pointer"
            >
              Continue to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#8b00cc] transition-colors z-10">
                  <Lock size={18} strokeWidth={2.2} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  placeholder="New Password" 
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  className="w-full pl-10 pr-11 py-3 bg-white border-2 border-gray-150 hover:border-gray-300 focus:border-[#8b00cc] focus:ring-4 focus:ring-purple-100 shadow-2xs rounded-2xl transition-all text-gray-900 font-semibold placeholder-gray-400 text-sm outline-none" 
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center z-10">
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-[#8b00cc] focus:outline-none transition-colors bg-transparent border-none cursor-pointer p-1">
                    {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <PasswordRequirements 
                password={password} 
                isFocused={isPasswordFocused} 
                variant="clean" 
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#8b00cc] transition-colors z-10">
                  <Lock size={18} strokeWidth={2.2} />
                </div>
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  required 
                  placeholder="Confirm New Password" 
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  onFocus={() => setIsConfirmFocused(true)}
                  onBlur={() => setIsConfirmFocused(false)}
                  className={`w-full pl-10 pr-11 py-3 bg-white border-2 shadow-2xs rounded-2xl focus:ring-4 focus:ring-purple-100 transition-all text-gray-900 font-semibold placeholder-gray-400 text-sm outline-none ${
                    confirmPassword && password !== confirmPassword ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : "border-gray-150 hover:border-gray-300 focus:border-[#8b00cc]"
                  }`} 
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center z-10">
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-gray-400 hover:text-[#8b00cc] focus:outline-none transition-colors bg-transparent border-none cursor-pointer p-1">
                    {showConfirmPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                  </button>
                </div>
              </div>

              {confirmPassword.length > 0 && password !== confirmPassword && (
                <div className="text-[11px] font-bold text-rose-600 ml-2 animate-in fade-in">
                  Passwords do not match.
                </div>
              )}
            </div>

            <div className="mt-2">
              <button 
                disabled={isLoading} 
                type="submit" 
                className="bg-gradient-to-r from-[#8b00cc] via-[#9d00e6] to-[#bd00ff] hover:from-[#7a00b3] hover:to-[#a900e6] text-white w-full py-3 rounded-2xl font-bold text-sm sm:text-base shadow-[0_8px_20px_rgba(139,0,204,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer border-none"
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
      <ResetPasswordForm />
    </Suspense>
  );
}
