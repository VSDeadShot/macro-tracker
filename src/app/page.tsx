import Link from "next/link";
import prisma from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import MealCard from "@/components/MealCard";

// Opt out of caching so the dashboard updates immediately when we redirect to it
export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch today's meals for the authenticated user
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const meals = await prisma.meal.findMany({
    where: {
      user_id: user!.id,
      logged_at: {
        gte: startOfDay,
      },
    },
    orderBy: {
      logged_at: "desc",
    },
  });

  // Calculate totals
  const totalCalories = meals.reduce((sum: number, meal: { calories: number }) => sum + meal.calories, 0);
  const totalProtein = meals.reduce((sum: number, meal: { protein: number }) => sum + meal.protein, 0);
  const totalCarbs = meals.reduce((sum: number, meal: { carbs: number }) => sum + meal.carbs, 0);
  const totalFats = meals.reduce((sum: number, meal: { fats: number }) => sum + meal.fats, 0);

  // Fetch user's custom targets (or use defaults)
  let userTargets = await prisma.dailyTarget.findUnique({
    where: { user_id: user!.id },
  });

  const TARGET_CALORIES = userTargets?.target_calories ?? 2000;
  const TARGET_PROTEIN = userTargets?.target_protein ?? 150;
  const TARGET_CARBS = userTargets?.target_carbs ?? 200;
  const TARGET_FATS = userTargets?.target_fats ?? 70;

  // Calculate progress percentages (capped at 100%)
  const calPercent = Math.min(100, Math.round((totalCalories / TARGET_CALORIES) * 100));
  const proPercent = Math.min(100, Math.round((totalProtein / TARGET_PROTEIN) * 100));
  const carbPercent = Math.min(100, Math.round((totalCarbs / TARGET_CARBS) * 100));
  const fatPercent = Math.min(100, Math.round((totalFats / TARGET_FATS) * 100));

  return (
    <div className="min-h-screen bg-background text-white pb-32">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex justify-between items-end max-w-md mx-auto">
        <div>
          <p className="text-primary font-medium text-sm mb-1 tracking-wide uppercase">Today</p>
          <h1 className="text-3xl font-bold tracking-tight text-white/95">
            Dashboard
          </h1>
        </div>
        <Link href="/settings" className="w-10 h-10 rounded-full bg-card border border-white/5 flex items-center justify-center text-white/50 shadow-sm overflow-hidden hover:border-primary/30 transition-colors">
          <div className="w-full h-full bg-primary/20 text-primary flex items-center justify-center font-bold">
            {user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
          </div>
        </Link>
      </header>

      <main className="px-6 space-y-8 max-w-md mx-auto">
        {/* Macros Summary Card */}
        <section className="glass-panel p-6">
          <div className="flex justify-between items-baseline mb-6">
            <h2 className="font-semibold text-lg">Daily Targets</h2>
            <span className="text-xs font-medium text-white/40">{Math.round(totalCalories)} / {TARGET_CALORIES} kcal</span>
          </div>
          
          <div className="grid grid-cols-3 gap-5">
            <div className="flex flex-col gap-2.5">
              <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" style={{ width: `${proPercent}%` }}></div>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">{Math.round(totalProtein)}g</span>
                <span className="text-xs text-white/40">Protein</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-2.5">
              <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                <div className="h-full bg-secondary rounded-full transition-all duration-1000 ease-out" style={{ width: `${carbPercent}%` }}></div>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">{Math.round(totalCarbs)}g</span>
                <span className="text-xs text-white/40">Carbs</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-2.5">
              <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                <div className="h-full bg-[#E5A93B] rounded-full transition-all duration-1000 ease-out" style={{ width: `${fatPercent}%` }}></div>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">{Math.round(totalFats)}g</span>
                <span className="text-xs text-white/40">Fats</span>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Meals */}
        <section>
          <h3 className="font-medium text-white/60 mb-4 px-1 text-sm">Today's Meals</h3>
          
          {meals.length === 0 ? (
            <div className="glass-panel p-10 flex flex-col items-center justify-center text-center border border-dashed border-white/10 bg-transparent shadow-none">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 text-white/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M2 12h20"/></svg>
              </div>
              <p className="text-sm text-white/50 font-medium">No meals logged today</p>
              <p className="text-xs text-white/30 mt-1">Tap below to scan your first meal.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {meals.map((meal) => (
                <MealCard key={meal.id} meal={meal} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Floating Action Button area */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <Link 
            href="/log" 
            className="w-full bg-primary hover:bg-primary/90 text-white py-4 px-8 rounded-2xl text-lg font-medium transition-all duration-200 flex items-center justify-center gap-3 shadow-[0_8px_30px_rgba(201,112,74,0.25)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            Scan a Meal
          </Link>
        </div>
      </div>
    </div>
  );
}
