import React, { useState } from 'react';
import { HardHat, FileText, CheckCircle, Newspaper, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface TimelineItem {
  id: string;
  type: 'VISITA' | 'TAREA' | 'NOVEDAD' | 'DILIGENCIA';
  title: string;
  createdAt: string;
  // Detalle adicional que podría venir de la vista
  description?: string;
  author_name?: string;
}

interface TimelineProps {
  items: TimelineItem[];
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

export const Timeline: React.FC<TimelineProps> = ({ items }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (items.length === 0) {
    return <p className="text-center p-6 text-slate-500">No hay eventos en el historial.</p>;
  }

  return (
    <div className="relative border-l-2 border-slate-200 ml-3 space-y-8">
      {items.map((item) => (
        <div key={item.id} className="relative pl-8">
          <div className="absolute -left-[9px] top-1 p-1 bg-white border-2 border-slate-300 rounded-full">
            {getIcon(item.type)}
          </div>
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <button 
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              className="w-full text-left p-4 flex justify-between items-center"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-block px-2 py-0.5 text-xs font-bold uppercase rounded bg-slate-100 text-slate-600">
                    {item.type}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-bold text-slate-800">{item.title}</h3>
              </div>
              {expandedId === item.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            
            {expandedId === item.id && (
              <div className="px-4 pb-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
                <p>{item.description || 'Sin descripción disponible.'}</p>
                {item.author_name && <p className="mt-2 text-xs opacity-70 italic">Autor: {item.author_name}</p>}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
