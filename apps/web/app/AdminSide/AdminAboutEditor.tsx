"use client";

import React, { useState, useEffect } from 'react';
import { 
  FileText, Save, Info, ShoppingBag, Store, CreditCard, 
  Facebook, Image as ImageIcon, ExternalLink, CheckCircle, AlertCircle, RefreshCw,
  Plus, Trash2, Building2, Upload, Loader2, Link as LinkIcon, Zap, Camera, Eye, X, ChevronLeft, ChevronRight, ShieldCheck
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

/**
 * Match a branch entry by branch field, title, id, or index
 */
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

/**
 * Client-side image compression helper using HTML Canvas
 * Resizes large images to max 1200px width and compresses JPEG quality to 75%
 * drastically reducing upload size before sending to server/Cloudinary.
 */
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
              resolve(file); // fallback to original if compression didn't save size
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
      // 1. Compress image client-side
      const compressedBlob = await compressImageFile(selectedFile);
      const formData = new FormData();
      formData.append('file', compressedBlob, selectedFile.name);
      formData.append('folder', `branch-documentation/${effectiveBranch.toLowerCase()}`);

      // 2. Upload to Cloudinary
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

      // 3. Save documentation record in DB
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

      setToastMessage({ type: 'success', text: `Photo uploaded successfully to ${effectiveBranch} Branch!` });
      setIsUploadModalOpen(false);
      setUploadTitle('');
      setUploadCaption('');
      setSelectedFile(null);
      setImagePreviewUrl(null);
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
            // Check legacy fields
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
      // Compress image client-side first
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
            text: `Image uploaded & compressed! (Reduced from ${originalSizeKB} KB to ${compressedSizeKB} KB)` 
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
        // Super Admin: Full Save for all policies and all branches
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
          setToastMessage({ type: 'success', text: 'About page contents and all Facebook store branches updated successfully!' });
        } else {
          const errData = await res.json();
          setToastMessage({ type: 'error', text: errData.error || 'Failed to save changes.' });
        }
      } else {
        // Branch Admin: Save ONLY the assigned branch Facebook store details
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
            text: data.message || `Facebook store details for ${effectiveBranch} Branch updated successfully!` 
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

  return (
    <div className="flex-1 p-4 sm:p-8 font-['Inter'] bg-[#f4f5f7] min-h-screen overflow-y-auto">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-50 text-[#bd00ff] rounded-xl flex items-center justify-center border border-purple-100 shrink-0">
              <FileText size={28} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 m-0 tracking-tight">About Page Editor</h1>
              <p className="text-gray-500 text-sm font-medium m-0 mt-1">Customize website text, policies, and upload auto-compressed banner images for Facebook store branches.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchPolicies}
              disabled={loading || saving}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all flex items-center gap-2 text-sm border-none cursor-pointer"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="px-6 py-2.5 bg-[#bd00ff] hover:bg-[#9c00d6] text-white font-extrabold rounded-xl shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2 text-sm border-none cursor-pointer disabled:opacity-50"
            >
              <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className={`p-4 rounded-xl flex items-center gap-3 border shadow-sm ${toastMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
            {toastMessage.type === 'success' ? <CheckCircle size={20} className="text-emerald-600 shrink-0" /> : <AlertCircle size={20} className="text-red-600 shrink-0" />}
            <span className="font-semibold text-sm">{toastMessage.text}</span>
          </div>
        )}

        {/* Editor Form & Live Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left Column: Form Controls */}
          <div className="flex flex-col gap-6">
            
            {/* Section 0: Branch Documentation */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-[#bd00ff] font-bold text-lg">
                  <Camera size={22} />
                  <span>
                    {isSuperAdmin 
                      ? 'Branch Documentation' 
                      : `Branch Documentation — ${effectiveBranch} Branch`}
                  </span>
                  <span className="ml-1.5 px-2.5 py-0.5 bg-purple-50 text-[#bd00ff] border border-purple-200 text-xs font-extrabold rounded-full">
                    {branchPhotos.length}/8 Photos
                  </span>
                </div>
                {isSuperAdmin ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-[#bd00ff] border border-purple-200 text-xs font-bold rounded-full">
                    <ShieldCheck size={14} /> Super Admin (View Only)
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={branchPhotos.length >= 8}
                    onClick={() => {
                      if (branchPhotos.length >= 8) {
                        setToastMessage({ type: 'error', text: 'Maximum limit of 8 images reached for this branch. Please delete an existing photo first.' });
                        return;
                      }
                      setIsUploadModalOpen(true);
                      setSelectedFile(null);
                      setImagePreviewUrl(null);
                      setUploadTitle('');
                      setUploadCaption('');
                    }}
                    className={`px-3.5 py-1.5 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border-none shadow-sm ${
                      branchPhotos.length >= 8
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-[#bd00ff] hover:bg-[#9c00d6] text-white cursor-pointer'
                    }`}
                    title={branchPhotos.length >= 8 ? "Maximum of 8 photos reached" : "Upload Photo"}
                  >
                    <Plus size={16} /> {branchPhotos.length >= 8 ? 'Max Limit (8/8)' : 'Upload Photo'}
                  </button>
                )}
              </div>

              <p className="text-gray-500 text-xs font-medium m-0 leading-relaxed">
                {isSuperAdmin 
                  ? 'Browse uploaded photos and documentation representing each branch across the Graphix network (Maximum of 8 images per branch). Super Admin has view-only access.'
                  : `Upload and manage photos that represent your assigned Graphix branch (Maximum of 8 images per branch, ${Math.max(0, 8 - branchPhotos.length)} slot(s) remaining). These photos will appear in the Branch Showcase on the customer homepage.`}
              </p>

              {/* Super Admin Branch Switcher Tabs */}
              {isSuperAdmin && (
                <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-xl border border-gray-200">
                  {['Tagoloan', 'Villanueva', 'Jasaan'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setSuperAdminSelectedBranch(b)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all border-none cursor-pointer ${
                        superAdminSelectedBranch.toLowerCase() === b.toLowerCase()
                          ? 'bg-[#bd00ff] text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 bg-transparent'
                      }`}
                    >
                      {b} Branch
                    </button>
                  ))}
                </div>
              )}

              {/* Photos Gallery */}
              {isLoadingPhotos ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 size={28} className="animate-spin text-[#bd00ff]" />
                </div>
              ) : branchPhotos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {branchPhotos.map((photo) => (
                    <div 
                      key={photo.id}
                      className="group relative bg-gray-50 rounded-xl overflow-hidden border border-gray-200 hover:border-purple-300 transition-all flex flex-col"
                    >
                      <div 
                        className="relative aspect-video w-full overflow-hidden bg-gray-200 cursor-pointer"
                        onClick={() => setPhotoToView(photo)}
                      >
                        <img 
                          src={photo.photoUrl} 
                          alt={photo.title || 'Branch photo'} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setPhotoToView(photo); }}
                            className="p-1.5 bg-white/90 hover:bg-white text-gray-900 rounded-lg shadow-sm border-none cursor-pointer"
                            title="View Photo"
                          >
                            <Eye size={14} />
                          </button>
                          {!isSuperAdmin && (
                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setPhotoToDelete(photo); }}
                              className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm border-none cursor-pointer"
                              title="Delete Photo"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="p-2.5 flex flex-col gap-1 bg-white">
                        <span className="font-bold text-xs text-gray-900 truncate">
                          {photo.title || `${photo.branch} Photo`}
                        </span>
                        {photo.caption && (
                          <span className="text-[10px] text-gray-500 line-clamp-1">
                            {photo.caption}
                          </span>
                        )}
                        <span className="text-[9px] text-gray-400">
                          {new Date(photo.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center gap-2">
                  <Camera size={32} className="text-gray-300" />
                  <span className="text-xs font-bold text-gray-500">
                    No branch photos uploaded yet for {isSuperAdmin ? `${superAdminSelectedBranch} Branch` : `${effectiveBranch} Branch`}.
                  </span>
                  {!isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setIsUploadModalOpen(true)}
                      className="mt-2 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#bd00ff] text-xs font-bold rounded-lg border border-purple-200 cursor-pointer transition-colors"
                    >
                      + Upload First Photo
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Section 1: Main Platform Overview */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-[#bd00ff] font-bold text-lg">
                  <Info size={22} />
                  <span>Main About Overview</span>
                </div>
                {!isSuperAdmin && (
                  <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                    Super Admin Only
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Customer Page Main Text</label>
                <textarea
                  rows={6}
                  value={mainText}
                  onChange={(e) => setMainText(e.target.value)}
                  disabled={!isSuperAdmin}
                  className={`w-full p-4 border border-gray-200 rounded-xl outline-none text-sm text-gray-800 font-medium leading-relaxed resize-y transition-all ${
                    !isSuperAdmin ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : 'focus:border-[#bd00ff] focus:ring-1 focus:ring-[#bd00ff]'
                  }`}
                  placeholder="Enter main platform description..."
                />
              </div>
            </div>

            {/* Section 2: Purchase & Downpayment Policies */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-purple-700 font-bold text-lg">
                  <ShoppingBag size={22} />
                  <span>Purchase & Downpayment Policies</span>
                </div>
                {!isSuperAdmin && (
                  <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                    Super Admin Only
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Full Online Purchase Policy</label>
                <textarea
                  rows={3}
                  value={purchasePolicy}
                  onChange={(e) => setPurchasePolicy(e.target.value)}
                  disabled={!isSuperAdmin}
                  className={`w-full p-3.5 border border-gray-200 rounded-xl outline-none text-sm text-gray-800 font-medium leading-relaxed resize-y transition-all ${
                    !isSuperAdmin ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : 'focus:border-[#bd00ff] focus:ring-1 focus:ring-[#bd00ff]'
                  }`}
                  placeholder="Enter online purchase policy statement..."
                />
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Downpayment & In-Store Notice</label>
                <textarea
                  rows={4}
                  value={downpaymentPolicy}
                  onChange={(e) => setDownpaymentPolicy(e.target.value)}
                  disabled={!isSuperAdmin}
                  className={`w-full p-3.5 border border-gray-200 rounded-xl outline-none text-sm text-gray-800 font-medium leading-relaxed resize-y transition-all ${
                    !isSuperAdmin ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : 'focus:border-[#bd00ff] focus:ring-1 focus:ring-[#bd00ff]'
                  }`}
                  placeholder="Enter in-store downpayment notice..."
                />
              </div>
            </div>

            {/* Section 3: Facebook Store Branches */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-lg">
                  <Facebook size={22} />
                  <span>
                    {isSuperAdmin 
                      ? `Facebook Store Branches (${branches.length})` 
                      : `Facebook Store Branch — ${effectiveBranch} Branch`}
                  </span>
                  {!isSuperAdmin && (
                    <span className="ml-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-extrabold rounded-full">
                      Assigned Branch
                    </span>
                  )}
                </div>
                {isSuperAdmin ? (
                  <button
                    type="button"
                    onClick={handleAddBranch}
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 border-none cursor-pointer"
                  >
                    <Plus size={16} /> Add Branch
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-full">
                    <Building2 size={14} /> {effectiveBranch} Admin
                  </span>
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
                  <div key={branch.id} className="bg-blue-50/40 p-4 rounded-xl border border-blue-100 flex flex-col gap-3 relative">
                    <div className="flex items-center justify-between border-b border-blue-100/80 pb-2">
                      <span className="font-extrabold text-xs text-blue-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Building2 size={16} /> {isSuperAdmin ? `Branch #${idx + 1}` : `${effectiveBranch} Branch (Assigned Branch)`}
                      </span>
                      {isSuperAdmin && branches.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBranch(branch.id)}
                          className="p-1 hover:bg-red-100 text-red-500 rounded-md transition border-none cursor-pointer"
                          title="Remove Branch"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-bold text-gray-600 uppercase">Branch Name / Title</label>
                      <input
                        type="text"
                        value={branch.title}
                        onChange={(e) => handleUpdateBranch(branch.id, 'title', e.target.value)}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-xs font-semibold text-gray-800"
                        placeholder="E.g., Graphix Tagoloan"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-bold text-gray-600 uppercase">Facebook Page Link</label>
                      <input
                        type="url"
                        value={branch.link}
                        onChange={(e) => handleUpdateBranch(branch.id, 'link', e.target.value)}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-xs font-semibold text-gray-800"
                        placeholder="https://facebook.com/Graphixtagoloan"
                      />
                    </div>

                    {/* Banner Image Upload & Direct Input */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-bold text-gray-600 uppercase flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          Banner Image Upload <Zap size={13} className="text-amber-500 fill-amber-500" />
                        </span>
                        <span className="text-[10px] text-emerald-600 font-bold">Auto-Compressed</span>
                      </label>

                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <label className={`cursor-pointer px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border shadow-xs transition-all ${uploadingBranchId === branch.id ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'}`}>
                          {uploadingBranchId === branch.id ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              <span>Compressing & Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload size={16} />
                              <span>Upload New Image</span>
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

                        {/* Image Preview thumbnail if available */}
                        {branch.image && (
                          <div className="w-16 h-10 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 shrink-0 relative group">
                            <img
                              src={branch.image}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              onError={(evt) => {
                                (evt.target as HTMLElement).setAttribute('src', '/Images/storefront-bg.jpg');
                              }}
                            />
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                ))}
              </div>

              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={handleAddBranch}
                  className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-xl border border-dashed border-gray-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus size={16} /> Add Another Store Branch Field
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Live Customer Page Preview */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl border border-gray-100 shadow-sm">
              <span className="font-extrabold text-gray-800 text-sm uppercase tracking-wider flex items-center gap-2">
                <ImageIcon size={18} className="text-[#bd00ff]" /> Live Customer Preview
              </span>
              <span className="text-xs text-gray-400 font-medium">Real-time simulation</span>
            </div>

            <div className="bg-[#f4f5f7] p-4 rounded-2xl border border-gray-200 flex flex-col gap-6 shadow-inner max-h-[850px] overflow-y-auto">
              
              {/* Preview 0: Branch Showcase */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border-t-8 border-purple-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-50 rounded-full flex justify-center items-center border border-purple-100 text-[#bd00ff] shrink-0">
                    <Camera size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-gray-900 m-0">Our Branches Showcase</h3>
                    <p className="text-xs text-gray-400 font-medium m-0 mt-0.5">Explore latest photos and documentation</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {['Tagoloan', 'Villanueva', 'Jasaan'].map((b) => (
                    <div key={b} className="bg-gray-100 rounded-xl overflow-hidden border border-gray-200 flex flex-col">
                      <div className="h-16 bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400">
                        {b === (isSuperAdmin ? superAdminSelectedBranch : effectiveBranch) && branchPhotos.length > 0 ? (
                          <img src={branchPhotos[0]?.photoUrl} alt={b} className="w-full h-full object-cover" />
                        ) : (
                          <span>{b} Photo</span>
                        )}
                      </div>
                      <div className="p-1.5 text-center bg-white">
                        <span className="text-[10px] font-bold text-gray-800 truncate block">{b} Branch</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview 1: About Main */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border-t-8 border-[#bd00ff]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-50 rounded-full flex justify-center items-center border border-purple-100 text-[#bd00ff] shrink-0">
                    <Info size={20} />
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-900 m-0">About this website</h3>
                </div>
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                  <p className="text-sm text-gray-700 leading-relaxed font-medium m-0 whitespace-pre-wrap">
                    {mainText || 'No main description configured.'}
                  </p>
                </div>
              </div>

              {/* Preview 2: Policies */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border-t-8 border-purple-600">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-50 rounded-full flex justify-center items-center border border-purple-100 text-[#bd00ff] shrink-0">
                    <ShoppingBag size={20} />
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-900 m-0">Purchase & Downpayment Policy</h3>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="bg-purple-50/60 rounded-xl p-4 border border-purple-100 flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg text-[#bd00ff] shrink-0 shadow-xs">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 m-0">Full Online Purchase Policy</h4>
                      <p className="text-xs text-gray-600 leading-relaxed m-0 mt-1 font-medium">
                        {purchasePolicy || 'No purchase policy configured.'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-200/70 flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg text-amber-600 shrink-0 shadow-xs">
                      <Store size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 m-0">Downpayment Information Notice</h4>
                      <p className="text-xs text-gray-600 leading-relaxed m-0 mt-1 font-medium">
                        {downpaymentPolicy || 'No downpayment notice configured.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview 3: Multiple Facebook Store Branches */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border-t-8 border-blue-600">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex justify-center items-center border border-blue-100 text-blue-600 shrink-0">
                    <Facebook size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-gray-900 m-0">Our Store Facebook Pages</h3>
                    <p className="text-xs text-gray-400 font-medium m-0 mt-0.5">Visit official Facebook pages for each branch</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {branches.map((b) => (
                    <div key={b.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-xs bg-white flex flex-col">
                      <a
                        href={b.link || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative w-full h-36 overflow-hidden block cursor-pointer"
                      >
                        <img
                          src={b.image || '/Images/storefront-bg.jpg'}
                          alt={b.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).setAttribute('src', '/Images/storefront-bg.jpg');
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4 text-white">
                          <span className="text-sm font-black tracking-tight drop-shadow-md group-hover:underline flex items-center gap-1.5">
                            {b.title} <ExternalLink size={14} />
                          </span>
                          <span className="text-[11px] text-gray-200 truncate mt-0.5 font-medium">
                            {b.link}
                          </span>
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Upload Branch Photo Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl flex flex-col gap-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-purple-50 text-[#bd00ff] rounded-xl flex items-center justify-center">
                  <Camera size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-gray-900 m-0">Upload Branch Photo</h3>
                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-purple-50 text-[#bd00ff] border border-purple-200">
                      {branchPhotos.length}/8 Used
                    </span>
                  </div>
                  <span className="text-xs font-bold text-gray-500">
                    {effectiveBranch} Branch • {Math.max(0, 8 - branchPhotos.length)} slot(s) remaining (Max 8)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition border-none cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {branchPhotos.length >= 8 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col gap-2 text-amber-800 text-xs">
                <span className="font-black text-sm text-amber-900">Maximum Limit Reached (8/8)</span>
                <span>This branch already has the maximum allowable 8 documentation photos. To upload a new photo, please close this dialog and delete an existing photo first.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitPhoto} className="flex flex-col gap-4">
                {/* File input */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 uppercase">Select Image *</label>
                    <span className="text-[11px] font-semibold text-purple-600">Max 8 images per branch</span>
                  </div>
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-[#bd00ff] rounded-2xl p-4 bg-gray-50 transition-colors">
                    {imagePreviewUrl ? (
                      <div className="relative w-full h-44 rounded-xl overflow-hidden bg-black/5 flex items-center justify-center">
                        <img src={imagePreviewUrl} alt="Upload preview" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => { setSelectedFile(null); setImagePreviewUrl(null); }}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-lg hover:bg-black/80 transition cursor-pointer border-none"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-2 cursor-pointer py-6 w-full">
                        <Upload size={32} className="text-purple-500" />
                        <span className="text-xs font-bold text-gray-700">Click to choose a photo</span>
                        <span className="text-[10px] text-gray-400">JPG, PNG, WebP (Auto-compressed)</span>
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
                    placeholder="e.g. Store Interior & Service Counter"
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#bd00ff] text-xs font-medium text-gray-800"
                  />
                </div>

                {/* Caption */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase">Caption / Description (Optional)</label>
                  <textarea
                    rows={2}
                    value={uploadCaption}
                    onChange={(e) => setUploadCaption(e.target.value)}
                    placeholder="e.g. Our welcoming technician workstation at Tagoloan."
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#bd00ff] text-xs font-medium text-gray-800 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    disabled={isSubmittingPhoto}
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition border-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPhoto || !selectedFile}
                    className="px-6 py-2.5 bg-[#bd00ff] hover:bg-[#9c00d6] text-white text-xs font-extrabold rounded-xl transition flex items-center gap-2 border-none cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    {isSubmittingPhoto ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        <span>Upload to {effectiveBranch}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {photoToView && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPhotoToView(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-[#bd00ff]" />
                <span className="font-extrabold text-sm text-gray-900">{photoToView.branch} Branch Documentation</span>
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
              <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100 mt-2">
                <span>Uploaded: {new Date(photoToView.createdAt).toLocaleString()}</span>
                {photoToView.uploadedBy && <span>By: {photoToView.uploadedBy}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {photoToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 text-center animate-in zoom-in-95">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={26} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 m-0">Delete Branch Photo?</h3>
              <p className="text-xs text-gray-500 mt-1 m-0">
                Are you sure you want to delete this photo from {photoToDelete.branch} branch? This action cannot be undone.
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
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl transition border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeletingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
