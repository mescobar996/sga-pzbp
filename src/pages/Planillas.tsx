import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Search, Battery, RefreshCw } from 'lucide-react';
import { getRelevamientoBateriasP25 } from '../db/planillas';
import type { RelevamientoBateriasP25 } from '../db/planillas';
import BateriasP25Form from '../components/forms/BateriasP25Form';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

export default function Planillas() {
  const { user } = useOutletContext<{ user: User }>();
  const [items, setItems] = useState<RelevamientoBateriasP25[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRegistro, setSelectedRegistro] = useState<RelevamientoBateriasP25 | null>(null);

  // Compute author name for the form submissions
  const authorName = (user?.user_metadata?.name as string) || user?.email?.split('@')[0] || 'USUARIO';

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getRelevamientoBateriasP25();
      setItems(data);
    } catch (err) {
      console.error('Error loading battery survey data:', err);
      toast.error('ERROR AL CARGAR EL RELEVAMIENTO');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSigla = item.destinatario_sigla.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesName = (item.locations?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesObs = (item.observaciones || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSigla || matchesName || matchesObs;
    });
  }, [items, searchQuery]);

  // Aggregate totals
  const totals = useMemo(() => {
    let functioning = 0;
    let outOfService = 0;
    filteredItems.forEach((item) => {
      functioning += item.en_funcionamiento;
      outOfService += item.fuera_de_servicio;
    });
    return {
      functioning,
      outOfService,
      total: functioning + outOfService,
      destinationsCount: filteredItems.length,
    };
  }, [filteredItems]);

  const openNewModal = () => {
    setSelectedRegistro(null);
    setIsModalOpen(true);
  };

  const openEditModal = (registro: RelevamientoBateriasP25) => {
    setSelectedRegistro(registro);
    setIsModalOpen(true);
  };

  return (
    <div className="font-['Inter'] max-w-6xl mx-auto px-3 sm:px-4 pb-24 lg:pb-8">
      {/* Title Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black uppercase font-['Space_Grotesk'] tracking-tighter text-black">
            RELEVAMIENTO BATERÍAS P25
          </h1>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">
            CONTROL Y MONITOREO DINÁMICO DEL PARQUE DE BATERÍAS DE EQUIPOS APX
          </p>
        </div>
        <button
          onClick={loadData}
          className="self-start md:self-auto p-2.5 border-2 border-black bg-white hover:bg-[#f5f0e8] text-black font-black uppercase transition-colors flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none cursor-pointer text-xs"
          title="REFRESCAR DATOS"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> REFRESCAR
        </button>
      </div>

      {/* Summary Totals Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">TOTAL EN FUNCIONAMIENTO</span>
          <p className="text-2xl sm:text-3xl font-black text-green-600 mt-1">{totals.functioning}</p>
        </div>
        <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">TOTAL FUERA DE SERVICIO</span>
          <p className="text-2xl sm:text-3xl font-black text-[#e63b2e] mt-1">{totals.outOfService}</p>
        </div>
        <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">PARQUE TOTAL BATERÍAS</span>
          <p className="text-2xl sm:text-3xl font-black text-black mt-1">{totals.total}</p>
        </div>
        <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">DESTINOS REGISTRADOS</span>
          <p className="text-2xl sm:text-3xl font-black text-[#0055ff] mt-1">{totals.destinationsCount}</p>
        </div>
      </div>

      {/* Filters and Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
        {/* Search Input */}
        <div className="w-full md:w-96 relative">
          <div className="flex items-center bg-white border-2 border-black px-3 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Search className="text-black mr-2 w-4 h-4 shrink-0" />
            <input
              className="bg-transparent border-none focus:outline-none text-xs font-bold uppercase tracking-wider outline-none w-full text-black placeholder:text-black/40"
              placeholder="FILTRAR POR DESTINO..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Create/Update Trigger Button */}
        <button
          onClick={openNewModal}
          className="w-full md:w-auto px-6 py-3 border-2 border-black bg-[#0055ff] text-white font-black uppercase tracking-widest hover:bg-black hover:text-[#0055ff] transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none cursor-pointer text-sm"
        >
          <Plus className="w-5 h-5 shrink-0" /> NUEVO REGISTRO / ACTUALIZAR
        </button>
      </div>

      {/* Main Grid View */}
      <div className="space-y-3">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-20 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-black border-t-[#0055ff] animate-spin"></div>
              <span className="text-xs font-black uppercase tracking-widest opacity-50">Cargando Relevamiento...</span>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center p-12 bg-white border-2 border-black font-black uppercase text-base opacity-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            No se encontraron registros de relevamiento.
          </div>
        ) : (
          <div className="w-full">
            {/* Table Header for Desktop */}
            <div className="w-full bg-[#1a1a1a] text-white border-2 border-black font-black uppercase text-xs p-3 hidden md:flex items-center gap-4 mb-2">
              <div className="w-32 shrink-0">SIGLA DESTINO</div>
              <div className="w-40 shrink-0 text-center">EN FUNCIONAMIENTO</div>
              <div className="w-40 shrink-0 text-center">FUERA DE SERVICIO</div>
              <div className="w-24 shrink-0 text-center">TOTAL</div>
              <div className="flex-1 min-w-0">OBSERVACIONES</div>
              <div className="w-32 shrink-0 text-right">ACCIONES</div>
            </div>

            {/* Row Loop */}
            {filteredItems.map((item) => {
              const totalRow = item.en_funcionamiento + item.fuera_de_servicio;
              return (
                <div
                  key={item.id}
                  className="w-full bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all mb-3"
                >
                  {/* Left part: Destination Icon and Info */}
                  <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                    <div className="border-2 border-black p-2 bg-[#ffd700] flex items-center justify-center shrink-0 w-10 h-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <Battery className="w-5 h-5 text-black" />
                    </div>

                    {/* Desktop/Tablet aligned flex */}
                    <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 items-center">
                      {/* Name / Sigla */}
                      <div className="min-w-0">
                        <h3 className="font-black text-sm sm:text-base uppercase truncate text-black">
                          {item.destinatario_sigla}
                        </h3>
                        <p className="text-[10px] font-bold text-gray-500 uppercase truncate">
                          {item.locations?.name || 'SIN DEPENDENCIA'}
                        </p>
                      </div>

                      {/* functioning count */}
                      <div className="flex flex-col sm:items-center">
                        <span className="text-[9px] font-black uppercase text-gray-400 block md:hidden">EN FUNCIONAMIENTO</span>
                        <span className="text-sm font-black text-green-600">{item.en_funcionamiento}</span>
                      </div>

                      {/* out of service count */}
                      <div className="flex flex-col sm:items-center">
                        <span className="text-[9px] font-black uppercase text-gray-400 block md:hidden">FUERA DE SERVICIO</span>
                        <span className="text-sm font-black text-[#e63b2e]">{item.fuera_de_servicio}</span>
                      </div>

                      {/* total count */}
                      <div className="flex flex-col sm:items-center">
                        <span className="text-[9px] font-black uppercase text-gray-400 block md:hidden">TOTAL</span>
                        <span className="text-sm font-black text-black">{totalRow}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle part: Observations */}
                  <div className="flex-1 min-w-0 md:max-w-xs text-xs font-semibold uppercase text-gray-600 break-words md:px-2">
                    {item.observaciones ? (
                      <span className="block">{item.observaciones}</span>
                    ) : (
                      <span className="opacity-40 italic">SIN OBSERVACIONES</span>
                    )}
                  </div>

                  {/* Right part: Modificar Button */}
                  <div className="flex items-center justify-end shrink-0">
                    <button
                      onClick={() => openEditModal(item)}
                      className="px-4 py-2.5 border-2 border-black bg-[#ffd700] hover:bg-black hover:text-[#ffd700] text-black font-black uppercase tracking-wider text-xs transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none cursor-pointer"
                    >
                      MODIFICAR
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Drawer Modal */}
      <BateriasP25Form
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveSuccess={loadData}
        registro={selectedRegistro}
        authorName={authorName}
      />
    </div>
  );
}
