import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Zap, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { toast } from 'sonner';

import { getTasks, onTasksChange } from '../db/tasks';
import { getVisitas, onVisitasChange } from '../db/visitas';
import { getNovedades, onNovedadesChange } from '../db/novedades';
import { getDiligenciamientos, onDiligenciamientosChange } from '../db/diligenciamientos';
import { getPersonal, onPersonalChange } from '../db/personal';
import { getLocations, onLocationsChange } from '../db/locations';
import { withTimeout } from '../db/client';
import type { Task, Visita, Novedad, Diligenciamiento, Personal as PersonalType, Location as LocationType } from '../types';

import DiligenciamientoFilter from '../components/dashboard/DiligenciamientoFilter';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { TaskStatusBar } from '../components/dashboard/TaskStatusBar';
import { PulseChart } from '../components/dashboard/PulseChart';
import { DashboardHistory } from '../components/dashboard/DashboardHistory';

export default function Dashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [visits, setVisits] = useState<Visita[]>([]);
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [diligenciamientos, setDiligenciamientos] = useState<Diligenciamiento[]>([]);
  const [personal, setPersonal] = useState<PersonalType[]>([]);
  const [locations, setLocations] = useState<LocationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{ category?: string; fechaInicio?: string; fechaFin?: string }>({});
  const [selectedLocation, setSelectedLocation] = useState('PZBP'); // Default

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksData, visitsData, novedadesData, diligenciamientosData, personalData, locationsData] = await withTimeout(Promise.all([
        getTasks(), getVisitas(), getNovedades(),
        getDiligenciamientos(filters),
        getPersonal(), getLocations(),
      ]), 8000);
      setTasks(tasksData);
      setVisits(visitsData);
      setNovedades(novedadesData);
      setDiligenciamientos(diligenciamientosData);
      setPersonal(personalData);
      setLocations(locationsData);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAll();
    const unsubTasks = onTasksChange(setTasks);
    const unsubVisitas = onVisitasChange(setVisits);
    const unsubNovedades = onNovedadesChange(setNovedades);
    const unsubDiligenciamientos = onDiligenciamientosChange(setDiligenciamientos);
    const unsubPersonal = onPersonalChange(setPersonal);
    const unsubLocations = onLocationsChange(setLocations);
    return () => {
      unsubTasks(); unsubVisitas(); unsubNovedades();
      unsubDiligenciamientos(); unsubPersonal(); unsubLocations();
    };
  }, [loadAll]);

  const pulseData = useMemo(() => {
    const dates = Array.from({ length: 15 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (14 - i));
      return d.toISOString().split('T')[0];
    });
    return dates.map(date => ({
      date: new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase(),
      VISITAS: visits.filter(v => v.fecha === date).length,
      TAREAS: tasks.filter(t => t.createdAt.split('T')[0] === date).length,
      NOVEDADES: novedades.filter(n => (n.fecha || n.createdAt).split('T')[0] === date).length,
    }));
  }, [visits, tasks, novedades]);

  const recentItems = useMemo(() => {
    const items: any[] = [];
    novedades.forEach(n => items.push({ title: n.title, detail: n.authorName, time: new Date(n.createdAt).toLocaleDateString(), type: 'NOVEDAD', color: 'bg-[#1a1a1a]' }));
    tasks.slice(0, 5).forEach(t => items.push({ title: t.title, detail: t.status.toUpperCase(), time: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—', type: 'TAREA', color: 'bg-[#0055ff]' }));
    visits.slice(0, 5).forEach(v => items.push({ title: `${v.origen} → ${v.destino}`, detail: v.responsable, time: v.fecha, type: 'VISITA', color: 'bg-[#00cc66]' }));
    return items.sort((a, b) => 0);
  }, [novedades, tasks, visits]);

  const statusData = [
    { name: 'COMPLETADAS', value: tasks.filter(t => t.status === 'completado').length, fill: '#00cc66' },
    { name: 'EN PROCESO', value: tasks.filter(t => t.status === 'en_proceso').length, fill: '#0055ff' },
    { name: 'PENDIENTES', value: tasks.filter(t => t.status === 'pendiente').length, fill: '#ff9900' },
  ];

  return (
    <div className="font-['Inter'] max-w-[1600px] mx-auto px-6 pb-24 pt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b-4 border-[#1a1a1a] pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase font-['Space_Grotesk'] tracking-tighter">CENTRO DE MANDO</h1>
          <p className="text-xs font-black opacity-50 uppercase tracking-widest mt-2">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <DiligenciamientoFilter onFilterChange={setFilters} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="flex flex-col gap-6 h-full">
          <RecentActivity data={recentItems} />
          <TaskStatusBar data={statusData} total={tasks.length} />
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
          <PulseChart data={pulseData} />
          <div className="bg-white border-4 border-[#1a1a1a] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] p-6 h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black uppercase">Historial por Destino: {selectedLocation}</h2>
              <select 
                value={selectedLocation} 
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="bg-slate-100 border-2 border-[#1a1a1a] font-bold text-xs p-1 uppercase"
              >
                {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
              </select>
            </div>
            <DashboardHistory locationCode={selectedLocation} />
          </div>
        </div>
      </div>
    </div>
  );
}
