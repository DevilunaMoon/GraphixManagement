"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Save, Info, ShoppingBag, Store, CreditCard, 
  Facebook, Image as ImageIcon, ExternalLink, CheckCircle, AlertCircle, RefreshCw,
  Plus, Trash2, Building2, Upload, Loader2, Link as LinkIcon
} from 'lucide-react';

interface FacebookBranch {
  id: string;
  title: string;
  link: string;
  image: string;
}

const DEFAULT_MAIN = `This website revolutionizes the traditional e-commerce model by seamlessly integrating online retail with a transparent, service-based repair platform. Unlike standard online stores that simply sell products, this site offers a unique device monitoring feature that empowers customers by providing real-time, visual updates on their phone's repair progress. This level of transparency bridges the trust gap often found in service industries, allowing users to see their device being worked on from anywhere. By combining the convenience of purchasing accessories or repair parts with the peace of mind that comes from complete visibility into the service process, this site creates a customer-centric ecosystem that prioritizes both convenience and trust in the tech repair space.`;

const DEFAULT_PURCHASE = `Customers can purchase items directly through this website. All online transactions require Full Purchase payment to complete your online order.`;

const DEFAULT_DOWNPAYMENT = `Online downpayments are not accepted on this website. Downpayment features and QR details displayed on product pages are strictly provided to show downpayment information and requirements for customers planning to visit our physical store. Actual downpayment processing is available exclusively for in-store walk-in transactions at our physical store POS terminal.`;

const INITIAL_BRANCHES: FacebookBranch[] = [
  {
    id: 'branch-1',
    title: 'Graphix Main Store',
    link: 'https://www.facebook.com',
    image: '/Images/storefront-bg.jpg'
  }
];

