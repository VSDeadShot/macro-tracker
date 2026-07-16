"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CameraCapture from "@/components/CameraCapture";

interface MacrosResult {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  confidence: string;
}

export default function LogMealPage() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MacrosResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleImageCaptured = async (base64String: string) => {
    setImage(base64String);
    if (!base64String) {
      setResult(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64String }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || "Failed to analyze image");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMeal = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });

      if (!res.ok) throw new Error("Failed to save");
      
      // Redirect back to the dashboard to see the logged meal
      router.push("/");
    } catch (err: any) {
      console.error(err);
      setError("Failed to save meal to the database. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-6 flex flex-col items-center pt-12 bg-background">
      <div className="w-full max-w-md">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-3 text-white/95">Log Meal</h1>
          <p className="text-white/60 text-base">Snap a photo to let AI estimate the macros.</p>
        </header>

        <CameraCapture onImageCaptured={handleImageCaptured} />

        {loading && (
          <div className="mt-8 p-6 glass-panel rounded-2xl flex flex-col items-center justify-center border border-secondary/30 bg-secondary/5">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-white/80 font-medium">Analyzing food with Gemini AI...</p>
          </div>
        )}

        {error && (
          <div className="mt-8 p-6 glass-panel rounded-2xl border border-red-500/30 bg-red-500/5">
            <p className="text-red-400 font-medium text-center">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-8 p-6 glass-panel rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 border border-primary/20 bg-primary/5">
            <h2 className="text-2xl font-bold mb-1 text-white">{result.foodName}</h2>
            <p className="text-sm text-white/50 mb-6 capitalize">Confidence: {result.confidence}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-black/20 p-4 rounded-xl flex flex-col items-center justify-center border border-white/5">
                <span className="text-3xl font-bold text-white mb-1">{result.calories}</span>
                <span className="text-xs text-white/50 uppercase tracking-wider">Calories</span>
              </div>
              <div className="bg-black/20 p-4 rounded-xl flex flex-col items-center justify-center border border-white/5">
                <span className="text-3xl font-bold text-primary mb-1">{result.protein}g</span>
                <span className="text-xs text-white/50 uppercase tracking-wider">Protein</span>
              </div>
              <div className="bg-black/20 p-4 rounded-xl flex flex-col items-center justify-center border border-white/5">
                <span className="text-3xl font-bold text-secondary mb-1">{result.carbs}g</span>
                <span className="text-xs text-white/50 uppercase tracking-wider">Carbs</span>
              </div>
              <div className="bg-black/20 p-4 rounded-xl flex flex-col items-center justify-center border border-white/5">
                <span className="text-3xl font-bold text-[#E5A93B] mb-1">{result.fats}g</span>
                <span className="text-xs text-white/50 uppercase tracking-wider">Fats</span>
              </div>
            </div>

            <button 
              onClick={handleSaveMeal}
              disabled={saving}
              className="w-full bg-primary hover:bg-primary/90 text-white py-4 px-4 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {saving ? "Saving to database..." : "Save to Daily Log"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
