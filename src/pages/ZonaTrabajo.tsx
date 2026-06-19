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
      <div className="flex border-b-4 border-black mb-8 overflow-x-auto scrollbar-none gap-2">
        {tabs.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) => 
              `flex items-center gap-2 px-4 sm:px-6 py-3 border-4 border-black font-black uppercase text-xs sm:text-sm tracking-wider transition-all duration-150 cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[#0055ff] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-white text-black hover:bg-[#f5f0e8]'
              }`
            }
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </NavLink>
        ))}
      </div>

      {/* Contenido Dinámico */}
      <div className="bg-white border-4 border-black p-6 min-h-[400px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <Outlet context={context} />
      </div>
    </div>
  );
}
