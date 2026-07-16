"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Meal {
  id: string;
  food_items: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export default function MealCard({ meal }: { meal: Meal }) {
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/meals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: meal.id }),
      });

      if (!res.ok) throw new Error("Failed to delete");

      // Refresh the page data from the server
      router.refresh();
    } catch (err) {
      console.error(err);
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="glass-panel p-4 flex justify-between items-center relative overflow-hidden">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white/90 truncate">{meal.food_items}</p>
        <div className="flex gap-3 text-xs text-white/40 mt-1 font-medium">
          <span className="text-primary">{Math.round(meal.protein)}g P</span>
          <span className="text-secondary">{Math.round(meal.carbs)}g C</span>
          <span className="text-[#E5A93B]">{Math.round(meal.fats)}g F</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="font-bold">{Math.round(meal.calories)}</p>
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Kcal</p>
        </div>

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="p-2 rounded-lg hover:bg-red-500/10 text-white/25 hover:text-red-400 transition-colors"
            title="Delete meal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        ) : (
          <div className="flex gap-1">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              {deleting ? "..." : "Delete"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="px-2 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs font-medium hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
