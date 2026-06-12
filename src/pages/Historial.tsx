import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getConsolidatedHistory } from '../db/historial';
import { getLocations } from '../db/locations';
import { Timeline } from '../components/Timeline';
import type { Location } from '../types';

export default function Historial() {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(locationId || '');
  const [activeFilter, setActiveFilter] = useState('TODOS');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getLocations().then(data => {
      setLocations(data);
      if (!selectedLocation && data.length > 0) setSelectedLocation(data[0].name);
    });
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      setLoading(true);
      getConsolidatedHistory(selectedLocation).then(data => {
        setHistory(data);
        setLoading(false);
      });
      if (selectedLocation !== locationId) navigate(`/historial/${selectedLocation}`, { replace: true });
    }
  }, [selectedLocation, locationId, navigate]);

  const filteredItems = useMemo(() => {
    return history.filter(item => {
      const matchesFilter = activeFilter === 'TODOS' || item.type === activeFilter;
      const matchesSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [history, activeFilter, searchQuery]);

  const categories = ['TODOS', 'VISITA', 'TAREA', 'NOVEDAD', 'DILIGENCIA'];

  if (loading && history.length === 0) return <div className="p-8">Cargando...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex flex-col gap-6 mb-8 border-b-4 border-[#1a1a1a] pb-6">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-black uppercase">Historial: {selectedLocation}</h1>
            <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className="bg-slate-100 border-2 border-[#1a1a1a] font-bold p-2 uppercase">
                {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </select>
        </div>
        <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
                <button key={cat} onClick={() => setActiveFilter(cat)} className={`px-4 py-2 font-bold uppercase text-xs border-2 border-[#1a1a1a] ${activeFilter === cat ? 'bg-[#1a1a1a] text-white' : 'bg-white hover:bg-slate-100'}`}>
                    {cat}
                </button>
            ))}
        </div>
        <input type="text" placeholder="Buscar en el historial..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full p-3 border-2 border-[#1a1a1a] font-bold text-sm" />
      </div>
      <Timeline items={filteredItems} locationName={selectedLocation} />
    </div>
  );
}
