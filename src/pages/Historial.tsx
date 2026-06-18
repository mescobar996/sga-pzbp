import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getConsolidatedHistory } from '../db/historial';
import { getLocations } from '../db/locations';
import { Timeline } from '../components/Timeline';
import { UniversalFilter } from '../components/UniversalFilter';
import type { Location } from '../types';

export default function Historial() {
  const { locationId: locationParam } = useParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [activeFilter, setActiveFilter] = useState('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Carga de ubicaciones: resuelve el param del URL contra los nombres reales
  useEffect(() => {
    getLocations().then(data => {
      setLocations(data);
      if (data.length === 0) return;

      if (locationParam) {
        const matched = data.find(
          l => l.name.toLowerCase() === locationParam.toLowerCase()
        );
        setSelectedLocation(matched ? matched.name : data[0].name);
      } else {
        setSelectedLocation(data[0].name);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch del historial: se re-ejecuta SIEMPRE que cambia selectedLocation
  useEffect(() => {
    if (!selectedLocation) return;

    let cancelled = false; // evita race conditions si el usuario cambia rápido

    setHistory([]);   // limpia datos anteriores para que el cambio sea visible
    setLoading(true);

    getConsolidatedHistory(selectedLocation)
      .then(data => { if (!cancelled) setHistory(data); })
      .catch(() => { if (!cancelled) setHistory([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    navigate(`/historial/${selectedLocation}`, { replace: true });

    return () => { cancelled = true; }; // cleanup si desmonta o cambia antes de terminar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation]); // navigate es estable, no necesita estar en deps

  // Filtrado con fix de timezone: normaliza created_at a YYYY-MM-DD local
  const filteredItems = useMemo(() => {
    return history.filter(item => {
      const matchesFilter = activeFilter === 'TODOS' || item.type === activeFilter;
      const matchesSearch =
        !searchQuery ||
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // FIX TIMEZONE: created_at es un timestamp UTC. Lo convertimos a fecha
      // local (UTC-3 en este caso) antes de comparar con el string YYYY-MM-DD
      // del filtro, evitando que registros de "hoy" queden fuera del rango.
      let matchesStartDate = true;
      let matchesEndDate = true;
      if (startDate || endDate) {
        const rawDate = item.created_at;
        const localDateStr = rawDate
          ? new Date(rawDate).toLocaleDateString('en-CA') // 'en-CA' → YYYY-MM-DD
          : null;
        if (localDateStr) {
          if (startDate) matchesStartDate = localDateStr >= startDate;
          if (endDate)   matchesEndDate   = localDateStr <= endDate;
        }
      }

      return matchesFilter && matchesSearch && matchesStartDate && matchesEndDate;
    });
  }, [history, activeFilter, searchQuery, startDate, endDate]);

  const categories = ['TODOS', 'VISITA', 'TAREA', 'NOVEDAD', 'DILIGENCIA'];

  if (loading && history.length === 0) return <div className="p-8">Cargando...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-black uppercase mb-6">Historial: {selectedLocation}</h1>
      <UniversalFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={activeFilter}
        onCategoryChange={setActiveFilter}
        categories={categories}
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        locations={locations}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
      />
      <Timeline items={filteredItems} locationName={selectedLocation} />
    </div>
  );
}
