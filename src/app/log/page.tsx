"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CameraCapture from "@/components/CameraCapture";
import { applyCalorieAutoFill, canSaveTemplate, GENERIC_SAVE_ERROR, macroInputChange, saveErrorMessage } from "@/lib/meal-form";
import { MAX_CALORIES, MAX_MACRO_GRAMS } from "@/lib/meal-input";

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
  ingredients?: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  confidence: string;
}

type MacroField = "protein" | "carbs" | "fats" | "calories";

interface DailyStats {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fats: number;
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

  // Manual-entry number inputs: per-field draft text while focused, and whether calories were set by hand
  const [drafts, setDrafts] = useState<Partial<Record<MacroField, string>>>({});
  const [caloriesTouched, setCaloriesTouched] = useState(false);

  // Daily stats for progress bars
  const [stats, setStats] = useState<DailyStats | null>(null);

  const router = useRouter();

  useEffect(() => {
    // Fetch Templates
    fetch("/api/templates")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTemplates(data);
        setLoadingTemplates(false);
      })
      .catch(() => setLoadingTemplates(false));

    // Fetch Daily Targets and Meals to calculate current progress
    Promise.all([
      fetch("/api/targets").then(res => res.json()),
      fetch("/api/meals").then(res => res.json())
    ]).then(([targetsData, mealsData]) => {
      const today = new Date().toDateString();
      const todaysMeals = (Array.isArray(mealsData) ? mealsData : []).filter((m: any) => 
        new Date(m.created_at).toDateString() === today
      );
      
      const sums = todaysMeals.reduce((acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fats: acc.fats + meal.fats,
      }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

      setStats({
        ...sums,
        target_calories: targetsData.target_calories || 2000,
        target_protein: targetsData.target_protein || 150,
        target_carbs: targetsData.target_carbs || 200,
        target_fats: targetsData.target_fats || 70,
      });
    }).catch(console.error);
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

  // Manual entry reuses the same review/edit step, just starting blank and without a photo
  const handleStartManualEntry = () => {
    setImage(null);
    setError(null);
    setDrafts({});
    setCaloriesTouched(false);
    setResult({ foodName: "", calories: 0, protein: 0, carbs: 0, fats: 0, confidence: "manual" });
  };

  // Protein/carbs/fats edits. In manual mode, calories follow 4P + 4C + 9F until the user sets calories.
  const updateMacros = (patch: Partial<Pick<MacrosResult, "protein" | "carbs" | "fats">>) => {
    if (!result) return;
    setResult(applyCalorieAutoFill({ ...result, ...patch }, { manual: !image, caloriesTouched }));
  };

  const setCalories = (calories: number) => {
    if (!result) return;
    setCaloriesTouched(true);
    setResult({ ...result, calories });
  };

  // While a number input is focused it shows a draft string (see macroInputChange)
  const macroDraft = (field: MacroField) => drafts[field] ?? String(result?.[field] ?? 0);

  const handleMacroInput = (field: MacroField, raw: string) => {
    const max = field === "calories" ? MAX_CALORIES : MAX_MACRO_GRAMS;
    const { draft, value } = macroInputChange(raw, macroDraft(field), max);
    setDrafts({ ...drafts, [field]: draft });
    if (field === "calories") {
      setCalories(value);
    } else {
      updateMacros({ [field]: value });
    }
  };

  const clearDraft = (field: MacroField) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSaveMeal = async () => {
    if (!result) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });

      if (!res.ok) {
        // A 400 explains what to fix (e.g. a macro out of range); anything else gets the generic message
        const body = await res.json().catch(() => null);
        setError(saveErrorMessage(res.status, body));
        return;
      }

