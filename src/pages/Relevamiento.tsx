import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Search, Battery, RefreshCw, Upload, Radio, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import {
  getRelevamientoBateriasP25,
  getRelevamientoEquipamientoRadioelectrico,
  insertRelevamientoEquipamientoRadioelectricoBatch,
} from '../db/relevamientos';
import type { RelevamientoBateriasP25, RelevamientoEquipamientoRadioelectrico } from '../db/relevamientos';
import { getLocations } from '../db/locations';
import type { Location } from '../types';
import BateriasP25Form from '../components/forms/BateriasP25Form';
import EquipamientoRadioForm from '../components/forms/EquipamientoRadioForm';
import { parseRadioExcel } from '../utils/excelParser';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

type TabId = 'baterias_p25' | 'equip_radio';

export default function Relevamiento() {
  const { user } = useOutletContext<{ user: User }>();
  const [activeTab, setActiveTab] = useState<TabId>('baterias_p25');
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);

  // Baterías state
  const [bateriasData, setBateriasData] = useState<RelevamientoBateriasP25[]>([]);
  const [searchQueryBaterias, setSearchQueryBaterias] = useState('');
  const [isBateriasModalOpen, setIsBateriasModalOpen] = useState(false);
  const [selectedBateria, setSelectedBateria] = useState<RelevamientoBateriasP25 | null>(null);

  // Equipamiento Radioeléctrico state
  const [radioData, setRadioData] = useState<RelevamientoEquipamientoRadioelectrico[]>([]);
  const [searchQueryRadio, setSearchQueryRadio] = useState('');
  const [isRadioModalOpen, setIsRadioModalOpen] = useState(false);
  const [selectedRadio, setSelectedRadio] = useState<RelevamientoEquipamientoRadioelectrico | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Pagination for Radio Equipment (since it can have hundreds of records)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const authorName = (user?.user_metadata?.name as string) || user?.email?.split('@')[0] || 'USUARIO';

  // Load locations on mount
  useEffect(() => {
    getLocations()
      .then((data) => setLocations(data))
      .catch((err) => console.error('Error fetching locations:', err));
  }, []);

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

  const loadRadio = async () => {
    setLoading(true);
    try {
      const data = await getRelevamientoEquipamientoRadioelectrico();
      setRadioData(data);
    } catch (err) {
      console.error('Error loading radio equipment data:', err);
      toast.error('ERROR AL CARGAR EL RELEVAMIENTO DE EQUIPOS');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'baterias_p25') {
      loadBaterias();
    } else if (activeTab === 'equip_radio') {
      loadRadio();
      setCurrentPage(1);
    }
  }, [activeTab]);

  // Excel Upload Handler
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading('PROCESANDO Y VALIDANDO ARCHIVO EXCEL...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer) throw new Error('NO SE PUDO LEER EL BUFFER DEL ARCHIVO');

        // Parse using XLSX multi-sheet utility
        const parsedRows = parseRadioExcel(buffer, locations);
        if (parsedRows.length === 0) {
          throw new Error('NO SE ENCONTRARON REGISTROS VÁLIDOS EN EL EXCEL. VERIFICAR FORMATO Y N° DE ORDEN.');
        }

        toast.loading(`CARGANDO ${parsedRows.length} REGISTROS EN SUPABASE...`, { id: toastId });

        // Map and append author details
        const payloads = parsedRows.map((row) => ({
          ...row,
          author_name: authorName.toUpperCase(),
        }));

        // Insert in segments of 100
        await insertRelevamientoEquipamientoRadioelectricoBatch(payloads);

        toast.success(`IMPORTACIÓN EXITOSA: ${payloads.length} REGISTROS CARGADOS`, { id: toastId });
        loadRadio();
      } catch (err: any) {
        console.error('Error importing Excel:', err);
        const errMsg = (err.message || 'ERROR DESCONOCIDO').toUpperCase();
        toast.error(`ERROR AL IMPORTAR: ${errMsg}`, { id: toastId });
      } finally {
        setIsUploading(false);
        // Clear file input
        e.target.value = '';
      }
    };

    reader.onerror = () => {
      toast.error('ERROR AL LEER EL ARCHIVO', { id: toastId });
      setIsUploading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Filters for Baterías
  const filteredBaterias = useMemo(() => {
    return bateriasData.filter((item) => {
      const matchesSigla = item.destinatario_sigla.toLowerCase().includes(searchQueryBaterias.toLowerCase());
      const matchesName = (item.locations?.name || '').toLowerCase().includes(searchQueryBaterias.toLowerCase());
      const matchesObs = (item.observaciones || '').toLowerCase().includes(searchQueryBaterias.toLowerCase());
      return matchesSigla || matchesName || matchesObs;
    });
  }, [bateriasData, searchQueryBaterias]);

  // Aggregate totals for Baterías
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

  // Filters for Radio Equipment
  const filteredRadio = useMemo(() => {
    return radioData.filter((item) => {
      const query = searchQueryRadio.toLowerCase();
      const matchesSigla = item.destinatario_sigla.toLowerCase().includes(query);
      const matchesLocationName = (item.locations?.name || '').toLowerCase().includes(query);
      const matchesUbicacion = (item.ubicacion_interna || '').toLowerCase().includes(query);
      const matchesModelo = item.modelo.toLowerCase().includes(query);
      const matchesSerie = item.nro_serie.toLowerCase().includes(query);
      const matchesEstado = item.estado.toLowerCase().includes(query);
      const matchesObs = (item.observaciones || '').toLowerCase().includes(query);
      return matchesSigla || matchesLocationName || matchesUbicacion || matchesModelo || matchesSerie || matchesEstado || matchesObs;
    });
  }, [radioData, searchQueryRadio]);

  // Aggregate totals for Radio Equipment
  const radioTotals = useMemo(() => {
    let operativo = 0;
    let mantenimiento = 0;
    let fueraServicio = 0;
    filteredRadio.forEach((item) => {
      const est = item.estado.toUpperCase();
      if (est.includes('OPERATIVO')) operativo++;
      else if (est.includes('MANTENIMIENTO')) mantenimiento++;
      else fueraServicio++;
    });
    return {
      total: filteredRadio.length,
      operativo,
      mantenimiento,
      fueraServicio,
    };
  }, [filteredRadio]);

  // Paginated Radio Equipment list
  const totalPagesRadio = Math.max(1, Math.ceil(filteredRadio.length / itemsPerPage));
  const paginatedRadio = useMemo(() => {
    return filteredRadio.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredRadio, currentPage]);

  const openNewBateriaModal = () => {
    setSelectedBateria(null);
    setIsBateriasModalOpen(true);
  };

  const openEditBateriaModal = (registro: RelevamientoBateriasP25) => {
    setSelectedBateria(registro);
    setIsBateriasModalOpen(true);
  };

  const openNewRadioModal = () => {
    setSelectedRadio(null);
    setIsRadioModalOpen(true);
  };

  const openEditRadioModal = (registro: RelevamientoEquipamientoRadioelectrico) => {
    setSelectedRadio(registro);
    setIsRadioModalOpen(true);
  };

  // Reset pagination when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQueryRadio]);

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

      {/* Tabs Selector */}
      <div className="flex border-b-4 border-black mb-6 overflow-x-auto scrollbar-none gap-2">
        <button
          onClick={() => setActiveTab('baterias_p25')}
          className={`px-4 sm:px-6 py-3 border-2 border-black font-black uppercase text-xs sm:text-sm tracking-wider transition-all duration-150 cursor-pointer shrink-0 ${
            activeTab === 'baterias_p25'
              ? 'bg-white border-b-0 translate-y-[4px] shadow-[4px_-4px_0px_0px_rgba(0,0,0,1)] text-[#0055ff]'
              : 'bg-gray-100 hover:bg-[#f5f0e8] border-b-2 opacity-70 hover:opacity-100 text-black'
          }`}
        >
          BATERÍAS P25
        </button>
        <button
          onClick={() => setActiveTab('equip_radio')}
          className={`px-4 sm:px-6 py-3 border-2 border-black font-black uppercase text-xs sm:text-sm tracking-wider transition-all duration-150 cursor-pointer shrink-0 ${
            activeTab === 'equip_radio'
              ? 'bg-white border-b-0 translate-y-[4px] shadow-[4px_-4px_0px_0px_rgba(0,0,0,1)] text-[#0055ff]'
              : 'bg-gray-100 hover:bg-[#f5f0e8] border-b-2 opacity-70 hover:opacity-100 text-black'
          }`}
        >
          EQUIPAMIENTO RADIOELÉCTRICO
        </button>
      </div>

      {/* PANEL 1: BATERÍAS P25 */}
      {activeTab === 'baterias_p25' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header */}
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

          {/* Totals */}
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

          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-96 relative">
              <div className="flex items-center bg-white border-2 border-black px-3 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Search className="text-black mr-2 w-4 h-4 shrink-0" />
                <input
                  className="bg-transparent border-none focus:outline-none text-xs font-bold uppercase tracking-wider outline-none w-full text-black placeholder:text-black/40"
                  placeholder="FILTRAR POR DESTINO..."
                  type="text"
                  value={searchQueryBaterias}
                  onChange={(e) => setSearchQueryBaterias(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={openNewBateriaModal}
              className="w-full md:w-auto px-6 py-3 border-2 border-black bg-[#0055ff] text-white font-black uppercase tracking-widest hover:bg-black hover:text-[#0055ff] transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none cursor-pointer text-sm"
            >
              <Plus className="w-5 h-5 shrink-0" /> NUEVO REGISTRO / ACTUALIZAR
            </button>
          </div>

          {/* List Grid */}
          <div className="space-y-3">
            {loading && bateriasData.length === 0 ? (
              <div className="flex items-center justify-center py-20 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-black border-t-[#0055ff] animate-spin"></div>
                  <span className="text-xs font-black uppercase tracking-widest opacity-50">Cargando Baterías...</span>
                </div>
              </div>
            ) : filteredBaterias.length === 0 ? (
              <div className="text-center p-12 bg-white border-2 border-black font-black uppercase text-base opacity-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                No se encontraron registros de relevamiento.
              </div>
            ) : (
              <div className="w-full">
                <div className="w-full bg-[#1a1a1a] text-white border-2 border-black font-black uppercase text-xs p-3 hidden md:flex items-center gap-4 mb-2">
                  <div className="w-32 shrink-0">SIGLA DESTINO</div>
                  <div className="w-40 shrink-0 text-center">EN FUNCIONAMIENTO</div>
                  <div className="w-40 shrink-0 text-center">FUERA DE SERVICIO</div>
                  <div className="w-24 shrink-0 text-center">TOTAL</div>
                  <div className="flex-1 min-w-0">OBSERVACIONES</div>
                  <div className="w-32 shrink-0 text-right">ACCIONES</div>
                </div>

                {filteredBaterias.map((item) => {
                  const totalRow = item.en_funcionamiento + item.fuera_de_servicio;
                  return (
                    <div
                      key={item.id}
                      className="w-full bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all mb-3"
                    >
                      <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                        <div className="border-2 border-black p-2 bg-[#ffd700] flex items-center justify-center shrink-0 w-10 h-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          <Battery className="w-5 h-5 text-black" />
                        </div>

                        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 items-center">
                          <div className="min-w-0">
                            <h3 className="font-black text-sm sm:text-base uppercase truncate text-black">
                              {item.destinatario_sigla}
                            </h3>
                            <p className="text-[10px] font-bold text-gray-500 uppercase truncate">
                              {item.locations?.name || 'SIN DEPENDENCIA'}
                            </p>
                          </div>

                          <div className="flex flex-col sm:items-center">
                            <span className="text-[9px] font-black uppercase text-gray-400 block md:hidden">EN FUNCIONAMIENTO</span>
                            <span className="text-sm font-black text-green-600">{item.en_funcionamiento}</span>
                          </div>

                          <div className="flex flex-col sm:items-center">
                            <span className="text-[9px] font-black uppercase text-gray-400 block md:hidden">FUERA DE SERVICIO</span>
                            <span className="text-sm font-black text-[#e63b2e]">{item.fuera_de_servicio}</span>
                          </div>

                          <div className="flex flex-col sm:items-center">
                            <span className="text-[9px] font-black uppercase text-gray-400 block md:hidden">TOTAL</span>
                            <span className="text-sm font-black text-black">{totalRow}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 md:max-w-xs text-xs font-semibold uppercase text-gray-600 break-words md:px-2">
                        {item.observaciones ? (
                          <span className="block">{item.observaciones}</span>
                        ) : (
                          <span className="opacity-40 italic">SIN OBSERVACIONES</span>
                        )}
                      </div>

                      <div className="flex items-center justify-end shrink-0">
                        <button
                          onClick={() => openEditBateriaModal(item)}
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

          <BateriasP25Form
            isOpen={isBateriasModalOpen}
            onClose={() => setIsBateriasModalOpen(false)}
            onSaveSuccess={loadBaterias}
            registro={selectedBateria}
            authorName={authorName}
          />
        </div>
      )}

      {/* PANEL 2: EQUIPAMIENTO RADIOELÉCTRICO */}
      {activeTab === 'equip_radio' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-black uppercase text-black font-['Space_Grotesk']">
                RELEVAMIENTO EQUIPAMIENTO RADIOELÉCTRICO
              </h2>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                PARQUE DE EQUIPOS VHF/UHF Y SISTEMAS DE COMUNICACIÓN
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {/* File Input hidden and styled */}
              <label className="p-2.5 border-2 border-black bg-[#00cc66] hover:bg-black hover:text-[#00cc66] text-white font-black uppercase transition-all flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none cursor-pointer text-xs">
                <Upload className="w-4 h-4" />
                {isUploading ? 'PROCESANDO...' : 'IMPORTAR EXCEL DE EQUIPAMIENTO'}
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleExcelUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>

              <button
                onClick={loadRadio}
                className="p-2.5 border-2 border-black bg-white hover:bg-[#f5f0e8] text-black font-black uppercase transition-colors flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none cursor-pointer text-xs"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> REFRESCAR
              </button>
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">TOTAL REGISTROS</span>
              <p className="text-2xl sm:text-3xl font-black text-black mt-1">{radioTotals.total}</p>
            </div>
            <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">OPERATIVOS</span>
              <p className="text-2xl sm:text-3xl font-black text-green-600 mt-1">{radioTotals.operativo}</p>
            </div>
            <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">MANTENIMIENTO</span>
              <p className="text-2xl sm:text-3xl font-black text-[#0055ff] mt-1">{radioTotals.mantenimiento}</p>
            </div>
            <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">FUERA DE SERVICIO / OTROS</span>
              <p className="text-2xl sm:text-3xl font-black text-[#e63b2e] mt-1">{radioTotals.fueraServicio}</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-96 relative">
              <div className="flex items-center bg-white border-2 border-black px-3 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Search className="text-black mr-2 w-4 h-4 shrink-0" />
                <input
                  className="bg-transparent border-none focus:outline-none text-xs font-bold uppercase tracking-wider outline-none w-full text-black placeholder:text-black/40"
                  placeholder="BUSCAR EQUIPO, SIGLA, SERIE, ESTADO..."
                  type="text"
                  value={searchQueryRadio}
                  onChange={(e) => setSearchQueryRadio(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={openNewRadioModal}
              className="w-full md:w-auto px-6 py-3 border-2 border-black bg-[#0055ff] text-white font-black uppercase tracking-widest hover:bg-black hover:text-[#0055ff] transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none cursor-pointer text-sm"
            >
              <Plus className="w-5 h-5 shrink-0" /> NUEVO REGISTRO / ACTUALIZAR
            </button>
          </div>

          {/* List Data Grid */}
          <div className="space-y-3">
            {loading && radioData.length === 0 ? (
              <div className="flex items-center justify-center py-20 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-black border-t-[#0055ff] animate-spin"></div>
                  <span className="text-xs font-black uppercase tracking-widest opacity-50">Cargando Equipos...</span>
                </div>
              </div>
            ) : filteredRadio.length === 0 ? (
              <div className="text-center p-12 bg-white border-2 border-black font-black uppercase text-base opacity-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                No se encontraron equipos registrados.
              </div>
            ) : (
              <div className="w-full">
                {/* Headers */}
                <div className="w-full bg-[#1a1a1a] text-white border-2 border-black font-black uppercase text-xs p-3 hidden md:flex items-center gap-4 mb-2">
                  <div className="w-24 shrink-0">DESTINO</div>
                  <div className="w-40 shrink-0">UBICACIÓN INTERNA</div>
                  <div className="w-36 shrink-0">MODELO</div>
                  <div className="w-40 shrink-0">N° DE SERIE</div>
                  <div className="w-32 shrink-0 text-center">ESTADO</div>
                  <div className="flex-1 min-w-0">OBSERVACIONES</div>
                  <div className="w-32 shrink-0 text-right">ACCIONES</div>
                </div>

                {/* Rows */}
                {paginatedRadio.map((item) => (
                  <div
                    key={item.id}
                    className="w-full bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all mb-3 text-xs sm:text-sm"
                  >
                    <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                      <div className="border-2 border-black p-2 bg-[#ffd700] flex items-center justify-center shrink-0 w-10 h-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <Radio className="w-5 h-5 text-black" />
                      </div>

                      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-4 items-center">
                        {/* Destinatario */}
                        <div className="min-w-0">
                          <h3 className="font-black uppercase truncate text-black">{item.destinatario_sigla}</h3>
                          <p className="text-[10px] font-bold text-gray-500 uppercase truncate">
                            {item.locations?.name || 'SIN ASIGNAR'}
                          </p>
                        </div>

                        {/* Ubicacion Interna */}
                        <div className="truncate">
                          <span className="text-[9px] font-black uppercase text-gray-400 block md:hidden">UBICACIÓN INTERNA</span>
                          <span className="font-semibold">{item.ubicacion_interna || '—'}</span>
                        </div>

                        {/* Modelo */}
                        <div className="truncate">
                          <span className="text-[9px] font-black uppercase text-gray-400 block md:hidden">MODELO</span>
                          <span className="font-bold">{item.modelo}</span>
                          {item.caracteristica_equipo && (
                            <span className="text-[9px] block text-gray-400 font-bold uppercase">({item.caracteristica_equipo})</span>
                          )}
                        </div>

                        {/* Nro Serie */}
                        <div className="truncate font-mono">
                          <span className="text-[9px] font-black uppercase text-gray-400 block md:hidden">N° DE SERIE</span>
                          <span className="font-bold">{item.nro_serie}</span>
                        </div>

                        {/* Estado */}
                        <div className="flex md:justify-center">
                          <span className="text-[9px] font-black uppercase text-gray-400 block md:hidden mr-2">ESTADO:</span>
                          <span
                            className={`border-2 border-black px-2 py-0.5 text-[9px] font-black uppercase shrink-0 ${
                              item.estado.toUpperCase().includes('OPERATIVO')
                                ? 'bg-green-100 text-green-700'
                                : item.estado.toUpperCase().includes('MANTENIMIENTO')
                                ? 'bg-blue-100 text-[#0055ff]'
                                : 'bg-red-100 text-[#e63b2e]'
                            }`}
                          >
                            {item.estado}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Observations */}
                    <div className="flex-1 min-w-0 md:max-w-xs text-xs font-semibold uppercase text-gray-600 break-words md:px-2">
                      {item.observaciones ? (
                        <span>{item.observaciones}</span>
                      ) : (
                        <span className="opacity-40 italic">SIN OBSERVACIONES</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end shrink-0">
                      <button
                        onClick={() => openEditRadioModal(item)}
                        className="px-4 py-2.5 border-2 border-black bg-[#ffd700] hover:bg-black hover:text-[#ffd700] text-black font-black uppercase tracking-wider text-xs transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none cursor-pointer"
                      >
                        MODIFICAR
                      </button>
                    </div>
                  </div>
                ))}

                {/* Pagination Controls */}
                {totalPagesRadio > 1 && (
                  <div className="flex justify-center items-center gap-3 sm:gap-4 mt-8">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-black uppercase tracking-widest text-xs sm:text-sm">
                      PÁGINA {currentPage} DE {totalPagesRadio} ({filteredRadio.length} TOTAL)
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPagesRadio, p + 1))}
                      disabled={currentPage === totalPagesRadio}
                      className="p-1.5 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <EquipamientoRadioForm
            isOpen={isRadioModalOpen}
            onClose={() => setIsRadioModalOpen(false)}
            onSaveSuccess={loadRadio}
            registro={selectedRadio}
            authorName={authorName}
          />
        </div>
      )}
    </div>
  );
}
