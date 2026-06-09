import React from 'react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { TrendingUp } from 'lucide-react';

function BrutalTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1a] border-2 border-[#1a1a1a] px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">{label}</p>
      {(payload || []).map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2" style={{ backgroundColor: p.color || p.fill }}></div>
          <p className="text-xs font-black text-white uppercase">{p.name}: {p.value}</p>
        </div>
      ))}
    </div>
  );
}

export function PulseChart({ data }: { data: any[] }) {
  return (
    <div className="border-2 border-[#1a1a1a] bg-white p-6">
      <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6">
        <TrendingUp className="w-4 h-4 text-[#0055ff]" /> PULSO OPERATIVO
      </h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a1a1a10" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 900 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fontWeight: 900 }} axisLine={false} tickLine={false} />
            <Tooltip content={<BrutalTooltip />} />
            <Area type="monotone" dataKey="VISITAS" stroke="#00cc66" strokeWidth={3} fillOpacity={0.05} fill="#00cc66" />
            <Area type="monotone" dataKey="TAREAS" stroke="#0055ff" strokeWidth={3} fillOpacity={0.05} fill="#0055ff" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
