"use client";

import { useState, useEffect, useRef } from 'react';
import { X, Link as LinkIcon } from 'lucide-react';

// Banner interface matching Prisma model
interface Banner {
  id: string;
  imageUrl: string;
  name?: string | null;
  linkUrl?: string | null;
  createdAt: string;
}

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBannerFile, setNewBannerFile] = useState<File | null>(null);
  const [newBannerPreview, setNewBannerPreview] = useState<string | null>(null);
  const [newBannerLink, setNewBannerLink] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch banners on load
  const fetchBanners = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/banners');
      if (res.ok) {
        const data = await res.json();
        setBanners(data);
      }
    } catch (err) {
      console.error('Failed to fetch banners', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewBannerFile(file);
      setNewBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadBanner = async () => {
    if (!newBannerFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('bannerImage', newBannerFile);
    formData.append('bannerName', newBannerFile.name);
    if (newBannerLink.trim()) {
      formData.append('bannerLink', newBannerLink.trim());
    }

    try {
      const res = await fetch('/api/banners', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        await fetchBanners(); // refresh list
        setIsModalOpen(false);
        setNewBannerFile(null);
        setNewBannerPreview(null);
        setNewBannerLink('');
      } else {
        alert('Failed to upload banner');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;

    try {
      const res = await fetch(/api/banners/ + id, {
        method: 'DELETE',
      });

      if (res.ok) {
        setBanners(banners.filter(b => b.id !== id));
      } else {
        alert('Failed to delete banner');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while deleting');
    }
  };

  return (
    <div className="flex flex-col gap-6 font-['Inter']">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Manage Banners</h2>
        
        <button 
          className="px-5 py-2 bg-[#5c0099] text-white font-semibold rounded-lg hover:bg-[#3d0066] transition cursor-pointer border-none shadow-sm"
          onClick={() => setIsModalOpen(true)}
        >
          Upload New Banner
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-10">
            <div className="w-10 h-10 border-4 border-purple-100 border-t-[#5c0099] rounded-full animate-spin"></div>
            <p className="text-gray-500 font-semibold mt-4">Loading banners...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {banners.map((banner) => (
                <div key={banner.id} className="flex flex-col gap-3 group relative">
                  <div className="relative w-full h-[200px] border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                    <img src={banner.imageUrl} alt={banner.name || 'Banner'} className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <button 
                        onClick={() => handleDeleteBanner(banner.id)}
                        className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 cursor-pointer border-none transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-start px-2">
                    <p className="text-sm text-gray-500 font-medium truncate max-w-[70%]">{banner.name || 'Untitled Banner'}</p>
                    {banner.linkUrl && (
                      <div className="flex items-center gap-1 text-xs text-[#bd00ff] bg-purple-50 px-2 py-1 rounded-md max-w-[30%] truncate" title={banner.linkUrl}>
                        <LinkIcon size={12} className="shrink-0" />
                        <span className="truncate">{banner.linkUrl}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {banners.length === 0 && (
              <p className="text-gray-500 text-center py-20 font-medium text-lg">No banners found. Upload some promotional images to display on the Customer Dashboard!</p>
            )}
          </>
        )}
      </div>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xl font-bold text-black m-0">Upload Banner</h3>
              <button onClick={() => { setIsModalOpen(false); setNewBannerFile(null); setNewBannerPreview(null); setNewBannerLink(''); }} className="text-gray-500 hover:text-black hover:bg-gray-200 p-1.5 rounded-full transition-colors border-none bg-transparent cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Banner Image <span className="text-red-500">*</span></label>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                />
                
                {newBannerPreview ? (
                  <div className="relative w-full h-40 border-2 border-gray-200 rounded-xl overflow-hidden group">
                    <img src={newBannerPreview} className="w-full h-full object-contain bg-gray-50" alt="Preview" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white text-black font-bold rounded-lg cursor-pointer border-none">
                        Change Image
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-purple-200 rounded-xl flex flex-col items-center justify-center bg-purple-50/50 cursor-pointer hover:bg-purple-50 transition-colors text-[#5c0099]"
                  >
                    <span className="font-semibold">Click to select image</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Target Link URL <span className="text-gray-400 font-normal ml-1">(Optional)</span></label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <LinkIcon size={16} />
                  </div>
                  <input 
                    type="url" 
                    value={newBannerLink}
                    onChange={(e) => setNewBannerLink(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#bd00ff] focus:ring-1 focus:ring-[#bd00ff] transition-all text-sm text-black"
                  />
                </div>
                <p className="text-xs text-gray-500 m-0">Customers will be redirected to this link when they click the banner.</p>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); setNewBannerFile(null); setNewBannerPreview(null); setNewBannerLink(''); }}
                className="px-5 py-2 font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadBanner}
                disabled={isUploading || !newBannerFile}
                className="px-6 py-2 bg-[#5c0099] text-white font-bold rounded-xl hover:bg-[#3d0066] transition-colors border-none cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isUploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Upload Banner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
