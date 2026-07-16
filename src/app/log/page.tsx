"use client";

import { useState } from "react";
import CameraCapture from "@/components/CameraCapture";

export default function LogMealPage() {
  const [image, setImage] = useState<string | null>(null);

  return (
    <div className="min-h-screen p-6 flex flex-col items-center pt-12 bg-background">
      <div className="w-full max-w-md">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-3 text-white/95">Log Meal</h1>
          <p className="text-white/60 text-base">Snap a photo to let AI estimate the macros.</p>
        </header>

        <CameraCapture onImageCaptured={setImage} />

        {image && (
          <div className="mt-8 p-6 glass-panel rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 border border-secondary/30 bg-secondary/10">
            <h2 className="text-lg font-medium mb-2 text-white">Photo Captured!</h2>
            <p className="text-sm text-white/60">
              In the next step, we will send this securely to Gemini Vision for analysis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
