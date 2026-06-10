import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getConsolidatedHistory } from '../db/historial';
import { History, HardHat, FileText, CheckCircle, Newspaper } from 'lucide-react';

export default function Historial() {
  const { locationId } = useParams();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (locationId) {
      getConsolidatedHistory(locationId).then(data => {
        setHistory(data);
        setLoading(false);
      });
    }
  }, [locationId]);

  if (loading) return <div className="p-8">Cargando historial...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-black uppercase mb-8 border-b-4 border-[#1a1a1a] pb-4">
        Historial de Ubicación: {locationId}
      </h1>
      <div className="space-y-4">
        {history.map((item, i) => (
          <div key={i} className="border-2 border-[#1a1a1a] p-4 flex gap-4 items-center hover:bg-slate-50 transition-colors">
            <div className="p-2 border border-[#1a1a1a]">
              {item.type === 'VISITA' && <HardHat className="w-5 h-5" />}
              {item.type === 'TAREA' && <CheckCircle className="w-5 h-5" />}
              {item.type === 'NOVEDAD' && <Newspaper className="w-5 h-5" />}
              {item.type === 'DILIGENCIA' && <FileText className="w-5 h-5" />}
            </div>
            <div>
              <p className="font-black text-sm uppercase">{item.title || item.type}</p>
              <p className="text-xs opacity-60">{new Date(item.createdAt).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
