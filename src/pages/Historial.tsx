import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
        // El param puede ser un nombre (ASEC, CORO…) — buscarlo case-insensitive
        const matched = data.find(
          l => l.name.toLowerCase() === locationParam.toLowerCase()
        );
        setSelectedLocation(matched ? matched.name : data[0].name);
      } else {
        setSelectedLocation(data[0].name);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // solo en mount

  // Fetch del historial cada vez que cambia la ubicación seleccionada
  const fetchHistory = useCallback(async (locationName: string) => {
    setLoading(true);
    try {
      const data = await getConsolidatedHistory(locationName);
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedLocation) return;
    fetchHistory(selectedLocation);
    navigate(`/historial/${selectedLocation}`, { replace: true });
  }, [selectedLocation]); // solo depende del nombre de ubicación

  const filteredItems = useMemo(() => {
    return history.filter(item => {
      const matchesFilter = activeFilter === 'TODOS' || item.type === activeFilter;
      const matchesSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const itemDate = item.date || item.fecha; // Normalizando la fecha del item
      const matchesStartDate = !startDate || itemDate >= startDate;
      const matchesEndDate = !endDate || itemDate <= endDate;
      
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