export default function AdminAboutEditor() {
  const [mainText, setMainText] = useState(DEFAULT_MAIN);
  const [purchasePolicy, setPurchasePolicy] = useState(DEFAULT_PURCHASE);
  const [downpaymentPolicy, setDownpaymentPolicy] = useState(DEFAULT_DOWNPAYMENT);
  const [branches, setBranches] = useState<FacebookBranch[]>(INITIAL_BRANCHES);

  const [uploadingBranchId, setUploadingBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchPolicies();
  }, []);

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
              }
            } catch (e) {
              console.error('Error parsing branches JSON:', e);
            }
          } else {
            // Check legacy fields
            const fbLinkRec = data.find((p: any) => p.type === 'ABOUT_FACEBOOK_LINK');
            const fbImgRec = data.find((p: any) => p.type === 'ABOUT_FACEBOOK_IMAGE');
            const fbTitleRec = data.find((p: any) => p.type === 'ABOUT_FACEBOOK_TITLE');

            if (fbLinkRec || fbImgRec || fbTitleRec) {
              setBranches([{
                id: 'branch-legacy',
                title: fbTitleRec?.content || 'Graphix Main Store',
                link: fbLinkRec?.content || 'https://www.facebook.com',
                image: fbImgRec?.content || '/Images/storefront-bg.jpg'
              }]);
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
    if (branches.length === 1) {
      setToastMessage({ type: 'error', text: 'At least one Facebook store branch must be maintained.' });
      return;
    }
    setBranches(branches.filter(b => b.id !== id));
  };

  const handleImageUpload = async (branchId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file) return;

    setUploadingBranchId(branchId);
    setToastMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'facebook-banners');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          handleUpdateBranch(branchId, 'image', data.url);
          setToastMessage({ type: 'success', text: 'Image uploaded successfully!' });
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

    const itemsToSave = [
      { type: 'ABOUT_MAIN', content: mainText },
      { type: 'ABOUT_PURCHASE', content: purchasePolicy },
      { type: 'ABOUT_DOWNPAYMENT', content: downpaymentPolicy },
      { type: 'ABOUT_FACEBOOK_BRANCHES', content: JSON.stringify(branches) }
    ];

    try {
      let allOk = true;
      for (const item of itemsToSave) {
        const res = await fetch('/api/policies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
        if (!res.ok) allOk = false;
      }

      if (allOk) {
        setToastMessage({ type: 'success', text: 'About page contents and all Facebook store branches updated successfully!' });
      } else {
        setToastMessage({ type: 'error', text: 'Some fields failed to save. Please try again.' });
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
              <p className="text-gray-500 text-sm font-medium m-0 mt-1">Customize website text, policies, and upload banner images for Facebook store branches.</p>
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
          <form onSubmit={handleSave} className="flex flex-col gap-6">
            
            {/* Section 1: Main Platform Overview */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[#bd00ff] font-bold text-lg border-b border-gray-100 pb-3">
                <Info size={22} />
                <span>Main About Overview</span>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Customer Page Main Text</label>
                <textarea
                  rows={6}
                  value={mainText}
                  onChange={(e) => setMainText(e.target.value)}
                  className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:border-[#bd00ff] focus:ring-1 focus:ring-[#bd00ff] text-sm text-gray-800 font-medium leading-relaxed resize-y transition-all"
                  placeholder="Enter main platform description..."
                />
              </div>
            </div>

            {/* Section 2: Purchase & Downpayment Policies */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-purple-700 font-bold text-lg border-b border-gray-100 pb-3">
                <ShoppingBag size={22} />
                <span>Purchase & Downpayment Policies</span>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Full Online Purchase Policy</label>
                <textarea
                  rows={3}
                  value={purchasePolicy}
                  onChange={(e) => setPurchasePolicy(e.target.value)}
                  className="w-full p-3.5 border border-gray-200 rounded-xl outline-none focus:border-[#bd00ff] focus:ring-1 focus:ring-[#bd00ff] text-sm text-gray-800 font-medium leading-relaxed resize-y transition-all"
                  placeholder="Enter online purchase policy statement..."
                />
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Downpayment & In-Store Notice</label>
                <textarea
                  rows={4}
                  value={downpaymentPolicy}
                  onChange={(e) => setDownpaymentPolicy(e.target.value)}
                  className="w-full p-3.5 border border-gray-200 rounded-xl outline-none focus:border-[#bd00ff] focus:ring-1 focus:ring-[#bd00ff] text-sm text-gray-800 font-medium leading-relaxed resize-y transition-all"
                  placeholder="Enter in-store downpayment notice..."
                />
              </div>
            </div>

            {/* Section 3: Multiple Facebook Store Branches */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-lg">
                  <Facebook size={22} />
                  <span>Facebook Store Branches ({branches.length})</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddBranch}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 border-none cursor-pointer"
                >
                  <Plus size={16} /> Add Branch
                </button>
              </div>

              <div className="flex flex-col gap-6">
                {branches.map((branch, idx) => (
                  <div key={branch.id} className="bg-blue-50/40 p-4 rounded-xl border border-blue-100 flex flex-col gap-3 relative">
                    <div className="flex items-center justify-between border-b border-blue-100/80 pb-2">
                      <span className="font-extrabold text-xs text-blue-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Building2 size={16} /> Branch #{idx + 1}
                      </span>
                      {branches.length > 1 && (
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
                        <span>Banner Image Upload</span>
                        <span className="text-[10px] text-gray-400 font-normal">Click button to choose file</span>
                      </label>

                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <label className={`cursor-pointer px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border shadow-xs transition-all ${uploadingBranchId === branch.id ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'}`}>
                          {uploadingBranchId === branch.id ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              <span>Uploading...</span>
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

                      {/* Optional direct URL input */}
                      <div className="relative mt-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                          <LinkIcon size={14} />
                        </div>
                        <input
                          type="text"
                          value={branch.image}
                          onChange={(e) => handleUpdateBranch(branch.id, 'image', e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-[11px] font-mono text-gray-700"
                          placeholder="Or paste image URL (e.g. /Images/storefront-bg.jpg)"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddBranch}
                className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-xl border border-dashed border-gray-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus size={16} /> Add Another Store Branch Field
              </button>
            </div>

            <button
              type="submit"
              disabled={saving || loading}
              className="w-full py-4 bg-gradient-to-r from-[#bd00ff] to-[#4B0082] text-white font-extrabold text-base rounded-2xl shadow-xl shadow-purple-500/25 hover:opacity-95 transition-all flex items-center justify-center gap-2 border-none cursor-pointer"
            >
              <Save size={20} /> Save All Changes
            </button>
          </form>

          {/* Right Column: Live Customer Page Preview */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl border border-gray-100 shadow-sm">
              <span className="font-extrabold text-gray-800 text-sm uppercase tracking-wider flex items-center gap-2">
                <ImageIcon size={18} className="text-[#bd00ff]" /> Live Customer Preview
              </span>
              <span className="text-xs text-gray-400 font-medium">Real-time simulation</span>
            </div>

            <div className="bg-[#f4f5f7] p-4 rounded-2xl border border-gray-200 flex flex-col gap-6 shadow-inner max-h-[850px] overflow-y-auto">
              
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
    </div>
  );
}
