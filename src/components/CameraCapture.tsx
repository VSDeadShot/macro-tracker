"use client";

import { useState, useRef } from "react";

interface CameraCaptureProps {
  onImageCaptured: (base64: string) => void;
}

export default function CameraCapture({ onImageCaptured }: CameraCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 1024;
        let { width, height } = img;

        if (width > height && width > MAX_SIZE) {
          height = (height / width) * MAX_SIZE;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = (width / height) * MAX_SIZE;
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.7);
        URL.revokeObjectURL(img.src);
        resolve(compressed);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const base64String = await compressImage(file);
    setPreview(base64String);
    onImageCaptured(base64String);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full mx-auto">
      {!preview ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="glass-panel w-full aspect-square flex flex-col items-center justify-center rounded-3xl cursor-pointer hover:bg-[#312b28] transition-colors duration-200 group"
        >
          <div className="bg-primary/10 text-primary p-5 rounded-full mb-4 group-hover:scale-105 transition-transform duration-200 border border-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
          </div>
          <p className="text-lg font-medium text-white/95">Tap to scan meal</p>
          <p className="text-sm text-white/50 mt-1">Camera or Gallery</p>
        </div>
      ) : (
        <div className="w-full space-y-4">
          <div className="relative w-full aspect-square rounded-3xl overflow-hidden glass-panel">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Meal preview" className="w-full h-full object-cover" />
          </div>
          <button 
            onClick={() => {
              setPreview(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
              onImageCaptured("");
            }}
            className="w-full py-4 px-4 rounded-xl font-medium bg-[#2a2422] border border-white/5 hover:bg-[#312b28] transition-colors text-white/90 shadow-sm"
          >
            Retake Photo
          </button>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
