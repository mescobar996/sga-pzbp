import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Clock, AlertTriangle, Newspaper, ArrowRight, HardHat, Plus, TrendingUp, ClipboardList, FileText, Calendar, ListChecks, Users, MapPin } from 'lucide-react';
import { getTasks, onTasksChange } from '../db/tasks';
import { getVisitas, onVisitasChange } from '../db/visitas';
import { getNovedades, onNovedadesChange } from '../db/novedades';
import { getDiligenciamientos, onDiligenciamientosChange } from '../db/diligenciamientos';
import { getPersonal, onPersonalChange } from '../db/personal';
import { getLocations, onLocationsChange } from '../db/locations';
import { withTimeout } from '../db/client';
import type { Task, Visita, Novedad, Diligenciamiento, Personal as PersonalType, Location as LocationType } from '../types';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { toast } from 'sonner';

function handleFirestoreError(error: unknown, collectionName: string) {
  console.error(`Error loading ${collectionName}:`, error);
  toast.error(`Error al cargar ${collectionName}`);
}

function SkeletonCard() {
  return (
    <div className="p-4 border-2 border-[#1a1a1a] bg-white animate-pulse">
      <div className="h-2 w-24 bg-[#1a1a1a]/10 mb-3"></div>
      <div className="h-8 w-16 bg-[#1a1a1a]/10"></div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [visits, setVisits] = useState<Visita[]>([]);
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [diligenciamientos, setDiligenciamientos] = useState<Diligenciamiento[]>([]);
  const [personal, setPersonal] = useState<PersonalType[]>([]);
  const [locations, setLocations] = useState<LocationType[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [tasksData, visitsData, novedadesData, diligenciamientosData, personalData, locationsData] = await withTimeout(Promise.all([
        getTasks(),
        getVisitas(),
        getNovedades(),
        getDiligenciamientos(),
        getPersonal(),
        getLocations(),
      ]), 8000);
      setTasks(tasksData);
      setVisits(visitsData);
      setNovedades(novedadesData);
      setDiligenciamientos(diligenciamientosData);
      setPersonal(personalData);
      setLocations(locationsData);
    } catch (error) {
      handleFirestoreError(error, 'dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();

    // Real-time subscriptions
    const unsubTasks = onTasksChange((data) => setTasks(data));
    const unsubVisitas = onVisitasChange((data) => setVisits(data));
    const unsubNovedades = onNovedadesChange((data) => setNovedades(data));
    const unsubDiligenciamientos = onDiligenciamientosChange((data) => setDiligenciamientos(data));
    const unsubPersonal = onPersonalChange((data) => setPersonal(data));
    const unsubLocations = onLocationsChange((data) => setLocations(data));

    // Auto-refresh when user returns to tab
    const onFocus = () => loadAll();
    window.addEventListener('focus', onFocus);

    return () => {
      unsubTasks();
      unsubVisitas();
      unsubNovedades();
      unsubDiligenciamientos();
      unsubPersonal();
      unsubLocations();
      window.removeEventListener('focus', onFocus);
    };
  }, [loadAll]);

  const pendingTasks = tasks.filter(t => t.status === 'pendiente' || t.status === 'en_proceso').length;
  const completedTasks = tasks.filter(t => t.status === 'completado').length;
  const highPriorityTasks = tasks.filter(t => t.priority === 'alta' && t.status !== 'completado');
  const highPriorityAlerts = highPriorityTasks.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const visitsToday = visits.filter(v => v.fecha === todayStr).length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const totalDiligenciamientos = diligenciamientos.length;

  const kpis = [
    { label: 'TAREAS COMPLETADAS', value: completedTasks.toString(), icon: CheckCircle, color: 'bg-[#00cc66]' },
    { label: 'VISITAS TÉCNICAS COMPLETADAS', value: visits.length.toString(), icon: HardHat, color: 'bg-[#0055ff]' },
    { label: 'DILIGENCIAMIENTOS', value: totalDiligenciamientos.toString(), icon: FileText, color: 'bg-[#ff9900]' },
    { label: 'ALERTAS PRIORIDAD ALTA', value: highPriorityAlerts.toString(), icon: AlertTriangle, color: 'bg-[#e63b2e]' },
    { label: 'VISITAS HOY', value: visitsToday.toString(), icon: Calendar, color: 'bg-[#00cc66]' },
  ];

  const totalPersonal = personal.length;
  const totalLocations = locations.length;

  const summaryCards = [
    { label: 'Tareas', value: tasks.length, icon: ListChecks, color: 'bg-[#0055ff]', route: '/tareas' },
    { label: 'Visitas', value: visits.length, icon: HardHat, color: 'bg-[#00cc66]', route: '/visitas' },
    { label: 'Personal', value: totalPersonal, icon: Users, color: 'bg-[#ff9900]', route: '/base-datos' },
    { label: 'Novedades', value: novedades.length, icon: Newspaper, color: 'bg-[#1a1a1a]', route: '/novedades' },
    { label: 'Diligenciamientos', value: totalDiligenciamientos, icon: FileText, color: 'bg-[#9b59b6]', route: '/diligenciamientos' },
    { label: 'Ubicaciones', value: totalLocations, icon: MapPin, color: 'bg-[#0055ff]', route: '/base-datos' },
  ];

  const recentTasks = tasks.filter(t => t.status !== 'completado').slice(0, 5);
  const recentNovedades = novedades.slice(0, 3);
  const recentVisits = visits.slice(0, 4);

  const quickActions = [
    { label: 'Nueva Visita', icon: HardHat, action: () => navigate('/visitas'), color: 'bg-[#00cc66]' },
    { label: 'Nueva Tarea', icon: Plus, action: () => navigate('/tareas'), color: 'bg-[#0055ff]' },
    { label: 'Diligenciamientos', icon: FileText, action: () => navigate('/diligenciamientos'), color: 'bg-[#ff9900]' },
    { label: 'Novedades', icon: Newspaper, action: () => navigate('/novedades'), color: 'bg-[#1a1a1a]' },
  ];

  if (loading) {
    return (
      <div className="font-['Inter'] max-w-6xl mx-auto">
        <div className="h-10 w-48 bg-[#1a1a1a]/10 animate-pulse mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
      <div className="font-['Inter'] max-w-6xl mx-auto px-3 sm:px-4 pb-24 lg:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-6 gap-2 sm:gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-black uppercase font-['Space_Grotesk'] tracking-tighter">Panel de Control</h1>
          <p className="text-[11px] sm:text-sm font-bold opacity-50 uppercase mt-1">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] sm:text-xs font-bold uppercase opacity-50">Completitud:</span>
          <span className="text-sm sm:text-base font-black text-[#00cc66]">{completionRate}%</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-8">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.3 }}
            className="p-2 sm:p-3 lg:p-4 border-2 border-[#1a1a1a] bg-white shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)] flex flex-col items-center justify-between transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(26,26,26,0.3)] cursor-default"
          >
            <div className="text-center w-full">
              <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest opacity-60 mb-0.5 sm:mb-1">{kpi.label}</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-black font-['Space_Grotesk']">{kpi.value}</p>
            </div>
            <div className={`p-1.5 sm:p-2 lg:p-3 border-2 border-[#1a1a1a] ${kpi.color} text-white mt-2 sm:mt-0`}>
              <kpi.icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-4 sm:mb-8">
        <h2 className="text-sm sm:text-lg font-black uppercase mb-2 sm:mb-3 font-['Space_Grotesk']">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.action}
              className="min-h-[44px] p-2 sm:p-3 lg:p-4 border-2 border-[#1a1a1a] bg-white shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all duration-150 flex flex-col items-center gap-1 sm:gap-1.5 lg:gap-2 group"
            >
              <div className={`p-1.5 sm:p-2 border-2 border-[#1a1a1a] ${action.color} text-white group-hover:scale-110 transition-transform`}>
                <action.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[9px] sm:text-[11px] lg:text-xs font-black uppercase tracking-wider text-center leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Resumen del Sistema */}
      <div className="mb-4 sm:mb-8">
        <h2 className="text-sm sm:text-lg font-black uppercase mb-2 sm:mb-3 font-['Space_Grotesk']">Resumen del Sistema</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
          {summaryCards.map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              onClick={() => navigate(card.route)}
              className="p-3 sm:p-4 lg:p-5 border-2 border-[#1a1a1a] bg-white shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)] flex items-center gap-3 sm:gap-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(26,26,26,0.3)] cursor-pointer"
            >
              <div className={`p-2.5 sm:p-3 border-2 border-[#1a1a1a] ${card.color} text-white shrink-0`}>
                <card.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-60">{card.label}</p>
                <p className="text-2xl sm:text-3xl font-black font-['Space_Grotesk']">{card.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tareas Recientes & Novedades - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-8">
        <div className="border-2 border-[#1a1a1a] bg-white p-2.5 sm:p-4 lg:p-5 shadow-[4px_4px_0px_0px_rgba(26,26,26,0.3)]">
          <div className="flex justify-between items-center mb-2 sm:mb-3 lg:mb-4">
            <h2 className="text-xs sm:text-lg font-black uppercase font-['Space_Grotesk'] border-b-2 border-[#1a1a1a] pb-1.5 sm:pb-2 inline-block">Tareas Recientes</h2>
            <button onClick={() => navigate('/tareas')} className="min-h-[44px] min-w-[44px] text-[10px] sm:text-xs font-bold uppercase text-[#0055ff] hover:underline flex items-center gap-1">
              Ver <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            {recentTasks.length > 0 ? recentTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-2 sm:p-2.5 border-2 border-[#1a1a1a]/10 hover:bg-[#f5f0e8] transition-colors cursor-pointer min-h-[44px]" onClick={() => navigate('/tareas')}>
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className={`w-2.5 h-2.5 border border-[#1a1a1a] shrink-0 ${task.priority === 'alta' ? 'bg-[#e63b2e]' : task.priority === 'media' ? 'bg-[#0055ff]' : 'bg-[#00cc66]'}`}></div>
                  <span className="font-bold text-[11px] sm:text-xs uppercase truncate">{task.title}</span>
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold opacity-70 shrink-0 ml-2 uppercase">{task.status === 'en_proceso' ? 'En Proceso' : 'Pendiente'}</span>
              </div>
            )) : (
              <div className="text-center py-6 sm:py-8">
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-30" />
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest opacity-50">No hay tareas pendientes</p>
                <button onClick={() => navigate('/tareas')} className="mt-2 min-h-[44px] px-3 py-2 text-[11px] sm:text-xs font-bold text-[#0055ff] hover:underline">Crear una tarea</button>
              </div>
            )}
          </div>
        </div>

        <div className="border-2 border-[#1a1a1a] bg-[#1a1a1a] text-white p-2.5 sm:p-4 lg:p-5 shadow-[4px_4px_0px_0px_rgba(0,85,255,0.3)]">
          <div className="flex justify-between items-center mb-2 sm:mb-3 lg:mb-4">
            <h2 className="text-xs sm:text-lg font-black uppercase font-['Space_Grotesk'] border-b-2 border-[#0055ff] pb-1.5 sm:pb-2 inline-block text-[#0055ff] flex items-center gap-1.5 sm:gap-2">
              <Newspaper className="w-4 h-4 sm:w-5 sm:h-5" /> Novedades
            </h2>
            <button onClick={() => navigate('/novedades')} className="min-h-[44px] min-w-[44px] text-[10px] sm:text-xs font-bold uppercase text-[#0055ff] hover:underline flex items-center gap-1">
              Ver <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            {recentNovedades.length > 0 ? recentNovedades.map((novedad) => (
              <div key={novedad.id} className="p-2 sm:p-2.5 border-2 border-white/20 hover:border-[#0055ff] transition-colors cursor-pointer min-h-[44px]" onClick={() => navigate('/novedades')}>
                <h3 className="font-bold text-[11px] sm:text-xs uppercase truncate mb-0.5 sm:mb-1 group-hover:text-[#0055ff] transition-colors">{novedad.title}</h3>
                <div className="flex justify-between items-center text-[10px] sm:text-[11px] opacity-70">
                  <span className="uppercase truncate">{novedad.authorName}</span>
                  <span className="shrink-0 ml-2">{new Date(novedad.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            )) : (
              <div className="text-center py-4 sm:py-6">
                <Newspaper className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-30" />
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest opacity-50">No hay novedades</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Visits */}
      <div className="border-2 border-[#1a1a1a] bg-white p-2.5 sm:p-4 lg:p-5 shadow-[4px_4px_0px_0px_rgba(26,26,26,0.3)]">
        <div className="flex justify-between items-center mb-2 sm:mb-3 lg:mb-4">
          <h2 className="text-xs sm:text-xl font-black uppercase font-['Space_Grotesk'] border-b-2 border-[#1a1a1a] pb-1.5 sm:pb-2 inline-block">Visitas Recientes</h2>
          <button onClick={() => navigate('/visitas')} className="min-h-[44px] min-w-[44px] text-[10px] sm:text-xs font-bold uppercase text-[#0055ff] hover:underline flex items-center gap-1">
            Ver <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {recentVisits.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {recentVisits.map((visita) => (
              <div
                key={visita.id}
                onClick={() => navigate('/visitas')}
                className="p-2.5 sm:p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] hover:bg-[#0055ff] hover:text-white transition-all duration-150 cursor-pointer min-h-[44px] group"
              >
                <div className="flex items-center gap-1 mb-1.5 sm:mb-2">
                  <HardHat className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="text-[11px] sm:text-xs font-bold uppercase truncate">{visita.origen}</span>
                </div>
                <div className="flex items-center gap-1 mb-1">
                  <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 opacity-50" />
                  <span className="text-[11px] sm:text-xs font-bold uppercase truncate">{visita.destino}</span>
                </div>
                <p className="text-[9px] sm:text-[10px] font-bold opacity-60 group-hover:opacity-80 uppercase">{visita.fecha} - {visita.hora}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 sm:py-8">
            <HardHat className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 opacity-30" />
            <p className="text-[11px] sm:text-sm font-bold uppercase tracking-widest opacity-50 mb-2">No hay visitas registradas</p>
            <button onClick={() => navigate('/visitas')} className="min-h-[44px] px-3 sm:px-4 py-2 bg-[#0055ff] text-white border-2 border-[#1a1a1a] font-black uppercase text-[10px] sm:text-xs hover:bg-[#1a1a1a] transition-colors shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">
              Registrar Visita
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
