"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Targets {
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fats: number;
}

export default function SettingsPage() {
  const [targets, setTargets] = useState<Targets>({
    target_calories: 2000,
    target_protein: 150,
    target_carbs: 200,
    target_fats: 70,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/targets")
      .then((res) => res.json())
      .then((data) => {
        setTargets({
          target_calories: data.target_calories,
          target_protein: data.target_protein,
          target_carbs: data.target_carbs,
          target_fats: data.target_fats,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/targets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targets),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: "target_calories" as const, label: "Daily Calories", unit: "kcal", color: "text-white" },
    { key: "target_protein" as const, label: "Protein", unit: "g", color: "text-primary" },
    { key: "target_carbs" as const, label: "Carbs", unit: "g", color: "text-secondary" },
    { key: "target_fats" as const, label: "Fats", unit: "g", color: "text-[#E5A93B]" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white pb-32">
      <header className="px-6 pt-12 pb-6 max-w-md mx-auto">
        <button
          onClick={() => router.push("/")}
          className="text-white/50 hover:text-white/80 transition-colors mb-4 flex items-center gap-1 text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          Back
        </button>
        <h1 className="text-3xl font-bold tracking-tight text-white/95">Daily Targets</h1>
        <p className="text-white/50 text-sm mt-1">Set your daily macro goals.</p>
      </header>

      <main className="px-6 max-w-md mx-auto space-y-4">
        {fields.map((field) => (
          <div key={field.key} className="glass-panel p-5">
            <label className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-white/70">{field.label}</span>
              <span className={`text-lg font-bold ${field.color}`}>
                {targets[field.key]} {field.unit}
              </span>
            </label>
            <input
              type="range"
              min={field.key === "target_calories" ? 1000 : 20}
              max={field.key === "target_calories" ? 5000 : 500}
              step={field.key === "target_calories" ? 50 : 5}
              value={targets[field.key]}
              onChange={(e) =>
                setTargets({ ...targets, [field.key]: Number(e.target.value) })
              }
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-white/30 mt-1.5">
              <span>{field.key === "target_calories" ? "1000" : "20"}</span>
              <span>{field.key === "target_calories" ? "5000" : "500"}</span>
            </div>
          </div>
        ))}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary hover:bg-primary/90 text-white py-4 px-4 rounded-2xl font-medium transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 mt-6"
        >
          {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Targets"}
        </button>
      </main>
    </div>
  );
}
