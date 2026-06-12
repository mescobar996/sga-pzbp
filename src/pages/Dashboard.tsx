import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';

// Mock Data
const kpis = [
  { label: 'Visitas', value: '142', trend: '+12%' },
  { label: 'Tareas', value: '89', trend: '-5%' },
  { label: 'Novedades', value: '23', trend: '+2%' },
  { label: 'Diligencias', value: '56', trend: '+8%' },
];

const categoryData = [
  { name: 'Visitas', value: 400 },
  { name: 'Tareas', value: 300 },
  { name: 'Novedades', value: 300 },
  { name: 'Diligencias', value: 200 },
];

const COLORS = ['#0055ff', '#00cc66', '#ff9900', '#e63b2e'];

const pulseData = Array.from({ length: 7 }, (_, i) => ({
  name: `Día ${i + 1}`,
  operaciones: Math.floor(Math.random() * 100) + 20,
}));

const topZones = [
  { name: 'PZBP', activity: 85 },
  { name: 'ASEC', activity: 72 },
  { name: 'CORO', activity: 60 },
  { name: 'DIAM', activity: 45 },
  { name: 'LPAZ', activity: 30 },
];

export default function Dashboard() {
  return (
    <div className="font-['Inter'] max-w-[1600px] mx-auto px-6 pb-24 pt-6 bg-[#f5f0e8] min-h-screen">
      <h1 className="text-4xl font-black uppercase font-['Space_Grotesk'] tracking-tighter mb-8 border-b-4 border-[#1a1a1a] pb-6">
        ANALÍTICA OPERATIVA
      </h1>

      {/* Row 1: KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
            <p className="text-xs font-black opacity-50 uppercase tracking-widest">{kpi.label}</p>
            <h2 className="text-4xl font-black mt-2">{kpi.value}</h2>
            <p className="text-xs font-bold text-emerald-600 mt-1">{kpi.trend}</p>
          </div>
        ))}
      </div>

      {/* Row 2: Main Charts */}
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
          <h3 className="text-sm font-black uppercase mb-6">Pulso Operativo</h3>
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

      {/* Row 3: Ranking */}
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
