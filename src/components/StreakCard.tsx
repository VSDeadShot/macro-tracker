import React from 'react';

export default function StreakCard({ streak }: { streak: number }) {
  return (
    <div className="glass-panel p-5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-300 ${streak > 0 ? 'bg-primary/20 border-primary/30 shadow-[0_0_15px_rgba(201,112,74,0.3)]' : 'bg-white/5 border-white/10'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-all duration-300 ${streak > 0 ? 'text-primary drop-shadow-[0_0_8px_rgba(201,112,74,0.8)]' : 'text-white/30'}`}>
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white/95">{streak} {streak === 1 ? 'Day' : 'Days'}</h2>
          <p className="text-sm font-medium text-white/50">Current Streak</p>
        </div>
      </div>
      {streak > 0 ? (
        <div className="text-xs font-semibold bg-primary/20 text-primary px-3 py-1.5 rounded-full border border-primary/30">
          On Fire!
        </div>
      ) : (
        <div className="text-xs font-medium bg-white/5 text-white/40 px-3 py-1.5 rounded-full border border-white/10">
          Start today!
        </div>
      )}
    </div>
  );
}
