import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getConsolidatedHistory } from '../db/historial';
import { getLocations } from '../db/locations';
import { Timeline } from '../components/Timeline';
import { UniversalFilter } from '../components/UniversalFilter';
import { supabase } from '../db/client';
import type { Location } from '../types';

// ─── Diagnóstico de datos (ajustado al esquema real) ─────────────────────────
async function runDataDiagnostic(locationName: string, renderedCount: number) {
  const name = locationName.trim();
  console.group(`%c[SGA DIAGNÓSTICO] Ubicación: ${name}`, 'color:#0055ff;font-weight:bold;font-size:14px');

  // VISITAS: filtradas por origen/destino (no tienen location_id)
  // TAREAS / NOVEDADES / DILIGENCIAMIENTOS: globales (no tienen campo de ubicación)
  const [
    { count: visitasCount,  error: e1 },
    { count: tareasCount,   error: e2 },
    { count: novedadesCount,error: e3 },
    { count: diligCount,    error: e4 },
  ] = await Promise.all([
    supabase.from('visitas')
      .select('*', { count: 'exact', head: true })
      .or(`origen.ilike.%${name}%,destino.ilike.%${name}%`),
    supabase.from('tasks')
      .select('*', { count: 'exact', head: true }),
    supabase.from('novedades')
      .select('*', { count: 'exact', head: true }),
    supabase.from('diligenciamientos')
      .select('*', { count: 'exact', head: true }),
  ]);

  [e1, e2, e3, e4].forEach((e, i) => {
    if (e) console.error(`Error en fuente ${i + 1}:`, e);
  });

  const totalEsperado = (visitasCount ?? 0) + (tareasCount ?? 0) + (novedadesCount ?? 0) + (diligCount ?? 0);

  console.table({
    'VISITAS  (filtradas por ubicación)': { count: visitasCount  ?? '❌ error', filtro: `origen/destino ilike %${name}%` },
    'TAREAS   (globales)':                { count: tareasCount   ?? '❌ error', filtro: 'todas' },
    'NOVEDADES (globales)':               { count: novedadesCount?? '❌ error', filtro: 'todas' },
    'DILIGENCIAS (globales)':             { count: diligCount    ?? '❌ error', filtro: 'todas' },
    '──────────────────────────────────': { count: '──────',                    filtro: '' },
    'TOTAL ESPERADO':                     { count: totalEsperado,               filtro: '' },
    'TOTAL RENDERIZADO EN PANTALLA':      { count: renderedCount,               filtro: '' },
    'PÉRDIDA (esperado - render)':        { count: totalEsperado - renderedCount, filtro: '' },
  });

  if (totalEsperado === renderedCount) {
    console.info('✅ Sin pérdida de datos. Todo está renderizado.');
  } else {
    console.warn(`⚠️  Se esperaban ${totalEsperado} registros pero se renderizan ${renderedCount}. Diferencia: ${totalEsperado - renderedCount}`);
  }

  console.groupEnd();
}
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────

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
  }, [selectedLocation]);

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

  // Diagnóstico: se ejecuta una vez al cargar el historial completo (sin filtros)
  useEffect(() => {
    if (!selectedLocation || loading || history.length === 0) return;
    // Pasa el conteo SIN filtros activos para medir pérdida real de la vista/render
    runDataDiagnostic(selectedLocation, history.length);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation, loading]); // solo cuando termina el fetch inicial

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

