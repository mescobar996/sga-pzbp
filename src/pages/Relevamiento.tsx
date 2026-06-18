import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Search, Battery, RefreshCw } from 'lucide-react';
import { getRelevamientoBateriasP25 } from '../db/relevamientos';
import type { RelevamientoBateriasP25 } from '../db/relevamientos';
import BateriasP25Form from '../components/forms/BateriasP25Form';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

type TabId = 'baterias_p25' | 'otros_equipos'; // extensible list of tabs

export default function Relevamiento() {
  const { user } = useOutletContext<{ user: User }>();
  const [activeTab, setActiveTab] = useState<TabId>('baterias_p25');
  const [bateriasData, setBateriasData] = useState<RelevamientoBateriasP25[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRegistro, setSelectedRegistro] = useState<RelevamientoBateriasP25 | null>(null);

  const authorName = (user?.user_metadata?.name as string) || user?.email?.split('@')[0] || 'USUARIO';

  const loadBaterias = async () => {
    setLoading(true);
    try {
      const data = await getRelevamientoBateriasP25();
      setBateriasData(data);
    } catch (err) {
      console.error('Error loading battery survey data:', err);
      toast.error('ERROR AL CARGAR EL RELEVAMIENTO DE BATERÍAS');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'baterias_p25') {
      loadBaterias();
    }
  }, [activeTab]);

  // Filters for Baterías P25
  const filteredBaterias = useMemo(() => {
    return bateriasData.filter((item) => {
      const matchesSigla = item.destinatario_sigla.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesName = (item.locations?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesObs = (item.observaciones || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSigla || matchesName || matchesObs;
    });
  }, [bateriasData, searchQuery]);

  // Aggregate totals for Baterías P25
  const bateriasTotals = useMemo(() => {
    let functioning = 0;
    let outOfService = 0;
    filteredBaterias.forEach((item) => {
      functioning += item.en_funcionamiento;
      outOfService += item.fuera_de_servicio;
    });
    return {
      functioning,
      outOfService,
      total: functioning + outOfService,
      destinationsCount: filteredBaterias.length,
    };
  }, [filteredBaterias]);

  const openNewModal = () => {
    setSelectedRegistro(null);
    setIsModalOpen(true);
  };

  const openEditModal = (registro: RelevamientoBateriasP25) => {
    setSelectedRegistro(registro);
    setIsModalOpen(true);
  };

  // Tabs Configuration
  const tabsList = [
    { id: 'baterias_p25', label: 'BATERÍAS P25' },
    // Placeholder tabs for future surveys
    { id: 'otros_equipos', label: 'OTROS RELEVAMIENTOS (PRÓXIMAMENTE)' },
  ];

  return (
    <div className="font-['Inter'] max-w-6xl mx-auto px-3 sm:px-4 pb-24 lg:pb-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-4xl font-black uppercase font-['Space_Grotesk'] tracking-tighter text-black">
          RELEVAMIENTO OPERATIVO
        </h1>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">
          CONTROL, MONITOREO Y RELEVAMIENTO DE EQUIPAMIENTO POR DESTINO
        </p>
      </div>

      {/* Neo-Brutalista Tab Selection Bar */}
      <div className="flex border-b-4 border-black mb-6 overflow-x-auto scrollbar-none gap-2">
        {tabsList.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'baterias_p25') {
                  setActiveTab(tab.id);
                } else {
                  toast.info('RELEVAMIENTO NO CONFIGURADO AÚN');
                }
              }}
              className={`px-4 sm:px-6 py-3 border-2 border-black font-black uppercase text-xs sm:text-sm tracking-wider transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-white border-b-0 translate-y-[4px] shadow-[4px_-4px_0px_0px_rgba(0,0,0,1)] text-[#0055ff]'
                  : 'bg-gray-100 hover:bg-[#f5f0e8] border-b-2 opacity-70 hover:opacity-100 text-black'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active Tab Panel */}
      {activeTab === 'baterias_p25' && (
        <div className="space-y-6">
          {/* Section SubHeader */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-black uppercase text-black font-['Space_Grotesk']">
                RELEVAMIENTO BATERÍAS P25
              </h2>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                CONTROL DEL PARQUE DE BATERÍAS APX POR CADA DESTINO
              </p>
            </div>
            <button
              onClick={loadBaterias}
              className="self-start md:self-auto p-2.5 border-2 border-black bg-white hover:bg-[#f5f0e8] text-black font-black uppercase transition-colors flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none cursor-pointer text-xs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> REFRESCAR
            </button>
          </div>

          {/* Aggregate Totals Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">TOTAL EN FUNCIONAMIENTO</span>
              <p className="text-2xl sm:text-3xl font-black text-green-600 mt-1">{bateriasTotals.functioning}</p>
            </div>
            <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">TOTAL FUERA DE SERVICIO</span>
              <p className="text-2xl sm:text-3xl font-black text-[#e63b2e] mt-1">{bateriasTotals.outOfService}</p>
            </div>
            <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">PARQUE TOTAL BATERÍAS</span>
              <p className="text-2xl sm:text-3xl font-black text-black mt-1">{bateriasTotals.total}</p>
            </div>
            <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">DESTINOS REGISTRADOS</span>
              <p className="text-2xl sm:text-3xl font-black text-[#0055ff] mt-1">{bateriasTotals.destinationsCount}</p>
            </div>
          </div>

          {/* Filters & Actions Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
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

            {/* Create Button */}
            <button
              onClick={openNewModal}
              className="w-full md:w-auto px-6 py-3 border-2 border-black bg-[#0055ff] text-white font-black uppercase tracking-widest hover:bg-black hover:text-[#0055ff] transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none cursor-pointer text-sm"
            >
              <Plus className="w-5 h-5 shrink-0" /> NUEVO REGISTRO / ACTUALIZAR
            </button>
          </div>

          {/* Dense Data Grid */}
          <div className="space-y-3">
            {loading && bateriasData.length === 0 ? (
              <div className="flex items-center justify-center py-20 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-black border-t-[#0055ff] animate-spin"></div>
                  <span className="text-xs font-black uppercase tracking-widest opacity-50">Cargando Relevamiento...</span>
                </div>
              </div>
            ) : filteredBaterias.length === 0 ? (
              <div className="text-center p-12 bg-white border-2 border-black font-black uppercase text-base opacity-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                No se encontraron registros de baterías.
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

                {/* Rows Grid */}
                {filteredBaterias.map((item) => {
                  const totalRow = item.en_funcionamiento + item.fuera_de_servicio;
                  return (
                    <div
                      key={item.id}
                      className="w-full bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all mb-3"
                    >
                      {/* Left Block */}
                      <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                        <div className="border-2 border-black p-2 bg-[#ffd700] flex items-center justify-center shrink-0 w-10 h-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          <Battery className="w-5 h-5 text-black" />
                        </div>

                        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 items-center">
                          {/* Destinatario Name */}
                          <div className="min-w-0">
                            <h3 className="font-black text-sm sm:text-base uppercase truncate text-black">
                              {item.destinatario_sigla}
                            </h3>
                            <p className="text-[10px] font-bold text-gray-500 uppercase truncate">
                              {item.locations?.name || 'SIN DEPENDENCIA'}
                            </p>
                          </div>

                          {/* Funcionando */}
                          <div className="flex flex-col sm:items-center">
                            <span className="text-[9px] font-black uppercase text-gray-400 block md:hidden">EN FUNCIONAMIENTO</span>
                            <span className="text-sm font-black text-green-600">{item.en_funcionamiento}</span>
                          </div>

                          {/* Fuera de servicio */}
                          <div className="flex flex-col sm:items-center">
                            <span className="text-[9px] font-black uppercase text-gray-400 block md:hidden">FUERA DE SERVICIO</span>
                            <span className="text-sm font-black text-[#e63b2e]">{item.fuera_de_servicio}</span>
                          </div>

                          {/* Total */}
                          <div className="flex flex-col sm:items-center">
                            <span className="text-[9px] font-black uppercase text-gray-400 block md:hidden">TOTAL</span>
                            <span className="text-sm font-black text-black">{totalRow}</span>
                          </div>
                        </div>
                      </div>

                      {/* Observations */}
                      <div className="flex-1 min-w-0 md:max-w-xs text-xs font-semibold uppercase text-gray-600 break-words md:px-2">
                        {item.observaciones ? (
                          <span className="block">{item.observaciones}</span>
                        ) : (
                          <span className="opacity-40 italic">SIN OBSERVACIONES</span>
                        )}
                      </div>

                      {/* Modificar Button */}
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

          {/* Form Modal Drawer */}
          <BateriasP25Form
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSaveSuccess={loadBaterias}
            registro={selectedRegistro}
            authorName={authorName}
          />
        </div>
      )}
    </div>
  );
}
