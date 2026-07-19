"use client";

import { BarChart, Bar, XAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell, YAxis } from 'recharts';

interface ChartData {
  day: string;
  protein: number;
}

export default function WeeklyProteinChart({ data, target }: { data: ChartData[], target: number }) {
  // Find the maximum value to ensure the Y-axis has enough headroom for the reference line
  const maxProtein = Math.max(...data.map(d => d.protein), target);

  return (
    <div className="glass-panel p-6">
      <div className="mb-6">
        <h2 className="font-semibold text-lg text-white/95">Weekly Protein Trend</h2>
        <p className="text-xs text-white/40">Last 7 days vs daily target ({target}g)</p>
      </div>
      <div className="h-48 w-full -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} 
              axisLine={false} 
              tickLine={false}
              dy={10}
            />
            <YAxis hide domain={[0, maxProtein + 20]} />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ backgroundColor: '#2a2422', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
              itemStyle={{ color: '#fff', fontWeight: 'bold' }}
              labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '4px' }}
              formatter={(value: number) => [`${value}g`, 'Protein']}
            />
            <ReferenceLine y={target} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" />
            <Bar dataKey="protein" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.protein >= target ? 'var(--color-secondary)' : 'rgba(255,255,255,0.15)'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
