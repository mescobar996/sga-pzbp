import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getConsolidatedHistory, resolveLocationId } from '../db/historial';
import { getLocations } from '../db/locations';
import { supabase } from '../db/client';
import { Timeline } from '../components/Timeline';
import { UniversalFilter } from '../components/UniversalFilter';
import type { Location } from '../types';

// ─── Diagnóstico de datos ────────────────────────────────────────────────────
async function runDataDiagnostic(locationName: string, renderedCount: number) {
  console.group(`%c[SGA DIAGNÓSTICO] Ubicación: ${locationName}`, 'color:#0055ff;font-weight:bold;font-size:14px');

  const locationId = await resolveLocationId(locationName);
  if (!locationId) {
    console.error('❌ No se pudo resolver el location_id para:', locationName);
    console.groupEnd();
    return;
  }
  console.info('🔑 location_id resuelto:', locationId);

  // Count en cada tabla fuente (filtrado por location_id donde aplique)
  const [
    { count: visitasCount,  error: e1 },
    { count: tareasCount,   error: e2 },
    { count: novedadesCount,error: e3 },
    { count: diligCount,    error: e4 },
    { count: vistaCount,    error: e5 },
  ] = await Promise.all([
    supabase.from('visitas')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId),
    supabase.from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId),
    supabase.from('novedades')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId),
    supabase.from('diligenciamientos')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId),
    supabase.from('vw_location_history')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId),
  ]);

  [e1, e2, e3, e4, e5].forEach((e, i) => {
    if (e) console.error(`Error en fuente ${i + 1}:`, e);
  });

  const totalTablas = (visitasCount ?? 0) + (tareasCount ?? 0) + (novedadesCount ?? 0) + (diligCount ?? 0);

  console.table({
    'VISITAS  (tabla fuente)':        { count: visitasCount  ?? '❌ error' },
    'TAREAS   (tabla fuente)':        { count: tareasCount   ?? '❌ error' },
    'NOVEDADES (tabla fuente)':       { count: novedadesCount?? '❌ error' },
    'DILIGENCIAS (tabla fuente)':     { count: diligCount    ?? '❌ error' },
    '─────────────────────────':      { count: '──────' },
    'TOTAL TABLAS FUENTE':            { count: totalTablas },
    'TOTAL EN VISTA SQL':             { count: vistaCount    ?? '❌ error' },
    'TOTAL RENDERIZADO EN PANTALLA':  { count: renderedCount },
    '─────────────────────────────':  { count: '──────' },
    'PÉRDIDA VISTA vs TABLAS':        { count: totalTablas - (vistaCount ?? 0) },
    'PÉRDIDA RENDER vs VISTA':        { count: (vistaCount ?? 0) - renderedCount },
  });

  if (totalTablas !== (vistaCount ?? 0)) {
    console.warn(`⚠️  La vista SQL omite ${totalTablas - (vistaCount ?? 0)} registros respecto a las tablas fuente.`);
  } else {
    console.info('✅ La vista SQL coincide con el total de tablas fuente.');
  }

  if ((vistaCount ?? 0) !== renderedCount) {
    console.warn(`⚠️  Los filtros del frontend ocultan ${(vistaCount ?? 0) - renderedCount} registros.`);
  } else {
    console.info('✅ Todos los registros de la vista se están renderizando (sin filtros activos).');
  }

  console.groupEnd();
}
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

