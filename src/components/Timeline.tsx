import React, { useState } from 'react';
import { HardHat, FileText, CheckCircle, Newspaper, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface TimelineItem {
  id: string;
  type: 'VISITA' | 'TAREA' | 'NOVEDAD' | 'DILIGENCIA';
  title: string;
  created_at: string;
  description?: string;
  author_name?: string;
}

interface TimelineProps {
  items: TimelineItem[];
  locationName: string;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'VISITA': return <HardHat className="w-5 h-5 text-indigo-600" />;
    case 'TAREA': return <CheckCircle className="w-5 h-5 text-emerald-600" />;
    case 'NOVEDAD': return <Newspaper className="w-5 h-5 text-amber-600" />;
    case 'DILIGENCIA': return <FileText className="w-5 h-5 text-rose-600" />;
    default: return <Clock className="w-5 h-5 text-slate-600" />;
  }
};

export const Timeline: React.FC<TimelineProps> = ({ items, locationName }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!items || items.length === 0) {
    return <p className="text-center p-4 text-xs italic text-slate-400">Sin historial registrado para esta ubicación.</p>;
  }

  return (
    <div className="relative border-l-2 border-slate-200 ml-3 space-y-4">
      {items.map((item) => {
        const dateObj = item.created_at ? new Date(item.created_at) : null;
        const dateFormatted = dateObj && !isNaN(dateObj.getTime()) 
          ? dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : 'Fecha no disponible';

        // Evitar redundancia visual
        const displayTitle = item.title.toLowerCase() === locationName.toLowerCase() 
          ? 'Registro general' 
          : item.title;

        return (
          <div key={item.id} className="relative pl-6">
            <div className="absolute -left-[9px] top-1 p-1 bg-white border-2 border-slate-300 rounded-full">
              {getIcon(item.type)}
            </div>
            <div className="bg-white border border-slate-200 rounded shadow-sm hover:shadow-md transition-shadow">
              <button 
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="w-full text-left p-3 flex justify-between items-center"
              >
                <div className="min-w-0 flex-1 mr-2">
                  <h3 className="font-bold text-slate-800 text-sm truncate">{displayTitle}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {item.type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {dateFormatted}
                    </span>
                  </div>
                </div>
                {expandedId === item.id ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </button>
              
              {expandedId === item.id && (
                <div className="px-3 pb-3 pt-0 text-xs text-slate-600 border-t border-slate-50">
                  <p className="whitespace-pre-wrap mt-2">{item.description || 'Sin detalles adicionales.'}</p>
                  {item.author_name && <p className="mt-2 text-[10px] opacity-70 italic">Autor: {item.author_name}</p>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
