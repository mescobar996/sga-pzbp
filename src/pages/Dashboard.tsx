import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
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

    setLoading(false);

    return () => {
      unsubscribeTasks();
      unsubscribeVisits();
    };
  }, []);

  // Calculate KPIs
  const pendingTasks = tasks.filter(t => t.status === 'pendiente' || t.status === 'en_proceso').length;
  const completedTasks = tasks.filter(t => t.status === 'completado').length;
  const highPriorityAlerts = tasks.filter(t => t.priority === 'alta' && t.status !== 'completado').length;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const visitsToday = visits.filter(v => v.fecha === todayStr).length;

  const kpis = [
    { label: 'TAREAS PENDIENTES', value: pendingTasks.toString(), icon: Clock, color: 'bg-[#ffcc00]' },
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
    
    // Count tasks created on this day
    const tasksCreated = tasks.filter(t => t.createdAt && t.createdAt.startsWith(dateStr)).length;
    // Count visits on this day
    const visitsOnDay = visits.filter(v => v.fecha === dateStr).length;

    chartData.push({
      name: dayName,
      Tareas: tasksCreated,
      Visitas: visitsOnDay
    });
  }

  // Recent Tasks (Top 4 pending/en_proceso tasks)
  const recentTasks = tasks.filter(t => t.status !== 'completado').slice(0, 4);

  return (
    <div className="font-['Inter']">
      <h1 className="text-5xl font-black uppercase mb-8 font-['Space_Grotesk'] tracking-tighter">Panel de Control</h1>
      
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {kpis.map((kpi, idx) => (
          <div key={idx} className={`p-6 border-4 border-[#1a1a1a] bg-white shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] flex items-center justify-between transition-transform hover:-translate-y-1`}>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">{kpi.label}</p>
              <p className="text-4xl font-black font-['Space_Grotesk']">{kpi.value}</p>
            </div>
            <div className={`p-4 border-2 border-[#1a1a1a] ${kpi.color} text-white`}>
              <kpi.icon className="w-8 h-8" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Charts */}
        <div className="lg:col-span-2 border-4 border-[#1a1a1a] bg-white p-6 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
          <h2 className="text-2xl font-black uppercase mb-6 font-['Space_Grotesk'] border-b-4 border-[#1a1a1a] pb-2 inline-block">Actividad Semanal</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#1a1a1a" tick={{fontFamily: 'Space Grotesk', fontWeight: 'bold'}} />
                <YAxis stroke="#1a1a1a" tick={{fontFamily: 'Space Grotesk', fontWeight: 'bold'}} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ border: '4px solid #1a1a1a', borderRadius: 0, fontWeight: 'bold', textTransform: 'uppercase' }}
                  itemStyle={{ color: '#1a1a1a' }}
                />
                <Bar dataKey="Tareas" fill="#ffcc00" stroke="#1a1a1a" strokeWidth={2} />
                <Bar dataKey="Visitas" fill="#0055ff" stroke="#1a1a1a" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="border-4 border-[#1a1a1a] bg-white p-6 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
          <h2 className="text-2xl font-black uppercase mb-6 font-['Space_Grotesk'] border-b-4 border-[#1a1a1a] pb-2 inline-block">Tareas Recientes</h2>
          <div className="space-y-4">
            {recentTasks.length > 0 ? recentTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 border-2 border-[#1a1a1a] hover:bg-[#f5f0e8] transition-colors cursor-pointer">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-3 h-3 border border-[#1a1a1a] rounded-full shrink-0 ${task.priority === 'alta' ? 'bg-[#e63b2e]' : task.priority === 'media' ? 'bg-[#ffcc00]' : 'bg-[#00cc66]'}`}></div>
                  <span className="font-bold text-sm uppercase truncate">{task.title}</span>
                </div>
                <span className="text-xs font-bold opacity-70 shrink-0 ml-2">{task.status === 'en_proceso' ? 'En Proceso' : 'Pendiente'}</span>
              </div>
            )) : (
              <div className="text-sm font-bold opacity-50 uppercase tracking-widest text-center py-8">
                No hay tareas pendientes
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
