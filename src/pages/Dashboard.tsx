import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  CheckCircle, Clock, AlertTriangle, Newspaper, ArrowRight, HardHat, 
  ListChecks, Users, MapPin, FileText, TrendingUp, Activity, BarChart3, 
  Zap, Map as MapIcon, Calendar, User, Wind, CloudRain, Sun, Thermometer,
  Eye, History
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getTasks, onTasksChange } from '../db/tasks';
import { getVisitas, onVisitasChange } from '../db/visitas';
import { getNovedades, onNovedadesChange } from '../db/novedades';
import { getDiligenciamientos, onDiligenciamientosChange } from '../db/diligenciamientos';
import { getPersonal, onPersonalChange } from '../db/personal';
import { getLocations, onLocationsChange } from '../db/locations';
import { withTimeout } from '../db/client';
import type { Task, Visita, Novedad, Diligenciamiento, Personal as PersonalType, Location as LocationType } from '../types';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, CartesianGrid 
} from 'recharts';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => { map.invalidateSize(); }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function SkeletonCard() {
  return (
    <div className="p-4 border-2 border-[#1a1a1a] bg-white animate-pulse">
      <div className="h-2 w-24 bg-[#1a1a1a]/10 mb-3"></div>
      <div className="h-8 w-16 bg-[#1a1a1a]/10"></div>
    </div>
  );
}

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

function WeatherWidget() {
  // Simulación de datos reales para la zona Bajo Paraná (San Nicolás/Ramallo/San Pedro)
  const [weather] = useState({
    temp: 24,
    condition: 'MAYORMENTE DESPEJADO',
    wind: '12 KM/H NE',
    visibility: '10 KM',
    humidity: '65%',
    uv: 'BAJO'
  });

  return (
    <div className="bg-[#1a1a1a] text-white p-4 border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(255,255,0,1)] flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-1">ZONA BAJO PARANÁ</p>
          <h4 className="text-xl font-black font-['Space_Grotesk'] leading-none">CONDICIONES MET</h4>
        </div>
        <Sun className="w-8 h-8 text-[#ffff00] animate-pulse" />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 opacity-40" />
          <div>
            <p className="text-[8px] font-bold opacity-40 uppercase">TEMP</p>
            <p className="text-sm font-black">{weather.temp}°C</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 opacity-40" />
          <div>
            <p className="text-[8px] font-bold opacity-40 uppercase">VIENTO</p>
            <p className="text-sm font-black">{weather.wind}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 opacity-40" />
          <div>
            <p className="text-[8px] font-bold opacity-40 uppercase">VISIBILIDAD</p>
            <p className="text-sm font-black">{weather.visibility}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CloudRain className="w-4 h-4 opacity-40" />
          <div>
            <p className="text-[8px] font-bold opacity-40 uppercase">HUMEDAD</p>
            <p className="text-sm font-black">{weather.humidity}</p>
          </div>
        </div>
      </div>
      
      <div className="pt-2 border-t border-white/10">
        <p className="text-[9px] font-black text-[#ffff00] uppercase tracking-widest">{weather.condition}</p>
      </div>
    </div>
  );
}

