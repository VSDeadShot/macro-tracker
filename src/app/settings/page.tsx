"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Targets {
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fats: number;
}

type Sex = "male" | "female";
type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
type Goal = "lose" | "maintain" | "gain";

interface BodyStats {
  weight: number;    // kg
  height: number;    // cm
  age: number;
  sex: Sex;
  activity: ActivityLevel;
  goal: Goal;
}

/**
 * Calculates daily macro targets using:
 * - Mifflin-St Jeor equation for BMR (most accurate for adults)
 * - Activity multiplier for TDEE
 * - Evidence-based protein: 1.6-2.2g/kg (Schoenfeld & Aragon, 2018)
 * - Healthy fats: ~25-30% of calories (minimum 0.8g/kg for hormonal health)
 * - Carbs: remaining calories
 */
function calculateTargets(stats: BodyStats): Targets {
  // Step 1: BMR via Mifflin-St Jeor
  let bmr: number;
  if (stats.sex === "male") {
    bmr = 10 * stats.weight + 6.25 * stats.height - 5 * stats.age + 5;
  } else {
    bmr = 10 * stats.weight + 6.25 * stats.height - 5 * stats.age - 161;
  }

  // Step 2: TDEE via activity multiplier
  const activityMultipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2,      // Desk job, no exercise
    light: 1.375,        // Light exercise 1-3 days/week
    moderate: 1.55,      // Moderate exercise 3-5 days/week
    active: 1.725,       // Hard exercise 6-7 days/week
    very_active: 1.9,    // Athlete / physical job + training
  };
  const tdee = bmr * activityMultipliers[stats.activity];

  // Step 3: Adjust calories for goal
  let targetCalories: number;
  if (stats.goal === "lose") {
    targetCalories = tdee - 500;  // ~0.5kg/week loss (safe and sustainable)
  } else if (stats.goal === "gain") {
    targetCalories = tdee + 300;  // Lean bulk surplus
  } else {
    targetCalories = tdee;
  }
  targetCalories = Math.round(targetCalories / 50) * 50; // Round to nearest 50

  // Step 4: Protein (evidence-based ranges)
  // Lose fat: 2.0g/kg (higher protein preserves muscle in deficit)
  // Maintain: 1.8g/kg
  // Gain muscle: 2.0g/kg
  const proteinPerKg = stats.goal === "maintain" ? 1.8 : 2.0;
  const targetProtein = Math.round(stats.weight * proteinPerKg / 5) * 5;

  // Step 5: Fats (25-30% of calories, minimum 0.8g/kg)
  const fatFromPercent = Math.round((targetCalories * 0.27) / 9); // 27% of cals, 9 cal/g
  const fatMinimum = Math.round(stats.weight * 0.8);
  const targetFats = Math.round(Math.max(fatFromPercent, fatMinimum) / 5) * 5;

  // Step 6: Carbs (remaining calories)
  // Total calories = protein*4 + carbs*4 + fats*9
  const remainingCalories = targetCalories - (targetProtein * 4) - (targetFats * 9);
  const targetCarbs = Math.round(Math.max(remainingCalories / 4, 50) / 5) * 5;

  return {
    target_calories: targetCalories,
    target_protein: targetProtein,
    target_carbs: targetCarbs,
    target_fats: targetFats,
  };
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
  const [showCalc, setShowCalc] = useState(false);
  const [stats, setStats] = useState<BodyStats>({
    weight: 70,
    height: 170,
    age: 20,
    sex: "male",
    activity: "moderate",
    goal: "maintain",
  });
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

  const handleAutoCalculate = () => {
    const calculated = calculateTargets(stats);
    setTargets(calculated);
    setShowCalc(false);
  };

  const fields = [
    { key: "target_calories" as const, label: "Daily Calories", unit: "kcal", color: "text-white" },
    { key: "target_protein" as const, label: "Protein", unit: "g", color: "text-primary" },
    { key: "target_carbs" as const, label: "Carbs", unit: "g", color: "text-secondary" },
    { key: "target_fats" as const, label: "Fats", unit: "g", color: "text-[#E5A93B]" },
  ];

  const activityLabels: Record<ActivityLevel, string> = {
    sedentary: "Sedentary (desk job)",
    light: "Light (1-3 days/week)",
    moderate: "Moderate (3-5 days/week)",
    active: "Active (6-7 days/week)",
    very_active: "Very Active (athlete)",
  };

  const goalLabels: Record<Goal, string> = {
    lose: "🔥 Lose Fat",
    maintain: "⚖️ Maintain",
    gain: "💪 Build Muscle",
  };

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
        {/* Smart Calculator Toggle */}
        <button
          onClick={() => setShowCalc(!showCalc)}
          className="w-full glass-panel p-4 flex items-center justify-between hover:bg-[#312b28] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-secondary/15 text-secondary p-2 rounded-lg border border-secondary/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-white/90">Smart Calculator</p>
              <p className="text-xs text-white/40">Auto-set targets based on your body</p>
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-white/40 transition-transform ${showCalc ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6"/></svg>
        </button>

        {/* Calculator Panel */}
        {showCalc && (
          <div className="glass-panel p-5 space-y-5 border border-secondary/20 bg-secondary/5 animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Body Stats</p>

            {/* Weight */}
            <div>
              <label className="flex justify-between items-center mb-2">
                <span className="text-sm text-white/70">Weight</span>
                <span className="text-sm font-bold">{stats.weight} kg</span>
              </label>
              <input type="range" min={30} max={200} step={1} value={stats.weight}
                onChange={(e) => setStats({ ...stats, weight: Number(e.target.value) })}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-secondary"
              />
            </div>

            {/* Height */}
            <div>
              <label className="flex justify-between items-center mb-2">
                <span className="text-sm text-white/70">Height</span>
                <span className="text-sm font-bold">{stats.height} cm</span>
              </label>
              <input type="range" min={120} max={220} step={1} value={stats.height}
                onChange={(e) => setStats({ ...stats, height: Number(e.target.value) })}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-secondary"
              />
            </div>

            {/* Age */}
            <div>
              <label className="flex justify-between items-center mb-2">
                <span className="text-sm text-white/70">Age</span>
                <span className="text-sm font-bold">{stats.age} years</span>
              </label>
              <input type="range" min={14} max={80} step={1} value={stats.age}
                onChange={(e) => setStats({ ...stats, age: Number(e.target.value) })}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-secondary"
              />
            </div>

            {/* Sex */}
            <div>
              <p className="text-sm text-white/70 mb-2">Sex</p>
              <div className="grid grid-cols-2 gap-2">
                {(["male", "female"] as Sex[]).map((s) => (
                  <button key={s} onClick={() => setStats({ ...stats, sex: s })}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${stats.sex === s ? "bg-secondary/20 text-secondary border border-secondary/30" : "bg-white/5 text-white/50 border border-white/5"}`}
                  >
                    {s === "male" ? "♂ Male" : "♀ Female"}
                  </button>
                ))}
              </div>
            </div>

            {/* Activity */}
            <div>
              <p className="text-sm text-white/70 mb-2">Activity Level</p>
              <div className="space-y-2">
                {(Object.keys(activityLabels) as ActivityLevel[]).map((level) => (
                  <button key={level} onClick={() => setStats({ ...stats, activity: level })}
                    className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium text-left transition-colors ${stats.activity === level ? "bg-secondary/20 text-secondary border border-secondary/30" : "bg-white/5 text-white/50 border border-white/5"}`}
                  >
                    {activityLabels[level]}
                  </button>
                ))}
              </div>
            </div>

            {/* Goal */}
            <div>
              <p className="text-sm text-white/70 mb-2">Goal</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(goalLabels) as Goal[]).map((g) => (
                  <button key={g} onClick={() => setStats({ ...stats, goal: g })}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${stats.goal === g ? "bg-secondary/20 text-secondary border border-secondary/30" : "bg-white/5 text-white/50 border border-white/5"}`}
                  >
                    {goalLabels[g]}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAutoCalculate}
              className="w-full bg-secondary/20 hover:bg-secondary/30 text-secondary py-3 px-4 rounded-xl font-medium transition-colors border border-secondary/30"
            >
              ✨ Calculate My Targets
            </button>

            <p className="text-[10px] text-white/30 text-center leading-relaxed">
              Uses the Mifflin-St Jeor equation for BMR, evidence-based protein recommendations (1.6–2.2g/kg), and healthy fat minimums for hormonal health.
            </p>
          </div>
        )}

        {/* Manual Sliders */}
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
