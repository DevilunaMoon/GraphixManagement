"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Mail, 
  Lock, 
  User, 
  Phone, 
  ArrowLeft, 
  CheckSquare, 
  Square, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  Scale, 
  ShieldCheck, 
  X, 
  FileText 
} from "lucide-react";
import { login, register } from "../../actions/auth";
import PasswordRequirements from "../../components/PasswordRequirements";
import { validatePassword, detectInvalidPasswordChars } from "../../lib/passwordPolicy";

interface PolicyItem {
  id?: string;
  type: string;
  content: string;
}

function LoginContent() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Registration form states
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
  const [isSignUpPasswordFocused, setIsSignUpPasswordFocused] = useState(false);
  const [isSignUpConfirmFocused, setIsSignUpConfirmFocused] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Policy modal states
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);

  const searchParams = useSearchParams();
  const urlError = searchParams?.get("error");
  
  useEffect(() => {
    if (urlError) setErrorMsg(decodeURIComponent(urlError));
  }, [urlError]);

  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === "GOOGLE_AUTH_SUCCESS") {
        window.location.href = event.data.url;
      } else if (event.data?.type === "GOOGLE_AUTH_ERROR") {
        setErrorMsg(event.data.error);
      }
    };
    window.addEventListener("message", handleAuthMessage);
    return () => window.removeEventListener("message", handleAuthMessage);
  }, [router]);

  // Load latest policies from database
  const loadPolicies = async () => {
    setIsLoadingPolicies(true);
    try {
      const res = await fetch('/api/policies');
      const data = await res.json();
      if (Array.isArray(data)) {
        setPolicies(data);
      }
    } catch (err) {
      console.error('Failed to load policies:', err);
    } finally {
      setIsLoadingPolicies(false);
    }
  };

  const handleOpenTermsModal = () => {
    loadPolicies();
    setTermsModalOpen(true);
  };

  const handleOpenPrivacyModal = () => {
    loadPolicies();
    setPrivacyModalOpen(true);
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await login(formData);

    if (result?.error) {
      setErrorMsg(result.error);
      setIsLoading(false);
    } else if (result?.success) {
      const redirectUrl = searchParams?.get("redirect");
      const isLoggingIntoMonitoring = redirectUrl && redirectUrl.includes("/monitoring");
      const userRole = (result.role || "").toUpperCase();

      if (userRole === "SUPER_ADMIN" || userRole === "ADMIN" || userRole === "BRANCH_ADMIN") {
        window.location.href = isLoggingIntoMonitoring ? "/admin/monitoring" : "/admin/dashboard";
      } else if (userRole === "CASHIER") {
        window.location.href = isLoggingIntoMonitoring ? "/cashier/monitoring" : "/cashier/dashboard";
      } else {
        window.location.href = redirectUrl || "/customer/dashboard";
      }
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = (formData.get("password") as string) || signUpPassword;
    const confirmPassword = (formData.get("confirmPassword") as string) || signUpConfirmPassword;

    // 1. Validate Agreement Checkbox
    if (!acceptTerms) {
      setErrorMsg("Please agree to the Terms and Conditions and Privacy Policy before creating your account.");
      return;
    }

    // 2. Validate Password Policy Requirements
    const pwdVal = validatePassword(password);
    if (!pwdVal.isValid) {
      setErrorMsg(pwdVal.error || "Password does not meet security requirements.");
      return;
    }

    // 3. Validate Password and Confirm Password match
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setErrorMsg("");
    setIsLoading(true);
    formData.append("acceptTerms", "true");
    const result = await register(formData);

    if (result?.error) {
      setErrorMsg(result.error);
      setIsLoading(false);
    } else if (result?.success) {
      setIsLoading(false);
      setShowSuccessModal(true);
      (e.target as HTMLFormElement).reset();
      setSignUpPassword("");
      setSignUpConfirmPassword("");
      setAcceptTerms(false);
    }
  };

  // Helper function to clear errors when switching tabs
  const toggleView = (viewIsLogin: boolean) => {
    setErrorMsg("");
    setIsLogin(viewIsLogin);
    setIsSignUpPasswordFocused(false);
    setIsSignUpConfirmFocused(false);
  };

  // Filter policies for Terms and Conditions modal (excluding privacy and about-page policies)
  const termsPolicies = policies.filter(p => {
    const pType = (p.type || '').toUpperCase();
    return pType !== 'PRIVACY' && !pType.startsWith('ABOUT_');
  });
  // Privacy policy for Privacy modal
  const privacyPolicy = policies.find(p => (p.type || '').toUpperCase() === 'PRIVACY');

  const policyTitles: Record<string, string> = {
    'PURCHASE': 'Terms of Service',
    'REFUND': 'Refund Policy',
    'PAYMENT': 'Payment Policy',
    'REPAIR': 'Repair Policy'
  };

  return (
    <div 
      className="h-[100dvh] min-h-[620px] w-full flex items-center justify-center p-4 sm:p-6 md:p-8 font-['Inter'] relative overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: "linear-gradient(rgba(14, 4, 26, 0.6), rgba(14, 4, 26, 0.65)), url('/Images/storefront-bg.jpg')" }}
    >
      {/* Ambient background blur circles */}
      <div className="absolute top-1/4 left-1/6 w-96 h-96 bg-[#8b00cc]/30 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute bottom-1/4 right-1/6 w-96 h-96 bg-[#bd00ff]/20 rounded-full blur-3xl pointer-events-none -z-0" />

      {/* Back to Homepage Button */}
      <button
        onClick={() => router.push('/')}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-40 flex items-center gap-2 text-[#8b00cc] font-extrabold hover:text-[#bd00ff] bg-white/90 hover:bg-white backdrop-blur-md px-4 py-2.5 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(139,0,204,0.2)] hover:-translate-y-0.5 active:translate-y-0 transition-all text-xs sm:text-sm cursor-pointer border-none"
      >
        <ArrowLeft size={18} />
        <span className="hidden sm:inline">Back to Homepage</span>
        <span className="inline sm:hidden">Home</span>
      </button>

      {/* Main Glassmorphic Container */}
      <div className="bg-white/30 backdrop-blur-xl rounded-[2.2rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] overflow-hidden w-full max-w-4xl h-[680px] md:h-[720px] max-h-[95vh] flex flex-col relative transition-all duration-700 border border-white/50 z-10">

        {/* --- Sign In Form --- */}
        <div 
          className={`w-full h-full flex-1 md:w-1/2 p-6 sm:p-8 md:p-10 flex flex-col justify-center bg-transparent transition-all duration-700 ease-in-out md:absolute md:top-0 md:h-full md:left-0 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-purple-300/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent
            ${isLogin ? 'opacity-100 z-10 translate-x-0' : 'opacity-0 z-0 -translate-x-[20%] pointer-events-none hidden md:flex'}
            ${isLogin ? 'flex' : 'hidden md:flex'}
          `}
        >
          <div className="text-center mb-5">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight m-0">Sign In</h2>
            <p className="text-xs sm:text-sm text-gray-700 font-semibold mt-1 m-0">Access your Graphix Account & Portal</p>
          </div>

          {errorMsg && isLogin && (
            <div className="bg-rose-50/90 backdrop-blur-xs text-rose-700 p-3 rounded-xl mb-3 text-xs sm:text-sm font-bold border border-rose-200 text-center animate-in fade-in shadow-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
            {/* Email or Username Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-600">
                <User size={18} />
              </div>
              <input 
                type="text" 
                name="email" 
                required 
                placeholder="Email or Username" 
                className="w-full pl-10 pr-4 py-2.5 bg-white/50 backdrop-blur-md border border-white/60 shadow-xs rounded-xl focus:ring-2 focus:ring-[#8b00cc] focus:bg-white/80 focus:border-purple-300 transition-all text-gray-900 font-bold placeholder-gray-500 text-sm outline-none" 
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-600">
                <Lock size={18} />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                required 
                placeholder="Password" 
                className="w-full pl-10 pr-10 py-2.5 bg-white/50 backdrop-blur-md border border-white/60 shadow-xs rounded-xl focus:ring-2 focus:ring-[#8b00cc] focus:bg-white/80 focus:border-purple-300 transition-all text-gray-900 font-bold placeholder-gray-500 text-sm outline-none" 
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="text-gray-500 hover:text-gray-800 focus:outline-none transition-colors bg-transparent border-none cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between mt-0.5">
              <div 
                className="flex items-center gap-2 cursor-pointer select-none" 
                onClick={() => setRememberMe(!rememberMe)}
              >
                {rememberMe ? (
                  <CheckSquare size={18} className="text-[#8b00cc]" />
                ) : (
                  <Square size={18} className="text-gray-500 hover:text-gray-700" />
                )}
                <span className="text-xs sm:text-sm font-bold text-gray-900">Remember Me</span>
              </div>
              <a 
                href="/forgot-password"
                className="text-xs sm:text-sm font-extrabold text-[#8b00cc] hover:text-[#bd00ff] transition-colors text-decoration-none"
              >
                Forgot Password?
              </a>
            </div>

            {/* Sign In Submit Button */}
            <div className="mt-1">
              <button 
                disabled={isLoading} 
                type="submit" 
                className="bg-gradient-to-r from-[#8b00cc] via-[#9d00e6] to-[#bd00ff] hover:from-[#7a00b3] hover:to-[#a900e6] text-white w-full py-3 rounded-xl font-black text-sm sm:text-base shadow-[0_8px_20px_rgba(139,0,204,0.35)] hover:shadow-[0_12px_28px_rgba(139,0,204,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 cursor-pointer border-none"
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center justify-center my-0.5 w-full mx-auto">
              <div className="h-px bg-gray-300/80 flex-1" />
              <span className="px-3 text-gray-500 text-xs font-black">OR</span>
              <div className="h-px bg-gray-300/80 flex-1" />
            </div>

            {/* Google Sign-In */}
            <div>
              <a 
                href={`/api/auth/google${searchParams?.get("redirect") ? `?redirect=${encodeURIComponent(searchParams.get("redirect")!)}` : ""}`} 
                className="flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border border-gray-200/90 text-gray-800 w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_18px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 active:translate-y-0 transition-all text-decoration-none"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>
              </a>
            </div>

            {/* Mobile-only View Toggle */}
            <div className="md:hidden mt-2 text-center">
              <p className="text-gray-600 text-xs mb-1 font-bold">Don't have an account yet?</p>
              <button 
                type="button" 
                onClick={() => toggleView(false)} 
                className="text-[#8b00cc] font-black text-sm bg-transparent border-none cursor-pointer hover:underline"
              >
                Sign Up
              </button>
            </div>
          </form>
        </div>

        {/* --- Sign Up Form --- */}
        <div 
          className={`w-full h-full flex-1 md:w-1/2 p-5 sm:p-6 md:p-8 flex flex-col justify-center bg-transparent transition-all duration-700 ease-in-out md:absolute md:top-0 md:h-full md:right-0 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-purple-300/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent
            ${!isLogin ? 'opacity-100 z-10 translate-x-0' : 'opacity-0 z-0 translate-x-[20%] pointer-events-none hidden md:flex'}
            ${!isLogin ? 'flex' : 'hidden md:flex'}
          `}
        >
          <div className="text-center mb-2.5">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight m-0">Create Account</h2>
            <p className="text-xs sm:text-sm text-gray-700 font-semibold mt-0.5 m-0">Join the Graphix Customer Community</p>
          </div>

          {errorMsg && !isLogin && (
            <div className="bg-rose-50/90 backdrop-blur-xs text-rose-700 p-2.5 rounded-xl mb-2 text-xs sm:text-sm font-bold border border-rose-200 text-center animate-in fade-in shadow-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleRegister} className="flex flex-col gap-2">
            {/* 1. Name */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-600">
                <User size={16} />
              </div>
              <input 
                type="text" 
                name="name" 
                required 
                placeholder="Full Name" 
                className="w-full pl-9 pr-3.5 py-2 bg-white/50 backdrop-blur-md border border-white/60 shadow-xs rounded-xl focus:ring-2 focus:ring-[#8b00cc] focus:bg-white/80 focus:border-purple-300 transition-all text-gray-900 font-bold placeholder-gray-500 text-xs sm:text-sm outline-none" 
              />
            </div>

            {/* 2. Email */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-600">
                <Mail size={16} />
              </div>
              <input 
                type="email" 
                name="email" 
                required 
                placeholder="Email Address" 
                className="w-full pl-9 pr-3.5 py-2 bg-white/50 backdrop-blur-md border border-white/60 shadow-xs rounded-xl focus:ring-2 focus:ring-[#8b00cc] focus:bg-white/80 focus:border-purple-300 transition-all text-gray-900 font-bold placeholder-gray-500 text-xs sm:text-sm outline-none" 
              />
            </div>

            {/* 3. Phone */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-600">
                <Phone size={16} />
              </div>
              <input 
                type="tel" 
                name="phone" 
                required 
                placeholder="Phone Number" 
                className="w-full pl-9 pr-3.5 py-2 bg-white/50 backdrop-blur-md border border-white/60 shadow-xs rounded-xl focus:ring-2 focus:ring-[#8b00cc] focus:bg-white/80 focus:border-purple-300 transition-all text-gray-900 font-bold placeholder-gray-500 text-xs sm:text-sm outline-none" 
              />
            </div>

            {/* 4. Password */}
            <div className="flex flex-col gap-0.5">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-600">
                  <Lock size={16} />
                </div>
                <input 
                  type={showSignUpPassword ? "text" : "password"} 
                  name="password" 
                  required 
                  value={signUpPassword}
                  onChange={(e) => {
                    setSignUpPassword(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  onFocus={() => setIsSignUpPasswordFocused(true)}
                  onBlur={() => setIsSignUpPasswordFocused(false)}
                  placeholder="Password" 
                  className="w-full pl-9 pr-9 py-2 bg-white/50 backdrop-blur-md border border-white/60 shadow-xs rounded-xl focus:ring-2 focus:ring-[#8b00cc] focus:bg-white/80 focus:border-purple-300 transition-all text-gray-900 font-bold placeholder-gray-500 text-xs sm:text-sm outline-none" 
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button 
                    type="button" 
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)} 
                    className="text-gray-500 hover:text-gray-800 focus:outline-none transition-colors bg-transparent border-none cursor-pointer"
                  >
                    {showSignUpPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Real-time Password Requirements */}
              <PasswordRequirements 
                password={signUpPassword} 
                isFocused={isSignUpPasswordFocused} 
                variant="glass" 
              />
            </div>

            {/* 5. Confirm Password */}
            <div className="flex flex-col gap-0.5">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-600">
                  <Lock size={16} />
                </div>
                <input 
                  type={showSignUpConfirmPassword ? "text" : "password"} 
                  name="confirmPassword" 
                  required 
                  value={signUpConfirmPassword}
                  onChange={(e) => {
                    setSignUpConfirmPassword(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  onFocus={() => setIsSignUpConfirmFocused(true)}
                  onBlur={() => setIsSignUpConfirmFocused(false)}
                  placeholder="Confirm Password" 
                  className={`w-full pl-9 pr-9 py-2 bg-white/50 backdrop-blur-md border shadow-xs rounded-xl focus:ring-2 focus:ring-[#8b00cc] focus:bg-white/80 transition-all text-gray-900 font-bold placeholder-gray-500 text-xs sm:text-sm outline-none ${
                    signUpConfirmPassword && signUpPassword !== signUpConfirmPassword
                      ? 'border-rose-400 focus:ring-rose-400'
                      : 'border-white/60'
                  }`}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button 
                    type="button" 
                    onClick={() => setShowSignUpConfirmPassword(!showSignUpConfirmPassword)} 
                    className="text-gray-500 hover:text-gray-800 focus:outline-none transition-colors bg-transparent border-none cursor-pointer"
                  >
                    {showSignUpConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {signUpConfirmPassword.length > 0 && signUpPassword !== signUpConfirmPassword && (
                <div className="text-[11px] font-bold text-rose-600 ml-1 animate-in fade-in">
                  Passwords do not match.
                </div>
              )}
            </div>

            {/* 6. Agreement Checkbox */}
            <div className="flex items-start gap-2 mt-0.5 select-none">
              <button
                type="button"
                onClick={() => setAcceptTerms(!acceptTerms)}
                className="mt-0.5 text-[#8b00cc] bg-transparent border-none p-0 cursor-pointer shrink-0"
              >
                {acceptTerms ? (
                  <CheckSquare size={16} className="text-[#8b00cc] bg-white rounded-xs" />
                ) : (
                  <Square size={16} className="text-gray-600 hover:text-gray-900" />
                )}
              </button>
              <label className="text-[11px] sm:text-xs font-semibold text-gray-900 leading-tight cursor-pointer">
                <span onClick={() => setAcceptTerms(!acceptTerms)}>I agree to the </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenTermsModal();
                  }}
                  className="text-[#8b00cc] font-bold underline hover:text-[#bd00ff] transition-colors bg-transparent border-none p-0 cursor-pointer inline"
                >
                  Terms and Conditions
                </button>
                <span onClick={() => setAcceptTerms(!acceptTerms)}> and </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenPrivacyModal();
                  }}
                  className="text-[#8b00cc] font-bold underline hover:text-[#bd00ff] transition-colors bg-transparent border-none p-0 cursor-pointer inline"
                >
                  Privacy Policy
                </button>
              </label>
            </div>

            {/* Sign Up Button */}
            <div className="mt-0.5">
              <button 
                disabled={isLoading} 
                type="submit" 
                className="bg-gradient-to-r from-[#8b00cc] via-[#9d00e6] to-[#bd00ff] hover:from-[#7a00b3] hover:to-[#a900e6] text-white w-full py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-[0_8px_18px_rgba(139,0,204,0.35)] hover:shadow-[0_10px_25px_rgba(139,0,204,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 cursor-pointer border-none"
              >
                {isLoading ? "Signing Up..." : "Sign Up"}
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center justify-center my-0.2 w-full mx-auto">
              <div className="h-px bg-gray-300/80 flex-1" />
              <span className="px-2.5 text-gray-500 text-[11px] font-black">OR</span>
              <div className="h-px bg-gray-300/80 flex-1" />
            </div>

            {/* Google Sign-Up */}
            <div>
              <a 
                href={`/api/auth/google${searchParams?.get("redirect") ? `?redirect=${encodeURIComponent(searchParams.get("redirect")!)}` : ""}`} 
                className="flex items-center justify-center gap-2.5 bg-white hover:bg-gray-50 border border-gray-200/90 text-gray-800 w-full py-2 rounded-xl font-bold text-xs shadow-[0_4px_10px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_15px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 active:translate-y-0 transition-all text-decoration-none"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>
              </a>
            </div>

            {/* Mobile View Toggle */}
            <div className="md:hidden mt-0.5 text-center">
              <p className="text-gray-600 text-[11px] mb-0.5 font-bold">Already have an account?</p>
              <button 
                type="button" 
                onClick={() => toggleView(true)} 
                className="text-[#8b00cc] font-black text-xs bg-transparent border-none cursor-pointer hover:underline"
              >
                Sign In
              </button>
            </div>
          </form>
        </div>

        {/* --- Sliding Overlay (Purple Box) --- */}
        <div 
          className={`hidden md:block absolute top-0 left-0 w-1/2 h-full z-30 transition-transform duration-700 ease-in-out bg-gradient-to-br from-[#9b00e6]/90 via-[#8200bf]/95 to-[#5e008a]/95 backdrop-blur-xl shadow-[-10px_0_35px_rgba(0,0,0,0.2)] border-l border-white/30
            ${isLogin ? 'translate-x-[100%]' : 'translate-x-0'}
          `}
        >
            {/* Facing SIGN IN -> Prompt to go to Sign Up */}
            <div className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center p-10 text-white text-center transition-all duration-700 delay-100 ease-in-out ${isLogin ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-[20%] pointer-events-none'}`}>
              <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl p-2.5 transform hover:scale-105 transition-transform duration-300 ring-4 ring-white/30">
                <img src="/Images/graphix-logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <h2 className="text-4xl font-black mb-2 tracking-tight drop-shadow-sm">Welcome Friend</h2>
              <p className="text-purple-100 mb-8 text-base font-medium max-w-xs">Don't have an account yet? Create one now to track your repairs and purchases.</p>

              <div className="w-full flex justify-center">
                <button
                  onClick={() => toggleView(false)}
                  className="bg-white/10 hover:bg-white text-white hover:text-[#8b00cc] border-2 border-white px-12 py-3 rounded-full font-black text-base transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-2xl hover:scale-105 active:scale-100 cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
            </div>

            {/* Facing SIGN UP -> Prompt to go to Sign In */}
            <div className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center p-10 text-white text-center transition-all duration-700 delay-100 ease-in-out ${!isLogin ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-[20%] pointer-events-none'}`}>
              <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl p-2.5 transform hover:scale-105 transition-transform duration-300 ring-4 ring-white/30">
                <img src="/Images/graphix-logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <h2 className="text-4xl font-black mb-2 tracking-tight drop-shadow-sm">Hello, User</h2>
              <p className="text-purple-100 mb-8 text-base font-medium max-w-xs">Already have an account? Sign in to access your portal and services.</p>

              <div className="w-full flex justify-center">
                <button
                  onClick={() => toggleView(true)}
                  className="bg-white/10 hover:bg-white text-white hover:text-[#8b00cc] border-2 border-white px-12 py-3 rounded-full font-black text-base transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-2xl hover:scale-105 active:scale-100 cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </div>
        </div>

      </div>

      {/* --- Terms & Conditions Modal --- */}
      {termsModalOpen && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border-2 border-purple-500/30 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#8b00cc] via-[#9d00e6] to-[#bd00ff] p-5 sm:p-6 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <Scale size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black m-0 text-white">Terms and Conditions</h3>
                  <p className="text-purple-100 text-xs mt-0.5 font-medium">Graphix Management System Policies</p>
                </div>
              </div>
              <button 
                onClick={() => setTermsModalOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors bg-transparent border-none cursor-pointer"
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
              {isLoadingPolicies ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-4 border-purple-100 border-t-[#8b00cc] rounded-full animate-spin" />
                  <p className="text-gray-500 font-bold text-sm">Loading latest terms & conditions...</p>
                </div>
              ) : termsPolicies.length > 0 ? (
                termsPolicies.map((p, idx) => {
                  const title = policyTitles[p.type.toUpperCase()] || p.type.replace(/_/g, ' ');
                  return (
                    <div key={idx} className="bg-purple-50/50 rounded-2xl p-5 border border-purple-100">
                      <h4 className="text-base font-black text-gray-900 mb-2 flex items-center gap-2">
                        <FileText size={16} className="text-[#8b00cc]" />
                        <span>{title}</span>
                      </h4>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap m-0 font-normal">
                        {p.content}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-sm text-center py-10">No Terms and Conditions configured yet.</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
              <span className="text-xs text-gray-400 font-medium">Synced in real-time from Super Admin</span>
              <button
                onClick={() => {
                  setAcceptTerms(true);
                  setTermsModalOpen(false);
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white rounded-xl font-bold text-sm shadow-md hover:opacity-95 transition-opacity cursor-pointer border-none"
              >
                I Understand & Agree
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Privacy Policy Modal --- */}
      {privacyModalOpen && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden border-2 border-purple-500/30 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#8b00cc] via-[#9d00e6] to-[#bd00ff] p-5 sm:p-6 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black m-0 text-white">Privacy Policy</h3>
                  <p className="text-purple-100 text-xs mt-0.5 font-medium">Customer Information & Data Protection</p>
                </div>
              </div>
              <button 
                onClick={() => setPrivacyModalOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors bg-transparent border-none cursor-pointer"
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {isLoadingPolicies ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-4 border-purple-100 border-t-[#8b00cc] rounded-full animate-spin" />
                  <p className="text-gray-500 font-bold text-sm">Loading latest privacy policy...</p>
                </div>
              ) : privacyPolicy?.content ? (
                <div className="bg-purple-50/50 rounded-2xl p-5 border border-purple-100 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {privacyPolicy.content}
                </div>
              ) : (
                <div className="bg-purple-50/50 rounded-2xl p-5 border border-purple-100 text-sm text-gray-700 leading-relaxed">
                  Graphix values your privacy and is committed to protecting your personal data. We collect customer information including name, email, phone number, and branch preferences solely for account authentication, order fulfillment, repair tracking, and service notifications. We do not sell or disclose your personal data to unauthorized third parties.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
              <span className="text-xs text-gray-400 font-medium">Synced in real-time from Super Admin</span>
              <button
                onClick={() => {
                  setAcceptTerms(true);
                  setPrivacyModalOpen(false);
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white rounded-xl font-bold text-sm shadow-md hover:opacity-95 transition-opacity cursor-pointer border-none"
              >
                I Understand & Agree
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal Overlay */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full text-center animate-in zoom-in duration-300 border-2 border-emerald-500">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle size={40} className="text-emerald-500" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Success!</h3>
            <p className="text-gray-600 font-medium mb-8 text-[0.95rem]">
              Your account has been created successfully. You can now log in.
            </p>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                setIsLogin(true);
              }}
              className="w-full bg-gradient-to-r from-[#8b00cc] via-[#9d00e6] to-[#bd00ff] text-white py-3.5 rounded-full font-black shadow-[0_8px_18px_rgba(139,0,204,0.4)] hover:shadow-[0_12px_25px_rgba(139,0,204,0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all text-base cursor-pointer border-none"
            >
              Continue to Sign In
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-purple-100 border-t-[#bd00ff] rounded-full animate-spin"></div></div>}>
      <LoginContent />
    </Suspense>
  );
}
