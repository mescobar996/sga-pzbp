import React from 'react';
import { Activity } from 'lucide-react';

interface TaskStatus {
  name: string;
  value: number;
  fill: string;
}

export function TaskStatusBar({ data, total }: { data: TaskStatus[], total: number }) {
  return (
    <div className="p-6 border-2 border-[#1a1a1a] bg-[#1a1a1a] text-white">
      <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-white/20 pb-4">
        <Activity className="w-4 h-4" /> ESTADO DE TAREAS
      </h3>
      <div className="space-y-6">
        {data.map((s, i) => (
          <div key={i}>
            <div className="flex justify-between text-[10px] font-black mb-2 uppercase">
              <span>{s.name}</span>
              <span>{s.value}</span>
            </div>
            <div className="h-2 bg-white/10">
              <div 
                className="h-full transition-all duration-1000" 
                style={{ 
                  width: total > 0 ? `${(s.value / total) * 100}%` : '0%', 
                  backgroundColor: s.fill 
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
