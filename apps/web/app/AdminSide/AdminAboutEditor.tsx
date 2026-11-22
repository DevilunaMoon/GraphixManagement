"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Save, Info, ShoppingBag, Store, CreditCard, 
  Facebook, Image as ImageIcon, ExternalLink, CheckCircle, AlertCircle, RefreshCw,
  Plus, Trash2, Building2, Upload, Loader2, Link as LinkIcon, Zap, Camera, Eye, X, 
  ShieldCheck, Lock, Edit3, Columns, Monitor, Smartphone, Check, Sparkles, ArrowUpRight
} from 'lucide-react';
import { useBranch } from '../../context/BranchContext';

interface FacebookBranch {
  id: string;
  branch?: string;
  title: string;
  link: string;
  image: string;
}

interface BranchDocumentationItem {
  id: string;
  branch: string;
  photoUrl: string;
  title?: string | null;
  caption?: string | null;
  uploadedBy?: string | null;
  createdAt: string;
}

const DEFAULT_MAIN = `This website revolutionizes the traditional e-commerce model by seamlessly integrating online retail with a transparent, service-based repair platform. Unlike standard online stores that simply sell products, this site offers a unique device monitoring feature that empowers customers by providing real-time, visual updates on their phone's repair progress. This level of transparency bridges the trust gap often found in service industries, allowing users to see their device being worked on from anywhere. By combining the convenience of purchasing accessories or repair parts with the peace of mind that comes from complete visibility into the service process, this site creates a customer-centric ecosystem that prioritizes both convenience and trust in the tech repair space.`;

const DEFAULT_PURCHASE = `Customers can purchase items directly through this website. All online transactions require Full Purchase payment to complete your online order.`;

const DEFAULT_DOWNPAYMENT = `Online downpayments are not accepted on this website. Downpayment features and QR details displayed on product pages are strictly provided to show downpayment information and requirements for customers planning to visit our physical store. Actual downpayment processing is available exclusively for in-store walk-in transactions at our physical store POS terminal.`;

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

const matchBranch = (b: FacebookBranch, targetBranchName: string, index?: number): boolean => {
  if (!b || !targetBranchName) return false;
  const target = targetBranchName.toLowerCase().trim();
  const bBranch = String(b.branch || '').toLowerCase().trim();
  const bTitle = String(b.title || '').toLowerCase().trim();
  const bId = String(b.id || '').toLowerCase().trim();

  if (target === 'tagoloan') {
    return bBranch === 'tagoloan' || bTitle.includes('tagoloan') || bTitle.includes('main') || bId.includes('tagoloan') || bId === 'branch-1' || index === 0;
  }
  if (target === 'jasaan') {
    return bBranch === 'jasaan' || bTitle.includes('jasaan') || bId.includes('jasaan') || bId === 'branch-2' || index === 1;
  }
  if (target === 'villanueva') {
    return bBranch === 'villanueva' || bTitle.includes('villanueva') || bId.includes('villanueva') || bId === 'branch-3' || index === 2;
  }
  return bBranch === target || bTitle.includes(target) || bId.includes(target);
};

