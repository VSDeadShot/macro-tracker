import Link from "next/link";
import prisma from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import MealCard from "@/components/MealCard";
import InstallPWA from "@/components/InstallPWA";
import WeeklyProteinChart from "@/components/WeeklyProteinChart";
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { subDays, format } from 'date-fns';

interface Meal {
  id: string;
  food_items: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  logged_at: Date;
  user_id: string;
  image_url: string | null;
}

// Opt out of caching so the dashboard updates immediately when we redirect to it
export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const TIMEZONE = 'Asia/Kolkata';
  
  // 1. Get current time in UTC
  const nowUtc = new Date();
  
  // 2. Convert current time to IST
  const nowIst = toZonedTime(nowUtc, TIMEZONE);
  
  // 3. Calculate start of today in IST
  const startOfTodayIst = new Date(nowIst.getFullYear(), nowIst.getMonth(), nowIst.getDate());
  
  // 4. Calculate start of 6 days ago in IST (so we have 7 days total including today)
  const startOf7DaysAgoIst = subDays(startOfTodayIst, 6);
  
  // 5. Convert that boundary back to UTC for the database query
  const queryStartDateUtc = fromZonedTime(startOf7DaysAgoIst, TIMEZONE);

  // Fetch all meals for the last 7 days
  const meals = await prisma.meal.findMany({
    where: {
      user_id: user!.id,
      logged_at: {
        gte: queryStartDateUtc,
      },
    },
    orderBy: {
      logged_at: "asc",
    },
  });

  // Filter for TODAY's meals for the summary cards and meal list
  const todayStartUtc = fromZonedTime(startOfTodayIst, TIMEZONE);
  const todayMeals = meals.filter((meal: Meal) => meal.logged_at >= todayStartUtc);

  // Calculate totals for TODAY
  const totalCalories = todayMeals.reduce((sum: number, meal: Meal) => sum + meal.calories, 0);
  const totalProtein = todayMeals.reduce((sum: number, meal: Meal) => sum + meal.protein, 0);
  const totalCarbs = todayMeals.reduce((sum: number, meal: Meal) => sum + meal.carbs, 0);
  const totalFats = todayMeals.reduce((sum: number, meal: Meal) => sum + meal.fats, 0);

  // Build the 7-day chart data
  const weeklyMap = new Map<string, { day: string; protein: number; sortKey: number }>();
  for (let i = 6; i >= 0; i--) {
    const day = subDays(startOfTodayIst, i);
    const dayKey = format(day, 'EEE'); // e.g. "Mon"
    weeklyMap.set(dayKey, { day: dayKey, protein: 0, sortKey: day.getTime() });
  }

  // Populate map with aggregated protein data
  meals.forEach((meal: Meal) => {
    const mealIst = toZonedTime(meal.logged_at, TIMEZONE);
    const dayKey = format(mealIst, 'EEE');
    if (weeklyMap.has(dayKey)) {
      const existing = weeklyMap.get(dayKey)!;
      existing.protein += meal.protein;
    }
  });

  // Convert map to array and sort chronologically just in case
  const weeklyData = Array.from(weeklyMap.values()).sort((a, b) => a.sortKey - b.sortKey);

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
        <div className="flex items-center">
          <InstallPWA />
          <Link href="/settings" className="w-10 h-10 rounded-full bg-card border border-white/5 flex items-center justify-center text-white/50 shadow-sm overflow-hidden hover:border-primary/30 transition-colors">
            <div className="w-full h-full bg-primary/20 text-primary flex items-center justify-center font-bold">
              {user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
            </div>
          </Link>
        </div>
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

        {/* Weekly Protein Trend Chart */}
        <WeeklyProteinChart data={weeklyData} target={TARGET_PROTEIN} />

        {/* Recent Meals */}
        <section>
          <h3 className="font-medium text-white/60 mb-4 px-1 text-sm">Today's Meals</h3>
          
          {todayMeals.length === 0 ? (
            <div className="glass-panel p-10 flex flex-col items-center justify-center text-center border border-dashed border-white/10 bg-transparent shadow-none">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 text-white/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M2 12h20"/></svg>
              </div>
              <p className="text-sm text-white/50 font-medium">No meals logged today</p>
              <p className="text-xs text-white/30 mt-1">Tap below to scan your first meal.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayMeals.map((meal: Meal) => (
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