      router.push("/");
    } catch (err) {
      console.error(err);
      setError(GENERIC_SAVE_ERROR);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!result || !canSaveTemplate(templateName, result.foodName)) return;
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName.trim(),
          food_items: result.foodName.trim(),
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
    <div className="min-h-screen p-6 flex flex-col items-center pt-12 bg-background pb-32">
      <div className="w-full max-w-md">
        
        {/* Header (Only show if not looking at results to save space) */}
        {!result && (
          <header className="mb-10 text-center animate-in fade-in slide-in-from-top-4">
            <h1 className="text-3xl font-bold tracking-tight mb-3 text-white/95">Log Meal</h1>
            <p className="text-white/60 text-base">Snap a photo to let AI estimate the macros, or enter them yourself.</p>
          </header>
        )}

        {/* Quick Log (Only show if not looking at results) */}
        {!result && !loadingTemplates && templates.length > 0 && (
          <div className="mb-8 animate-in fade-in">
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

        {/* Camera (Only show if not looking at results) */}
        {!result && !loading && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <CameraCapture onImageCaptured={handleImageCaptured} />
            {/* Always available — including after a failed photo analysis */}
            <button
              onClick={handleStartManualEntry}
              className="w-full mt-4 py-4 px-4 rounded-xl font-medium bg-white/5 border border-white/5 hover:bg-white/10 transition-colors text-white/80"
            >
              ✏️ Enter manually
            </button>
          </div>
        )}

        {loading && (
          <div className="mt-8 p-6 glass-panel rounded-3xl flex flex-col items-center justify-center border border-secondary/30 bg-secondary/5 h-64">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-white/80 font-medium">Analyzing food...</p>
          </div>
        )}

        {/* Errors before review (e.g. analysis failed); save errors render next to the Save button */}
        {error && !result && (
          <div className="mt-8 p-6 glass-panel rounded-2xl border border-red-500/30 bg-red-500/5">
            <p className="text-red-400 font-medium text-center">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full mt-4">
            
            {/* Top Card: Image + Ingredients */}
            <div className="glass-panel rounded-[2rem] p-5">
              <input
                type="text"
                value={result.foodName}
                onChange={(e) => setResult({...result, foodName: e.target.value})}
                placeholder="Meal name (e.g. Protein Shake)"
                autoFocus={!image}
                className={`w-full text-xl font-bold text-white bg-transparent focus:outline-none border-b transition-colors placeholder:text-white/30 ${image ? "border-transparent focus:border-white/20 mb-4" : "border-white/10 focus:border-white/30"}`}
              />

              {/* Manual entries have no photo, so skip the image box entirely */}
              {image && (
                <div className="flex justify-center">
                  <div className="w-full max-w-[200px] aspect-square rounded-2xl overflow-hidden relative bg-black/40 border border-white/5 shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt="Food" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>

            {/* Macro Cards */}
            <div className="grid grid-cols-4 gap-2">
              <div className="glass-panel p-3 rounded-2xl flex flex-col items-center justify-center border border-primary/20 bg-primary/5 text-center">
                <p className="text-sm font-bold text-white mb-0.5">{result.calories}</p>
                <p className="text-[9px] text-white/50 uppercase">Kcal</p>
              </div>
              <div className="glass-panel p-3 rounded-2xl flex flex-col justify-center border border-white/5 text-center relative overflow-hidden">
                <p className="text-sm font-bold text-primary mb-0.5">{result.protein}g</p>
                <p className="text-[9px] text-white/40 mb-2 whitespace-nowrap">
                  ({stats ? stats.protein + result.protein : result.protein}/{stats?.target_protein || 0}g)
                </p>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${Math.min(100, ((stats ? stats.protein + result.protein : result.protein) / (stats?.target_protein || 1)) * 100)}%` }} />
                </div>
              </div>
              <div className="glass-panel p-3 rounded-2xl flex flex-col justify-center border border-white/5 text-center relative overflow-hidden">
                <p className="text-sm font-bold text-secondary mb-0.5">{result.carbs}g</p>
                <p className="text-[9px] text-white/40 mb-2 whitespace-nowrap">
                  ({stats ? stats.carbs + result.carbs : result.carbs}/{stats?.target_carbs || 0}g)
                </p>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
                  <div className="h-full bg-secondary transition-all duration-300" style={{ width: `${Math.min(100, ((stats ? stats.carbs + result.carbs : result.carbs) / (stats?.target_carbs || 1)) * 100)}%` }} />
                </div>
              </div>
              <div className="glass-panel p-3 rounded-2xl flex flex-col justify-center border border-white/5 text-center relative overflow-hidden">
                <p className="text-sm font-bold text-[#E5A93B] mb-0.5">{result.fats}g</p>
                <p className="text-[9px] text-white/40 mb-2 whitespace-nowrap">
                  ({stats ? stats.fats + result.fats : result.fats}/{stats?.target_fats || 0}g)
                </p>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
                  <div className="h-full bg-[#E5A93B] transition-all duration-300" style={{ width: `${Math.min(100, ((stats ? stats.fats + result.fats : result.fats) / (stats?.target_fats || 1)) * 100)}%` }} />
                </div>
              </div>
            </div>

            {/* Adjust Portions */}
            <div className="glass-panel rounded-3xl p-5 mt-2">
              <h3 className="text-base font-bold text-white/90 mb-5">Adjust Portions</h3>
              
              <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                {/* Protein Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="macro-protein" className="text-xs text-white/80 font-medium">Protein (g)</label>
                    <input id="macro-protein" type="number" inputMode="decimal" min="0" max={MAX_MACRO_GRAMS} step="any" value={macroDraft("protein")} onChange={(e) => handleMacroInput("protein", e.target.value)} onBlur={() => clearDraft("protein")} className="w-16 bg-black/40 border border-white/10 rounded-md px-2 py-1 text-xs text-right text-white focus:outline-none focus:border-white/30 hide-arrows" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateMacros({protein: Math.max(0, result.protein - 1)})} className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors">-</button>
                    <input type="range" min="0" max="150" value={result.protein} onChange={(e) => updateMacros({protein: Number(e.target.value)})} className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary" />
                    <button onClick={() => updateMacros({protein: result.protein + 1})} className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors">+</button>
                  </div>
                </div>

                {/* Carbs Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="macro-carbs" className="text-xs text-white/80 font-medium">Carbs (g)</label>
                    <input id="macro-carbs" type="number" inputMode="decimal" min="0" max={MAX_MACRO_GRAMS} step="any" value={macroDraft("carbs")} onChange={(e) => handleMacroInput("carbs", e.target.value)} onBlur={() => clearDraft("carbs")} className="w-16 bg-black/40 border border-white/10 rounded-md px-2 py-1 text-xs text-right text-white focus:outline-none focus:border-white/30 hide-arrows" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateMacros({carbs: Math.max(0, result.carbs - 1)})} className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors">-</button>
                    <input type="range" min="0" max="300" value={result.carbs} onChange={(e) => updateMacros({carbs: Number(e.target.value)})} className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-secondary" />
                    <button onClick={() => updateMacros({carbs: result.carbs + 1})} className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors">+</button>
                  </div>
                </div>

                {/* Fats Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="macro-fats" className="text-xs text-white/80 font-medium">Fats (g)</label>
                    <input id="macro-fats" type="number" inputMode="decimal" min="0" max={MAX_MACRO_GRAMS} step="any" value={macroDraft("fats")} onChange={(e) => handleMacroInput("fats", e.target.value)} onBlur={() => clearDraft("fats")} className="w-16 bg-black/40 border border-white/10 rounded-md px-2 py-1 text-xs text-right text-white focus:outline-none focus:border-white/30 hide-arrows" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateMacros({fats: Math.max(0, result.fats - 1)})} className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors">-</button>
                    <input type="range" min="0" max="150" value={result.fats} onChange={(e) => updateMacros({fats: Number(e.target.value)})} className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#E5A93B]" />
                    <button onClick={() => updateMacros({fats: result.fats + 1})} className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors">+</button>
                  </div>
                </div>

                {/* Calories Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="macro-calories" className="text-xs text-white/80 font-medium">Calories</label>
                    <input id="macro-calories" type="number" inputMode="decimal" min="0" max={MAX_CALORIES} step="any" value={macroDraft("calories")} onChange={(e) => handleMacroInput("calories", e.target.value)} onBlur={() => clearDraft("calories")} className="w-16 bg-black/40 border border-white/10 rounded-md px-2 py-1 text-xs text-right text-white focus:outline-none focus:border-white/30 hide-arrows" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCalories(Math.max(0, result.calories - 10))} className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors">-</button>
                    <input type="range" min="0" max="2000" step="10" value={result.calories} onChange={(e) => setCalories(Number(e.target.value))} className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white" />
                    <button onClick={() => setCalories(result.calories + 10)} className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors">+</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mt-6">
              {error && (
                <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/5">
                  <p className="text-red-400 text-sm font-medium text-center">{error}</p>
                  <button onClick={() => setError(null)} className="mt-3 w-full py-2 bg-red-500/20 text-red-400 rounded-lg text-sm">Dismiss</button>
                </div>
              )}

              <button
                onClick={handleSaveMeal}
                disabled={saving || !result.foodName.trim()}
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
                  className="w-full bg-white/5 hover:bg-white/10 text-white/70 py-4 px-4 rounded-xl font-medium transition-colors"
                >
                  ⭐ Save as Template
                </button>
              ) : (
                <div className="bg-black/20 border border-white/5 p-4 rounded-2xl space-y-3">
                  <p className="text-sm font-medium text-white/80">Save this meal for quick logging later.</p>
                  <input 
                    type="text" 
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Morning Protein Shake"
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-white/20"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowTemplateInput(false)}
                      className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 text-sm font-medium hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveTemplate}
                      disabled={savingTemplate || !canSaveTemplate(templateName, result.foodName)}
                      className="flex-1 py-3 rounded-xl bg-secondary hover:bg-secondary/90 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      {savingTemplate ? "Saving..." : "Save Template"}
                    </button>
                  </div>
                </div>
              )}
              
              <button
                onClick={() => {
                  setResult(null);
                  setImage(null);
                  setError(null);
                  setDrafts({});
                  setCaloriesTouched(false);
                }}
                className="w-full py-4 text-white/40 hover:text-white/60 text-sm font-medium transition-colors"
              >
                {image ? "Discard & Retake Photo" : "Discard"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
