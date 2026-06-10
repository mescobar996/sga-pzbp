import React, { useState, useEffect } from 'react';
import { getConsolidatedHistory } from '../../db/historial';
import { getLocations } from '../../db/locations';
import { SearchableSelect } from '../SearchableSelect';
import { History, HardHat, FileText, CheckCircle, Newspaper, X } from 'lucide-react';
import type { Location } from '../../types';

interface GlobalHistoryProps {
  isFocusMode?: boolean;
  onClose?: () => void;
}

export function GlobalHistory({ isFocusMode, onClose }: GlobalHistoryProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getLocations().then(setLocations);
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      setLoading(true);
      getConsolidatedHistory(selectedLocation).then(data => {
        setHistory(data);
        setLoading(false);
      });
    } else {
      setHistory([]);
    }
  }, [selectedLocation]);

  const containerClasses = isFocusMode
    ? "fixed inset-0 z-[100] bg-white p-6 overflow-y-auto"
    : "bg-white p-6 border-2 border-[#1a1a1a] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]";

  return (
    <div className={containerClasses}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
          <History className="w-6 h-6" />
          {isFocusMode ? 'HISTORIAL COMPLETO' : 'Consultar Historial por Destino'}
        </h2>
        {isFocusMode && (
          <button onClick={onClose} className="p-2 hover:bg-gray-100 border-2 border-[#1a1a1a]">
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="mb-6">
        <SearchableSelect
          options={locations.map(l => ({ value: l.id, label: l.name }))}
          value={selectedLocation}
          onChange={setSelectedLocation}
          placeholder="SELECCIONAR DESTINO..."
        />
      </div>

      {loading ? (
        <p className="text-sm font-bold opacity-60">Cargando...</p>
      ) : selectedLocation && history.length === 0 ? (
        <p className="text-sm font-bold opacity-60">No hay historial disponible para esta ubicación.</p>
      ) : (
        <div className={`space-y-3 ${isFocusMode ? '' : 'max-h-[400px] overflow-y-auto'}`}>
          {history.map((item, i) => (
            <div key={i} className="border-2 border-[#1a1a1a] p-3 flex gap-4 items-center hover:bg-slate-50 transition-colors">
              <div className="p-2 bg-gray-100 border border-[#1a1a1a]">
                {item.type === 'VISITA' && <HardHat className="w-4 h-4" />}
                {item.type === 'TAREA' && <CheckCircle className="w-4 h-4" />}
                {item.type === 'NOVEDAD' && <Newspaper className="w-4 h-4" />}
                {item.type === 'DILIGENCIA' && <FileText className="w-4 h-4" />}
              </div>
              <div>
                <p className="font-black text-xs uppercase">{item.title || item.type}</p>
                <p className="text-[10px] opacity-60">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
