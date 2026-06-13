import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { supabase } from '../db/client';

const COLORS = ['#0055ff', '#00cc66', '#ff9900', '#e63b2e'];

export default function Dashboard() {
  const [data, setData] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [historyRes, locRes] = await Promise.all([
          supabase.from('vw_location_history').select('*'),
          supabase.from('locations').select('id, name')
        ]);
        
        setData(historyRes.data || []);
        setLocations(locRes.data || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const kpis = useMemo(() => {
    const counts = { VISITA: 0, TAREA: 0, NOVEDAD: 0, DILIGENCIA: 0 };
    data.forEach(item => { if (item.type in counts) counts[item.type]++; });
    return [
      { label: 'Visitas', value: counts.VISITA },
      { label: 'Tareas', value: counts.TAREA },
      { label: 'Novedades', value: counts.NOVEDAD },
      { label: 'Diligencias', value: counts.DILIGENCIA },
    ];
  }, [data]);

  const categoryData = useMemo(() => kpis.map(k => ({ name: k.label, value: k.value })), [kpis]);

  const pulseData = useMemo(() => {
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d.toISOString().split('T')[0];
    });

    return last14Days.map(date => ({
      name: new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase(),
      operaciones: data.filter(item => item.created_at.split('T')[0] === date).length,
    }));
  }, [data]);

  const topZones = useMemo(() => {
    const zoneCounts = data.reduce((acc, item) => {
      if (item.location_id) {
        acc[item.location_id] = (acc[item.location_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(zoneCounts)
      .map(([id, count]) => ({
        name: locations.find(l => l.id === id)?.name || 'Sin Zona',
        activity: count
      }))
      .sort((a, b) => b.activity - a.activity)
      .slice(0, 5);
  }, [data, locations]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f0e8]">
        <div className="bg-white border-4 border-[#1a1a1a] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 font-black uppercase text-xl">
          CARGANDO ANALÍTICAS...
        </div>
      </div>
    );
  }

  return (
    <div className="font-['Inter'] max-w-[1600px] mx-auto px-6 pb-24 pt-6 bg-[#f5f0e8] min-h-screen">
      <h1 className="text-4xl font-black uppercase font-['Space_Grotesk'] tracking-tighter mb-8 border-b-4 border-[#1a1a1a] pb-6">
        ESTADÍSTICAS
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
            <p className="text-xs font-black opacity-50 uppercase tracking-widest">{kpi.label}</p>
            <h2 className="text-4xl font-black mt-2">{kpi.value}</h2>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
          <h3 className="text-sm font-black uppercase mb-6">Distribución por Categoría</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={categoryData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {categoryData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-white border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
          <h3 className="text-sm font-black uppercase mb-6">Pulso Operativo (Últimos 14 días)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={pulseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="operaciones" stroke="#0055ff" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
        <h3 className="text-sm font-black uppercase mb-6">Top 5 Zonas con más Actividad</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topZones} layout="vertical">
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={80} />
            <Tooltip />
            <Bar dataKey="activity" fill="#0055ff" barSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
