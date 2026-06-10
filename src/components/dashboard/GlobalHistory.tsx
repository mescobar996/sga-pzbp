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
    <div className={containerClasses + " lg:max-w-2xl mx-auto"}>
      <div className="flex justify-between items-center mb-6 border-b-2 border-[#1a1a1a] pb-4">
        <h2 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
          <History className="w-5 h-5" />
          {isFocusMode ? 'HISTORIAL COMPLETO' : 'Historial por Destino'}
        </h2>
        {isFocusMode && (
          <button onClick={onClose} className="p-1 hover:bg-gray-100 border border-[#1a1a1a]">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="mb-6">
        <SearchableSelect
          options={locations.map(l => ({ value: l.name, label: l.name }))}
          value={selectedLocation}
          onChange={setSelectedLocation}
          placeholder="SELECCIONAR DESTINO..."
        />
      </div>

      {loading ? (
        <p className="text-xs font-bold opacity-60">Cargando...</p>
      ) : selectedLocation && history.length === 0 ? (
        <p className="text-xs font-bold opacity-60">No hay historial para esta ubicación.</p>
      ) : (
        <div className={`space-y-4 ${isFocusMode ? '' : 'max-h-[500px] overflow-y-auto pr-2'}`}>
          {history.map((item, i) => (
            <div key={i} className="border-2 border-[#1a1a1a] p-6 flex gap-6 items-start hover:bg-slate-50 transition-colors bg-white shadow-[4px_4px_0px_0px_rgba(26,26,26,0.1)]">
              <div className="p-3 bg-[#1a1a1a] text-white shrink-0">
                {item.type === 'VISITA' && <HardHat className="w-5 h-5" />}
                {item.type === 'NOVEDAD' && <Newspaper className="w-5 h-5" />}
                {item.type === 'DILIGENCIA' && <FileText className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-3">
                  <p className="font-black text-lg uppercase tracking-tight">{item.title || item.type}</p>
                  <span className="text-xs font-bold bg-gray-200 px-2 py-1 uppercase">{item.type}</span>
                </div>
                <div className="text-sm text-gray-800 mb-4 leading-relaxed bg-gray-50 p-4 border-l-4 border-[#0055ff]">
                  {item.content || item.observaciones || 'Sin detalles adicionales disponibles.'}
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold opacity-60 uppercase">
                  <span>{item.authorName || 'SISTEMA'}</span>
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
