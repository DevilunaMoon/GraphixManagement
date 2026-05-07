"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, User, Phone, ArrowLeft, CheckSquare, Square, Eye, EyeOff, CheckCircle } from "lucide-react";
import Link from "next/link";
import { login, register } from "../../actions/auth";

function LoginContent() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
      if (result.role === "admin" || result.role === "ADMIN") window.location.href = "/admin/dashboard";
      else if (result.role === "cashier" || result.role === "CASHIER") window.location.href = "/cashier/dashboard";
      else window.location.href = "/customer/dashboard";
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!acceptTerms) {
      setErrorMsg("You must accept the Terms and Regulation.");
      return;
    }
    setErrorMsg("");
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await register(formData);

    if (result?.error) {
      setErrorMsg(result.error);
      setIsLoading(false);
    } else if (result?.success) {
      setIsLoading(false);
      setShowSuccessModal(true);
      (e.target as HTMLFormElement).reset();
    }
  };

  // Helper function to clear errors when switching tabs
  const toggleView = (viewIsLogin: boolean) => {
    setErrorMsg("");
    setIsLogin(viewIsLogin);
  };

  return (
    <div 
      className="min-h-screen flex py-10 items-center justify-center p-4 font-['Inter'] relative overflow-hidden bg-cover bg-center"
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
      <div className="bg-white/30 backdrop-blur-md rounded-[2rem] shadow-2xl overflow-hidden w-full max-w-4xl min-h-[680px] flex flex-col relative transition-all duration-700 border border-white/50">

        {/* --- Sign In Form --- */}
        <div 
          className={`w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-transparent transition-all duration-700 ease-in-out md:absolute md:top-0 md:h-full md:left-0
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

          <form onSubmit={handleLogin} className="flex flex-col gap-6">
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

            <div className="flex justify-center mt-6">
              <button disabled={isLoading} type="submit" className="bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white w-full py-3 rounded-xl font-bold text-lg shadow-[0_8px_15px_-3px_rgba(139,0,204,0.4)] hover:shadow-[0_12px_20px_-3px_rgba(139,0,204,0.6)] hover:-translate-y-1 transition-all disabled:opacity-50">
                {isLoading ? "Signing In..." : "Sign In"}
              </button>
            </div>

            <div className="flex items-center justify-center my-2 w-full mx-auto">
              <div className="h-px bg-gray-200 flex-1"></div>
              <span className="px-4 text-gray-400 text-sm font-bold">OR</span>
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>

            <div className="flex justify-center">
              <a href="/api/auth/google" className="flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 w-full py-3 rounded-xl font-bold text-lg shadow-[0_4px_10px_-3px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_15px_-3px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all">
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
            <div className="md:hidden mt-4 text-center">
              <p className="text-gray-500 text-sm mb-2 font-bold">Don't have an account yet?</p>
              <button type="button" onClick={() => toggleView(false)} className="text-[#8b00cc] font-extrabold text-lg">Sign Up</button>
            </div>
          </form>
        </div>

        {/* --- Sign Up Form --- */}
        <div 
          className={`w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-transparent transition-all duration-700 ease-in-out md:absolute md:top-0 md:h-full md:right-0
            ${!isLogin ? 'opacity-100 z-10 translate-x-0' : 'opacity-0 z-0 translate-x-[20%] pointer-events-none hidden md:flex'}
            ${!isLogin ? 'flex' : 'hidden md:flex'}
          `}
        >
          <h2 className="text-4xl font-extrabold text-[#111] mb-6 text-center tracking-tight">Create Account</h2>

          {errorMsg && !isLogin && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm font-bold border border-red-100 text-center animate-in fade-in">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                <User size={22} />
              </div>
              <input type="text" name="name" required placeholder="Name" className="w-full pl-12 pr-4 py-3 bg-white/40 border border-white/50 shadow-sm rounded-[1rem] focus:ring-2 focus:ring-[#8b00cc] focus:bg-white/60 transition-all text-gray-900 font-bold placeholder-gray-600" />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                <Mail size={22} />
              </div>
              <input type="text" name="email" required placeholder="Email" className="w-full pl-12 pr-4 py-3 bg-white/40 border border-white/50 shadow-sm rounded-[1rem] focus:ring-2 focus:ring-[#8b00cc] focus:bg-white/60 transition-all text-gray-900 font-bold placeholder-gray-600" />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                <Phone size={22} />
              </div>
              <input type="tel" name="phone" required placeholder="Phone Number" className="w-full pl-12 pr-4 py-3 bg-white/40 border border-white/50 shadow-sm rounded-[1rem] focus:ring-2 focus:ring-[#8b00cc] focus:bg-white/60 transition-all text-gray-900 font-bold placeholder-gray-600" />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                <Lock size={22} />
              </div>
              <input type={showSignUpPassword ? "text" : "password"} name="password" required placeholder="Password" className="w-full pl-12 pr-12 py-3 bg-white/40 border border-white/50 shadow-sm rounded-[1rem] focus:ring-2 focus:ring-[#8b00cc] focus:bg-white/60 transition-all text-gray-900 font-bold placeholder-gray-600" />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                <button type="button" onClick={() => setShowSignUpPassword(!showSignUpPassword)} className="text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700 transition-colors">
                  {showSignUpPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 cursor-pointer mt-1" onClick={() => setAcceptTerms(!acceptTerms)}>
              {acceptTerms ? <CheckSquare size={20} className="text-[#a200ea]" /> : <Square size={20} className="text-gray-400" />}
              <span className="text-sm font-extrabold text-[#111]">I Accept the <span className="text-[#a200ea]">Terms and Regulation</span></span>
            </div>

            <div className="flex justify-center mt-3">
              <button disabled={isLoading} type="submit" className="bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white w-full py-3 rounded-xl font-bold shadow-[0_8px_15px_-3px_rgba(139,0,204,0.4)] hover:shadow-[0_12px_20px_-3px_rgba(139,0,204,0.6)] hover:-translate-y-1 transition-all text-lg disabled:opacity-50">
                {isLoading ? "Signing Up..." : "Sign Up"}
              </button>
            </div>

            <div className="flex items-center justify-center my-2 w-full mx-auto">
              <div className="h-px bg-gray-200 flex-1"></div>
              <span className="px-4 text-gray-400 text-sm font-bold">OR</span>
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>

            <div className="flex justify-center">
              <a href="/api/auth/google" className="flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 w-full py-3 rounded-xl font-bold text-lg shadow-[0_4px_10px_-3px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_15px_-3px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all">
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
            <div className="md:hidden mt-4 text-center">
              <p className="text-gray-500 text-sm mb-2 font-bold">Already have account?</p>
              <button type="button" onClick={() => toggleView(true)} className="text-[#8b00cc] font-extrabold text-lg">Sign In</button>
            </div>
          </form>
        </div>

        {/* --- Sliding Overlay (Purple Box) --- */}
        <div 
          className={`hidden md:block absolute top-0 left-0 w-1/2 h-full z-30 transition-transform duration-700 ease-in-out bg-gradient-to-b from-[#b100ff]/40 to-[#7f00bc]/50 backdrop-blur-md shadow-[-10px_0_30px_rgba(0,0,0,0.15)] border-l border-white/20
            ${isLogin ? 'translate-x-[100%]' : 'translate-x-0'}
          `}
        >
            {/* The overlay content needs to cleanly toggle its text depending on the state. 
                We use absolute positioning within the overlay to fade elements in/out based on state. */}

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
                  className="bg-transparent border-2 border-white text-white px-16 py-3 rounded-full font-bold text-lg hover:bg-white hover:text-[#8b00cc] transition-all w-3/4 duration-300 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-xl"
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
                  className="bg-transparent border-2 border-white text-white px-16 py-3 rounded-full font-bold text-lg hover:bg-white hover:text-[#8b00cc] transition-all w-3/4 duration-300 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-xl"
                >
                  Sign In
                </button>
              </div>
            </div>
        </div>

      </div>

      {/* Success Modal Overlay */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full text-center animate-in zoom-in duration-300">
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
              className="w-full bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white py-3.5 rounded-full font-bold shadow-[0_8px_15px_-3px_rgba(139,0,204,0.4)] hover:shadow-[0_12px_20px_-3px_rgba(139,0,204,0.6)] hover:-translate-y-1 transition-all text-lg"
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
