import React from 'react';
import { Outlet, NavLink, useOutletContext } from 'react-router-dom';
import { HardHat, ListChecks, FileText, Newspaper } from 'lucide-react';

export default function ZonaTrabajo() {
  const context = useOutletContext();
  const tabs = [
    { name: 'Visitas', path: '/zona-trabajo/visitas', icon: HardHat },
    { name: 'Tareas', path: '/zona-trabajo/tareas', icon: ListChecks },
    { name: 'Novedades', path: '/zona-trabajo/novedades', icon: Newspaper },
    { name: 'Diligencias', path: '/zona-trabajo/diligenciamientos', icon: FileText },
  ];

  return (
    <div className="font-['Inter']">
      <h1 className="text-3xl font-black uppercase mb-6 font-['Space_Grotesk'] tracking-tighter">ZONA DE TRABAJO</h1>
      
      {/* Pestañas de Navegación */}
      <div className="flex gap-2 mb-8 border-b-2 border-[#1a1a1a] pb-2">
        {tabs.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) => 
              `flex items-center gap-2 px-4 py-2 font-black uppercase text-xs border-2 border-[#1a1a1a] transition-all ${
                isActive ? 'bg-[#1a1a1a] text-white' : 'bg-white hover:bg-slate-50'
              }`
            }
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </NavLink>
        ))}
      </div>

      {/* Contenido Dinámico */}
      <div className="bg-white border-2 border-[#1a1a1a] p-6 min-h-[400px]">
        <Outlet context={context} />
      </div>
    </div>
  );
}
