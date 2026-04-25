import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Clock, AlertTriangle, Newspaper, ArrowRight, HardHat, ListChecks, Users, MapPin, FileText, TrendingUp, Activity, BarChart3, Copy } from 'lucide-react';
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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

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

// Feature #3: SVG Progress Ring
function ProgressRing({ pct, color, size = 90, stroke = 8 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={off}
        strokeLinecap="butt"
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
}

// Custom tooltip for brutalista style
function BrutalTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1a] border-2 border-[#1a1a1a] px-3 py-2 shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)]">
      <p className="text-[10px] font-black uppercase tracking-widest text-white/70">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-black text-white">{p.value}</p>
      ))}
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

  // ── Analytics ──
  const pendingTasks = tasks.filter(t => t.status === 'pendiente' || t.status === 'en_proceso').length;
  const completedTasks = tasks.filter(t => t.status === 'completado').length;
  const highPriorityAlerts = tasks.filter(t => t.priority === 'alta' && t.status !== 'completado').length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const totalDiligenciamientos = diligenciamientos.length;
  const totalPersonal = personal.length;
  const totalLocations = locations.length;

  // Feature #2: Overdue tasks
  const today = new Date();
  const overdueTasks = tasks.filter(t => {
    if (!t.dueDate || t.status === 'completado') return false;
    return new Date(t.dueDate) < today;
  });
  const overdueCount = overdueTasks.length;

  // Feature #23: Total attachments
  const totalAttachments =
    visits.reduce((acc, v) => acc + (v.attachments?.length || 0), 0) +
    novedades.reduce((acc, n) => acc + (n.attachments?.length || 0), 0) +
    diligenciamientos.reduce((acc, d) => acc + (d.attachments?.length || 0), 0);

  // Feature #1: Chart data — tasks by status
  const statusData = [
    { name: 'Completadas', value: completedTasks, fill: '#00cc66' },
    { name: 'En Proceso', value: tasks.filter(t => t.status === 'en_proceso').length, fill: '#0055ff' },
    { name: 'Pendientes', value: tasks.filter(t => t.status === 'pendiente').length, fill: '#f5f0e8' },
  ];

  // Tasks by priority (for pie chart)
  const prioData = [
    { name: 'Alta', value: tasks.filter(t => t.priority === 'alta').length, fill: '#e63b2e' },
    { name: 'Media', value: tasks.filter(t => t.priority === 'media').length, fill: '#ff9900' },
    { name: 'Baja', value: tasks.filter(t => t.priority === 'baja').length, fill: '#00cc66' },
  ].filter(d => d.value > 0);

  // Visits by day (last 7 days area chart)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
  const visitsByDay = last7.map(date => ({
    day: new Date(date).toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase(),
    visitas: visits.filter(v => v.fecha === date).length,
  }));

  // Module distribution for horizontal bars
  const modules = [
    { name: 'Tareas', value: tasks.length, color: '#0055ff' },
    { name: 'Visitas', value: visits.length, color: '#00cc66' },
    { name: 'Novedades', value: novedades.length, color: '#1a1a1a' },
    { name: 'Diligenciamientos', value: totalDiligenciamientos, color: '#9b59b6' },
    { name: 'Personal', value: totalPersonal, color: '#ff9900' },
  ];
  const maxModule = Math.max(...modules.map(m => m.value), 1);

  const summaryCards = [
    { label: 'Tareas', value: tasks.length, icon: ListChecks, color: 'bg-[#0055ff]', route: '/tareas' },
    { label: 'Visitas', value: visits.length, icon: HardHat, color: 'bg-[#00cc66]', route: '/visitas' },
    { label: 'Personal', value: totalPersonal, icon: Users, color: 'bg-[#ff9900]', route: '/base-datos' },
    { label: 'Novedades', value: novedades.length, icon: Newspaper, color: 'bg-[#1a1a1a]', route: '/novedades' },
    { label: 'Diligencias', value: totalDiligenciamientos, icon: FileText, color: 'bg-[#9b59b6]', route: '/diligenciamientos' },
    { label: 'Ubicaciones', value: totalLocations, icon: MapPin, color: 'bg-[#0055ff]', route: '/base-datos' },
  ];

  // Feature #4: Timeline data
  const timeline: { date: string; type: string; title: string; color: string; icon: React.ReactNode; route: string }[] = [];
  visits.slice(0, 3).forEach(v => timeline.push({
    date: v.fecha || new Date(v.createdAt).toLocaleDateString('es-ES'),
    type: 'VISITA', title: `${v.origen} → ${v.destino}`,
    color: 'bg-[#00cc66]', icon: <HardHat className="w-3 h-3" />, route: '/visitas',
  }));
  tasks.filter(t => t.status !== 'completado').slice(0, 3).forEach(t => timeline.push({
    date: t.dueDate || new Date(t.createdAt).toLocaleDateString('es-ES'),
    type: 'TAREA', title: t.title,
    color: t.priority === 'alta' ? 'bg-[#e63b2e]' : 'bg-[#0055ff]',
    icon: <ListChecks className="w-3 h-3" />, route: '/tareas',
  }));
  novedades.slice(0, 2).forEach(n => timeline.push({
    date: n.fecha || new Date(n.createdAt).toLocaleDateString('es-ES'),
    type: 'NOVEDAD', title: n.title,
    color: 'bg-[#1a1a1a]', icon: <Newspaper className="w-3 h-3" />, route: '/novedades',
  }));

  const recentTasks = tasks.filter(t => t.status !== 'completado').slice(0, 5);

  if (loading) {
    return (
      <div className="font-['Inter'] max-w-6xl mx-auto">
        <div className="h-10 w-48 bg-[#1a1a1a]/10 animate-pulse mb-6"></div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const compColor = completionRate > 70 ? '#00cc66' : completionRate > 40 ? '#ff9900' : '#e63b2e';

  return (
      <div className="font-['Inter'] max-w-6xl mx-auto px-3 sm:px-4 pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-6 gap-2 sm:gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-black uppercase font-['Space_Grotesk'] tracking-tighter">Panel de Control</h1>
          <p className="text-[11px] sm:text-sm font-bold opacity-50 uppercase mt-1">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        {/* Feature #3: Progress Ring */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <ProgressRing pct={completionRate} color={compColor} size={56} stroke={5} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-black" style={{ color: compColor }}>{completionRate}%</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-50 block">Completitud</span>
            <span className="text-sm font-black">{completedTasks}/{tasks.length}</span>
          </div>
        </div>
      </div>

      {/* Feature #2: Overdue Alert Banner */}
      {overdueCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6 p-3 sm:p-4 bg-[#e63b2e] text-white border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] flex items-center justify-between cursor-pointer hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
          onClick={() => navigate('/tareas')}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            <div>
              <p className="font-black uppercase text-sm sm:text-base tracking-wider">
                {overdueCount} Tarea{overdueCount > 1 ? 's' : ''} Vencida{overdueCount > 1 ? 's' : ''}
              </p>
              <p className="text-[10px] sm:text-xs font-bold opacity-80 uppercase">
                {overdueTasks.slice(0, 2).map(t => t.title).join(', ')}{overdueCount > 2 ? ` +${overdueCount - 2} más` : ''}
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 shrink-0" />
        </motion.div>
      )}

      {/* Summary Cards */}
      <div className="mb-4 sm:mb-6">
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

      {/* Feature #1: Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Bar Chart: Tasks by Status */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="border-2 border-[#1a1a1a] bg-white p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,0.3)]"
        >
          <h3 className="text-xs font-black uppercase tracking-widest mb-3 border-b-2 border-[#1a1a1a] pb-2 flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5" /> Tareas por Estado
          </h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={statusData} barSize={28}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 900 }} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip content={<BrutalTooltip />} />
              <Bar dataKey="value" radius={0}>
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} stroke="#1a1a1a" strokeWidth={2} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pie Chart: Priority Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="border-2 border-[#1a1a1a] bg-white p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,0.3)]"
        >
          <h3 className="text-xs font-black uppercase tracking-widest mb-3 border-b-2 border-[#1a1a1a] pb-2 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" /> Prioridades
          </h3>
          <div className="flex items-center justify-between">
            <ResponsiveContainer width="55%" height={130}>
              <PieChart>
                <Pie data={prioData} dataKey="value" cx="50%" cy="50%" outerRadius={50} innerRadius={25} strokeWidth={2} stroke="#1a1a1a">
                  {prioData.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2">
              {prioData.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 border border-[#1a1a1a]" style={{ backgroundColor: p.fill }}></div>
                  <span className="text-[10px] font-bold uppercase">{p.name}: {p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Area Chart: Visits last 7 days */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="border-2 border-[#1a1a1a] bg-white p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,0.3)]"
        >
          <h3 className="text-xs font-black uppercase tracking-widest mb-3 border-b-2 border-[#1a1a1a] pb-2 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> Visitas (7 días)
          </h3>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={visitsByDay}>
              <XAxis dataKey="day" tick={{ fontSize: 9, fontWeight: 900 }} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip content={<BrutalTooltip />} />
              <Area type="stepAfter" dataKey="visitas" fill="#00cc66" fillOpacity={0.3} stroke="#00cc66" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Row: Tasks + Novedades + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
        {/* Recent Tasks */}
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

        {/* Novedades */}
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
            {novedades.slice(0, 3).length > 0 ? novedades.slice(0, 3).map((novedad) => (
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

        {/* Feature #4: Activity Timeline */}
        <div className="border-2 border-[#1a1a1a] bg-white p-2.5 sm:p-4 lg:p-5 shadow-[4px_4px_0px_0px_rgba(26,26,26,0.3)]">
          <h2 className="text-xs sm:text-lg font-black uppercase font-['Space_Grotesk'] border-b-2 border-[#1a1a1a] pb-1.5 sm:pb-2 mb-2 sm:mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Actividad
          </h2>
          <div className="space-y-0">
            {timeline.slice(0, 6).map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-2 py-2 border-b border-[#1a1a1a]/10 last:border-0 cursor-pointer hover:bg-[#f5f0e8] transition-colors px-1"
                onClick={() => navigate(item.route)}
              >
                <div className="flex flex-col items-center shrink-0 mt-0.5">
                  <div className={`w-5 h-5 ${item.color} text-white flex items-center justify-center border border-[#1a1a1a]`}>
                    {item.icon}
                  </div>
                  {i < timeline.length - 1 && <div className="w-0.5 h-4 bg-[#1a1a1a]/15 mt-0.5"></div>}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 border border-[#1a1a1a]/20 bg-[#f5f0e8]">{item.type}</span>
                    <span className="text-[9px] font-bold opacity-40">{item.date}</span>
                  </div>
                  <p className="text-[11px] font-bold uppercase truncate">{item.title}</p>
                </div>
              </div>
            ))}
            {timeline.length === 0 && (
              <p className="text-center text-[11px] font-bold uppercase opacity-40 py-6">Sin actividad reciente</p>
            )}
          </div>
        </div>
      </div>

      {/* Row: Module Distribution + Recent Visits + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Module Distribution Bars */}
        <div className="border-2 border-[#1a1a1a] bg-white p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,0.3)]">
          <h3 className="text-xs font-black uppercase tracking-widest mb-3 border-b-2 border-[#1a1a1a] pb-2">
            Distribución por Módulo
          </h3>
          <div className="space-y-3">
            {modules.map((mod, i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider">{mod.name}</span>
                  <span className="text-xs font-black" style={{ color: mod.color }}>{mod.value}</span>
                </div>
                <div className="h-2 bg-[#f5f0e8] w-full">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(mod.value / maxModule) * 100}%` }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="h-2"
                    style={{ backgroundColor: mod.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Visits */}
        <div className="lg:col-span-2 border-2 border-[#1a1a1a] bg-white p-2.5 sm:p-4 lg:p-5 shadow-[4px_4px_0px_0px_rgba(26,26,26,0.3)]">
          <div className="flex justify-between items-center mb-2 sm:mb-3 lg:mb-4">
            <h2 className="text-xs sm:text-xl font-black uppercase font-['Space_Grotesk'] border-b-2 border-[#1a1a1a] pb-1.5 sm:pb-2 inline-block">Visitas Recientes</h2>
            <button onClick={() => navigate('/visitas')} className="min-h-[44px] min-w-[44px] text-[10px] sm:text-xs font-bold uppercase text-[#0055ff] hover:underline flex items-center gap-1">
              Ver <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {visits.slice(0, 4).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              {visits.slice(0, 4).map((visita) => (
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

      {/* Bottom row: Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="p-3 sm:p-4 border-2 border-[#1a1a1a] bg-[#f5f0e8] shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)]">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Alertas Alta Prioridad</p>
          <p className="text-2xl font-black font-['Space_Grotesk']" style={{ color: highPriorityAlerts > 0 ? '#e63b2e' : '#00cc66' }}>{highPriorityAlerts}</p>
        </div>
        <div className="p-3 sm:p-4 border-2 border-[#1a1a1a] bg-[#f5f0e8] shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)]">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Tareas Vencidas</p>
          <p className="text-2xl font-black font-['Space_Grotesk']" style={{ color: overdueCount > 0 ? '#e63b2e' : '#00cc66' }}>{overdueCount}</p>
        </div>
        <div className="p-3 sm:p-4 border-2 border-[#1a1a1a] bg-[#f5f0e8] shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)]">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Pendientes</p>
          <p className="text-2xl font-black font-['Space_Grotesk']">{pendingTasks}</p>
        </div>
        <div className="p-3 sm:p-4 border-2 border-[#1a1a1a] bg-[#f5f0e8] shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)]">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Adjuntos</p>
          <p className="text-2xl font-black font-['Space_Grotesk']">{totalAttachments}</p>
        </div>
      </div>
    </div>
  );
}
