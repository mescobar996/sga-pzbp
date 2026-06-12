import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    getLocations().then(data => {
      setLocations(data);
      if (!selectedLocation && data.length > 0) {
        setSelectedLocation(data[0].name);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      setLoading(true);
      getConsolidatedHistory(selectedLocation).then(data => {
        setHistory(data);
        setLoading(false);
      });
      // Update URL if needed
      if (selectedLocation !== locationId) {
        navigate(`/historial/${selectedLocation}`, { replace: true });
      }
    }
  }, [selectedLocation, locationId, navigate]);

  if (loading && history.length === 0) return <div className="p-8">Cargando historial...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8 border-b-4 border-[#1a1a1a] pb-4">
        <h1 className="text-3xl font-black uppercase">
          Historial: {selectedLocation}
        </h1>
        <select 
          value={selectedLocation} 
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="bg-slate-100 border-2 border-[#1a1a1a] font-bold p-2 uppercase"
        >
          {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
        </select>
      </div>
      <Timeline items={history} />
    </div>
  );
}
