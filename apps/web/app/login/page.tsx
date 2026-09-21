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

      if (result.role === "admin" || result.role === "ADMIN" || result.role === "super_admin" || result.role === "SUPER_ADMIN") {
        window.location.href = isLoggingIntoMonitoring ? "/admin/monitoring" : "/admin/dashboard";
      } else if (result.role === "cashier" || result.role === "CASHIER") {
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
    'PURCHASE': 'Purchase Policy',
    'PAYMENT': 'Payment Policy',
    'REPAIR': 'Repair Policy'
  };

  return (
    <div 
      className="h-[100dvh] w-full flex items-center justify-center p-4 sm:p-8 font-['Inter'] relative overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('/Images/storefront-bg.jpg')" }}
    >
      <button
        onClick={() => router.push('/')}
        className="absolute top-4 left-4 sm:top-8 sm:left-8 z-40 flex items-center gap-1 sm:gap-2 text-[#8b00cc] font-bold hover:text-[#bd00ff] transition-colors bg-white/80 backdrop-blur-md px-3 sm:px-4 py-2 rounded-full shadow-md text-sm sm:text-base"
      >
        <ArrowLeft size={18} className="sm:w-[20px] sm:h-[20px]" />
        <span className="hidden sm:inline">Back to Homepage</span>
        <span className="inline sm:hidden">Home</span>
      </button>

      {/* Main Container */}
      <div className="bg-white/30 backdrop-blur-md rounded-[2rem] shadow-2xl overflow-hidden w-full max-w-4xl h-full max-h-[720px] flex flex-col relative transition-all duration-700 border border-white/50">

        {/* --- Sign In Form --- */}
        <div 
          className={`w-full h-full flex-1 md:w-1/2 p-6 sm:p-8 md:p-12 flex flex-col justify-center bg-transparent transition-all duration-700 ease-in-out md:absolute md:top-0 md:h-full md:left-0 overflow-y-auto
            ${isLogin ? 'opacity-100 z-10 translate-x-0' : 'opacity-0 z-0 -translate-x-[20%] pointer-events-none hidden md:flex'}
            ${isLogin ? 'flex' : 'hidden md:flex'}
          `}
        >
          <h2 className="text-4xl font-extrabold text-[#111] mb-6 text-center tracking-tight">Sign In</h2>

          {errorMsg && isLogin && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm font-bold border border-red-100 text-center animate-in fade-in">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                <User size={22} />
              </div>
              <input type="text" name="email" required placeholder="Email" className="w-full pl-12 pr-4 py-3 bg-white/40 border border-white/50 shadow-sm rounded-[1rem] focus:ring-2 focus:ring-[#8b00cc] focus:bg-white/60 transition-all text-gray-900 font-bold placeholder-gray-600" />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                <Lock size={22} />
              </div>
              <input type={showPassword ? "text" : "password"} name="password" required placeholder="Password" className="w-full pl-12 pr-12 py-3 bg-white/40 border border-white/50 shadow-sm rounded-[1rem] focus:ring-2 focus:ring-[#8b00cc] focus:bg-white/60 transition-all text-gray-900 font-bold placeholder-gray-600" />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700 transition-colors">
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                {rememberMe ? <CheckSquare size={20} className="text-[#a200ea]" /> : <Square size={20} className="text-gray-400" />}
                <span className="text-sm font-extrabold text-[#111]">Remember Me</span>
              </div>
              <a 
                href="/forgot-password"
                className="text-sm font-bold text-[#8b00cc] hover:text-[#bd00ff] transition-colors"
              >
                Forgot Password?
              </a>
            </div>

            <div className="flex justify-center mt-4">
              <button disabled={isLoading} type="submit" className="bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white w-full py-3 rounded-xl font-bold text-lg shadow-[0_8px_15px_-3px_rgba(139,0,204,0.4)] hover:shadow-[0_12px_20px_-3px_rgba(139,0,204,0.6)] hover:-translate-y-1 transition-all disabled:opacity-50 cursor-pointer border-none">
                {isLoading ? "Signing In..." : "Sign In"}
              </button>
            </div>

            <div className="flex items-center justify-center my-1 w-full mx-auto">
              <div className="h-px bg-gray-200 flex-1"></div>
              <span className="px-4 text-gray-400 text-sm font-bold">OR</span>
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>

            <div className="flex justify-center">
              <a href={`/api/auth/google${searchParams?.get("redirect") ? `?redirect=${encodeURIComponent(searchParams.get("redirect")!)}` : ""}`} className="flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 w-full py-3 rounded-xl font-bold text-lg shadow-[0_4px_10px_-3px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_15px_-3px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </a>
            </div>

            {/* Mobile only toggle */}
            <div className="md:hidden mt-2 text-center">
              <p className="text-gray-500 text-sm mb-1 font-bold">Don't have an account yet?</p>
              <button type="button" onClick={() => toggleView(false)} className="text-[#8b00cc] font-extrabold text-base bg-transparent border-none cursor-pointer">Sign Up</button>
            </div>
          </form>
        </div>

        {/* --- Sign Up Form --- */}
        <div 
          className={`w-full h-full flex-1 md:w-1/2 p-6 sm:p-8 md:p-10 flex flex-col justify-center bg-transparent transition-all duration-700 ease-in-out md:absolute md:top-0 md:h-full md:right-0 overflow-y-auto
            ${!isLogin ? 'opacity-100 z-10 translate-x-0' : 'opacity-0 z-0 translate-x-[20%] pointer-events-none hidden md:flex'}
            ${!isLogin ? 'flex' : 'hidden md:flex'}
          `}
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111] mb-4 text-center tracking-tight">Create Account</h2>

          {errorMsg && !isLogin && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-3 text-xs sm:text-sm font-bold border border-red-100 text-center animate-in fade-in">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleRegister} className="flex flex-col gap-3">
            {/* 1. Name */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                <User size={20} />
              </div>
              <input type="text" name="name" required placeholder="Name" className="w-full pl-11 pr-4 py-2.5 bg-white/40 border border-white/50 shadow-sm rounded-[0.9rem] focus:ring-2 focus:ring-[#8b00cc] focus:bg-white/60 transition-all text-gray-900 font-bold placeholder-gray-600 text-sm" />
            </div>

            {/* 2. Email */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                <Mail size={20} />
              </div>
              <input type="email" name="email" required placeholder="Email" className="w-full pl-11 pr-4 py-2.5 bg-white/40 border border-white/50 shadow-sm rounded-[0.9rem] focus:ring-2 focus:ring-[#8b00cc] focus:bg-white/60 transition-all text-gray-900 font-bold placeholder-gray-600 text-sm" />
            </div>

            {/* 3. Phone */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                <Phone size={20} />
              </div>
              <input type="tel" name="phone" required placeholder="Phone Number" className="w-full pl-11 pr-4 py-2.5 bg-white/40 border border-white/50 shadow-sm rounded-[0.9rem] focus:ring-2 focus:ring-[#8b00cc] focus:bg-white/60 transition-all text-gray-900 font-bold placeholder-gray-600 text-sm" />
            </div>

            {/* 4. Password */}
            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Lock size={20} />
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
                  className="w-full pl-11 pr-11 py-2.5 bg-white/40 border border-white/50 shadow-sm rounded-[0.9rem] focus:ring-2 focus:ring-[#8b00cc] focus:bg-white/60 transition-all text-gray-900 font-bold placeholder-gray-600 text-sm" 
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                  <button type="button" onClick={() => setShowSignUpPassword(!showSignUpPassword)} className="text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700 transition-colors bg-transparent border-none cursor-pointer">
                    {showSignUpPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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

            {/* 5. Confirm Password (Directly below Password) */}
            <div className="flex flex-col gap-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Lock size={20} />
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
                  className={`w-full pl-11 pr-11 py-2.5 bg-white/40 border shadow-sm rounded-[0.9rem] focus:ring-2 focus:ring-[#8b00cc] focus:bg-white/60 transition-all text-gray-900 font-bold placeholder-gray-600 text-sm ${
                    signUpConfirmPassword && signUpPassword !== signUpConfirmPassword
                      ? 'border-rose-400 focus:ring-rose-400'
                      : 'border-white/50'
                  }`}
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                  <button type="button" onClick={() => setShowSignUpConfirmPassword(!showSignUpConfirmPassword)} className="text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700 transition-colors bg-transparent border-none cursor-pointer">
                    {showSignUpConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Inline Confirm Password Mismatch */}
              {signUpConfirmPassword.length > 0 && signUpPassword !== signUpConfirmPassword && (
                <div className="text-[11px] font-bold text-rose-300 ml-1 animate-in fade-in">
                  Passwords do not match.
                </div>
              )}
            </div>

            {/* 6. Agreement Checkbox (White text for purple background readability) */}
            <div className="flex items-start gap-2 mt-1 select-none">
              <button
                type="button"
                onClick={() => setAcceptTerms(!acceptTerms)}
                className="mt-0.5 text-white bg-transparent border-none p-0 cursor-pointer shrink-0"
              >
                {acceptTerms ? (
                  <CheckSquare size={18} className="text-[#a200ea] bg-white rounded-xs" />
                ) : (
                  <Square size={18} className="text-white/80 hover:text-white" />
                )}
              </button>
              <label className="text-xs sm:text-[13px] font-medium text-white leading-snug cursor-pointer">
                <span onClick={() => setAcceptTerms(!acceptTerms)}>I agree to the </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenTermsModal();
                  }}
                  className="text-white font-bold underline hover:text-purple-200 transition-colors bg-transparent border-none p-0 cursor-pointer inline"
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
                  className="text-white font-bold underline hover:text-purple-200 transition-colors bg-transparent border-none p-0 cursor-pointer inline"
                >
                  Privacy Policy
                </button>
              </label>
            </div>

            <div className="flex justify-center mt-2">
              <button disabled={isLoading} type="submit" className="bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white w-full py-2.5 rounded-xl font-bold shadow-[0_8px_15px_-3px_rgba(139,0,204,0.4)] hover:shadow-[0_12px_20px_-3px_rgba(139,0,204,0.6)] hover:-translate-y-1 transition-all text-base disabled:opacity-50 cursor-pointer border-none">
                {isLoading ? "Signing Up..." : "Sign Up"}
              </button>
            </div>

            <div className="flex items-center justify-center my-1 w-full mx-auto">
              <div className="h-px bg-gray-200 flex-1"></div>
              <span className="px-3 text-gray-400 text-xs font-bold">OR</span>
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>

            <div className="flex justify-center">
              <a href={`/api/auth/google${searchParams?.get("redirect") ? `?redirect=${encodeURIComponent(searchParams.get("redirect")!)}` : ""}`} className="flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 w-full py-2.5 rounded-xl font-bold text-sm shadow-[0_4px_10px_-3px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_15px_-3px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </a>
            </div>

            {/* Mobile only toggle */}
            <div className="md:hidden mt-2 text-center">
              <p className="text-gray-500 text-xs mb-1 font-bold">Already have account?</p>
              <button type="button" onClick={() => toggleView(true)} className="text-[#8b00cc] font-extrabold text-sm bg-transparent border-none cursor-pointer">Sign In</button>
            </div>
          </form>
        </div>

        {/* --- Sliding Overlay (Purple Box) --- */}
        <div 
          className={`hidden md:block absolute top-0 left-0 w-1/2 h-full z-30 transition-transform duration-700 ease-in-out bg-gradient-to-b from-[#b100ff]/40 to-[#7f00bc]/50 backdrop-blur-md shadow-[-10px_0_30px_rgba(0,0,0,0.15)] border-l border-white/20
            ${isLogin ? 'translate-x-[100%]' : 'translate-x-0'}
          `}
        >
            {/* Content when facing SIGN IN (Prompts to go to Sign Up) */}
            <div className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center p-10 text-white text-center transition-all duration-700 delay-100 ease-in-out ${isLogin ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-[20%] pointer-events-none'}`}>
              <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl p-2 transform hover:scale-105 transition-transform duration-300">
                <img src="/Images/graphix-logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <h2 className="text-4xl font-extrabold mb-3 tracking-wide">Welcome Friend</h2>
              <p className="text-purple-100 mb-10 text-lg font-medium">Don't have an account yet?</p>

              <div className="mt-2 w-full flex justify-center">
                <button
                  onClick={() => toggleView(false)}
                  className="bg-transparent border-2 border-white text-white px-16 py-3 rounded-full font-bold text-lg hover:bg-white hover:text-[#8b00cc] transition-all w-3/4 duration-300 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-xl cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
            </div>

            {/* Content when facing SIGN UP (Prompts to go to Sign In) */}
            <div className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center p-10 text-white text-center transition-all duration-700 delay-100 ease-in-out ${!isLogin ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-[20%] pointer-events-none'}`}>
              <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl p-2 transform hover:scale-105 transition-transform duration-300">
                <img src="/Images/graphix-logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <h2 className="text-4xl font-extrabold mb-2 tracking-wide">Hello, User</h2>
              <p className="text-purple-100 mb-10 text-lg font-medium">Already have an account?</p>

              <div className="mt-2 w-full flex justify-center">
                <button
                  onClick={() => toggleView(true)}
                  className="bg-transparent border-2 border-white text-white px-16 py-3 rounded-full font-bold text-lg hover:bg-white hover:text-[#8b00cc] transition-all w-3/4 duration-300 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-xl cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </div>
        </div>

      </div>

      {/* --- Terms & Conditions Modal --- */}
      {termsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border-2 border-[#BF00FF] animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#BF00FF] to-[#6B21A8] p-5 sm:p-6 text-white flex items-center justify-between shrink-0">
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
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
              {isLoadingPolicies ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-4 border-purple-100 border-t-[#BF00FF] rounded-full animate-spin"></div>
                  <p className="text-gray-500 font-bold text-sm">Loading latest terms & conditions...</p>
                </div>
              ) : termsPolicies.length > 0 ? (
                termsPolicies.map((p, idx) => {
                  const title = policyTitles[p.type.toUpperCase()] || p.type.replace(/_/g, ' ');
                  return (
                    <div key={idx} className="bg-purple-50/40 rounded-2xl p-5 border border-purple-100/80">
                      <h4 className="text-base font-black text-gray-900 mb-2 flex items-center gap-2">
                        <FileText size={16} className="text-[#BF00FF]" />
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
                className="px-6 py-2.5 bg-gradient-to-r from-[#BF00FF] to-[#6B21A8] text-white rounded-xl font-bold text-sm shadow-md hover:opacity-95 transition-opacity cursor-pointer border-none"
              >
                I Understand & Agree
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Privacy Policy Modal --- */}
      {privacyModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden border-2 border-[#BF00FF] animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#BF00FF] to-[#6B21A8] p-5 sm:p-6 text-white flex items-center justify-between shrink-0">
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
                  <div className="w-10 h-10 border-4 border-purple-100 border-t-[#BF00FF] rounded-full animate-spin"></div>
                  <p className="text-gray-500 font-bold text-sm">Loading latest privacy policy...</p>
                </div>
              ) : privacyPolicy?.content ? (
                <div className="bg-purple-50/40 rounded-2xl p-5 border border-purple-100/80 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {privacyPolicy.content}
                </div>
              ) : (
                <div className="bg-purple-50/40 rounded-2xl p-5 border border-purple-100/80 text-sm text-gray-700 leading-relaxed">
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
                className="px-6 py-2.5 bg-gradient-to-r from-[#BF00FF] to-[#6B21A8] text-white rounded-xl font-bold text-sm shadow-md hover:opacity-95 transition-opacity cursor-pointer border-none"
              >
                I Understand & Agree
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal Overlay */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full text-center animate-in zoom-in duration-300 border-2 border-emerald-500">
            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle size={40} className="text-green-500" />
            </div>
            <h3 className="text-3xl font-extrabold text-[#111] mb-2 tracking-tight">Success!</h3>
            <p className="text-gray-600 font-medium mb-8 text-[0.95rem]">
              Your account has been created successfully. You can now log in.
            </p>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                setIsLogin(true);
              }}
              className="w-full bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white py-3.5 rounded-full font-bold shadow-[0_8px_15px_-3px_rgba(139,0,204,0.4)] hover:shadow-[0_12px_20px_-3px_rgba(139,0,204,0.6)] hover:-translate-y-1 transition-all text-lg cursor-pointer border-none"
            >
              Continue to Login
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