function RecentActivity({ data }: { data: any[] }) {
  return (
    <div className="border-2 border-[#1a1a1a] bg-white p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
      <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-4">
        <History className="w-4 h-4 text-[#0055ff]" /> ACTIVIDAD RECIENTE
      </h3>
      <div className="space-y-4">
        {data.slice(0, 5).map((item, i) => (
          <div key={i} className="flex gap-3 relative pb-4 border-l-2 border-[#1a1a1a]/10 ml-2 pl-4 last:pb-0 last:border-l-0">
            <div className="absolute -left-[9px] top-0 w-4 h-4 bg-white border-2 border-[#1a1a1a] rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-[#1a1a1a] rounded-full"></div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-0.5">
                <p className="text-[10px] font-black uppercase truncate max-w-[150px]">{item.title}</p>
                <span className="text-[8px] font-bold opacity-30 uppercase">{item.time}</span>
              </div>
              <p className="text-[9px] font-medium opacity-60 line-clamp-1">{item.detail}</p>
              <div className="mt-1">
                <span className={`text-[7px] font-black px-1.5 py-0.5 border border-[#1a1a1a] uppercase ${item.color} text-white`}>
                  {item.type}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BrutalTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1a] border-2 border-[#1a1a1a] px-3 py-2 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]">
      <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">{label}</p>
      {(payload || []).map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2" style={{ backgroundColor: p.color || p.fill }}></div>
          <p className="text-xs font-black text-white uppercase">{p.name}: {p.value}</p>
        </div>
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
        getTasks(), getVisitas(), getNovedades(),
        getDiligenciamientos(), getPersonal(), getLocations(),
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
  }, []);

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

  const mapData = useMemo(() => {
    const locationMap = new Map(locations.map(l => [l.name.toUpperCase(), l]));
    return visits.map(v => ({
      ...v,
      coords: locationMap.get(v.destino.toUpperCase()) || locationMap.get(v.origen.toUpperCase())
    })).filter(v => v.coords?.latitude && v.coords?.longitude);
  }, [visits, locations]);

  const completedTasks = tasks.filter(t => t.status === 'completado').length;
  const highPriorityAlerts = tasks.filter(t => t.priority === 'alta' && t.status !== 'completado').length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const overdueCount = tasks.filter(t => t.dueDate && t.status !== 'completado' && new Date(t.dueDate) < new Date()).length;
  const totalAttachments = visits.reduce((acc, v) => acc + (v.attachments?.length || 0), 0) + novedades.reduce((acc, n) => acc + (n.attachments?.length || 0), 0);

  const statusData = [
    { name: 'COMPLETADAS', value: completedTasks, fill: '#00cc66' },
    { name: 'EN PROCESO', value: tasks.filter(t => t.status === 'en_proceso').length, fill: '#0055ff' },
    { name: 'PENDIENTES', value: tasks.filter(t => t.status === 'pendiente').length, fill: '#ff9900' },
  ];

  const recentItems = useMemo(() => {
    const items: any[] = [];
    
    novedades.forEach(n => items.push({
      title: n.title,
      detail: n.authorName,
      time: new Date(n.createdAt).toLocaleDateString(),
      type: 'NOVEDAD',
      color: 'bg-[#1a1a1a]',
      timestamp: new Date(n.createdAt).getTime()
    }));
    
    tasks.slice(0, 10).forEach(t => items.push({
      title: t.title,
      detail: t.status.toUpperCase(),
      time: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—',
      type: 'TAREA',
      color: 'bg-[#0055ff]',
      timestamp: t.createdAt ? new Date(t.createdAt).getTime() : 0
    }));

    visits.slice(0, 10).forEach(v => items.push({
      title: `${v.origen} → ${v.destino}`,
      detail: v.responsable,
      time: v.fecha,
      type: 'VISITA',
      color: 'bg-[#00cc66]',
      timestamp: new Date(v.fecha).getTime()
    }));

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [novedades, tasks, visits]);

  if (loading) {
    return (
      <div className="font-['Inter'] max-w-7xl mx-auto p-4 sm:p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const compColor = completionRate > 70 ? '#00cc66' : completionRate > 40 ? '#ff9900' : '#e63b2e';

  return (
    <div className="font-['Inter'] max-w-7xl mx-auto px-3 sm:px-6 pb-24 lg:pb-12">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-6 sm:mb-8 gap-4 pt-4 sm:pt-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[#1a1a1a] text-white p-2 border-2 border-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(0,85,255,1)]">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-[#0055ff]" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black uppercase font-['Space_Grotesk'] tracking-tighter leading-none">
              CENTRO DE MANDO
            </h1>
          </div>
          <p className="text-[10px] sm:text-xs font-black opacity-40 uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-3 h-3" /> {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* ─── ALERT BANNER ─── */}
      {overdueCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
          <div 
            className="p-3 sm:p-4 bg-[#e63b2e] text-white border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] flex items-center justify-between cursor-pointer group active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all" 
            onClick={() => navigate('/tareas')}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-white text-[#e63b2e] p-1.5 sm:p-2 border-2 border-[#1a1a1a]">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
              </div>
              <div>
                <p className="font-black uppercase text-sm sm:text-lg tracking-tight">ALERTA: {overdueCount} TAREAS VENCIDAS</p>
                <p className="text-[9px] sm:text-[10px] font-bold opacity-80 uppercase tracking-widest">REQUIEREN ATENCIÓN INMEDIATA</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-active:translate-x-1 transition-transform" />
          </div>
        </motion.div>
      )}

      {/* ─── TOP KPI ROW ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {/* EFFICIENCY WIDGET - Integrado como KPI */}
        <div className="flex items-center gap-3 bg-[#f5f0e8] border-2 border-[#1a1a1a] p-3 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]">
          <div className="relative shrink-0">
            <ProgressRing pct={completionRate} color={compColor} size={48} stroke={4} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[8px] font-black" style={{ color: compColor }}>{completionRate}%</span>
            </div>
          </div>
          <div className="min-w-0">
            <span className="text-[7px] font-black uppercase tracking-widest opacity-40 block mb-0.5">EFICIENCIA</span>
            <p className="text-sm font-black font-['Space_Grotesk'] leading-none">{completedTasks}/{tasks.length}</p>
          </div>
        </div>

        {[
          { label: 'TAREAS', value: tasks.length, icon: ListChecks, color: 'bg-[#0055ff]', route: '/tareas' },
          { label: 'VISITAS', value: visits.length, icon: HardHat, color: 'bg-[#00cc66]', route: '/visitas' },
          { label: 'NOVEDADES', value: novedades.length, icon: Newspaper, color: 'bg-[#1a1a1a]', route: '/novedades' },
          { label: 'PERSONAL', value: personal.length, icon: Users, color: 'bg-[#ff9900]', route: '/base-datos' },
        ].map((card, idx) => (
          <motion.div 
            key={idx} 
            whileTap={{ scale: 0.98 }} 
            onClick={() => navigate(card.route)} 
            className="p-3 border-2 border-[#1a1a1a] bg-white shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] flex items-center gap-3 cursor-pointer active:shadow-none transition-all group"
          >
            <div className={`p-2 border-2 border-[#1a1a1a] ${card.color} text-white shrink-0 group-hover:scale-110 transition-transform`}>
              <card.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[7px] sm:text-[8px] font-black uppercase opacity-40 leading-none mb-1 truncate">{card.label}</p>
              <p className="text-base sm:text-xl font-black font-['Space_Grotesk'] leading-none">{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ─── MAIN CONTENT GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* ─── SIDEBAR (Left) ─── */}
        <div className="lg:col-span-1 flex flex-col gap-6 order-2 lg:order-1">
          <WeatherWidget />
          
          <RecentActivity data={recentItems} />

          {/* TASK STATUS BAR */}
          <div className="p-4 border-2 border-[#1a1a1a] bg-[#1a1a1a] text-white shadow-[4px_4px_0px_0px_rgba(0,85,255,1)]">
            <h3 className="text-[9px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-white/20 pb-2">
              <Activity className="w-3 h-3" /> ESTADO DE TAREAS
            </h3>
            <div className="space-y-4">
              {statusData.map((s, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[9px] font-black mb-1.5 uppercase"><span>{s.name}</span><span>{s.value}</span></div>
                  <div className="h-1.5 bg-white/10 border border-white/20">
                    <div className="h-full transition-all duration-1000" style={{ width: tasks.length > 0 ? `${(s.value / tasks.length) * 100}%` : '0%', backgroundColor: s.fill }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── CENTER CONTENT (Pulse & Map) ─── */}
        <div className="lg:col-span-3 flex flex-col gap-6 order-1 lg:order-2">
          
          {/* PULSE CHART */}
          <div className="border-2 border-[#1a1a1a] bg-white p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0055ff]" /> PULSO OPERATIVO
              </h3>
              <div className="hidden sm:flex gap-3">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[#00cc66]"></div><span className="text-[8px] font-black">V</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[#0055ff]"></div><span className="text-[8px] font-black">T</span></div>
              </div>
            </div>
            <div className="h-[180px] sm:h-[240px] w-full min-h-[180px]">
              <ResponsiveContainer width="99%" height="100%" minHeight={180}>
                <AreaChart data={pulseData}>
                  <defs>
                    <linearGradient id="colorVisitas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00cc66" stopOpacity={0.1}/><stop offset="95%" stopColor="#00cc66" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorTareas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0055ff" stopOpacity={0.1}/><stop offset="95%" stopColor="#0055ff" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a1a1a10" />
                  <XAxis dataKey="date" tick={{ fontSize: 8, fontWeight: 900 }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis tick={{ fontSize: 8, fontWeight: 900 }} axisLine={false} tickLine={false} width={20} />
                  <Tooltip content={<BrutalTooltip />} />
                  <Area type="monotone" dataKey="VISITAS" stroke="#00cc66" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVisitas)" />
                  <Area type="monotone" dataKey="TAREAS" stroke="#0055ff" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTareas)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* OPERATIONAL MAP */}
          <div className="border-2 border-[#1a1a1a] bg-[#f5f0e8] p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest flex items-center gap-2 text-[#1a1a1a] mb-4">
              <MapIcon className="w-4 h-4" /> MAPA OPERATIVO
            </h3>
            <div className="h-[300px] sm:h-[400px] border-2 border-[#1a1a1a] relative overflow-hidden">
              <MapContainer center={[-33.25, -60.1]} zoom={10} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapResizer />
                {(mapData || []).map((v, i) => (
                  <Marker key={i} position={[v.coords!.latitude!, v.coords!.longitude!]}>
                    <Popup>
                      <div className="font-['Inter'] text-[10px]">
                        <p className="font-black uppercase text-[#00cc66] mb-0.5">VISITA</p>
                        <h4 className="font-black uppercase mb-1">{v.destino}</h4>
                        <div className="flex gap-1 opacity-70"><Calendar className="w-3 h-3" /> {v.fecha}</div>
                        <div className="flex gap-1 font-bold"><User className="w-3 h-3" /> {v.responsable}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ─── FOOTER QUICK STATS (ALIGNED) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
        <div className="p-3 sm:p-4 border-2 border-[#1a1a1a] bg-white shadow-[3px_3px_0px_0px_rgba(230,59,46,1)] active:shadow-none transition-all">
          <p className="text-[8px] sm:text-[9px] font-black uppercase opacity-40 leading-none mb-1 truncate">ALERTAS CRÍTICAS</p>
          <p className="text-2xl sm:text-3xl font-black font-['Space_Grotesk'] text-[#e63b2e] leading-none">{highPriorityAlerts}</p>
        </div>
        <div className="p-3 sm:p-4 border-2 border-[#1a1a1a] bg-white shadow-[3px_3px_0px_0px_rgba(0,85,255,1)] active:shadow-none transition-all">
          <p className="text-[8px] sm:text-[9px] font-black uppercase opacity-40 leading-none mb-1 truncate">PERSONAL ACTIVO</p>
          <p className="text-2xl sm:text-3xl font-black font-['Space_Grotesk'] leading-none">{personal.length}</p>
        </div>
        <div 
          className="p-3 sm:p-4 border-2 border-[#1a1a1a] bg-white shadow-[3px_3px_0px_0px_rgba(0,204,102,1)] active:shadow-none transition-all cursor-pointer group"
          onClick={() => navigate('/diligenciamientos')}
        >
          <p className="text-[8px] sm:text-[9px] font-black uppercase opacity-40 leading-none mb-1 truncate">DILIGENCIAS</p>
          <div className="flex items-end justify-between">
            <p className="text-2xl sm:text-3xl font-black font-['Space_Grotesk'] leading-none">{diligenciamientos.length}</p>
            <div className="flex flex-col items-end gap-0.5">
              {(() => {
                const stats: Record<string, number> = {};
                diligenciamientos.forEach(d => {
                  const cat = d.category || 'OTROS';
                  stats[cat] = (stats[cat] || 0) + 1;
                });
                return Object.entries(stats)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 2)
                  .map(([cat, count]) => (
                    <span key={cat} className="text-[6px] font-black uppercase opacity-30 group-hover:opacity-100 transition-opacity">
                      {cat.slice(0, 15)}: {count}
                    </span>
                  ));
              })()}
            </div>
          </div>
        </div>
        <div className="p-3 sm:p-4 border-2 border-[#1a1a1a] bg-white shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] active:shadow-none transition-all">
          <p className="text-[8px] sm:text-[9px] font-black uppercase opacity-40 leading-none mb-1 truncate">ADJUNTOS</p>
          <p className="text-2xl sm:text-3xl font-black font-['Space_Grotesk'] leading-none">{totalAttachments}</p>
        </div>
      </div>
    </div>
  );
}
