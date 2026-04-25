"use client";

import { useState, useEffect, useRef } from 'react';

// Banner interface matching Prisma model
interface Banner {
  id: string;
  imageUrl: string;
  name?: string | null;
  createdAt: string;
}

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
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

  const handleUploadBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('bannerImage', file);
    formData.append('bannerName', file.name);

    try {
      const res = await fetch('/api/banners', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        await fetchBanners(); // refresh list
      } else {
        alert('Failed to upload banner');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during upload');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;

    try {
      const res = await fetch(`/api/banners/${id}`, {
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
        
        {/* Hidden file input */}
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handleUploadBanner} 
          className="hidden" 
        />
        
        <button 
          className="px-5 py-2 bg-[#5c0099] text-white font-semibold rounded-lg hover:bg-[#3d0066] transition cursor-pointer border-none shadow-sm disabled:opacity-50"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload New Banner'}
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
                <div key={banner.id} className="flex flex-col gap-3 group">
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
                  <p className="text-sm text-gray-500 text-center font-medium truncate px-4">{banner.name || 'Untitled Banner'}</p>
                </div>
              ))}
            </div>
            
            {banners.length === 0 && (
              <p className="text-gray-500 text-center py-20 font-medium text-lg">No banners found. Upload some promotional images to display on the Customer Dashboard!</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
