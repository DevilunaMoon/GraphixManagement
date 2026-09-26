"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Menu, X,
  MonitorSmartphone, ShoppingBag,
  ShieldCheck, Clock,
  ArrowRight, Sparkles, ArrowUp,
  Facebook, ExternalLink, Building2,
  Camera, ChevronLeft, ChevronRight
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

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      setShowScrollTop(window.scrollY > 300);
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

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

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
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
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
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                onClick={(e) => scrollToSection(e, item.toLowerCase())}
                className={`font-bold relative ${isScrolled ? 'text-gray-600' : 'text-white hover:text-[#bd00ff]'} hover:text-[#bd00ff] transition-colors`}
              >
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
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    scrollToSection(e, item.toLowerCase());
                  }}
                  className="text-gray-800 font-bold text-xl py-3 border-b border-gray-100/50"
                >
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

      {/* About Section -> Our Branches Showcase */}
      <section id="about" className="py-24 bg-gray-900 text-white border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col gap-16">
          
          {/* Section Header: Our Branches */}
          <div className="flex flex-col gap-4 text-center max-w-3xl mx-auto">
            <div className="inline-flex w-max mx-auto items-center gap-2 px-4 py-1.5 bg-purple-500/15 rounded-full font-extrabold text-xs text-[#e0b0ff] border border-purple-400/20 uppercase tracking-wider">
              <Building2 size={15} /> Store Locations
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white leading-tight m-0 tracking-tight">
              Our Branches
            </h2>
            <p className="text-base md:text-lg text-gray-300 leading-relaxed font-medium m-0">
              Explore our Graphix branches and see their latest photos and documentation.
            </p>
          </div>

          {/* Exactly 3 Branch Categories: Tagoloan, Villanueva, Jasaan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                  className="bg-[#111111] border border-gray-800 hover:border-[#bd00ff]/70 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer group flex flex-col"
                >
                  <div className="relative w-full h-64 bg-gray-950 overflow-hidden">
                    {latestPhoto?.photoUrl ? (
                      <>
                        <img
                          src={latestPhoto.photoUrl}
                          alt={latestPhoto.title || `${branch.title} photo`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gray-900/90">
                        <Camera size={42} className="text-gray-600 mb-2 group-hover:text-[#bd00ff] transition-colors" />
                        <span className="text-sm font-bold text-gray-400">No branch photos available yet.</span>
                        <span className="text-xs text-gray-600 mt-1">Documentation coming soon</span>
                      </div>
                    )}

                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10 flex items-center gap-1.5 shadow-sm">
                      <Camera size={13} className="text-[#e0b0ff]" />
                      <span>{photosCount} {photosCount === 1 ? 'Photo' : 'Photos'}</span>
                    </div>

                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="inline-flex items-center gap-1.5 bg-[#8b00cc] text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full mb-1.5 shadow-sm">
                        <Building2 size={11} /> Branch Showcase
                      </div>
                      <h3 className="text-2xl font-black text-white m-0 group-hover:text-[#e0b0ff] transition-colors tracking-tight">
                        {branch.title}
                      </h3>
                    </div>
                  </div>

                  <div className="p-5 bg-[#141414] border-t border-gray-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400 font-medium m-0">{branch.desc}</p>
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

          {/* Facebook Store Branches Showcase */}
          {facebookBranches.length > 0 && (
            <div className="pt-12 border-t border-gray-800/80 flex flex-col gap-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/15 text-blue-400 rounded-lg text-xs font-extrabold uppercase tracking-wider mb-2">
                    <Facebook size={16} /> Facebook Store Locations
                  </div>
                  <h4 className="text-3xl md:text-4xl font-black text-white tracking-tight m-0">Our Official Facebook Pages</h4>
                </div>
                <p className="text-sm text-gray-400 max-w-md m-0 font-medium">
                  Connect with our store branches directly on Facebook for inquiries, service updates, and physical store locations.
                </p>
              </div>

              <div className={`grid grid-cols-1 ${facebookBranches.length > 1 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-1 max-w-md'} gap-6`}>
                {facebookBranches.map((branch) => (
                  <div key={branch.id} className="bg-[#111111] border border-gray-800 rounded-2xl overflow-hidden shadow-xl hover:border-blue-500/50 transition-all group flex flex-col">
                    <a
                      href={branch.link || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative w-full h-48 overflow-hidden block cursor-pointer"
                    >
                      <img
                        src={branch.image || '/Images/storefront-bg.jpg'}
                        alt={branch.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLElement).setAttribute('src', '/Images/storefront-bg.jpg');
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-5 text-white">
                        <div className="flex items-center gap-1.5 bg-blue-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full w-max mb-1.5 shadow-sm">
                          <Building2 size={12} /> Branch Location
                        </div>
                        <h5 className="text-lg font-black text-white tracking-tight group-hover:text-blue-400 transition-colors flex items-center gap-2 m-0 border-none">
                          {branch.title} <ExternalLink size={16} />
                        </h5>
                        <p className="text-xs text-gray-300 truncate mt-1 m-0 font-medium">
                          {branch.link}
                        </p>
                      </div>
                    </a>

                    <div className="p-4 bg-gray-900/90 border-t border-gray-800 flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-bold flex items-center gap-1.5">
                        <Facebook size={14} className="text-blue-400" /> Graphix Official Page
                      </span>
                      <a
                        href={branch.link || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 text-decoration-none"
                      >
                        Visit Page <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
            <a href="#home" onClick={(e) => scrollToSection(e, 'home')} className="hover:text-[#8b00cc] transition-colors">Home Selection</a>
            <a href="#about" onClick={(e) => scrollToSection(e, 'about')} className="hover:text-[#8b00cc] transition-colors">Our Approach</a>
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-[#8b00cc] transition-colors">Feature Set</a>
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
            <ArrowUp size={24} className="group-hover:-translate-y-1 transition-transform stroke-[2.5]" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
