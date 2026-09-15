"use client";

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode as QrIcon } from 'lucide-react';

interface QRCodeDisplayProps {
  value: string;
  uploadedImageUrl?: string | null;
  alt?: string;
  size?: number;
  className?: string;
}

export default function QRCodeDisplay({
  value,
  uploadedImageUrl,
  alt = "GCash QR Code",
  size = 200,
  className = ""
}: QRCodeDisplayProps) {
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // If an official QR image is uploaded, we don't need to generate a dynamic one
    if (uploadedImageUrl) {
      setGeneratedUrl(null);
      return;
    }

    if (!value) return;

    let isMounted = true;
    setIsGenerating(true);

    QRCode.toDataURL(value, {
      width: size * 2, // High DPI
      margin: 1,
      color: {
        dark: '#005ce6', // Official GCash Blue
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then(url => {
        if (isMounted) {
          setGeneratedUrl(url);
          setIsGenerating(false);
        }
      })
      .catch(err => {
        console.error("QR Code generation error:", err);
        if (isMounted) setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [value, uploadedImageUrl, size]);

  // Case 1: Official Uploaded QR Image
  if (uploadedImageUrl) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <img
          src={uploadedImageUrl}
          alt={alt}
          className="w-full h-full object-contain rounded-xl"
          style={{ maxWidth: `${size}px`, maxHeight: `${size}px` }}
        />
      </div>
    );
  }

  // Case 2: Generated QR Code
  if (generatedUrl) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <img
          src={generatedUrl}
          alt={alt}
          className="w-full h-full object-contain rounded-xl"
          style={{ maxWidth: `${size}px`, maxHeight: `${size}px` }}
        />
      </div>
    );
  }

  // Case 3: Generating / Loading Placeholder
  return (
    <div 
      className={`flex items-center justify-center bg-gray-50 border-2 border-dashed border-blue-200 rounded-2xl ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {isGenerating ? (
        <div className="w-8 h-8 border-3 border-blue-200 border-t-[#005ce6] rounded-full animate-spin"></div>
      ) : (
        <QrIcon size={size * 0.5} className="text-[#005ce6] opacity-60" />
      )}
    </div>
  );
}
