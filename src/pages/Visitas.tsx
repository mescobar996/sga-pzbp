import React, { useState, useEffect, useMemo } from 'react';
import {
  Save,
  X,
  Edit2,
  Trash2,
  MapPin,
  Calendar,
  Clock,
  User,
  FileText,
  ArrowRight,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';
import { visitaSchema } from '../utils/validation';
import { SkeletonPage } from '../components/Skeleton';
import VisitasMap from '../components/VisitasMap';
import { getVisitas, addVisita, updateVisita, deleteVisita, onVisitasChange } from '../db/visitas';
import { getLocations, onLocationsChange } from '../db/locations';
import { getPersonal, onPersonalChange } from '../db/personal';
import { addNotification } from '../db/notifications';
import { getCurrentUserId } from '../db/client';

interface Visita {
  id: string;
  origen: string;
  destino: string;
  fecha: string;
  hora: string;
  responsable: string;
  observaciones?: string;
  createdAt: string;
  authorId: string;
}

function handleError(error: unknown) {
  console.error('Error:', error);
  toast.error('Error al procesar la solicitud');
}

export default function Visitas() {
  const { isAdmin } = useOutletContext<{ isAdmin: boolean }>();
  const [formData, setFormData] = useState({
    origen: '',
    destino: '',
    fecha: '',
    hora: '',
    responsable: '',
    observaciones: '',
  });

  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string; type: string }[]>([]);
  const [personal, setPersonal] = useState<{ id: string; name: string }[]>([]);
  const [selectedVisita, setSelectedVisita] = useState<Visita | null>(null);
  const [isEditingVisita, setIsEditingVisita] = useState(false);
  const [editingVisitaId, setEditingVisitaId] = useState<string | null>(null);
  const [selectedResponsables, setSelectedResponsables] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Filters and Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [responsableFilter, setResponsableFilter] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    const loadVisitas = async () => {
      try {
        const data = await getVisitas();
        setVisitas(data);
      } catch (error) {
        handleError(error);
      }
    };

    const unsubLocations = onLocationsChange((locs) => {
      setLocations(locs.map(l => ({ id: l.id, name: l.name, type: l.type, latitude: l.latitude, longitude: l.longitude })));
    });

    const unsubPersonal = onPersonalChange((pers) => {
      setPersonal(pers.map(p => ({ id: p.id, name: p.name })));
      setLoading(false);
    });

    loadVisitas();
    return () => {
      unsubLocations();
      unsubPersonal();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedResponsables.length === 0) {
      toast.error('Debe seleccionar al menos un responsable.');
      return;
    }

    const visitaData = {
      origen: formData.origen,
      destino: formData.destino,
      fecha: formData.fecha,
      hora: formData.hora,
      responsable: selectedResponsables.join(' Y '),
      observaciones: formData.observaciones,
    };

    const result = visitaSchema.safeParse(visitaData);
    if (!result.success) {
      result.error.issues.forEach((err) => toast.error(err.message));
      return;
    }

    try {
      const finalFormData = {
        ...result.data,
        responsable: selectedResponsables.join(' Y '),
      };

      if (isEditingVisita && editingVisitaId) {
        await updateVisita(editingVisitaId, finalFormData);
        toast.success('Visita actualizada exitosamente');
        setIsEditingVisita(false);
        setEditingVisitaId(null);
      } else {
        await addVisita({
          ...finalFormData,
          comments: [],
        });

        await addNotification({
          title: 'Nueva Visita Técnica',
          message: `${formData.origen} -> ${formData.destino}`,
          type: 'visita',
        });

        toast.success('Visita registrada exitosamente');
      }
      setFormData({ origen: '', destino: '', fecha: '', hora: '', responsable: '', observaciones: '' });
      setSelectedResponsables([]);
    } catch (error) {
      toast.error(isEditingVisita ? 'Error al actualizar la visita' : 'Error al registrar la visita');
      handleError(error);
    }
  };

  const handleEditVisita = (visita: Visita) => {
    setFormData({
      origen: visita.origen,
      destino: visita.destino,
      fecha: visita.fecha,
      hora: visita.hora,
      responsable: '', // We use selectedResponsables instead
      observaciones: visita.observaciones || '',
    });
    setSelectedResponsables(visita.responsable ? visita.responsable.split(' Y ') : []);
    setIsEditingVisita(true);
    setEditingVisitaId(visita.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteVisita = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta visita?')) return;
    try {
      await deleteVisita(id);
      toast.success('Visita eliminada exitosamente');
      if (selectedVisita?.id === id) {
        setSelectedVisita(null);
      }
    } catch (error) {
      toast.error('Error al eliminar la visita');
      handleError(error);
    }
  };

  const filteredVisitas = useMemo(
    () =>
      visitas.filter((v) => {
        const matchesSearch =
          v.origen.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.destino.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (v.observaciones && v.observaciones.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesResponsable =
          responsableFilter === 'todos' || (v.responsable && v.responsable.split(' Y ').includes(responsableFilter));
        const matchesDateFrom = !dateFrom || v.fecha >= dateFrom;
        const matchesDateTo = !dateTo || v.fecha <= dateTo;

        return matchesSearch && matchesResponsable && matchesDateFrom && matchesDateTo;
      }),
    [visitas, searchQuery, responsableFilter, dateFrom, dateTo],
  );

  const totalPages = Math.max(1, Math.ceil(filteredVisitas.length / itemsPerPage));
  const paginatedVisitas = filteredVisitas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFrom, dateTo, responsableFilter]);

  return (
    <div className="font-['Inter'] max-w-6xl mx-auto">
      {loading ? (
        <SkeletonPage title="Registro de Visita" cardCount={3} layout="table" />
      ) : (
        <>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase mb-4 sm:mb-6 font-['Space_Grotesk'] tracking-tighter">
            {isEditingVisita ? 'Editar Visita' : 'Registro de Visita'}
          </h1>

          <form
            onSubmit={handleSubmit}
            className="bg-white border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] sm:shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] p-4 sm:p-6 mb-6 sm:mb-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-widest">Origen</label>
                <input
                  type="text"
                  list="origenes-list"
                  required
                  value={formData.origen}
                  onChange={(e) => setFormData({ ...formData, origen: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 sm:p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors text-xs sm:text-sm"
                  placeholder="Ej. Sede Central"
                />
                <datalist id="origenes-list">
                  {locations
                    .filter((l) => l.type === 'Origen' || l.type === 'Origen/Destino')
                    .map((l) => (
                      <option key={l.id} value={l.name.toUpperCase()} />
                    ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-widest">Destino</label>
                <input
                  type="text"
                  list="destinos-list"
                  required
                  value={formData.destino}
                  onChange={(e) => setFormData({ ...formData, destino: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 sm:p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors text-xs sm:text-sm"
                  placeholder="Ej. Zona Portuaria"
                />
                <datalist id="destinos-list">
                  {locations
                    .filter((l) => l.type === 'Destino' || l.type === 'Origen/Destino')
                    .map((l) => (
                      <option key={l.id} value={l.name.toUpperCase()} />
                    ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-widest">Fecha</label>
                <input
                  type="date"
                  required
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full p-2.5 sm:p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-widest">Hora</label>
                <input
                  type="time"
                  required
                  value={formData.hora}
                  onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                  className="w-full p-2.5 sm:p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="block text-xs font-black uppercase tracking-widest">Responsables</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    list="personal-list"
                    value={formData.responsable}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      if (/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/.test(val)) {
                        setFormData({ ...formData, responsable: val });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (formData.responsable && !selectedResponsables.includes(formData.responsable)) {
                          setSelectedResponsables([...selectedResponsables, formData.responsable]);
                          setFormData({ ...formData, responsable: '' });
                        }
                      }
                    }}
                    className="flex-1 p-2.5 sm:p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors text-xs sm:text-sm"
                    placeholder="Nombre del responsable (Enter para agregar)"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.responsable && !selectedResponsables.includes(formData.responsable)) {
                        setSelectedResponsables([...selectedResponsables, formData.responsable]);
                        setFormData({ ...formData, responsable: '' });
                      }
                    }}
                    className="px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-[#1a1a1a] bg-[#1a1a1a] text-white font-black uppercase tracking-widest hover:bg-[#0055ff] transition-colors text-xs sm:text-sm"
                  >
                    Agregar
                  </button>
                </div>
                <datalist id="personal-list">
                  {personal.map((p) => (
                    <option key={p.id} value={p.name.toUpperCase()} />
                  ))}
                </datalist>
                {selectedResponsables.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                    {selectedResponsables.map((resp) => (
                      <span
                        key={resp}
                        className="inline-flex items-center gap-1 bg-[#0055ff] text-white px-2 sm:px-3 py-1 font-bold text-xs sm:text-sm uppercase border-2 border-[#1a1a1a]"
                      >
                        {resp}
                        <button
                          type="button"
                          onClick={() => setSelectedResponsables(selectedResponsables.filter((r) => r !== resp))}
                          className="hover:text-[#1a1a1a] ml-1"
                        >
                          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="block text-xs font-black uppercase tracking-widest">Observaciones</label>
                <textarea
                  rows={3}
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 sm:p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors resize-none text-xs sm:text-sm"
                  placeholder="Detalles adicionales..."
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end border-t-2 border-[#1a1a1a] pt-4 sm:pt-6">
              <button
                type="button"
                onClick={() => {
                  setFormData({ origen: '', destino: '', fecha: '', hora: '', responsable: '', observaciones: '' });
                  setIsEditingVisita(false);
                  setEditingVisitaId(null);
                }}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-[#1a1a1a] bg-white text-[#1a1a1a] font-black uppercase tracking-widest hover:bg-[#e63b2e] hover:text-white transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Cancelar
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-[#1a1a1a] bg-[#0055ff] text-white font-black uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-[#0055ff] transition-colors flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] sm:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1 text-xs sm:text-sm"
              >
                <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {isEditingVisita ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>

          {/* Recent Visits List */}
          <div className="mt-6 sm:mt-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 gap-2 sm:gap-4">
              <h2 className="text-xl sm:text-2xl font-black uppercase font-['Space_Grotesk'] tracking-tighter">
                Registro Histórico
              </h2>
              <div className="flex border-2 border-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-colors ${viewMode === 'list' ? 'bg-[#1a1a1a] text-white' : 'bg-white text-[#1a1a1a] hover:bg-[#f5f0e8]'}`}
                >
                  Lista
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest border-l-2 border-[#1a1a1a] transition-colors ${viewMode === 'map' ? 'bg-[#1a1a1a] text-white' : 'bg-white text-[#1a1a1a] hover:bg-[#f5f0e8]'}`}
                >
                  Mapa
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white border-2 border-[#1a1a1a] p-3 sm:p-4 mb-4 sm:mb-6 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] sm:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1a1a1a] opacity-50" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="BUSCAR..."
                    className="w-full pl-9 sm:pl-10 p-2 sm:p-2.5 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase text-[10px] sm:text-xs transition-colors"
                  />
                </div>
                <div>
                  <select
                    value={responsableFilter}
                    onChange={(e) => setResponsableFilter(e.target.value)}
                    className="w-full p-2 sm:p-3 border-2 sm:border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase text-[10px] sm:text-sm transition-colors"
                  >
                    <option value="todos">TODOS LOS RESPONSABLES</option>
                    {Array.from(new Set(visitas.flatMap((v) => (v.responsable ? v.responsable.split(' Y ') : [])))).map(
                      (resp) => (
                        <option key={resp} value={resp}>
                          {resp}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full p-2 sm:p-3 border-2 sm:border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase text-[10px] sm:text-sm transition-colors"
                    title="Fecha Desde"
                  />
                </div>
                <div>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full p-2 sm:p-3 border-2 sm:border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase text-[10px] sm:text-sm transition-colors"
                    title="Fecha Hasta"
                  />
                </div>
              </div>
            </div>

            {viewMode === 'list' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {paginatedVisitas.map((visita) => (
                    <div
                      key={visita.id}
                      onClick={() => setSelectedVisita(visita)}
                      className="bg-white border-2 sm:border-4 border-[#1a1a1a] p-3 sm:p-4 cursor-pointer hover:bg-[#f5f0e8] transition-colors shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] sm:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-1.5 sm:mb-2">
                          <h3 className="font-black uppercase text-sm sm:text-lg truncate pr-2">
                            {visita.origen} &rarr; {visita.destino}
                          </h3>
                          <span className="text-[10px] sm:text-xs font-bold bg-[#1a1a1a] text-white px-1.5 sm:px-2 py-0.5 sm:py-1 uppercase flex-shrink-0">
                            {visita.fecha}
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-sm font-bold opacity-70 uppercase truncate">
                          Resp: {visita.responsable}
                        </p>
                      </div>
                      <div className="mt-3 sm:mt-4 flex justify-between items-center">
                        <div className="flex gap-1.5 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditVisita(visita);
                            }}
                            className="p-1 sm:p-1.5 border-2 border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          {isAdmin && (
                            <button
                               onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVisita(visita.id);
                              }}
                              className="p-1 sm:p-1.5 border-2 border-[#1a1a1a] hover:bg-[#e63b2e] hover:text-white transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {paginatedVisitas.length === 0 && (
                    <p className="text-xs sm:text-sm font-bold uppercase opacity-50 sm:col-span-2 text-center py-8">
                      No hay visitas que coincidan con los filtros.
                    </p>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-3 sm:gap-4 mt-6 sm:mt-8">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 sm:p-2 border-2 sm:border-4 border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" />
                    </button>
                    <span className="font-black uppercase tracking-widest text-xs sm:text-sm">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 sm:p-2 border-2 sm:border-4 border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-4 mb-8">
                <VisitasMap visitas={filteredVisitas} locations={locations} />
              </div>
            )}
          </div>

          {/* Visita Details Modal */}
          {selectedVisita && (
            <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto pt-8 sm:pt-10 pb-8 sm:pb-10">
              <div className="bg-white border-2 sm:border-4 border-[#1a1a1a] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] sm:shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] p-0 w-full max-w-3xl flex flex-col relative">
                {/* Header */}
                <div className="bg-[#1a1a1a] text-white p-4 sm:p-6 flex justify-between items-start">
                  <div className="flex-1 min-w-0 mr-2">
                    <h2 className="text-xl sm:text-3xl font-black uppercase font-['Space_Grotesk'] tracking-widest mb-1.5 sm:mb-2">
                      Detalles de Visita
                    </h2>
                    <div className="flex items-center gap-1.5 sm:gap-3 text-[#0055ff] font-bold uppercase tracking-widest text-[10px] sm:text-sm flex-wrap">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" /> {selectedVisita.origen}
                      </span>
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-white shrink-0" />
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" /> {selectedVisita.destino}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedVisita(null)}
                    className="p-1.5 sm:p-2 hover:bg-[#e63b2e] hover:text-white transition-colors border-2 border-transparent hover:border-white text-white shrink-0"
                  >
                    <X className="w-4 h-4 sm:w-6 sm:h-6" />
                  </button>
                </div>

                <div className="p-4 sm:p-6">
                  {/* Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <div className="border-2 border-[#1a1a1a] p-3 sm:p-4 bg-[#f5f0e8] flex flex-col justify-center">
                      <p className="font-bold uppercase opacity-70 text-[10px] sm:text-xs mb-1.5 sm:mb-2 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Fecha
                      </p>
                      <p className="font-black uppercase text-base sm:text-lg">{selectedVisita.fecha}</p>
                    </div>
                    <div className="border-2 border-[#1a1a1a] p-3 sm:p-4 bg-[#f5f0e8] flex flex-col justify-center">
                      <p className="font-bold uppercase opacity-70 text-[10px] sm:text-xs mb-1.5 sm:mb-2 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Hora
                      </p>
                      <p className="font-black uppercase text-base sm:text-lg">{selectedVisita.hora}</p>
                    </div>
                    <div className="border-2 border-[#1a1a1a] p-3 sm:p-4 bg-[#f5f0e8] flex flex-col justify-center overflow-hidden">
                      <p className="font-bold uppercase opacity-70 text-[10px] sm:text-xs mb-1.5 sm:mb-2 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Responsable
                      </p>
                      <p
                        className="font-black uppercase text-base sm:text-lg truncate"
                        title={selectedVisita.responsable}
                      >
                        {selectedVisita.responsable}
                      </p>
                    </div>
                    {selectedVisita.observaciones && (
                      <div className="col-span-1 sm:col-span-3 border-2 border-[#1a1a1a] p-3 sm:p-4 bg-white">
                        <p className="font-bold uppercase opacity-70 text-[10px] sm:text-xs mb-1.5 sm:mb-2 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Observaciones
                        </p>
                        <p className="font-medium text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                          {selectedVisita.observaciones}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
