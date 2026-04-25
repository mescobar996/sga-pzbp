import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  CheckCircle, Clock, AlertTriangle, Newspaper, ArrowRight, HardHat, 
  ListChecks, Users, MapPin, FileText, TrendingUp, Activity, BarChart3, 
  Zap, Map as MapIcon, Calendar, User
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

function BrutalTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1a] border-2 border-[#1a1a1a] px-3 py-2 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]">
      <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
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

  if (loading) {
    return (
      <div className="font-['Inter'] max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const compColor = completionRate > 70 ? '#00cc66' : completionRate > 40 ? '#ff9900' : '#e63b2e';

  return (
    <div className="font-['Inter'] max-w-7xl mx-auto px-3 sm:px-6 pb-24 lg:pb-12">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 gap-4 pt-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[#1a1a1a] text-white p-2 border-2 border-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(0,85,255,1)]">
              <Zap className="w-5 h-5 text-[#0055ff]" />
            </div>
            <h1 className="text-3xl lg:text-5xl font-black uppercase font-['Space_Grotesk'] tracking-tighter leading-none">
              CENTRO DE MANDO
            </h1>
          </div>
          <p className="text-xs font-black opacity-40 uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-3 h-3" /> {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-6 bg-[#f5f0e8] border-2 border-[#1a1a1a] p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
          <div className="relative">
            <ProgressRing pct={completionRate} color={compColor} size={64} stroke={6} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-black" style={{ color: compColor }}>{completionRate}%</span>
            </div>
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-50 block mb-1">EFICIENCIA GLOBAL</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black font-['Space_Grotesk']">{completedTasks}</span>
              <span className="text-xs font-bold opacity-30">/ {tasks.length} TAREAS</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ALERT BANNER ─── */}
      {overdueCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="p-4 bg-[#e63b2e] text-white border-2 border-[#1a1a1a] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] flex items-center justify-between cursor-pointer group" onClick={() => navigate('/tareas')}>
            <div className="flex items-center gap-4">
              <div className="bg-white text-[#e63b2e] p-2 border-2 border-[#1a1a1a]"><AlertTriangle className="w-6 h-6 animate-pulse" /></div>
              <div>
                <p className="font-black uppercase text-lg tracking-tight">ALERTA: {overdueCount} TAREAS VENCIDAS</p>
                <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">REQUIEREN ATENCIÓN INMEDIATA</p>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* ─── LEFT COLUMN: QUICK STATS ─── */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            {[
              { label: 'TAREAS', value: tasks.length, icon: ListChecks, color: 'bg-[#0055ff]', route: '/tareas' },
              { label: 'VISITAS', value: visits.length, icon: HardHat, color: 'bg-[#00cc66]', route: '/visitas' },
              { label: 'NOVEDADES', value: novedades.length, icon: Newspaper, color: 'bg-[#1a1a1a]', route: '/novedades' },
              { label: 'PERSONAL', value: personal.length, icon: Users, color: 'bg-[#ff9900]', route: '/base-datos' },
            ].map((card, idx) => (
              <motion.div key={idx} whileHover={{ x: 4 }} onClick={() => navigate(card.route)} className="p-4 border-2 border-[#1a1a1a] bg-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] flex items-center gap-4 cursor-pointer">
                <div className={`p-3 border-2 border-[#1a1a1a] ${card.color} text-white`}><card.icon className="w-5 h-5" /></div>
                <div>
                  <p className="text-[9px] font-black uppercase opacity-40 leading-none mb-1">{card.label}</p>
                  <p className="text-2xl font-black font-['Space_Grotesk'] leading-none">{card.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="p-5 border-2 border-[#1a1a1a] bg-[#1a1a1a] text-white shadow-[4px_4px_0px_0px_rgba(0,85,255,1)] flex-grow">
            <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-white/20 pb-2">
              <Activity className="w-3.5 h-3.5" /> ESTADO DE TAREAS
            </h3>
            <div className="space-y-4">
              {statusData.map((s, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[10px] font-black mb-1.5 uppercase"><span>{s.name}</span><span>{s.value}</span></div>
                  <div className="h-2 bg-white/10 border border-white/20">
                    <div className="h-full transition-all duration-1000" style={{ width: tasks.length > 0 ? `${(s.value / tasks.length) * 100}%` : '0%', backgroundColor: s.fill }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── CENTER COLUMN: PULSE & MAP ─── */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="border-2 border-[#1a1a1a] bg-white p-6 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0055ff]" /> PULSO OPERATIVO (15 DÍAS)
              </h3>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pulseData}>
                  <defs>
                    <linearGradient id="colorVisitas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00cc66" stopOpacity={0.1}/><stop offset="95%" stopColor="#00cc66" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorTareas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0055ff" stopOpacity={0.1}/><stop offset="95%" stopColor="#0055ff" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a1a1a10" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 900 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fontWeight: 900 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<BrutalTooltip />} />
                  <Area type="monotone" dataKey="VISITAS" stroke="#00cc66" strokeWidth={3} fillOpacity={1} fill="url(#colorVisitas)" />
                  <Area type="monotone" dataKey="TAREAS" stroke="#0055ff" strokeWidth={3} fillOpacity={1} fill="url(#colorTareas)" />
                  <Area type="monotone" dataKey="NOVEDADES" stroke="#1a1a1a" strokeWidth={3} fill="none" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border-2 border-[#1a1a1a] bg-[#f5f0e8] p-6 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-[#1a1a1a] mb-4">
              <MapIcon className="w-4 h-4" /> MAPA DE UBICACIONES OPERATIVAS
            </h3>
            <div className="h-[400px] border-2 border-[#1a1a1a] relative overflow-hidden">
              <MapContainer center={[-33.25, -60.1]} zoom={10} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapResizer />
                {mapData.map((v, i) => (
                  <Marker key={i} position={[v.coords!.latitude!, v.coords!.longitude!]}>
                    <Popup>
                      <div className="font-['Inter']">
                        <p className="text-xs font-bold uppercase text-[#00cc66] mb-1">VISITA</p>
                        <h4 className="font-black uppercase text-sm mb-2">{v.destino}</h4>
                        <div className="flex gap-1 text-xs mb-1"><Calendar className="w-3.5 h-3.5" /> {v.fecha}</div>
                        <div className="flex gap-1 text-xs font-bold"><User className="w-3.5 h-3.5" /> {v.responsable}</div>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="p-4 border-2 border-[#1a1a1a] bg-white shadow-[4px_4px_0px_0px_rgba(230,59,46,1)]">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">ALERTAS CRÍTICAS</p>
          <p className="text-3xl font-black font-['Space_Grotesk'] text-[#e63b2e]">{highPriorityAlerts}</p>
        </div>
        <div className="p-4 border-2 border-[#1a1a1a] bg-white shadow-[4px_4px_0px_0px_rgba(0,85,255,1)]">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">PERSONAL ACTIVO</p>
          <p className="text-3xl font-black font-['Space_Grotesk']">{personal.length}</p>
        </div>
        <div className="p-4 border-2 border-[#1a1a1a] bg-white shadow-[4px_4px_0px_0px_rgba(0,204,102,1)]">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">DILIGENCIAS</p>
          <p className="text-3xl font-black font-['Space_Grotesk']">{diligenciamientos.length}</p>
        </div>
        <div className="p-4 border-2 border-[#1a1a1a] bg-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">ADJUNTOS CARGADOS</p>
          <p className="text-3xl font-black font-['Space_Grotesk']">{totalAttachments}</p>
        </div>
      </div>
    </div>
  );
}
