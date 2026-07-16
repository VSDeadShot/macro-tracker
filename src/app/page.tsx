import Link from "next/link";

export default function Home() {
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
        <div className="w-10 h-10 rounded-full bg-card border border-white/5 flex items-center justify-center text-white/50 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
      </header>

      <main className="px-6 space-y-8 max-w-md mx-auto">
        {/* Macros Summary Card */}
        <section className="glass-panel p-6">
          <div className="flex justify-between items-baseline mb-6">
            <h2 className="font-semibold text-lg">Daily Targets</h2>
            <span className="text-xs font-medium text-white/40">0 / 2,000 kcal</span>
          </div>
          
          <div className="grid grid-cols-3 gap-5">
            <div className="flex flex-col gap-2.5">
              <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[0%] rounded-full"></div>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">0g</span>
                <span className="text-xs text-white/40">Protein</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-2.5">
              <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                <div className="h-full bg-secondary w-[0%] rounded-full"></div>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">0g</span>
                <span className="text-xs text-white/40">Carbs</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-2.5">
              <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                <div className="h-full bg-[#E5A93B] w-[0%] rounded-full"></div>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">0g</span>
                <span className="text-xs text-white/40">Fats</span>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Meals */}
        <section>
          <h3 className="font-medium text-white/60 mb-4 px-1 text-sm">Today's Meals</h3>
          <div className="glass-panel p-10 flex flex-col items-center justify-center text-center border border-dashed border-white/10 bg-transparent shadow-none">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 text-white/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M2 12h20"/></svg>
            </div>
            <p className="text-sm text-white/50 font-medium">No meals logged today</p>
            <p className="text-xs text-white/30 mt-1">Tap below to scan your first meal.</p>
          </div>
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
