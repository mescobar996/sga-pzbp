import React from 'react';
import { History } from 'lucide-react';

interface ActivityItem {
  title: string;
  detail: string;
  time: string;
  type: string;
  color: string;
}

export function RecentActivity({ data }: { data: ActivityItem[] }) {
  return (
    <div className="border-2 border-[#1a1a1a] bg-white p-6">
      <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-6 border-b-2 border-[#1a1a1a] pb-4">
        <History className="w-4 h-4 text-[#0055ff]" /> ACTIVIDAD RECIENTE
      </h3>
      <div className="space-y-6">
        {data.slice(0, 6).map((item, i) => (
          <div key={i} className="group">
            <div className="flex justify-between items-start mb-1">
              <p className="text-sm font-black uppercase truncate max-w-[80%]">{item.title}</p>
              <span className="text-[10px] font-bold opacity-40">{item.time}</span>
            </div>
            <p className="text-xs font-medium opacity-60 line-clamp-1">{item.detail}</p>
            <div className="mt-2">
              <span className={`text-[10px] font-black px-2 py-0.5 border border-[#1a1a1a] uppercase ${item.color} text-white`}>
                {item.type}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
