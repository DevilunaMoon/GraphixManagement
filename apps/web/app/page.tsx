"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Menu, X,
  ShoppingBag, Wrench, Receipt, MapPin,
  ArrowRight, Sparkles, ArrowUp,
  Facebook, ExternalLink, Building2,
  Camera, ChevronLeft, ChevronRight,
  ShieldCheck, Smartphone, CheckCircle2, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FacebookBranch {
  id: string;
  branch?: string;
  title: string;
  link: string;
  image: string;
}

const INITIAL_BRANCHES: FacebookBranch[] = [
  {
    id: 'branch-1',
    branch: 'Tagoloan',
    title: 'Tagoloan Branch',
    link: 'https://www.facebook.com/Graphixtagoloan',
    image: '/Images/storefront-bg.jpg'
  },
  {
    id: 'branch-2',
    branch: 'Jasaan',
    title: 'Jasaan Branch',
    link: 'https://www.facebook.com/profile.php?id=61587565422103',
    image: '/Images/storefront-bg.jpg'
  },
  {
    id: 'branch-3',
    branch: 'Villanueva',
    title: 'Villanueva Branch',
    link: 'https://www.facebook.com/GraceGeraldizoSaludares',
    image: '/Images/storefront-bg.jpg'
  }
];

export default function HomePage() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [selectedPolicyType, setSelectedPolicyType] = useState('PURCHASE');
  const [policyContent, setPolicyContent] = useState('');
  const [loadingPolicy, setLoadingPolicy] = useState(false);

  const [facebookBranches, setFacebookBranches] = useState<FacebookBranch[]>(INITIAL_BRANCHES);

  // Branch Documentation Showcase State
  const [latestBranchPhotos, setLatestBranchPhotos] = useState<Record<string, any>>({});
  const [branchPhotosMap, setBranchPhotosMap] = useState<Record<string, any[]>>({
    Tagoloan: [],
    Villanueva: [],
    Jasaan: []
  });
  const [activeBranchModal, setActiveBranchModal] = useState<string | null>(null);
  const [modalPhotoIndex, setModalPhotoIndex] = useState(0);

  useEffect(() => {
    const fetchBranchDocumentation = async () => {
      try {
        const res = await fetch('/api/branch-documentation');
        if (res.ok) {
          const data = await res.json();
          if (data.latestByBranch) {
            setLatestBranchPhotos(data.latestByBranch);
          }
          if (Array.isArray(data.photos)) {
            const map: Record<string, any[]> = { Tagoloan: [], Villanueva: [], Jasaan: [] };
            data.photos.forEach((p: any) => {
              const rawB = p.branch || 'Tagoloan';
              const bKey = rawB.charAt(0).toUpperCase() + rawB.slice(1).toLowerCase();
              if (!map[bKey]) map[bKey] = [];
              map[bKey].push(p);
            });
            setBranchPhotosMap(map);
          }
        }
      } catch (err) {
        console.error('Failed to load branch documentation:', err);
      }
    };
    fetchBranchDocumentation();
  }, []);

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
  const [selectedBestSellerBranch, setSelectedBestSellerBranch] = useState<string>('all');

  const BEST_SELLER_BRANCH_TABS = [
    { key: 'all', label: 'All Branches', icon: Building2 },
    { key: 'Tagoloan', label: 'Tagoloan', icon: MapPin },
    { key: 'Villanueva', label: 'Villanueva', icon: MapPin },
    { key: 'Jasaan', label: 'Jasaan', icon: MapPin },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      setShowScrollTop(window.scrollY > 350);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Check if the user is logged in
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn) setIsLoggedIn(true);
      })
      .catch((err) => console.error("Session check failed", err));
  }, []);

  useEffect(() => {
    const fetchDevices = async () => {
      setIsLoadingProducts(true);
      try {
        const url = selectedBestSellerBranch && selectedBestSellerBranch.toLowerCase() !== 'all'
          ? `/api/devices/best-selling?branch=${encodeURIComponent(selectedBestSellerBranch)}`
          : '/api/devices/best-selling';

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            const isAll = !selectedBestSellerBranch || selectedBestSellerBranch.toLowerCase() === 'all';
            const dbProducts = data.map((device: any, index: number) => {
              const stockCount = device.branchStockQuantity !== undefined ? device.branchStockQuantity : device.stock;
              const isAvailable = stockCount > 0;
              const rank = device.rank || (index + 1);
              const branchName = device.topBranch || device.branch || (isAll ? 'Tagoloan' : selectedBestSellerBranch);
              
              let tagText = 'Best Seller';
              if (!isAvailable) {
                tagText = 'Out of Stock';
              } else if (isAll) {
                tagText = `Top ${rank} · ${branchName}`;
              } else {
                tagText = `${selectedBestSellerBranch} Top Seller`;
              }

              return {
                id: device.id,
                name: device.name,
                description: device.specs || 'Premium electronic device.',
                price: device.price,
                originalPrice: null,
                image: device.image || '/Images/graphix-logo.jpg',
                unitsSold: device.unitsSold || 0,
                selectedBranch: device.selectedBranch,
                branchName: branchName,
                rank: rank,
                stock: stockCount,
                tag: tagText,
                tagColor: isAvailable ? 'purple' : 'gray'
              };
            });

            setProducts(dbProducts);
          } else {
            setProducts([]);
          }
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error('Error fetching best-selling devices', err);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchDevices();
  }, [selectedBestSellerBranch]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await fetch('/api/policies');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const branchesRec = data.find((p: any) => p.type === 'ABOUT_FACEBOOK_BRANCHES');
            if (branchesRec?.content) {
              try {
                const parsed = JSON.parse(branchesRec.content);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setFacebookBranches(parsed);
                  return;
                }
              } catch (e) {
                console.error("Error parsing branches JSON:", e);
              }
            }

            // Legacy fallback
            const fbLinkRec = data.find((p: any) => p.type === 'ABOUT_FACEBOOK_LINK');
            const fbImgRec = data.find((p: any) => p.type === 'ABOUT_FACEBOOK_IMAGE');
            const fbTitleRec = data.find((p: any) => p.type === 'ABOUT_FACEBOOK_TITLE');

            if (fbLinkRec || fbImgRec || fbTitleRec) {
              setFacebookBranches([{
                id: 'branch-legacy',
                title: fbTitleRec?.content || 'Graphix Main Store',
                link: fbLinkRec?.content || 'https://www.facebook.com',
                image: fbImgRec?.content || '/Images/storefront-bg.jpg'
              }]);
            } else {
              setFacebookBranches(INITIAL_BRANCHES);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load facebook branches:', err);
      }
    };
    fetchBranches();
  }, []);

  const features = [
    {
      title: "Shop Devices",
      description: "Browse certified smartphones & gadgets with real-time specs, transparent pricing, and branch-specific stock availability.",
      icon: <ShoppingBag className="text-white" size={28} />,
      badge: "Marketplace"
    },
    {
      title: "Repair Your Device",
      description: "Submit diagnostic requests online, track live repair milestones from intake to completion, and get digital estimates.",
      icon: <Wrench className="text-white" size={28} />,
      badge: "Diagnostics & Care"
    },
    {
      title: "Track Your Orders",
      description: "Access your purchases, digital invoices, warranty cards, pickup reminders, and real-time transaction history anytime.",
      icon: <Receipt className="text-white" size={28} />,
      badge: "Real-time Records"
    },
    {
      title: "Find Your Branch",
      description: "Explore our Tagoloan, Villanueva, and Jasaan branches. View verified storefront documentation and service schedules.",
      icon: <MapPin className="text-white" size={28} />,
      badge: "3 Locations"
    }
  ];

  const scrollToSection = (e: React.MouseEvent<any>, id: string) => {
    if (e && e.preventDefault) e.preventDefault();
    setMobileMenuOpen(false);

    // Timeout ensures that closing the mobile drawer does not cancel smooth scroll on Android/Chromium
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        try {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (_) {
          const offset = 80;
          const targetY = element.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop || 0) - offset;
          window.scrollTo({
            top: Math.max(0, targetY),
            behavior: 'smooth'
          });
        }
      }
    }, 120);
  };

  return (
    <div className="min-h-screen bg-[#fafafc] font-['Inter'] flex flex-col overflow-x-hidden selection:bg-[#8b00cc] selection:text-white">
      {/* Navigation Bar */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-[0_4px_25px_rgba(0,0,0,0.06)] py-3.5 border-b border-purple-100/70"
            : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer group select-none"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div
              className={`w-11 h-11 rounded-2xl flex justify-center items-center overflow-hidden p-0.5 transition-all duration-300 shadow-sm ${
                isScrolled
                  ? 'bg-gradient-to-tr from-[#8b00cc] to-[#bd00ff] ring-2 ring-purple-100'
                  : 'bg-white/20 backdrop-blur-md border border-white/40 ring-2 ring-white/20'
              }`}
            >
              <img
                src="/Images/graphix-logo.jpg"
                alt="Graphix Logo"
                className="w-full h-full object-cover rounded-[0.9rem] bg-white"
              />
            </div>
            <div className="flex flex-col">
              <span
                className={`text-2xl sm:text-3xl font-black tracking-tight leading-none transition-colors ${
                  isScrolled ? 'text-gray-900' : 'text-white'
                }`}
              >
                Graph<span className="text-[#a200ea]">iX</span>
              </span>
              <span
                className={`text-[10px] font-bold tracking-widest uppercase mt-0.5 transition-colors ${
                  isScrolled ? 'text-purple-600' : 'text-purple-200'
                }`}
              >
                Management System
              </span>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15">
              {[
                { label: 'Home', id: 'home' },
                { label: 'Best Sellers', id: 'storefront' },
                { label: 'Branches', id: 'about' },
                { label: 'Services', id: 'features' }
              ].map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => scrollToSection(e, item.id)}
                  className={`font-bold text-sm px-4 py-2 rounded-full transition-all duration-200 cursor-pointer select-none active:scale-95 touch-manipulation ${
                    isScrolled
                      ? 'text-gray-600 hover:text-[#8b00cc] hover:bg-purple-50'
                      : 'text-white/90 hover:text-white hover:bg-white/15'
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>

            <button
              onClick={() => router.push('/login')}
              className="bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] hover:from-[#7a00b3] hover:to-[#a900e6] text-white px-7 py-2.5 rounded-full font-bold text-sm shadow-[0_4px_15px_rgba(139,0,204,0.35)] hover:shadow-[0_6px_20px_rgba(139,0,204,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer border-none flex items-center gap-2"
            >
              <span>{isLoggedIn ? "Dashboard" : "Sign In"}</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            className={`md:hidden p-2.5 rounded-2xl transition-colors border ${
              isScrolled
                ? 'text-[#8b00cc] bg-purple-50 border-purple-100'
                : 'text-white bg-white/15 backdrop-blur-md border-white/20'
            }`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            <motion.div
              key={mobileMenuOpen ? "close" : "menu"}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.div>
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="md:hidden absolute top-full left-0 w-full bg-white shadow-2xl border-t border-purple-100 flex flex-col py-5 px-6 gap-2 overflow-hidden"
            >
              {[
                { label: 'Home', id: 'home' },
                { label: 'Best Sellers', id: 'storefront' },
                { label: 'Branches', id: 'about' },
                { label: 'Services', id: 'features' }
              ].map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => scrollToSection(e, item.id)}
                  className="text-gray-800 hover:text-[#8b00cc] active:text-[#8b00cc] active:bg-purple-50/80 font-bold text-lg py-3 px-3 rounded-xl hover:bg-purple-50/80 transition-colors border-b border-gray-50 flex items-center justify-between cursor-pointer select-none touch-manipulation"
                >
                  <span>{item.label}</span>
                  <ChevronRight size={18} className="text-gray-400" />
                </a>
              ))}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push('/login');
                }}
                className="bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white py-3.5 rounded-2xl font-bold w-full mt-3 text-base shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
              >
                <span>{isLoggedIn ? "Go to Dashboard" : "Sign In to Graphix"}</span>
                <ArrowRight size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section
        id="home"
        className="scroll-mt-24 relative pt-36 pb-28 md:pt-48 md:pb-40 px-5 sm:px-8 overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/Images/storefront-bg.jpg')" }}
      >
        {/* Modern dark gradient overlay with purple tint */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-[#120422]/90 backdrop-blur-[2px] z-0" />

        {/* Ambient Glowing Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#8b00cc] rounded-full mix-blend-screen opacity-25 blur-3xl pointer-events-none z-0 animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#bd00ff] rounded-full mix-blend-screen opacity-20 blur-3xl pointer-events-none z-0" />

        <div className="max-w-5xl mx-auto flex flex-col items-center text-center gap-6 relative z-10">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full font-bold text-xs sm:text-sm border border-white/20 text-[#e9c4ff] shadow-lg">
            <span className="w-2 h-2 rounded-full bg-[#bd00ff] animate-ping" />
            <Sparkles size={15} className="text-[#bd00ff]" />
            <span>Next-Gen Electronics & Service Portal</span>
          </div>

          {/* Hero Main Heading */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white leading-[1.1] tracking-tight max-w-4xl drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
            Control your tech with <span className="bg-gradient-to-r from-[#bd00ff] via-[#e0aaff] to-white bg-clip-text text-transparent">clarity & precision.</span>
          </h1>

          {/* Hero Supporting Paragraph */}
          <p className="text-base sm:text-xl text-purple-100/90 max-w-2xl font-normal leading-relaxed drop-shadow-sm">
            Graphix provides a seamless, transparent platform to track repairs in real-time, explore premium smartphones, and manage device services across Tagoloan, Villanueva, and Jasaan.
          </p>

          {/* Hero Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 mt-4 w-full sm:w-auto">
            <button
              onClick={() => router.push('/login')}
              className="bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] hover:from-[#7a00b3] hover:to-[#a900e6] text-white px-9 py-4 rounded-2xl font-bold text-base sm:text-lg hover:shadow-[0_10px_25px_rgba(139,0,204,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-500/25 w-full sm:w-auto cursor-pointer border-none"
            >
              <span>{isLoggedIn ? "Go to Dashboard" : "Get Started Now"}</span>
              <ArrowRight size={20} />
            </button>
            <a
              href="#storefront"
              onClick={(e) => scrollToSection(e, 'storefront')}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-2xl font-bold text-base sm:text-lg transition-all flex items-center justify-center gap-2 w-full sm:w-auto hover:-translate-y-0.5 active:translate-y-0 text-decoration-none"
            >
              <ShoppingBag size={18} className="text-[#e0aaff]" />
              <span>Explore Products</span>
            </a>
          </div>

          {/* Feature highlights bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10 w-full max-w-3xl">
            {[
              { icon: ShieldCheck, label: "Official Warranty" },
              { icon: Smartphone, label: "Top Brand Devices" },
              { icon: Clock, label: "Live Repair Status" },
              { icon: CheckCircle2, label: "3 Store Locations" }
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-center gap-2 text-xs font-semibold text-purple-200/90">
                <item.icon size={16} className="text-[#bd00ff] shrink-0" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Storefront / Best Sellers Section */}
      <section id="storefront" className="scroll-mt-24 px-5 sm:px-8 py-20 bg-[#fafafc] border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col gap-10">
          {/* Section Header with Branch Tabs */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100/80 text-[#8b00cc] rounded-lg text-xs font-black uppercase tracking-wider mb-2.5">
                <ShoppingBag size={14} /> Storefront Showcase
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight m-0">
                Best Sellers & Featured Tech
              </h2>
              <p className="text-sm sm:text-base text-gray-500 font-medium m-0 mt-2">
                Explore top-selling smartphones and verified customer favorites across Graphix branch inventories.
              </p>
            </div>

            {/* Branch Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white rounded-2xl border border-gray-200 shadow-xs">
              {BEST_SELLER_BRANCH_TABS.map((tab) => {
                const isActive = selectedBestSellerBranch.toLowerCase() === tab.key.toLowerCase();
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSelectedBestSellerBranch(tab.key)}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white shadow-md shadow-purple-500/20'
                        : 'bg-transparent hover:bg-purple-50/60 text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <tab.icon size={14} className={isActive ? "text-white" : "text-purple-600"} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
            {isLoadingProducts ? (
              <div className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-5 flex flex-col justify-center items-center py-24 gap-3">
                <div className="w-12 h-12 border-4 border-purple-100 border-t-[#8b00cc] rounded-full animate-spin" />
                <span className="text-xs font-bold text-gray-400">Loading catalog...</span>
              </div>
            ) : products.length > 0 ? products.map((product) => (
              <div
                key={product.id}
                onClick={() => router.push('/login')}
                className="bg-white rounded-2xl p-3 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_30px_rgba(139,0,204,0.12)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between border border-gray-100 group relative"
              >
                {/* Product Image Stage */}
                <div className="aspect-square w-full bg-purple-50/30 rounded-xl flex justify-center items-center overflow-hidden mb-3 relative p-2">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Product Badges (Rank & Availability / Tags) */}
                  <div className="absolute top-2 inset-x-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 pointer-events-none z-10">
                    {selectedBestSellerBranch.toLowerCase() === 'all' && product.rank && (
                      <div className="px-2 sm:px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white text-[9px] sm:text-[10px] font-black shadow-md border border-white tracking-wider uppercase flex items-center gap-1 shrink-0">
                        <span>Top #{product.rank}</span>
                      </div>
                    )}
                    {product.tag && (
                      <div className={`text-[9px] sm:text-[10px] font-black px-2 sm:px-2.5 py-0.5 rounded-full shadow-xs uppercase tracking-wider border shrink-0 max-w-full truncate ${
                        selectedBestSellerBranch.toLowerCase() === 'all' && product.rank
                          ? 'self-start sm:self-auto sm:ml-auto'
                          : 'self-end sm:self-auto ml-auto'
                      } ${
                        product.stock > 0 
                          ? 'bg-white/90 backdrop-blur-xs text-[#8b00cc] border-purple-200' 
                          : 'bg-gray-100 text-gray-500 border-gray-200'
                      }`}>
                        {product.tag}
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Details */}
                <div className="flex flex-col gap-1">
                  <h3 className="font-extrabold text-gray-900 text-xs sm:text-sm line-clamp-2 min-h-[2.5rem] leading-snug group-hover:text-[#8b00cc] transition-colors m-0">
                    {product.name}
                  </h3>
                  {selectedBestSellerBranch.toLowerCase() === 'all' && product.branchName && (
                    <div className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md w-fit my-0.5">
                      <MapPin size={11} className="text-[#8b00cc] shrink-0" />
                      <span>{product.branchName} Branch</span>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 line-clamp-1 m-0 font-medium">
                    {product.description}
                  </p>
                </div>

                {/* Price & Action */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    {product.originalPrice && (
                      <span className="text-[10px] text-gray-400 line-through font-bold">₱{product.originalPrice.toFixed(2)}</span>
                    )}
                    <span className="font-black text-sm sm:text-base text-[#8b00cc]">
                      ₱{product.price.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push('/login');
                    }}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-50 group-hover:bg-gradient-to-r group-hover:from-[#8b00cc] group-hover:to-[#bd00ff] text-[#8b00cc] group-hover:text-white flex justify-center items-center transition-all shadow-xs border-none cursor-pointer"
                    title="View Product"
                  >
                    <ShoppingBag size={16} />
                  </button>
                </div>
              </div>
            )) : (
              <div className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-5 flex flex-col items-center justify-center py-20 text-gray-500 bg-white rounded-3xl border border-dashed border-purple-200 p-8">
                <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center text-[#8b00cc] mb-4">
                  <ShoppingBag size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 m-0">No Products Found</h3>
                <p className="text-xs sm:text-sm text-gray-500 m-0 mt-1 max-w-sm text-center">
                  No recorded top sellers for {selectedBestSellerBranch === 'all' ? 'any branch' : `${selectedBestSellerBranch} Branch`} currently available.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedBestSellerBranch('all')}
                  className="mt-5 px-5 py-2.5 bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer border-none hover:opacity-95"
                >
                  View All Branches
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* About Section: Our Branches & Showcases */}
      <section id="about" className="scroll-mt-24 py-24 bg-[#0d0714] text-white border-y border-purple-950/60 relative overflow-hidden">
        {/* Background glow accents */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#8b00cc] rounded-full mix-blend-screen opacity-15 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#bd00ff] rounded-full mix-blend-screen opacity-15 blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col gap-16 relative z-10">
          {/* Section Header */}
          <div className="flex flex-col gap-3 text-center max-w-3xl mx-auto">
            <div className="inline-flex w-max mx-auto items-center gap-2 px-3.5 py-1.5 bg-purple-500/15 rounded-full font-bold text-xs text-[#e0b0ff] border border-purple-400/20 uppercase tracking-wider">
              <Building2 size={14} /> Store Locations & Documentation
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight m-0 tracking-tight">
              Our Graphix Branches
            </h2>
            <p className="text-sm sm:text-base text-purple-200/80 leading-relaxed font-normal m-0">
              Visit our authorized branch locations across Northern Mindanao. Click any branch card to inspect verified store facilities and photo documentation.
            </p>
          </div>

          {/* Exactly 3 Branch Cards: Tagoloan, Villanueva, Jasaan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              { name: 'Tagoloan', title: 'Tagoloan Branch', desc: 'Main Tech Center & Storefront' },
              { name: 'Villanueva', title: 'Villanueva Branch', desc: 'Authorized Service & Sales Hub' },
              { name: 'Jasaan', title: 'Jasaan Branch', desc: 'Express Repair & Device Depot' }
            ].map((branch) => {
              const latestPhoto = latestBranchPhotos[branch.name];
              const branchPhotosList = branchPhotosMap[branch.name] || [];
              const photosCount = branchPhotosList.length || (latestPhoto ? 1 : 0);

              return (
                <div
                  key={branch.name}
                  onClick={() => {
                    setActiveBranchModal(branch.name);
                    setModalPhotoIndex(0);
                  }}
                  className="bg-white/5 border border-purple-500/20 hover:border-[#bd00ff] rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer group flex flex-col backdrop-blur-xs"
                >
                  <div className="relative w-full h-64 bg-gray-950 overflow-hidden">
                    {latestPhoto?.photoUrl ? (
                      <>
                        <img
                          src={latestPhoto.photoUrl}
                          alt={latestPhoto.title || `${branch.title} photo`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0714] via-[#0d0714]/40 to-transparent" />
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-purple-950/20">
                        <Camera size={40} className="text-purple-400/40 mb-2 group-hover:text-[#bd00ff] transition-colors" />
                        <span className="text-sm font-bold text-gray-400">No branch photos uploaded yet</span>
                        <span className="text-xs text-gray-600 mt-0.5">Documentation coming soon</span>
                      </div>
                    )}

                    {/* Photos Count Badge */}
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10 flex items-center gap-1.5 shadow-sm">
                      <Camera size={13} className="text-[#e0b0ff]" />
                      <span>{photosCount} {photosCount === 1 ? 'Photo' : 'Photos'}</span>
                    </div>

                    {/* Branch Title Badge */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="inline-flex items-center gap-1.5 bg-[#8b00cc] text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full mb-1.5 shadow-sm">
                        <Building2 size={11} /> Verified Branch
                      </div>
                      <h3 className="text-2xl font-black text-white m-0 group-hover:text-[#e0b0ff] transition-colors tracking-tight">
                        {branch.title}
                      </h3>
                    </div>
                  </div>

                  <div className="p-5 bg-white/5 border-t border-purple-500/15 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-purple-200/70 font-medium m-0">{branch.desc}</p>
                      {latestPhoto?.title && (
                        <p className="text-[11px] text-[#e0b0ff] truncate max-w-[200px] mt-1 m-0 font-semibold">
                          Latest: {latestPhoto.title}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-extrabold text-[#e0b0ff] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      View Photos <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Facebook Official Branch Pages */}
          {facebookBranches.length > 0 && (
            <div className="pt-12 border-t border-purple-900/30 flex flex-col gap-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/15 text-blue-400 rounded-lg text-xs font-bold uppercase tracking-wider mb-2">
                    <Facebook size={14} /> Social Channels
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight m-0">
                    Official Facebook Pages
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-purple-200/70 max-w-md m-0 font-medium">
                  Connect with our store branches directly on Facebook for service updates, real-time inquiries, and community announcements.
                </p>
              </div>

              <div className={`grid grid-cols-1 ${facebookBranches.length > 1 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-1 max-w-md'} gap-6`}>
                {facebookBranches.map((branch) => (
                  <div
                    key={branch.id}
                    className="bg-white/5 border border-purple-500/20 rounded-2xl overflow-hidden shadow-xl hover:border-blue-500/60 transition-all duration-300 group flex flex-col"
                  >
                    <a
                      href={branch.link || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative w-full h-44 overflow-hidden block cursor-pointer"
                    >
                      <img
                        src={branch.image || '/Images/storefront-bg.jpg'}
                        alt={branch.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLElement).setAttribute('src', '/Images/storefront-bg.jpg');
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0714] via-[#0d0714]/50 to-transparent flex flex-col justify-end p-4 text-white">
                        <div className="flex items-center gap-1.5 bg-blue-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full w-max mb-1.5 shadow-sm">
                          <Building2 size={11} /> Facebook Store
                        </div>
                        <h4 className="text-base font-black text-white tracking-tight group-hover:text-blue-300 transition-colors flex items-center gap-1.5 m-0 border-none">
                          {branch.title} <ExternalLink size={14} />
                        </h4>
                        <p className="text-[11px] text-purple-200/70 truncate mt-0.5 m-0 font-medium">
                          {branch.link}
                        </p>
                      </div>
                    </a>

                    <div className="p-4 bg-white/5 border-t border-purple-500/15 flex items-center justify-between">
                      <span className="text-xs text-purple-200/80 font-bold flex items-center gap-1.5">
                        <Facebook size={14} className="text-blue-400" /> Official Page
                      </span>
                      <a
                        href={branch.link || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 text-decoration-none"
                      >
                        Visit Page <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Services / Feature Section */}
      <section id="features" className="scroll-mt-24 py-24 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-[#8b00cc] rounded-lg text-xs font-black uppercase tracking-wider mb-3">
              <Sparkles size={14} /> Comprehensive Platform
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-4">
              Everything you need for your devices, in one place.
            </h2>
            <p className="text-base sm:text-lg text-gray-600 font-normal leading-relaxed">
              Shop devices, request repairs, track your orders, and stay connected with your local Graphix branch through one convenient platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="bg-[#fafafc] hover:bg-white p-7 rounded-3xl border border-gray-200/80 hover:border-purple-300 hover:shadow-[0_12px_30px_rgba(139,0,204,0.1)] transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 bg-gradient-to-tr from-[#8b00cc] to-[#bd00ff] rounded-2xl flex items-center justify-center shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
                      {feature.icon}
                    </div>
                    <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                      {feature.badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#8b00cc] transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 font-normal leading-relaxed m-0">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Grand CTA Banner */}
      <section className="py-20 px-5 sm:px-8 bg-[#fafafc]">
        <div className="max-w-5xl mx-auto bg-gradient-to-r from-[#8b00cc] via-[#9d00e6] to-[#bd00ff] rounded-3xl p-8 sm:p-14 text-center shadow-[0_20px_50px_rgba(139,0,204,0.3)] relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
              Ready to manage your tech?
            </h2>
            <p className="text-base sm:text-xl text-purple-100 font-normal mb-8 max-w-2xl mx-auto leading-relaxed">
              Experience the easiest way to browse products and track your repairs safely across all Graphix branches.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="bg-white hover:bg-gray-50 text-[#8b00cc] px-10 py-4 rounded-2xl font-black text-base sm:text-lg transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-100 inline-flex items-center gap-2 cursor-pointer border-none"
            >
              <span>{isLoggedIn ? "Go to Dashboard" : "Sign In to Get Started"}</span>
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Modernized Footer */}
      <footer className="bg-white pt-16 pb-8 px-5 sm:px-8 text-gray-500 border-t border-gray-200">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12 border-b border-gray-100 pb-12">
          {/* Col 1 & 2: Branding */}
          <div className="col-span-1 md:col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8b00cc] to-[#bd00ff] p-0.5 flex justify-center items-center overflow-hidden shadow-sm">
                <img src="/Images/graphix-logo.jpg" alt="Logo" className="w-full h-full object-cover rounded-[0.55rem] bg-white" />
              </div>
              <span className="text-2xl font-black text-gray-900 tracking-tight">
                Graph<span className="text-[#8b00cc]">iX</span>
              </span>
            </div>
            <p className="text-sm text-gray-500 font-normal leading-relaxed max-w-sm m-0">
              The premier electronics device management and sales tracking system built to organize your technical life across Tagoloan, Villanueva, and Jasaan.
            </p>
          </div>

          {/* Col 3: Navigation */}
          <div className="flex flex-col gap-3">
            <h4 className="text-gray-900 font-bold text-sm uppercase tracking-wider mb-1">Navigation</h4>
            <a href="#home" onClick={(e) => scrollToSection(e, 'home')} className="text-sm text-gray-600 hover:text-[#8b00cc] transition-colors text-decoration-none">Home</a>
            <a href="#storefront" onClick={(e) => scrollToSection(e, 'storefront')} className="text-sm text-gray-600 hover:text-[#8b00cc] transition-colors text-decoration-none">Best Sellers</a>
            <a href="#about" onClick={(e) => scrollToSection(e, 'about')} className="text-sm text-gray-600 hover:text-[#8b00cc] transition-colors text-decoration-none">Our Branches</a>
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="text-sm text-gray-600 hover:text-[#8b00cc] transition-colors text-decoration-none">Services</a>
          </div>

          {/* Col 4: Policy & Legal */}
          <div className="flex flex-col gap-3">
            <h4 className="text-gray-900 font-bold text-sm uppercase tracking-wider mb-1">Policies</h4>
            <a href="#" onClick={(e) => openPolicyModal(e, 'PURCHASE')} className="text-sm text-gray-600 hover:text-[#8b00cc] transition-colors text-decoration-none">Purchase Policy</a>
            <a href="#" onClick={(e) => openPolicyModal(e, 'PAYMENT')} className="text-sm text-gray-600 hover:text-[#8b00cc] transition-colors text-decoration-none">Payment Policy</a>
            <a href="#" onClick={(e) => openPolicyModal(e, 'REPAIR')} className="text-sm text-gray-600 hover:text-[#8b00cc] transition-colors text-decoration-none">Repair Policy</a>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-gray-400">
          <p className="m-0">&copy; {new Date().getFullYear()} Graphix Management System. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Tagoloan • Villanueva • Jasaan</span>
          </div>
        </div>
      </footer>

      {/* Branch Photo Showcase Modal */}
      {activeBranchModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveBranchModal(null)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-[#e0b0ff] flex items-center justify-center border border-purple-500/30">
                  <Building2 size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white m-0">
                    {activeBranchModal} Branch Documentation
                  </h3>
                  <span className="text-xs text-gray-400 font-medium">
                    Official store photos & facilities
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveBranchModal(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition border-none bg-transparent cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            {(() => {
              const currentPhotos = branchPhotosMap[activeBranchModal] || [];
              const hasPhotos = currentPhotos.length > 0;
              const currentPhoto = hasPhotos ? currentPhotos[modalPhotoIndex] || currentPhotos[0] : null;

              if (!hasPhotos || !currentPhoto) {
                return (
                  <div className="py-24 px-6 flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center text-gray-500">
                      <Camera size={36} />
                    </div>
                    <div className="max-w-md">
                      <h4 className="text-xl font-bold text-white mb-1">No branch photos available yet.</h4>
                      <p className="text-sm text-gray-400">
                        The {activeBranchModal} Branch team has not uploaded documentation photos yet. Please check back soon!
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="flex flex-col flex-1 overflow-y-auto">
                  {/* Main Image Stage */}
                  <div className="relative w-full h-[380px] sm:h-[460px] bg-black flex items-center justify-center overflow-hidden select-none">
                    <img
                      src={currentPhoto.photoUrl}
                      alt={currentPhoto.title || `${activeBranchModal} Photo`}
                      className="max-h-full max-w-full object-contain"
                    />

                    {/* Navigation Arrows */}
                    {currentPhotos.length > 1 && (
                      <>
                        <button
                          onClick={() => setModalPhotoIndex((prev) => (prev > 0 ? prev - 1 : currentPhotos.length - 1))}
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/90 text-white rounded-full transition border border-white/20 cursor-pointer shadow-lg"
                          title="Previous Photo"
                        >
                          <ChevronLeft size={24} />
                        </button>
                        <button
                          onClick={() => setModalPhotoIndex((prev) => (prev < currentPhotos.length - 1 ? prev + 1 : 0))}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/90 text-white rounded-full transition border border-white/20 cursor-pointer shadow-lg"
                          title="Next Photo"
                        >
                          <ChevronRight size={24} />
                        </button>
                      </>
                    )}

                    {/* Counter Indicator */}
                    <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">
                      {modalPhotoIndex + 1} of {currentPhotos.length}
                    </div>
                  </div>

                  {/* Photo Details & Thumbnails */}
                  <div className="p-6 bg-gray-900 border-t border-gray-800 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-lg font-bold text-white m-0">
                          {currentPhoto.title || `${activeBranchModal} Branch Photo`}
                        </h4>
                        {currentPhoto.caption && (
                          <p className="text-sm text-gray-400 mt-1 m-0 font-medium">
                            {currentPhoto.caption}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                        Uploaded: {new Date(currentPhoto.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>

                    {/* Thumbnails if multiple */}
                    {currentPhotos.length > 1 && (
                      <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1">
                        {currentPhotos.map((p, idx) => (
                          <button
                            key={p.id || idx}
                            onClick={() => setModalPhotoIndex(idx)}
                            className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer p-0 bg-transparent ${
                              modalPhotoIndex === idx
                                ? 'border-[#bd00ff] ring-2 ring-[#bd00ff]/30 scale-105'
                                : 'border-gray-800 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={p.photoUrl} alt="thumbnail" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-800 bg-black/40 flex justify-end">
              <button
                onClick={() => setActiveBranchModal(null)}
                className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-bold text-sm rounded-xl transition border border-gray-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Policy Modal */}
      {policyModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-purple-500/20 overflow-hidden">
            <div className="px-6 py-5 border-b border-purple-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-white">
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight m-0">
                {selectedPolicyType === 'PURCHASE' ? 'Purchase Policy' :
                  selectedPolicyType === 'PAYMENT' ? 'Payment Policy' : 'Repair Policy'}
              </h3>
              <button
                onClick={() => setPolicyModalOpen(false)}
                className="p-2 hover:bg-purple-100 rounded-full text-gray-500 hover:text-[#8b00cc] transition cursor-pointer border-none bg-transparent"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto">
              {loadingPolicy ? (
                <div className="flex justify-center items-center py-20">
                  <div className="w-10 h-10 border-4 border-purple-200 border-t-[#8b00cc] rounded-full animate-spin" />
                </div>
              ) : (
                <div className="text-gray-700 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-normal">
                  {policyContent}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setPolicyModalOpen(false)}
                className="px-7 py-2.5 bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white rounded-xl font-bold text-sm hover:opacity-95 transition-opacity shadow-md shadow-purple-500/20 cursor-pointer border-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Scroll-to-Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 z-50 p-4 bg-gradient-to-r from-[#8b00cc] to-[#bd00ff] text-white rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer border border-white/20 group"
            title="Scroll to top"
            aria-label="Scroll to top"
          >
            <ArrowUp size={22} className="group-hover:-translate-y-1 transition-transform stroke-[2.5]" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
