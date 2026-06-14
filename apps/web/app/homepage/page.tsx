"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Menu, X,
  MonitorSmartphone, ShoppingBag,
  ShieldCheck, Clock,
  ArrowRight, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";


export default function HomePage() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [selectedPolicyType, setSelectedPolicyType] = useState('PURCHASE');
  const [policyContent, setPolicyContent] = useState('');
  const [loadingPolicy, setLoadingPolicy] = useState(false);

  const openPolicyModal = async (e: React.MouseEvent, type: string) => {
    e.preventDefault();
    setSelectedPolicyType(type);
    setPolicyModalOpen(true);
    setLoadingPolicy(true);

    try {
      const res = await fetch('/api/policies');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const target = data.find((p: any) => p.type === type.toUpperCase());
          if (target) setPolicyContent(target.content);
          else setPolicyContent('No policy content defined yet.');
        }
      }
    } catch (err) {
      setPolicyContent('Failed to load policy.');
    } finally {
      setLoadingPolicy(false);
    }
  };

  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Check if the user is already logged in
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn) setIsLoggedIn(true);
      })
      .catch((err) => console.error("Session check failed", err));
  }, []);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch('/api/devices/best-selling');
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const dbProducts = data.map((device: any) => ({
              id: device.id,
              name: device.name,
              description: device.specs || 'Premium electronic device.',
              price: device.price,
              originalPrice: null,
              image: device.image || '/Images/graphix-logo.jpg',
              tag: device.stock > 0 ? 'Best Seller' : 'Out of Stock',
              tagColor: device.stock > 0 ? 'purple' : 'gray'
            }));

            setProducts(dbProducts);
          } else {
            setProducts([]);
          }
        }
      } catch (err) {
        console.error('Error fetching best-selling devices', err);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchDevices();
  }, []);

  const features = [
    {
      title: "Device Monitoring",
      description: "Track the real-time repair and maintenance status of your electronic devices with complete transparency.",
      icon: <MonitorSmartphone className="text-white" size={32} />
    },
    {
      title: "Digital Marketplace",
      description: "Browse and purchase a wide selection of premium electronics, cables, and accessories directly.",
      icon: <ShoppingBag className="text-white" size={32} />
    },
    {
      title: "Secure Data",
      description: "Safe, secure, and fully documented transactions with digital receipts for every purchase or service.",
      icon: <ShieldCheck className="text-white" size={32} />
    },
    {
      title: "Efficiency",
      description: "No more waiting in lines. Get live updates on your repair progress straight from the dashboard.",
      icon: <Clock className="text-white" size={32} />
    }
  ];

  return (
    <div className="min-h-screen bg-[#f3f4f8] font-['Inter'] flex flex-col overflow-x-hidden selection:bg-[#bd00ff] selection:text-white">
      {/* Navbar */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled
          ? "bg-white shadow-md py-4 border-b border-gray-200"
          : "bg-transparent py-6"
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo(0, 0)}>
            <div
              className={`w-12 h-12 rounded-xl flex justify-center items-center overflow-hidden border-2 ${isScrolled ? 'border-[#8b00cc]' : 'border-white/40'}`}
            >
              <img src="/Images/graphix-logo.jpg" alt="Graphix Logo" className="w-full h-full object-cover bg-white" />
            </div>
            <span className={`text-3xl font-extrabold tracking-tight ${isScrolled ? 'text-[#8b00cc]' : 'text-white group-hover:text-[#bd00ff]'} transition-colors`}>
              Graphix
            </span>
          </div>

          <div className="hidden md:flex items-center gap-10">
            {['Home', 'About', 'Features'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className={`font-bold relative ${isScrolled ? 'text-gray-600' : 'text-white hover:text-[#bd00ff]'} hover:text-[#bd00ff] transition-colors`}>
                {item}
              </a>
            ))}
            <button
              onClick={() => router.push('/login')}
              className="bg-[#8b00cc] text-white px-8 py-3 rounded-xl font-bold shadow-md ml-4 hover:bg-[#bd00ff] transition-all"
            >
              {isLoggedIn ? "Dashboard" : "Log in"}
            </button>
          </div>

          <button 
            className="md:hidden text-[#8b00cc] p-2 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center focus:outline-none" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <motion.div
              key={mobileMenuOpen ? "close" : "menu"}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </motion.div>
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="md:hidden absolute top-full left-0 w-full bg-white shadow-xl border-t border-gray-100 flex flex-col py-6 px-6 gap-2 overflow-hidden"
            >
              {['Home', 'About', 'Features'].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMobileMenuOpen(false)} className="text-gray-800 font-bold text-xl py-3 border-b border-gray-100/50">
                  {item}
                </a>
              ))}
              <button
                onClick={() => { setMobileMenuOpen(false); router.push('/login'); }}
                className="bg-[#8b00cc] text-white px-6 py-4 rounded-xl font-bold w-full mt-4 text-xl shadow-md"
              >
                {isLoggedIn ? "Dashboard" : "Log in"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section 
        id="home" 
        className="relative pt-40 pb-32 md:pt-56 md:pb-48 px-6 border-b border-gray-200 overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/Images/storefront-bg.jpg')" }}
      >
        {/* Sleek semi-transparent dark frosted overlay */}
        <div className="absolute inset-0 bg-black/65 backdrop-blur-[1.5px] z-0"></div>

        {/* CSS Animation Loop Overlay */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes float1 {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-30px) scale(1.05); }
          }
          @keyframes float2 {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(40px) scale(0.95); }
          }
          @keyframes rotateOrb {
            0% { transform: rotate(0deg) translate(50px) rotate(0deg); }
            100% { transform: rotate(360deg) translate(50px) rotate(-360deg); }
          }
        `}} />

        {/* Ambient Animated Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen opacity-20 blur-3xl pointer-events-none z-0" style={{ animation: 'float1 8s ease-in-out infinite' }}></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-600 rounded-full mix-blend-screen opacity-15 blur-3xl pointer-events-none z-0" style={{ animation: 'float2 10s ease-in-out infinite' }}></div>

        <div className="max-w-7xl mx-auto flex flex-col items-center text-center gap-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-purple-500/15 rounded-full font-bold text-sm border border-purple-400/30 text-[#e0b0ff]">
            <Sparkles size={16} />
            <span>Next-Gen Device Management</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white leading-tight max-w-4xl drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            Control your tech with clarity.
          </h1>

          <p className="text-xl text-gray-200 max-w-2xl font-medium leading-relaxed mt-2 drop-shadow-[0_1px_5px_rgba(0,0,0,0.5)]">
            Graphix provides a seamless, transparent, and breathtakingly fast way to track repairs, browse electronics, and manage tech investments.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto">
            <button
              onClick={() => router.push('/login')}
              className="bg-[#8b00cc] text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-[#bd00ff] transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-500/20"
            >
              {isLoggedIn ? "Go to Dashboard" : "Get Started Free"} <ArrowRight size={22} />
            </button>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="px-6 py-20 bg-[#f3f4f8]">
        <div className="max-w-7xl mx-auto flex flex-col gap-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between">
            <div>
              <h2 className="text-[#8b00cc] font-black text-xl tracking-wide uppercase mb-2 flex items-center gap-2">
                <ShoppingBag size={24} /> Storefront
              </h2>
              <h3 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">Best Sellers</h3>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-6">
            {isLoadingProducts ? (
              <div className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-5 flex justify-center items-center py-20">
                <div className="w-12 h-12 border-4 border-purple-200 border-t-[#bd00ff] rounded-full animate-spin"></div>
              </div>
            ) : products.length > 0 ? products.map((product) => (
              <div
                key={product.id}
                onClick={() => router.push('/login')}
                className="bg-white rounded-xl p-2 sm:p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-md md:hover:-translate-y-1 transition-all cursor-pointer flex flex-col gap-2 border border-transparent md:border md:border-gray-200 group"
              >
                <div className="aspect-square w-full bg-transparent flex justify-center items-center overflow-hidden mb-1 sm:mb-2 relative">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain p-1 md:p-0 transition-transform duration-300 md:group-hover:scale-105"
                  />
                  {product.tag && (
                    <div className="absolute top-2 right-2 bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded shadow-sm uppercase tracking-wide">
                      {product.tag}
                    </div>
                  )}
                </div>
                <h4 className="font-bold text-gray-900 text-xs sm:text-sm line-clamp-2 h-8 sm:h-10 leading-snug">{product.name}</h4>
                <div className="mt-auto flex justify-between items-center w-full">
                  <div className="flex flex-col">
                    {product.originalPrice && (
                      <span className="text-[10px] text-gray-400 line-through font-bold">₱{product.originalPrice.toFixed(2)}</span>
                    )}
                    <span className="font-black text-sm sm:text-base text-[#8b00cc]">₱{product.price.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push('/login');
                    }}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-50 text-[#8b00cc] flex justify-center items-center hover:bg-[#8b00cc] hover:text-white transition-all shadow-sm hidden md:flex"
                  >
                    <ShoppingBag size={18} className="stroke-[2.5]" />
                  </button>
                </div>
              </div>
            )) : (
              <div className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-5 flex flex-col items-center justify-center py-16 text-gray-500">
                <ShoppingBag size={48} className="text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-700">No products available</h3>
                <p>Check back later for new inventory.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-gray-900 text-white border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col gap-6">
            <div className="inline-flex w-max items-center gap-2 px-4 py-2 bg-white/10 rounded-lg font-bold text-sm text-[#e0b0ff]">
              Why Choose Us
            </div>
            <h3 className="text-4xl md:text-5xl font-black text-white leading-tight">
              Bridging the gap between service & transparency.
            </h3>
            <p className="text-lg text-gray-400 leading-relaxed max-w-lg">
              We eliminated the anxiety of device repairs. Our system provides real-time, step-by-step visibility into your electronics' status.
            </p>
            <div className="flex gap-8 mt-6">
              <div className="flex flex-col bg-white/5 p-6 rounded-2xl border border-white/10 flex-1">
                <span className="text-4xl font-black">24<span className="text-[#e0b0ff]">/7</span></span>
                <span className="text-gray-400 font-bold uppercase text-xs mt-1">Visibility</span>
              </div>
              <div className="flex flex-col bg-white/5 p-6 rounded-2xl border border-white/10 flex-1">
                <span className="text-4xl font-black">100<span className="text-[#e0b0ff]">%</span></span>
                <span className="text-gray-400 font-bold uppercase text-xs mt-1">Guarantee</span>
              </div>
            </div>
          </div>
          <div className="bg-[#111111] border border-gray-800 rounded-3xl p-4 shadow-xl flex flex-col w-full h-[400px] overflow-hidden relative">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3945.6080787723067!2d124.75142957478778!3d8.53737499150564!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x32ffef54dd5fc27f%3A0xa3526601c268e1b1!2sGraphix!5e0!3m2!1sen!2sph!4v1778072713852!5m2!1sen!2sph" 
              width="100%" 
              height="100%" 
              style={{ border: 0, borderRadius: '1rem' }} 
              allowFullScreen={true} 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              title="Store Location"
            ></iframe>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-[#8b00cc] font-black text-lg tracking-widest uppercase mb-2">Core Platform</h2>
            <h3 className="text-4xl md:text-5xl font-black text-gray-900">Everything you need, unified.</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="bg-[#f8f9fc] p-8 rounded-2xl border border-gray-200 flex flex-col shadow-sm"
              >
                <div className="w-16 h-16 bg-[#8b00cc] rounded-xl flex items-center justify-center mb-6 shadow-md">
                  {feature.icon}
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h4>
                <p className="text-gray-600 font-medium leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Grand CTA Section */}
      <section className="py-20 px-6 bg-[#f3f4f8]">
        <div className="max-w-5xl mx-auto bg-[#8b00cc] rounded-3xl p-12 text-center shadow-xl">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Ready to take control?</h2>
          <p className="text-xl text-purple-100 font-medium mb-8 max-w-2xl mx-auto">
            Experience the easiest way to browse products and track your repairs safely.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="bg-white text-[#8b00cc] px-10 py-4 rounded-xl font-bold text-xl hover:bg-gray-50 transition-colors shadow-md inline-flex items-center gap-2"
          >
            {isLoggedIn ? "Go to Dashboard" : "Create Account Free"}
            <ArrowRight size={24} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white pt-16 pb-8 px-6 text-gray-500 border-t border-gray-200">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12 border-b border-gray-100 pb-12">
          <div className="col-span-1 md:col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#8b00cc] rounded-xl flex justify-center items-center overflow-hidden">
                <img src="/Images/graphix-logo.jpg" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-2xl font-black text-gray-900">Graphix</span>
            </div>
            <p className="text-gray-500 font-medium leading-relaxed max-w-sm">
              The premier electronics device management and sales tracking system built to organize your technical life.
            </p>
          </div>
          <div className="flex flex-col gap-3 font-semibold">
            <h4 className="text-gray-900 font-bold text-lg mb-1">Platform</h4>
            <a href="#home" className="hover:text-[#8b00cc] transition-colors">Home Selection</a>
            <a href="#about" className="hover:text-[#8b00cc] transition-colors">Our Approach</a>
            <a href="#features" className="hover:text-[#8b00cc] transition-colors">Feature Set</a>
          </div>
          <div className="flex flex-col gap-3 font-semibold">
            <h4 className="text-gray-900 font-bold text-lg mb-1">General Terms & Conditions</h4>
            <a href="#" onClick={(e) => openPolicyModal(e, 'PURCHASE')} className="hover:text-[#8b00cc] transition-colors">Purchase Policy</a>
            <a href="#" onClick={(e) => openPolicyModal(e, 'PAYMENT')} className="hover:text-[#8b00cc] transition-colors">Payment Policy</a>
            <a href="#" onClick={(e) => openPolicyModal(e, 'REPAIR')} className="hover:text-[#8b00cc] transition-colors">Repair Policy</a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto text-center font-semibold md:flex md:justify-between items-center text-sm">
          <p>&copy; {new Date().getFullYear()} Graphix Management System.</p>
        </div>
      </footer>

      {policyModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-purple-500/20">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-[#fcf8ff] rounded-t-3xl">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                {selectedPolicyType === 'PURCHASE' ? 'Purchase Policy' :
                  selectedPolicyType === 'PAYMENT' ? 'Payment Policy' : 'Repair Policy'}
              </h3>
              <button
                onClick={() => setPolicyModalOpen(false)}
                className="p-2 hover:bg-purple-100 rounded-full text-gray-500 hover:text-purple-700 transition cursor-pointer border-none bg-transparent"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto">
              {loadingPolicy ? (
                <div className="flex justify-center items-center py-20">
                  <div className="w-10 h-10 border-4 border-purple-200 border-t-[#bd00ff] rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap font-medium">
                  {policyContent}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-3xl flex justify-end">
              <button
                onClick={() => setPolicyModalOpen(false)}
                className="px-8 py-3 bg-[#bd00ff] text-white rounded-xl font-bold hover:bg-[#9c00d6] transition-colors shadow-lg shadow-purple-500/30 cursor-pointer border-none"
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