const compressImageFile = (file: File, maxWidth = 1200, quality = 0.75): Promise<Blob> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export default function AdminAboutEditor() {
  const { isSuperAdmin, userRole, userBranch } = useBranch();
  const effectiveBranch = userBranch || 'Tagoloan';

  // Navigation and View Modes
  const [activeTab, setActiveTab] = useState<'showcase' | 'facebook' | 'policies'>('showcase');
  const [viewMode, setViewMode] = useState<'editor' | 'split' | 'preview'>('editor');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Policy & Branches State
  const [mainText, setMainText] = useState(DEFAULT_MAIN);
  const [purchasePolicy, setPurchasePolicy] = useState(DEFAULT_PURCHASE);
  const [downpaymentPolicy, setDownpaymentPolicy] = useState(DEFAULT_DOWNPAYMENT);
  const [branches, setBranches] = useState<FacebookBranch[]>(INITIAL_BRANCHES);

  // Branch Documentation state
  const [branchPhotos, setBranchPhotos] = useState<BranchDocumentationItem[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [superAdminSelectedBranch, setSuperAdminSelectedBranch] = useState('Tagoloan');

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [targetSlot, setTargetSlot] = useState<number | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isSubmittingPhoto, setIsSubmittingPhoto] = useState(false);

  // Photo viewer / delete modal state
  const [photoToView, setPhotoToView] = useState<BranchDocumentationItem | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<BranchDocumentationItem | null>(null);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);

  const [uploadingBranchId, setUploadingBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeBranchName = isSuperAdmin ? superAdminSelectedBranch : effectiveBranch;

  // 8 Slots construction
  const showcaseSlots = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const photo = branchPhotos[i] || null;
      return {
        slotNumber: i + 1,
        photo
      };
    });
  }, [branchPhotos]);

  const slotsCount = branchPhotos.length;
  const slotsRemaining = Math.max(0, 8 - slotsCount);
  const percentFilled = Math.min(100, Math.round((slotsCount / 8) * 100));

  useEffect(() => {
    fetchPolicies();
    fetchBranchDocumentation();
  }, [isSuperAdmin, userBranch, superAdminSelectedBranch]);

  const fetchBranchDocumentation = async () => {
    setIsLoadingPhotos(true);
    try {
      const branchToQuery = isSuperAdmin ? superAdminSelectedBranch : effectiveBranch;
      const res = await fetch(`/api/branch-documentation?branch=${encodeURIComponent(branchToQuery)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.photos)) {
          setBranchPhotos(data.photos);
        }
      }
    } catch (err) {
      console.error('Failed to load branch documentation:', err);
    } finally {
      setIsLoadingPhotos(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    }
  };

  const handleSubmitPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setToastMessage({ type: 'error', text: 'Please select an image file to upload.' });
      return;
    }

    setIsSubmittingPhoto(true);
    setToastMessage(null);

    try {
      const compressedBlob = await compressImageFile(selectedFile);
      const formData = new FormData();
      formData.append('file', compressedBlob, selectedFile.name);
      formData.append('folder', `branch-documentation/${activeBranchName.toLowerCase()}`);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json();
        throw new Error(errData.error || 'Failed to upload photo image');
      }

      const uploadData = await uploadRes.json();
      const photoUrl = uploadData.url;

      const saveRes = await fetch('/api/branch-documentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrl,
          title: uploadTitle.trim() || null,
          caption: uploadCaption.trim() || null
        })
      });

      if (!saveRes.ok) {
        const errData = await saveRes.json();
        throw new Error(errData.error || 'Failed to save branch documentation');
      }

      setToastMessage({ type: 'success', text: `Photo uploaded successfully to ${activeBranchName} Branch!` });
      setIsUploadModalOpen(false);
      setUploadTitle('');
      setUploadCaption('');
      setSelectedFile(null);
      setImagePreviewUrl(null);
      setTargetSlot(null);
      fetchBranchDocumentation();
    } catch (err: any) {
      console.error('Error submitting branch photo:', err);
      setToastMessage({ type: 'error', text: err?.message || 'Failed to upload photo' });
    } finally {
      setIsSubmittingPhoto(false);
    }
  };

  const handleConfirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    setIsDeletingPhoto(true);

    try {
      const res = await fetch(`/api/branch-documentation/${photoToDelete.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setToastMessage({ type: 'success', text: 'Photo deleted successfully.' });
        setPhotoToDelete(null);
        fetchBranchDocumentation();
      } else {
        const errData = await res.json();
        setToastMessage({ type: 'error', text: errData.error || 'Failed to delete photo' });
      }
    } catch (err) {
      console.error('Error deleting photo:', err);
      setToastMessage({ type: 'error', text: 'An error occurred while deleting photo.' });
    } finally {
      setIsDeletingPhoto(false);
    }
  };

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/policies');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const mainRec = data.find((p: any) => p.type === 'ABOUT_MAIN');
          const purchRec = data.find((p: any) => p.type === 'ABOUT_PURCHASE');
          const downRec = data.find((p: any) => p.type === 'ABOUT_DOWNPAYMENT');
          const branchesRec = data.find((p: any) => p.type === 'ABOUT_FACEBOOK_BRANCHES');

          if (mainRec?.content) setMainText(mainRec.content);
          if (purchRec?.content) setPurchasePolicy(purchRec.content);
          if (downRec?.content) setDownpaymentPolicy(downRec.content);

          if (branchesRec?.content) {
            try {
              const parsed = JSON.parse(branchesRec.content);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setBranches(parsed);
              } else {
                setBranches(INITIAL_BRANCHES);
              }
            } catch (e) {
              console.error('Error parsing branches JSON, defaulting to initial branches:', e);
              setBranches(INITIAL_BRANCHES);
            }
          } else {
            const fbLinkRec = data.find((p: any) => p.type === 'ABOUT_FACEBOOK_LINK');
            const fbImgRec = data.find((p: any) => p.type === 'ABOUT_FACEBOOK_IMAGE');
            const fbTitleRec = data.find((p: any) => p.type === 'ABOUT_FACEBOOK_TITLE');

            if (fbLinkRec || fbImgRec || fbTitleRec) {
              setBranches([{
                id: 'branch-legacy',
                branch: 'Tagoloan',
                title: fbTitleRec?.content || 'Tagoloan Branch',
                link: fbLinkRec?.content || 'https://www.facebook.com/Graphixtagoloan',
                image: fbImgRec?.content || '/Images/storefront-bg.jpg'
              }]);
            } else {
              setBranches(INITIAL_BRANCHES);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch policies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBranch = () => {
    if (!isSuperAdmin) return;
    const newBranch: FacebookBranch = {
      id: `branch-${Date.now()}`,
      title: `Graphix Branch ${branches.length + 1}`,
      link: 'https://www.facebook.com',
      image: '/Images/storefront-bg.jpg'
    };
    setBranches([...branches, newBranch]);
  };

  const handleUpdateBranch = (id: string, key: keyof FacebookBranch, value: string) => {
    setBranches(branches.map(b => b.id === id ? { ...b, [key]: value } : b));
  };

  const handleRemoveBranch = (id: string) => {
    if (!isSuperAdmin) return;
    if (branches.length === 1) {
      setToastMessage({ type: 'error', text: 'At least one Facebook store branch must be maintained.' });
      return;
    }
    setBranches(branches.filter(b => b.id !== id));
  };

  const handleImageUpload = async (branchId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const originalFile = files[0];
    if (!originalFile) return;

    setUploadingBranchId(branchId);
    setToastMessage(null);

    try {
      const compressedBlob = await compressImageFile(originalFile);
      const originalSizeKB = Math.round(originalFile.size / 1024);
      const compressedSizeKB = Math.round(compressedBlob.size / 1024);

      const formData = new FormData();
      formData.append('file', compressedBlob, originalFile.name);
      formData.append('folder', 'facebook-banners');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          handleUpdateBranch(branchId, 'image', data.url);
          setToastMessage({ 
            type: 'success', 
            text: `Banner uploaded & compressed! (Reduced from ${originalSizeKB} KB to ${compressedSizeKB} KB)` 
          });
        }
      } else {
        const errData = await res.json();
        setToastMessage({ type: 'error', text: errData.error || 'Failed to upload image.' });
      }
    } catch (err) {
      console.error('Image upload error:', err);
      setToastMessage({ type: 'error', text: 'An error occurred during image upload.' });
    } finally {
      setUploadingBranchId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToastMessage(null);

    try {
      if (isSuperAdmin) {
        const itemsToSave = [
          { type: 'ABOUT_MAIN', content: mainText },
          { type: 'ABOUT_PURCHASE', content: purchasePolicy },
          { type: 'ABOUT_DOWNPAYMENT', content: downpaymentPolicy },
          { type: 'ABOUT_FACEBOOK_BRANCHES', content: JSON.stringify(branches) }
        ];

        const res = await fetch('/api/policies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ policies: itemsToSave })
        });

        if (res.ok) {
          setToastMessage({ type: 'success', text: 'All policies and Facebook store branches updated successfully!' });
        } else {
          const errData = await res.json();
          setToastMessage({ type: 'error', text: errData.error || 'Failed to save changes.' });
        }
      } else {
        const assignedBranchData = branches.find((b, idx) => matchBranch(b, effectiveBranch, idx)) || {
          id: `branch-${effectiveBranch.toLowerCase()}`,
          branch: effectiveBranch,
          title: `${effectiveBranch} Branch`,
          link: 'https://www.facebook.com',
          image: '/Images/storefront-bg.jpg'
        };

        const res = await fetch('/api/policies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'ABOUT_FACEBOOK_BRANCHES',
            branchData: assignedBranchData
          })
        });

        if (res.ok) {
          const data = await res.json();
          setToastMessage({ 
            type: 'success', 
            text: data.message || `Facebook storefront for ${effectiveBranch} Branch saved successfully!` 
          });
          fetchPolicies();
        } else {
          const errData = await res.json();
          setToastMessage({ type: 'error', text: errData.error || 'Failed to save branch details.' });
        }
      }
    } catch (err) {
      console.error('Failed to save policies:', err);
      setToastMessage({ type: 'error', text: 'An error occurred while saving policies.' });
    } finally {
      setSaving(false);
    }
  };

  // Customer Preview Render Helper
  const renderCustomerSimulation = () => {
    return (
      <div className={`flex flex-col gap-6 w-full ${previewDevice === 'mobile' ? 'max-w-md mx-auto shadow-2xl rounded-3xl p-4 bg-white border border-gray-200' : 'w-full'}`}>
        
        {/* Preview Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Live Customer View</span>
          </div>
          <span className="text-[11px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
            {previewDevice === 'mobile' ? 'Mobile View' : 'Desktop View'}
          </span>
        </div>

        {/* 1. Our Branches Showcase */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-purple-100/90 flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b border-purple-100/80 pb-4">
            <div className="w-10 h-10 bg-purple-50 rounded-2xl flex justify-center items-center border border-purple-100/80 text-[#8b00cc] shadow-sm shrink-0">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-gray-900 uppercase tracking-wide m-0">Our Branches Showcase</h3>
              <p className="text-xs text-gray-500 font-medium m-0 mt-0.5">Explore authentic photos and repair workspaces</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {['Tagoloan', 'Villanueva', 'Jasaan'].map((b) => (
              <div key={b} className="group rounded-2xl overflow-hidden border border-purple-100 shadow-xs bg-gray-50 flex flex-col">
                <div className="h-28 sm:h-32 bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-400 relative overflow-hidden">
                  {b.toLowerCase() === activeBranchName.toLowerCase() && branchPhotos.length > 0 ? (
                    <img src={branchPhotos[0]?.photoUrl} alt={b} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-400">
                      <Camera size={20} />
                      <span className="text-[11px] font-semibold">{b} Showcase</span>
                    </div>
                  )}
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-[10px] font-bold rounded-md backdrop-blur-xs">
                    {b} Branch
                  </span>
                </div>
                <div className="p-2.5 text-center bg-white border-t border-purple-50">
                  <span className="text-xs font-bold text-gray-800 truncate block">{b} Branch Store</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. About this website */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-purple-100/90 flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b border-purple-100/80 pb-4">
            <div className="w-10 h-10 bg-purple-50 rounded-2xl flex justify-center items-center border border-purple-100/80 text-[#8b00cc] shadow-sm shrink-0">
              <Info size={20} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-gray-900 uppercase tracking-wide m-0">About this website</h3>
              <p className="text-xs text-gray-500 font-medium m-0 mt-0.5">Overview of Graphix electronics management</p>
            </div>
          </div>
          <div className="bg-purple-50/30 rounded-2xl p-4 sm:p-5 border border-purple-100/70">
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed m-0 font-normal whitespace-pre-wrap">
              {mainText || 'No main description configured.'}
            </p>
          </div>
        </div>

        {/* 3. Policies */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-purple-100/90 flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b border-purple-100/80 pb-4">
            <div className="w-10 h-10 bg-purple-50 rounded-2xl flex justify-center items-center border border-purple-100/80 text-[#8b00cc] shadow-sm shrink-0">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-gray-900 uppercase tracking-wide m-0">Purchase & Downpayment Policy</h3>
              <p className="text-xs text-gray-500 font-medium m-0 mt-0.5">Important guidelines for online & in-store customers</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-2xl p-4 border border-purple-100/90 shadow-xs flex items-start gap-3">
              <div className="p-2.5 bg-purple-50 rounded-xl shadow-xs border border-purple-100 text-[#8b00cc] shrink-0">
                <CreditCard size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 m-0">Full Online Purchase Policy</h4>
                <p className="text-xs text-gray-600 leading-relaxed m-0 whitespace-pre-wrap">
                  {purchasePolicy}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-xs flex items-start gap-3">
              <div className="p-2.5 bg-amber-50 rounded-xl shadow-xs border border-amber-200 text-amber-600 shrink-0">
                <Store size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 m-0">Downpayment Information Notice</h4>
                <p className="text-xs text-gray-600 leading-relaxed m-0 whitespace-pre-wrap">
                  {downpaymentPolicy}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Facebook Store Branches */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-purple-100/90 flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b border-purple-100/80 pb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-2xl flex justify-center items-center border border-blue-100 text-blue-600 shadow-sm shrink-0">
              <Facebook size={20} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-gray-900 uppercase tracking-wide m-0">Our Facebook Store Branches</h3>
              <p className="text-xs text-gray-500 font-medium m-0 mt-0.5">Visit official Facebook pages for each branch</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {branches.map((b) => (
              <div key={b.id} className="border border-purple-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all bg-white flex flex-col">
                <div className="relative w-full h-36 overflow-hidden block">
                  <img
                    src={b.image || '/Images/storefront-bg.jpg'}
                    alt={b.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).setAttribute('src', '/Images/storefront-bg.jpg');
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-3.5 text-white">
                    <span className="text-xs sm:text-sm font-black drop-shadow-md flex items-center gap-1.5">
                      {b.title} <ArrowUpRight size={14} />
                    </span>
                    <span className="text-[10px] text-gray-200 truncate mt-0.5 font-medium">
                      {b.link}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="flex-1 p-3 sm:p-6 md:p-8 font-['Inter'] bg-[#f8f9fc] min-h-screen overflow-y-auto">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">

        {/* Top Header Card */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-xs border border-purple-100/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-[#bd00ff] text-white rounded-2xl flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
              <FileText size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 m-0 tracking-tight">About Page & Showcase Editor</h1>
                {isSuperAdmin ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-[#bd00ff] border border-purple-200 text-xs font-black rounded-full shadow-2xs">
                    <ShieldCheck size={13} className="text-[#bd00ff]" /> Super Admin • Network Control
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black rounded-full shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <Building2 size={13} className="text-emerald-600" /> {effectiveBranch} Branch Admin
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-xs sm:text-sm font-medium m-0 mt-1">
                Customize website policies, Facebook storefront links, and manage the 8-photo branch documentation showcase.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-gray-100 p-1 rounded-2xl border border-gray-200/80">
              <button
                type="button"
                onClick={() => setViewMode('editor')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border-none cursor-pointer ${
                  viewMode === 'editor'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 bg-transparent'
                }`}
                title="Editor Mode"
              >
                <Edit3 size={14} />
                <span className="hidden sm:inline">Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border-none cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 bg-transparent'
                }`}
                title="Split Screen View"
              >
                <Columns size={14} />
                <span className="hidden sm:inline">Split</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border-none cursor-pointer ${
                  viewMode === 'preview'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 bg-transparent'
                }`}
                title="Live Customer Preview"
              >
                <Eye size={14} />
                <span className="hidden sm:inline">Preview</span>
              </button>
            </div>

            <button
              type="button"
              onClick={fetchPolicies}
              disabled={loading || saving}
              className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-xl border border-gray-200 transition-all flex items-center gap-1.5 text-xs shadow-2xs cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-[#bd00ff]" : ""} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="px-5 py-2 bg-gradient-to-r from-purple-700 to-[#bd00ff] hover:brightness-110 text-white font-extrabold rounded-xl shadow-md shadow-purple-500/25 transition-all flex items-center gap-2 text-xs border-none cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 border shadow-xs animate-in fade-in duration-200 ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}>
            {toastMessage.type === 'success' ? (
              <CheckCircle size={20} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={20} className="text-rose-600 shrink-0" />
            )}
            <span className="font-bold text-xs sm:text-sm">{toastMessage.text}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-auto p-1 text-gray-400 hover:text-gray-600 rounded-lg border-none bg-transparent cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Main Content Layout based on viewMode */}
        <div className={`grid gap-6 ${viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>

          {/* LEFT/MAIN: EDITOR CANVAS */}
          {viewMode !== 'preview' && (
            <div className="flex flex-col gap-6">

              {/* Segmented Workspace Tabs Navigation */}
              <div className="bg-white p-2 rounded-2xl border border-purple-100 shadow-2xs flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab('showcase')}
                  className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all border-none cursor-pointer flex items-center justify-center gap-2 ${
                    activeTab === 'showcase'
                      ? 'bg-gradient-to-r from-purple-900 to-indigo-900 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-purple-50 bg-transparent'
                  }`}
                >
                  <Camera size={16} className={activeTab === 'showcase' ? 'text-purple-300' : 'text-purple-600'} />
                  <span>Branch Showcase</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === 'showcase' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {slotsCount}/8
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('facebook')}
                  className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all border-none cursor-pointer flex items-center justify-center gap-2 ${
                    activeTab === 'facebook'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-blue-50 bg-transparent'
                  }`}
                >
                  <Facebook size={16} className={activeTab === 'facebook' ? 'text-white' : 'text-blue-600'} />
                  <span>Facebook Storefront</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('policies')}
                  className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all border-none cursor-pointer flex items-center justify-center gap-2 ${
                    activeTab === 'policies'
                      ? 'bg-gradient-to-r from-purple-700 to-[#bd00ff] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-purple-50 bg-transparent'
                  }`}
                >
                  <FileText size={16} className={activeTab === 'policies' ? 'text-white' : 'text-[#bd00ff]'} />
                  <span>Company Policies</span>
                  {!isSuperAdmin && (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-gray-200 text-gray-700">
                      Reference
                    </span>
                  )}
                </button>
              </div>

              {/* TAB 1: BRANCH PHOTO SHOWCASE (8 SLOTS) */}
              {activeTab === 'showcase' && (
                <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-purple-100/80 flex flex-col gap-6 animate-in fade-in duration-150">
                  
                  {/* Tab Header with Branch Indicator and Progress Meter */}
                  <div className="flex flex-col gap-4 border-b border-gray-100 pb-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-lg sm:text-xl font-black text-gray-900 m-0">
                            Branch Documentation Showcase
                          </h2>
                          <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-bold">
                            {activeBranchName} Branch
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium m-0 mt-1">
                          Photos uploaded here appear directly in the Branch Showcase on the customer homepage. (Maximum 8 slots per branch).
                        </p>
                      </div>

                      {!isSuperAdmin && (
                        <button
                          type="button"
                          disabled={slotsCount >= 8}
                          onClick={() => {
                            if (slotsCount >= 8) {
                              setToastMessage({ type: 'error', text: 'Maximum limit of 8 images reached. Delete an existing photo to upload a new one.' });
                              return;
                            }
                            setTargetSlot(slotsCount + 1);
                            setIsUploadModalOpen(true);
                            setSelectedFile(null);
                            setImagePreviewUrl(null);
                            setUploadTitle('');
                            setUploadCaption('');
                          }}
                          className={`px-4 py-2 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border-none shadow-xs shrink-0 ${
                            slotsCount >= 8
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-purple-700 to-[#bd00ff] hover:brightness-110 text-white cursor-pointer shadow-purple-500/20'
                          }`}
                        >
                          <Plus size={16} />
                          <span>{slotsCount >= 8 ? 'Showcase Full (8/8)' : 'Upload New Photo'}</span>
                        </button>
                      )}
                    </div>

                    {/* Super Admin Multi-Branch Switcher Tabs */}
                    {isSuperAdmin && (
                      <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-purple-950">
                          <ShieldCheck size={16} className="text-[#bd00ff]" />
                          <span>Select branch showcase to inspect:</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-purple-200 shadow-2xs">
                          {['Tagoloan', 'Villanueva', 'Jasaan'].map((b) => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => setSuperAdminSelectedBranch(b)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border-none cursor-pointer ${
                                superAdminSelectedBranch.toLowerCase() === b.toLowerCase()
                                  ? 'bg-[#bd00ff] text-white shadow-xs'
                                  : 'text-gray-600 hover:text-gray-900 bg-transparent'
                              }`}
                            >
                              {b} Branch
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Visual Progress Bar */}
                    <div className="flex flex-col gap-2 pt-1">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                        <span className="flex items-center gap-1.5">
                          <Camera size={14} className="text-[#bd00ff]" />
                          <span>Showcase Capacity: <strong className="text-purple-950 font-black">{slotsCount} / 8 slots filled</strong></span>
                        </span>
                        <span className="text-purple-700 font-extrabold">
                          {slotsRemaining > 0 ? `${slotsRemaining} slot(s) remaining` : 'Showcase gallery complete'}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200/80">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-600 via-purple-700 to-[#bd00ff] rounded-full transition-all duration-500"
                          style={{ width: `${percentFilled}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 8-SLOT INTERACTIVE GRID */}
                  {isLoadingPhotos ? (
                    <div className="flex flex-col justify-center items-center py-16 gap-3">
                      <Loader2 size={32} className="animate-spin text-[#bd00ff]" />
                      <span className="text-xs font-bold text-gray-500">Loading {activeBranchName} documentation photos...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {showcaseSlots.map(({ slotNumber, photo }) => {
                        const isFeaturedCover = slotNumber === 1;

                        if (photo) {
                          return (
                            <div 
                              key={photo.id}
                              className={`group relative bg-white rounded-2xl overflow-hidden border transition-all duration-200 flex flex-col shadow-xs hover:shadow-md ${
                                isFeaturedCover 
                                  ? 'border-purple-300 ring-2 ring-purple-100' 
                                  : 'border-gray-200 hover:border-purple-300'
                              }`}
                            >
                              {/* Image Container */}
                              <div 
                                className="relative aspect-video sm:aspect-4/3 w-full overflow-hidden bg-gray-100 cursor-pointer"
                                onClick={() => setPhotoToView(photo)}
                              >
                                <img 
                                  src={photo.photoUrl} 
                                  alt={photo.title || `Slot ${slotNumber}`} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />

                                {/* Slot Badge */}
                                <div className="absolute top-2.5 left-2.5 z-10">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs ${
                                    isFeaturedCover 
                                      ? 'bg-purple-900/90 text-white border border-purple-400/50' 
                                      : 'bg-black/70 text-white'
                                  }`}>
                                    {isFeaturedCover ? '⭐ Slot 1 • Cover' : `Slot ${slotNumber}`}
                                  </span>
                                </div>

                                {/* Hover Actions Overlay */}
                                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setPhotoToView(photo); }}
                                    className="p-2 bg-white/95 hover:bg-white text-gray-900 rounded-xl shadow-md border-none cursor-pointer transition-transform hover:scale-110"
                                    title="View Photo Lightbox"
                                  >
                                    <Eye size={15} className="text-purple-700" />
                                  </button>
                                  {!isSuperAdmin && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setPhotoToDelete(photo); }}
                                      className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md border-none cursor-pointer transition-transform hover:scale-110"
                                      title="Delete Photo"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Card Meta Content */}
                              <div className="p-3 flex flex-col gap-1 bg-white border-t border-gray-100">
                                <span className="font-black text-xs text-gray-900 truncate">
                                  {photo.title || `${activeBranchName} Photo`}
                                </span>
                                {photo.caption ? (
                                  <span className="text-[11px] text-gray-500 line-clamp-1 font-medium">
                                    {photo.caption}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-gray-400 italic">No caption</span>
                                )}
                                <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium pt-1 border-t border-gray-50 mt-1">
                                  <span>{new Date(photo.createdAt).toLocaleDateString()}</span>
                                  {isFeaturedCover && (
                                    <span className="text-purple-600 font-bold">Homepage Primary</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // EMPTY SLOT
                        return (
                          <div
                            key={`empty-${slotNumber}`}
                            onClick={() => {
                              if (isSuperAdmin) return;
                              setTargetSlot(slotNumber);
                              setIsUploadModalOpen(true);
                              setSelectedFile(null);
                              setImagePreviewUrl(null);
                              setUploadTitle('');
                              setUploadCaption('');
                            }}
                            className={`rounded-2xl border-2 border-dashed p-4 flex flex-col items-center justify-center gap-2 text-center transition-all ${
                              isSuperAdmin
                                ? 'border-gray-200 bg-gray-50/50 text-gray-400'
                                : 'border-purple-200 hover:border-[#bd00ff] bg-purple-50/20 hover:bg-purple-50/50 cursor-pointer shadow-2xs hover:shadow-xs group'
                            } min-h-[190px]`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                              isSuperAdmin ? 'bg-gray-100 text-gray-400' : 'bg-purple-100 text-[#bd00ff]'
                            }`}>
                              <Plus size={20} strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-extrabold text-xs text-gray-800">
                                {isFeaturedCover ? 'Add Cover Photo' : `Add Photo`}
                              </span>
                              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                                {isFeaturedCover ? 'Slot 1 (Featured)' : `Slot ${slotNumber}`}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium">
                              {isSuperAdmin ? 'Empty slot' : 'Click to upload'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              )}

              {/* TAB 2: FACEBOOK STOREFRONT */}
              {activeTab === 'facebook' && (
                <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-purple-100/80 flex flex-col gap-6 animate-in fade-in duration-150">
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <Facebook size={22} className="text-blue-600 shrink-0" />
                        <h2 className="text-lg sm:text-xl font-black text-gray-900 m-0">
                          {isSuperAdmin ? 'Facebook Store Branches' : `Facebook Storefront — ${effectiveBranch} Branch`}
                        </h2>
                      </div>
                      <p className="text-xs text-gray-500 font-medium m-0 mt-1">
                        Configure the official Facebook branch page URL, title, and banner shown in the customer about section.
                      </p>
                    </div>

                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={handleAddBranch}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border-none cursor-pointer shadow-xs shrink-0"
                      >
                        <Plus size={16} /> Add Store Branch
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-6">
                    {(isSuperAdmin 
                      ? branches 
                      : (branches.filter((b, idx) => matchBranch(b, effectiveBranch, idx)).length > 0
                          ? branches.filter((b, idx) => matchBranch(b, effectiveBranch, idx))
                          : [{
                              id: `branch-${effectiveBranch.toLowerCase()}`,
                              branch: effectiveBranch,
                              title: `${effectiveBranch} Branch`,
                              link: 'https://www.facebook.com',
                              image: '/Images/storefront-bg.jpg'
                            }]
                        )
                    ).map((branch, idx) => (
                      <div key={branch.id} className="bg-gradient-to-br from-blue-50/40 via-white to-purple-50/20 p-5 rounded-2xl border border-blue-100/80 flex flex-col gap-4 shadow-xs">
                        
                        <div className="flex items-center justify-between border-b border-blue-100/60 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                            <span className="font-black text-xs text-blue-900 uppercase tracking-wide">
                              {isSuperAdmin ? `Store Branch #${idx + 1}` : `${effectiveBranch} Branch Storefront`}
                            </span>
                          </div>
                          {isSuperAdmin && branches.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveBranch(branch.id)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border-none cursor-pointer"
                              title="Delete Branch"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        {/* Banner Preview & Input Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                          
                          {/* Banner Live Card Mockup (5 cols) */}
                          <div className="lg:col-span-5 flex flex-col gap-2">
                            <label className="text-[11px] font-bold text-gray-600 uppercase flex items-center justify-between">
                              <span>Banner Live Mockup</span>
                              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                <Sparkles size={11} /> Auto-Compressed
                              </span>
                            </label>

                            <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-gray-200 shadow-xs group bg-gray-100">
                              <img
                                src={branch.image || '/Images/storefront-bg.jpg'}
                                alt="Banner"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={(e) => {
                                  (e.target as HTMLElement).setAttribute('src', '/Images/storefront-bg.jpg');
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-4 text-white">
                                <span className="text-xs font-black drop-shadow-md">
                                  {branch.title || 'Branch Title'}
                                </span>
                                <span className="text-[10px] text-gray-200 truncate mt-0.5">
                                  {branch.link || 'https://facebook.com/...'}
                                </span>
                              </div>
                            </div>

                            <label className={`cursor-pointer w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border shadow-xs transition-all ${
                              uploadingBranchId === branch.id 
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                            }`}>
                              {uploadingBranchId === branch.id ? (
                                <>
                                  <Loader2 size={15} className="animate-spin" />
                                  <span>Compressing & Uploading Banner...</span>
                                </>
                              ) : (
                                <>
                                  <Upload size={15} />
                                  <span>Upload New Banner Image</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                disabled={uploadingBranchId === branch.id}
                                onChange={(e) => handleImageUpload(branch.id, e)}
                                className="hidden"
                              />
                            </label>
                          </div>

                          {/* Inputs (7 cols) */}
                          <div className="lg:col-span-7 flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-gray-700 uppercase">Branch Title / Label</label>
                              <input
                                type="text"
                                value={branch.title}
                                onChange={(e) => handleUpdateBranch(branch.id, 'title', e.target.value)}
                                className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-xs font-semibold text-gray-900 shadow-xs"
                                placeholder="E.g., Graphix Tagoloan Branch"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-gray-700 uppercase">Facebook Page Link</label>
                                {branch.link && (
                                  <a
                                    href={branch.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    Test Link <ArrowUpRight size={12} />
                                  </a>
                                )}
                              </div>
                              <input
                                type="url"
                                value={branch.link}
                                onChange={(e) => handleUpdateBranch(branch.id, 'link', e.target.value)}
                                className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-xs font-semibold text-gray-900 shadow-xs"
                                placeholder="https://www.facebook.com/Graphixtagoloan"
                              />
                            </div>

                            <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                              <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                              <span className="leading-relaxed">
                                When a customer clicks on this branch card in the about page or homepage, it directly directs them to this verified Facebook store URL.
                              </span>
                            </div>
                          </div>

                        </div>

                      </div>
                    ))}
                  </div>

                </div>
              )}

              {/* TAB 3: COMPANY POLICIES & OVERVIEW */}
              {activeTab === 'policies' && (
                <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-purple-100/80 flex flex-col gap-6 animate-in fade-in duration-150">
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText size={22} className="text-[#bd00ff] shrink-0" />
                        <h2 className="text-lg sm:text-xl font-black text-gray-900 m-0">
                          Company Policies & Platform Overview
                        </h2>
                      </div>
                      <p className="text-xs text-gray-500 font-medium m-0 mt-1">
                        Customer-facing website description, full online purchase guidelines, and in-store downpayment notice.
                      </p>
                    </div>

                    {!isSuperAdmin && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 border border-gray-200 text-xs font-bold rounded-xl shrink-0">
                        <Lock size={13} className="text-gray-400" /> Super Admin Managed
                      </span>
                    )}
                  </div>

                  {/* Branch Admin Informational Banner */}
                  {!isSuperAdmin && (
                    <div className="p-4 bg-purple-50/60 border border-purple-200/80 rounded-2xl flex items-start gap-3">
                      <div className="p-2 bg-white rounded-xl text-[#bd00ff] shadow-xs shrink-0">
                        <Info size={18} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-black text-purple-950">Company Policy Reference</span>
                        <p className="text-xs text-purple-900/80 m-0 leading-relaxed font-medium">
                          These platform policies apply across all Graphix branches (Tagoloan, Villanueva, and Jasaan). Only the Super Admin can edit them to ensure operational and legal consistency. As a Branch Admin, you can reference them below when assisting walk-in or online customers.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Section 1: Main Platform Description */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                        <Info size={15} className="text-[#bd00ff]" /> Customer Page Main About Text
                      </label>
                      <span className="text-[11px] text-gray-400 font-semibold">{mainText.length} characters</span>
                    </div>
                    {isSuperAdmin ? (
                      <textarea
                        rows={6}
                        value={mainText}
                        onChange={(e) => setMainText(e.target.value)}
                        className="w-full p-4 border border-gray-200 rounded-2xl outline-none text-xs sm:text-sm font-medium leading-relaxed resize-y bg-white text-gray-900 focus:border-[#bd00ff] focus:ring-2 focus:ring-purple-100 shadow-xs"
                        placeholder="Enter main platform description..."
                      />
                    ) : (
                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
                        {mainText}
                      </div>
                    )}
                  </div>

                  {/* Section 2: Online Purchase Policy */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                        <CreditCard size={15} className="text-purple-600" /> Full Online Purchase Policy
                      </label>
                      <span className="text-[11px] text-gray-400 font-semibold">{purchasePolicy.length} characters</span>
                    </div>
                    {isSuperAdmin ? (
                      <textarea
                        rows={3}
                        value={purchasePolicy}
                        onChange={(e) => setPurchasePolicy(e.target.value)}
                        className="w-full p-4 border border-gray-200 rounded-2xl outline-none text-xs sm:text-sm font-medium leading-relaxed resize-y bg-white text-gray-900 focus:border-[#bd00ff] focus:ring-2 focus:ring-purple-100 shadow-xs"
                        placeholder="Enter online purchase statement..."
                      />
                    ) : (
                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
                        {purchasePolicy}
                      </div>
                    )}
                  </div>

                  {/* Section 3: Downpayment Notice */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                        <Store size={15} className="text-amber-600" /> Downpayment & In-Store Notice
                      </label>
                      <span className="text-[11px] text-gray-400 font-semibold">{downpaymentPolicy.length} characters</span>
                    </div>
                    {isSuperAdmin ? (
                      <textarea
                        rows={5}
                        value={downpaymentPolicy}
                        onChange={(e) => setDownpaymentPolicy(e.target.value)}
                        className="w-full p-4 border border-gray-200 rounded-2xl outline-none text-xs sm:text-sm font-medium leading-relaxed resize-y bg-white text-gray-900 focus:border-[#bd00ff] focus:ring-2 focus:ring-purple-100 shadow-xs"
                        placeholder="Enter in-store downpayment advisory..."
                      />
                    ) : (
                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
                        {downpaymentPolicy}
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          )}

          {/* RIGHT / PREVIEW: LIVE CUSTOMER PREVIEW SIMULATOR */}
          {(viewMode === 'split' || viewMode === 'preview') && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-purple-100 shadow-xs">
                <div className="flex items-center gap-2">
                  <ImageIcon size={18} className="text-[#bd00ff]" />
                  <span className="font-extrabold text-gray-900 text-xs sm:text-sm uppercase tracking-wider">
                    Customer Experience Simulation
                  </span>
                </div>
                
                {/* Device Selector */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1.5 rounded-lg border-none cursor-pointer transition-colors ${
                      previewDevice === 'desktop' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900 bg-transparent'
                    }`}
                    title="Desktop Preview"
                  >
                    <Monitor size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1.5 rounded-lg border-none cursor-pointer transition-colors ${
                      previewDevice === 'mobile' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900 bg-transparent'
                    }`}
                    title="Mobile Preview"
                  >
                    <Smartphone size={15} />
                  </button>
                </div>
              </div>

              <div className="bg-[#f0f2f7] p-4 sm:p-6 rounded-3xl border border-gray-200 shadow-inner max-h-[85vh] overflow-y-auto custom-scrollbar">
                {renderCustomerSimulation()}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Upload Branch Photo Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-100 flex flex-col gap-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 text-[#bd00ff] rounded-2xl flex items-center justify-center border border-purple-100 shrink-0">
                  <Camera size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-gray-900 m-0">Upload Showcase Photo</h3>
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-purple-50 text-[#bd00ff] border border-purple-200">
                      Slot {targetSlot || slotsCount + 1} of 8
                    </span>
                  </div>
                  <span className="text-xs font-bold text-gray-500">
                    {activeBranchName} Branch • {slotsRemaining} slot(s) remaining
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition border-none cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {slotsCount >= 8 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col gap-2 text-amber-900 text-xs">
                <span className="font-black text-sm">Maximum 8 Slots Reached</span>
                <span>This branch showcase has already reached the maximum 8 photos. Please delete an existing photo from the showcase grid before adding a new one.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitPhoto} className="flex flex-col gap-4">
                
                {/* File Dropzone */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 uppercase">Select Photo *</label>
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <Sparkles size={11} /> Auto-Compressed
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-purple-200 hover:border-[#bd00ff] rounded-2xl p-4 bg-purple-50/20 transition-colors">
                    {imagePreviewUrl ? (
                      <div className="relative w-full h-48 rounded-xl overflow-hidden bg-black/5 flex items-center justify-center">
                        <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => { setSelectedFile(null); setImagePreviewUrl(null); }}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg transition cursor-pointer border-none"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-2 cursor-pointer py-6 w-full">
                        <Upload size={32} className="text-[#bd00ff]" />
                        <span className="text-xs font-bold text-gray-800">Click to choose image file</span>
                        <span className="text-[10px] text-gray-400 font-medium">Supports JPG, PNG, WEBP (Max 1200px auto-optimized)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase">Photo Title (Optional)</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="E.g., Clean Repair Counter & Storefront"
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#bd00ff] text-xs font-semibold text-gray-900 shadow-2xs"
                  />
                </div>

                {/* Caption */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase">Short Description (Optional)</label>
                  <textarea
                    rows={2}
                    value={uploadCaption}
                    onChange={(e) => setUploadCaption(e.target.value)}
                    placeholder="E.g., High-precision microscope repair tools at Tagoloan."
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#bd00ff] text-xs font-medium text-gray-900 resize-none shadow-2xs"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    disabled={isSubmittingPhoto}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition border-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPhoto || !selectedFile}
                    className="px-5 py-2 bg-gradient-to-r from-purple-700 to-[#bd00ff] hover:brightness-110 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-2 border-none cursor-pointer disabled:opacity-50 shadow-md shadow-purple-500/20"
                  >
                    {isSubmittingPhoto ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={15} />
                        <span>Upload to {activeBranchName}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {photoToView && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPhotoToView(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-[#bd00ff]" />
                <span className="font-black text-sm text-gray-900">{photoToView.branch} Branch Showcase</span>
              </div>
              <button
                type="button"
                onClick={() => setPhotoToView(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg border-none bg-transparent cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[60vh] bg-black flex items-center justify-center overflow-hidden">
              <img src={photoToView.photoUrl} alt={photoToView.title || 'Photo'} className="max-h-[60vh] w-auto object-contain" />
            </div>
            <div className="p-5 flex flex-col gap-2 bg-white">
              <h4 className="font-extrabold text-base text-gray-900 m-0">
                {photoToView.title || `${photoToView.branch} Branch Photo`}
              </h4>
              {photoToView.caption && (
                <p className="text-xs text-gray-600 m-0 leading-relaxed font-medium">
                  {photoToView.caption}
                </p>
              )}
              <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100 mt-2 font-medium">
                <span>Uploaded: {new Date(photoToView.createdAt).toLocaleString()}</span>
                {photoToView.uploadedBy && <span>By: {photoToView.uploadedBy}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {photoToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-gray-100 flex flex-col gap-4 text-center animate-in zoom-in-95">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 size={26} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 m-0">Delete Showcase Photo?</h3>
              <p className="text-xs text-gray-500 mt-1.5 m-0 leading-relaxed font-medium">
                Are you sure you want to delete this photo from <strong>{photoToDelete.branch} Branch</strong>? This slot will immediately become empty and available for a new photo.
              </p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => setPhotoToDelete(null)}
                disabled={isDeletingPhoto}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition border-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePhoto}
                disabled={isDeletingPhoto}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/20"
              >
                {isDeletingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>Delete Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
