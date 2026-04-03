import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, Clock, AlertTriangle, Newspaper } from 'lucide-react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [novedades, setNovedades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const tasksQuery = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(tasksData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tasks');
    });

    const visitsQuery = query(collection(db, 'visitas'), orderBy('createdAt', 'desc'));
    const unsubscribeVisits = onSnapshot(visitsQuery, (snapshot) => {
      const visitsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVisits(visitsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'visitas');
    });

    const novedadesQuery = query(collection(db, 'novedades'), orderBy('createdAt', 'desc'));
    const unsubscribeNovedades = onSnapshot(novedadesQuery, (snapshot) => {
      const novedadesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNovedades(novedadesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'novedades');
    });

    setLoading(false);

    return () => {
      unsubscribeTasks();
      unsubscribeVisits();
      unsubscribeNovedades();
    };
  }, []);

  // Calculate KPIs
  const pendingTasks = tasks.filter(t => t.status === 'pendiente' || t.status === 'en_proceso').length;
  const completedTasks = tasks.filter(t => t.status === 'completado').length;
  const highPriorityAlerts = tasks.filter(t => t.priority === 'alta' && t.status !== 'completado').length;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const visitsToday = visits.filter(v => v.fecha === todayStr).length;

  const kpis = [
    { label: 'TAREAS PENDIENTES', value: pendingTasks.toString(), icon: Clock, color: 'bg-[#0055ff]' },
    { label: 'VISITAS HOY', value: visitsToday.toString(), icon: Activity, color: 'bg-[#0055ff]' },
    { label: 'COMPLETADAS', value: completedTasks.toString(), icon: CheckCircle, color: 'bg-[#00cc66]' },
    { label: 'ALERTAS (ALTA PRIORIDAD)', value: highPriorityAlerts.toString(), icon: AlertTriangle, color: 'bg-[#e63b2e]' },
  ];

  // Calculate Chart Data (Last 7 days)
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase();
    
    // Count tasks due on this day
    const tasksDue = tasks.filter(t => t.dueDate === dateStr).length;
    // Count visits on this day
    const visitsOnDay = visits.filter(v => v.fecha === dateStr).length;

    chartData.push({
      name: dayName,
      Tareas: tasksDue,
      Visitas: visitsOnDay
    });
  }

  // Recent Tasks (Top 4 pending/en_proceso tasks)
  const recentTasks = tasks.filter(t => t.status !== 'completado').slice(0, 4);
  
  // Recent Novedades (Top 3)
  const recentNovedades = novedades.slice(0, 3);

  return (
    <div className="font-['Inter'] max-w-6xl mx-auto">
      <h1 className="text-4xl font-black uppercase mb-6 font-['Space_Grotesk'] tracking-tighter">Panel de Control</h1>
      
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi, idx) => (
          <div key={idx} className={`p-4 border-2 border-[#1a1a1a] bg-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] flex items-center justify-between transition-transform hover:-translate-y-1`}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">{kpi.label}</p>
              <p className="text-3xl font-black font-['Space_Grotesk']">{kpi.value}</p>
            </div>
            <div className={`p-3 border-2 border-[#1a1a1a] ${kpi.color} text-white`}>
              <kpi.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts */}
        <div className="lg:col-span-2 border-2 border-[#1a1a1a] bg-white p-5 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
          <h2 className="text-xl font-black uppercase mb-4 font-['Space_Grotesk'] border-b-2 border-[#1a1a1a] pb-2 inline-block">Actividad Semanal</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#1a1a1a" tick={{fontFamily: 'Space Grotesk', fontWeight: 'bold', fontSize: 12}} />
                <YAxis stroke="#1a1a1a" tick={{fontFamily: 'Space Grotesk', fontWeight: 'bold', fontSize: 12}} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ border: '2px solid #1a1a1a', borderRadius: 0, fontWeight: 'bold', textTransform: 'uppercase', fontSize: 12 }}
                  itemStyle={{ color: '#1a1a1a' }}
                />
                <Bar dataKey="Tareas" fill="#0055ff" stroke="#1a1a1a" strokeWidth={2} />
                <Bar dataKey="Visitas" fill="#00cc66" stroke="#1a1a1a" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity & Novedades */}
        <div className="flex flex-col gap-6">
          <div className="border-2 border-[#1a1a1a] bg-white p-5 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
            <h2 className="text-xl font-black uppercase mb-4 font-['Space_Grotesk'] border-b-2 border-[#1a1a1a] pb-2 inline-block">Tareas Recientes</h2>
            <div className="space-y-3">
              {recentTasks.length > 0 ? recentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-2 border-2 border-[#1a1a1a] hover:bg-[#f5f0e8] transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className={`w-2.5 h-2.5 border border-[#1a1a1a] rounded-full shrink-0 ${task.priority === 'alta' ? 'bg-[#e63b2e]' : task.priority === 'media' ? 'bg-[#0055ff]' : 'bg-[#00cc66]'}`}></div>
                    <span className="font-bold text-xs uppercase truncate">{task.title}</span>
                  </div>
                  <span className="text-[10px] font-bold opacity-70 shrink-0 ml-2">{task.status === 'en_proceso' ? 'En Proceso' : 'Pendiente'}</span>
                </div>
              )) : (
                <div className="text-xs font-bold opacity-50 uppercase tracking-widest text-center py-6">
                  No hay tareas pendientes
                </div>
              )}
            </div>
          </div>

          <div className="border-2 border-[#1a1a1a] bg-[#1a1a1a] text-white p-5 shadow-[6px_6px_0px_0px_rgba(0,85,255,1)]">
            <h2 className="text-xl font-black uppercase mb-4 font-['Space_Grotesk'] border-b-2 border-[#0055ff] pb-2 inline-block text-[#0055ff] flex items-center gap-2">
              <Newspaper className="w-5 h-5" /> Últimas Novedades
            </h2>
            <div className="space-y-3">
              {recentNovedades.length > 0 ? recentNovedades.map((novedad) => (
                <div key={novedad.id} className="p-2 border-2 border-white/20 hover:border-[#0055ff] transition-colors cursor-pointer">
                  <h3 className="font-bold text-xs uppercase truncate mb-1">{novedad.title}</h3>
                  <div className="flex justify-between items-center text-[10px] opacity-70">
                    <span className="uppercase">{novedad.authorName}</span>
                    <span>{new Date(novedad.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )) : (
                <div className="text-xs font-bold opacity-50 uppercase tracking-widest text-center py-6">
                  No hay novedades recientes
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
