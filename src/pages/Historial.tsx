import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getConsolidatedHistory } from '../db/historial';
import { Timeline } from '../components/Timeline';

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
        Historial de Ubicación
      </h1>
      <Timeline items={history} />
    </div>
  );
}
