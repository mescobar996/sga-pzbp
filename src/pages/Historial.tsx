import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getConsolidatedHistory } from '../db/historial';
import { getLocations } from '../db/locations';
import { Timeline } from '../components/Timeline';
import { UniversalFilter } from '../components/UniversalFilter';
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
      />
      <Timeline items={filteredItems} locationName={selectedLocation} />
    </div>
  );
}
