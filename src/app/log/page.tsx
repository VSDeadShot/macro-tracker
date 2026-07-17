"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CameraCapture from "@/components/CameraCapture";

interface Template {
  id: string;
  name: string;
  food_items: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

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
  
  // Template state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [showTemplateInput, setShowTemplateInput] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const router = useRouter();

  useEffect(() => {
    fetch("/api/templates")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTemplates(data);
        setLoadingTemplates(false);
      })
      .catch(() => setLoadingTemplates(false));
  }, []);

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

  const handleSaveTemplate = async () => {
    if (!result || !templateName) return;
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          food_items: result.foodName,
          calories: result.calories,
          protein: result.protein,
          carbs: result.carbs,
          fats: result.fats,
        }),
      });

      if (!res.ok) throw new Error("Failed to save template");
      
      const newTemplate = await res.json();
      setTemplates([newTemplate, ...templates]);
      setShowTemplateInput(false);
      setTemplateName("");
    } catch (err: any) {
      console.error(err);
      setError("Failed to save template.");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleQuickLog = async (template: Template) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodName: template.food_items,
          calories: template.calories,
          protein: template.protein,
          carbs: template.carbs,
          fats: template.fats,
        }),
      });

      if (!res.ok) throw new Error("Failed to log from template");
      router.push("/");
    } catch (err: any) {
      console.error(err);
      setError("Failed to quick log meal.");
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const res = await fetch("/api/templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setTemplates(templates.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen p-6 flex flex-col items-center pt-12 bg-background">
      <div className="w-full max-w-md">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-3 text-white/95">Log Meal</h1>
          <p className="text-white/60 text-base">Snap a photo to let AI estimate the macros.</p>
        </header>

        {!loadingTemplates && templates.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">Quick Log</h2>
            <div className="space-y-3">
              {templates.map((template) => (
                <div key={template.id} className="glass-panel p-4 flex justify-between items-center group relative overflow-hidden">
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleQuickLog(template)}
                  >
                    <p className="font-medium text-white/90 truncate">{template.name}</p>
                    <div className="flex gap-3 text-xs text-white/40 mt-1 font-medium">
                      <span className="text-primary">{Math.round(template.protein)}g P</span>
                      <span className="text-secondary">{Math.round(template.carbs)}g C</span>
                      <span className="text-[#E5A93B]">{Math.round(template.fats)}g F</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right cursor-pointer" onClick={() => handleQuickLog(template)}>
                      <p className="font-bold">{Math.round(template.calories)}</p>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider">Kcal</p>
                    </div>
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template.id); }}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors"
                      title="Delete template"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
            <div className="relative group flex items-center justify-center mb-1">
              <input 
                type="text"
                value={result.foodName}
                onChange={(e) => setResult({...result, foodName: e.target.value})}
                className="w-full text-2xl font-bold text-white bg-transparent text-center focus:outline-none border-b border-dashed border-white/20 focus:border-white/50 transition-colors py-1"
              />
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute right-2 text-white/30 pointer-events-none group-hover:text-white/50"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            </div>
            <p className="text-sm text-white/50 mb-4 capitalize text-center">Confidence: {result.confidence}</p>
            <p className="text-xs text-primary/70 mb-4 text-center font-medium animate-pulse">Tap any number below to edit ✏️</p>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-black/20 p-4 rounded-xl flex flex-col items-center justify-center border border-white/5 hover:border-white/10 transition-colors">
                <input 
                  type="number" 
                  value={result.calories} 
                  onChange={(e) => setResult({...result, calories: Number(e.target.value)})}
                  className="w-20 text-3xl font-bold text-white mb-1 bg-black/20 rounded-lg text-center focus:outline-none border border-white/10 focus:border-white/30 transition-colors py-1" 
                />
                <span className="text-xs text-white/50 uppercase tracking-wider mt-1">Calories</span>
              </div>
              <div className="bg-black/20 p-4 rounded-xl flex flex-col items-center justify-center border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex items-baseline justify-center mb-1">
                  <input 
                    type="number" 
                    value={result.protein} 
                    onChange={(e) => setResult({...result, protein: Number(e.target.value)})}
                    className="w-16 text-3xl font-bold text-primary bg-black/20 rounded-lg text-center focus:outline-none border border-white/10 focus:border-primary/40 transition-colors py-1" 
                  />
                  <span className="text-xl font-bold text-primary ml-1">g</span>
                </div>
                <span className="text-xs text-white/50 uppercase tracking-wider mt-1">Protein</span>
              </div>
              <div className="bg-black/20 p-4 rounded-xl flex flex-col items-center justify-center border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex items-baseline justify-center mb-1">
                  <input 
                    type="number" 
                    value={result.carbs} 
                    onChange={(e) => setResult({...result, carbs: Number(e.target.value)})}
                    className="w-16 text-3xl font-bold text-secondary bg-black/20 rounded-lg text-center focus:outline-none border border-white/10 focus:border-secondary/40 transition-colors py-1" 
                  />
                  <span className="text-xl font-bold text-secondary ml-1">g</span>
                </div>
                <span className="text-xs text-white/50 uppercase tracking-wider mt-1">Carbs</span>
              </div>
              <div className="bg-black/20 p-4 rounded-xl flex flex-col items-center justify-center border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex items-baseline justify-center mb-1">
                  <input 
                    type="number" 
                    value={result.fats} 
                    onChange={(e) => setResult({...result, fats: Number(e.target.value)})}
                    className="w-16 text-3xl font-bold text-[#E5A93B] bg-black/20 rounded-lg text-center focus:outline-none border border-white/10 focus:border-[#E5A93B]/40 transition-colors py-1" 
                  />
                  <span className="text-xl font-bold text-[#E5A93B] ml-1">g</span>
                </div>
                <span className="text-xs text-white/50 uppercase tracking-wider mt-1">Fats</span>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleSaveMeal}
                disabled={saving}
                className="w-full bg-primary hover:bg-primary/90 text-white py-4 px-4 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {saving ? "Saving to database..." : "Save to Daily Log"}
              </button>
              
              {!showTemplateInput ? (
                <button 
                  onClick={() => {
                    setTemplateName(result.foodName);
                    setShowTemplateInput(true);
                  }}
                  className="w-full bg-secondary/10 hover:bg-secondary/20 text-secondary py-3 px-4 rounded-xl font-medium transition-colors border border-secondary/20"
                >
                  ⭐ Save as Template
                </button>
              ) : (
                <div className="bg-secondary/5 border border-secondary/20 p-4 rounded-xl space-y-3">
                  <p className="text-sm font-medium text-white/80">Save this meal for quick logging later.</p>
                  <input 
                    type="text" 
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Morning Protein Shake"
                    className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-secondary"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowTemplateInput(false)}
                      className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 text-sm font-medium hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveTemplate}
                      disabled={savingTemplate || !templateName}
                      className="flex-1 py-2 rounded-lg bg-secondary hover:bg-secondary/90 text-black text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      {savingTemplate ? "Saving..." : "Save Template"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
