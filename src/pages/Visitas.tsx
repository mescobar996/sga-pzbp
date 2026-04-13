import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Paperclip,
  Upload,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../db/client';
import { visitaSchema } from '../utils/validation';
import { SkeletonPage } from '../components/Skeleton';
import VisitasMap from '../components/VisitasMap';
import { getVisitas, addVisita, updateVisita, deleteVisita, uploadVisitaAttachment, onVisitasChange } from '../db/visitas';
import { getLocations, onLocationsChange } from '../db/locations';
import { getPersonal, onPersonalChange } from '../db/personal';
import { addNotification } from '../db/notifications';
import { getCurrentUserId } from '../db/client';
import { motion } from 'motion/react';

interface Attachment {
  name: string;
  url: string;
  type: string;
  path: string;
  size?: number;
}

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
  attachments?: Attachment[];
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

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Attachments
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick upload handler
  const handleQuickUpload = async (visitaId: string, currentAttachments: Attachment[] = [], file: File) => {
    try {
      toast.loading(`Subiendo ${file.name}...`, { id: `upload-${visitaId}` });
      const userId = getCurrentUserId();
      const newAttachment = await uploadVisitaAttachment(file, visitaId, userId);
      const path = `visitas/${visitaId}/${Date.now()}_${file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const fullAttachment = { ...newAttachment, path };

      await updateVisita(visitaId, {
        attachments: [...(currentAttachments || []), fullAttachment] as any,
      });

      if (selectedVisita?.id === visitaId) {
        setSelectedVisita({ ...selectedVisita, attachments: [...(currentAttachments || []), fullAttachment] });
      }

      toast.success(`Archivo ${file.name} subido`, { id: `upload-${visitaId}` });
    } catch (error) {
      console.error('Error quick uploading file:', error);
      toast.error('Error al subir el archivo.', { id: `upload-${visitaId}` });
    }
  };

  const handleDeleteAttachment = async (visitaId: string, attachment: Attachment) => {
    try {
      const path = attachment.path || attachment.url.split('/object/public/attachments/')[1] || '';
      if (path) {
        await supabase.storage.from('attachments').remove([path]);
      }

      const currentVisita = visitas.find((v) => v.id === visitaId);
      const remaining = (currentVisita?.attachments || []).filter((a) => a.url !== attachment.url);
      await updateVisita(visitaId, { attachments: remaining as any });

      if (selectedVisita?.id === visitaId) {
        setSelectedVisita({ ...selectedVisita, attachments: remaining });
      }

      toast.success('Archivo eliminado');
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Error al eliminar el archivo');
    }
  };

  // Filters and Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [responsableFilter, setResponsableFilter] = useState('todos');
  const [sortBy, setSortBy] = useState('fecha_desc');
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

    const unsubVisitas = onVisitasChange((data) => {
      setVisitas(data);
      setLoading(false);
    });

    loadVisitas();

    const onFocus = () => loadVisitas();
    window.addEventListener('focus', onFocus);

    return () => {
      unsubLocations();
      unsubPersonal();
      unsubVisitas();
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const openNewModal = () => {
    setFormData({ origen: '', destino: '', fecha: new Date().toISOString().split('T')[0], hora: '', responsable: '', observaciones: '' });
    setSelectedResponsables([]);
    setPendingFiles([]);
    setAttachmentsToDelete([]);
    setIsEditingVisita(false);
    setEditingVisitaId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (visita: Visita) => {
    setFormData({
      origen: visita.origen,
      destino: visita.destino,
      fecha: visita.fecha,
      hora: visita.hora,
      responsable: '',
      observaciones: visita.observaciones || '',
    });
    setSelectedResponsables(visita.responsable ? visita.responsable.split(' Y ') : []);
    setSelectedVisita(visita);
    setIsEditingVisita(true);
    setEditingVisitaId(visita.id);
    setPendingFiles([]);
    setAttachmentsToDelete([]);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ origen: '', destino: '', fecha: '', hora: '', responsable: '', observaciones: '' });
    setSelectedResponsables([]);
    setPendingFiles([]);
    setAttachmentsToDelete([]);
    setIsEditingVisita(false);
    setEditingVisitaId(null);
    setSelectedVisita(null);
  };

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

    const finalFormData = {
      ...result.data,
      responsable: selectedResponsables.join(' Y '),
    };

    try {
      setIsSubmitting(true);
      let finalAttachments: Attachment[] = [];

      if (isEditingVisita && editingVisitaId) {
        const existingVisita = visitas.find((v) => v.id === editingVisitaId);
        finalAttachments = (existingVisita?.attachments || []).filter(
          (a) => !attachmentsToDelete.find((d) => d.url === a.url),
        );

        if (pendingFiles.length > 0) {
          for (const file of pendingFiles) {
            const userId = getCurrentUserId();
            const newAttachment = await uploadVisitaAttachment(file, editingVisitaId, userId);
            const path = `visitas/${editingVisitaId}/${Date.now()}_${file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            finalAttachments.push({ ...newAttachment, path });
          }
        }

        await updateVisita(editingVisitaId, { ...finalFormData, attachments: finalAttachments as any });
        toast.success('Visita actualizada exitosamente');
      } else {
        await addVisita({
          ...finalFormData,
          comments: [],
          attachments: [],
        });

        const allVisitas = await getVisitas();
        const newVisita = allVisitas.find((v) => v.origen === finalFormData.origen && v.fecha === finalFormData.fecha && v.hora === finalFormData.hora);

        if (newVisita && pendingFiles.length > 0) {
          for (const file of pendingFiles) {
            const userId = getCurrentUserId();
            const newAttachment = await uploadVisitaAttachment(file, newVisita.id, userId);
            const path = `visitas/${newVisita.id}/${Date.now()}_${file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            finalAttachments.push({ ...newAttachment, path });
          }
          await updateVisita(newVisita.id, { attachments: finalAttachments as any });
        }

        await addNotification({
          title: 'Nueva Visita Técnica',
          message: `${formData.origen} -> ${formData.destino}`,
          type: 'visita',
        });

        toast.success('Visita registrada exitosamente');
      }
      closeModal();
    } catch (error) {
      setIsSubmitting(false);
      toast.error(isEditingVisita ? 'Error al actualizar la visita' : 'Error al registrar la visita');
      handleError(error);
    }
    setIsSubmitting(false);
  };

  const handleDeleteVisita = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta visita?')) return;
    try {
      const visitaToDelete = visitas.find((v) => v.id === id);
      if (visitaToDelete?.attachments) {
        for (const att of visitaToDelete.attachments) {
          const path = att.path || att.url.split('/object/public/attachments/')[1] || '';
          if (path) {
            try {
              await supabase.storage.from('attachments').remove([path]);
            } catch (error) {
              console.error('Error deleting attachment:', error);
            }
          }
        }
      }

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
      }).sort((a, b) => {
        if (sortBy === 'fecha_desc') return b.fecha.localeCompare(a.fecha);
        if (sortBy === 'fecha_asc') return a.fecha.localeCompare(b.fecha);
        if (sortBy === 'titulo_az') return a.origen.localeCompare(b.origen, 'es');
        if (sortBy === 'titulo_za') return b.origen.localeCompare(a.origen, 'es');
        return 0;
      }),
    [visitas, responsableFilter, searchQuery, dateFrom, dateTo, sortBy],
  );

  const totalPages = Math.max(1, Math.ceil(filteredVisitas.length / itemsPerPage));
  const paginatedVisitas = filteredVisitas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFrom, dateTo, responsableFilter, sortBy]);

  return (
    <div className="font-['Inter'] max-w-6xl mx-auto px-3 sm:px-4 pb-24 lg:pb-8">
      {loading ? (
        <SkeletonPage title="Visitas Técnicas" cardCount={3} layout="table" />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black uppercase font-['Space_Grotesk'] tracking-tighter">
              Visitas Técnicas
            </h1>
            <button
              onClick={openNewModal}
              className="min-h-[44px] px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-[#1a1a1a] bg-[#00cc66] text-white font-black uppercase tracking-widest hover:bg-[#1a1a1a] transition-colors flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-0.5 hover:translate-y-0.5 text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> Nueva Visita
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white border-2 border-[#1a1a1a] p-3 sm:p-4 mb-4 sm:mb-6 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1a1a1a] opacity-50" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                  placeholder="BUSCAR..."
                  className="w-full pl-9 sm:pl-10 p-2 sm:p-2.5 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase text-[10px] sm:text-xs transition-colors"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full p-2.5 sm:p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase text-xs sm:text-sm transition-colors"
                  title="Fecha Desde"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full p-2.5 sm:p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase text-xs sm:text-sm transition-colors"
                  title="Fecha Hasta"
                />
              </div>
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full p-2 sm:p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase text-[10px] sm:text-sm transition-colors cursor-pointer"
                >
                  <option value="fecha_desc">Fecha (Más reciente)</option>
                  <option value="fecha_asc">Fecha (Más antiguo)</option>
                  <option value="titulo_az">Origen (A-Z)</option>
                  <option value="titulo_za">Origen (Z-A)</option>
                </select>
              </div>
              <div className="flex items-center">
                <div className="flex border-2 border-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] w-full">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex-1 px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-colors ${viewMode === 'list' ? 'bg-[#1a1a1a] text-white' : 'bg-white text-[#1a1a1a] hover:bg-[#f5f0e8]'}`}
                  >
                    Lista
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`flex-1 px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest border-l-2 border-[#1a1a1a] transition-colors ${viewMode === 'map' ? 'bg-[#1a1a1a] text-white' : 'bg-white text-[#1a1a1a] hover:bg-[#f5f0e8]'}`}
                  >
                    Mapa
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-3 sm:mt-4">
              <select
                value={responsableFilter}
                onChange={(e) => setResponsableFilter(e.target.value)}
                className="w-full p-2 sm:p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase text-[10px] sm:text-sm transition-colors"
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

            {(searchQuery || dateFrom || dateTo) && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase opacity-60">Filtros activos:</span>
                {searchQuery && (
                  <span className="text-[10px] font-bold bg-[#f5f0e8] border-2 border-[#1a1a1a] px-2 py-0.5">
                    Búsqueda: {searchQuery}
                  </span>
                )}
                {dateFrom && (
                  <span className="text-[10px] font-bold bg-[#f5f0e8] border-2 border-[#1a1a1a] px-2 py-0.5">
                    Desde: {dateFrom}
                  </span>
                )}
                {dateTo && (
                  <span className="text-[10px] font-bold bg-[#f5f0e8] border-2 border-[#1a1a1a] px-2 py-0.5">
                    Hasta: {dateTo}
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="text-[10px] font-bold text-[#e63b2e] hover:underline ml-1"
                >
                  Limpiar
                </button>
              </div>
            )}
          </div>

          {/* List / Map */}
          {viewMode === 'list' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {paginatedVisitas.map((visita) => (
                  <div
                    key={visita.id}
                    onClick={() => setSelectedVisita(visita)}
                    className="bg-white border-2 border-[#1a1a1a] p-3 sm:p-4 cursor-pointer hover:bg-[#f5f0e8] transition-colors shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-1.5 sm:mb-2">
                        <h3 className="font-black uppercase text-sm sm:text-lg truncate pr-2">
                          {visita.origen} &rarr; {visita.destino}
                        </h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {visita.attachments && visita.attachments.length > 0 && (
                            <span className="text-[10px] font-bold flex items-center gap-0.5 bg-orange-100 text-orange-700 px-1.5 py-0.5 border border-orange-300" title={`${visita.attachments.length} adjunto(s)`}>
                              <Paperclip className="w-2.5 h-2.5" /> {visita.attachments.length}
                            </span>
                          )}
                          <span className="text-[10px] sm:text-xs font-bold bg-[#1a1a1a] text-white px-1.5 sm:px-2 py-0.5 sm:py-1 uppercase">
                            {visita.fecha}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] sm:text-sm font-bold opacity-70 uppercase truncate">
                        Resp: {visita.responsable}
                      </p>
                    </div>
                    <div className="mt-3 sm:mt-4 flex justify-between items-center">
                      <div className="flex gap-1.5 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <label
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center border-2 border-[#1a1a1a] bg-white hover:bg-[#f5f0e8] transition-colors cursor-pointer"
                          title="Subir archivo rápido"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Upload className="w-5 h-5 sm:w-4 sm:h-4" />
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleQuickUpload(visita.id, visita.attachments as any, file);
                              }
                              e.target.value = '';
                            }}
                          />
                        </label>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(visita);
                          }}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center border-2 border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-5 h-5 sm:w-4 sm:h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVisita(visita.id);
                            }}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center border-2 border-[#1a1a1a] hover:bg-[#e63b2e] hover:text-white transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
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
                    className="p-1.5 sm:p-2 border-2 border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" />
                  </button>
                  <span className="font-black uppercase tracking-widest text-xs sm:text-sm">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 sm:p-2 border-2 border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Create/Edit Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto pt-8 sm:pt-10 pb-8 sm:pb-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-white border-2 sm:border-4 border-[#1a1a1a] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] p-0 w-full max-w-3xl relative"
              >
                {/* Header */}
                <div className="bg-[#1a1a1a] text-white p-4 sm:p-5 flex justify-between items-center">
                  <h2 className="text-lg sm:text-2xl font-black uppercase font-['Space_Grotesk'] tracking-widest">
                    {isEditingVisita ? 'Editar Visita' : 'Nueva Visita Técnica'}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="p-1.5 sm:p-2 hover:bg-[#e63b2e] hover:text-white transition-colors border-2 border-transparent hover:border-white text-white"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                        className="w-full p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors text-base sm:text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-widest">Hora</label>
                      <input
                        type="time"
                        required
                        value={formData.hora}
                        onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                        className="w-full p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors text-base sm:text-sm"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-xs font-black uppercase tracking-widest">Responsables</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          list="personal-list"
                          autoComplete="name"
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

                    {/* Attachments in modal */}
                    <div className="md:col-span-2 border-2 border-[#1a1a1a] p-3 sm:p-4 bg-white">
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                          <Paperclip className="w-4 h-4" /> Archivos Adjuntos
                        </label>
                        <label className="cursor-pointer px-3 py-1.5 bg-[#1a1a1a] text-white font-bold uppercase text-[10px] tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2">
                          <Upload className="w-3.5 h-3.5" /> Subir Archivos
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            multiple
                            onChange={(e) => {
                              if (e.target.files) {
                                setPendingFiles([...pendingFiles, ...Array.from(e.target.files)]);
                              }
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>

                      <div className="flex flex-col gap-2">
                        {isEditingVisita && editingVisitaId && selectedVisita?.attachments
                          ?.filter((a: any) => !attachmentsToDelete.find((d) => d.url === a.url))
                          .map((att: Attachment, idx: number) => (
                            <div
                              key={`att-${idx}`}
                              className="flex items-center justify-between p-2 border-2 border-[#1a1a1a] bg-[#f5f0e8]"
                            >
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 hover:underline truncate max-w-[80%]"
                              >
                                <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate text-xs font-medium">{att.name}</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => setAttachmentsToDelete([...attachmentsToDelete, att])}
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-[#e63b2e] hover:text-white transition-colors ml-2"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          ))}

                        {pendingFiles.map((file, idx) => (
                          <div
                            key={`pending-${idx}`}
                            className="flex items-center justify-between p-2 border-2 border-dashed border-[#1a1a1a] bg-gray-50"
                          >
                            <div className="flex items-center gap-2 truncate max-w-[80%] opacity-70">
                              <Paperclip className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate text-sm font-medium">{file.name} <span className="opacity-50">(Pendiente)</span></span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPendingFiles(pendingFiles.filter((_, i) => i !== idx))}
                              className="p-1 hover:bg-[#e63b2e] hover:text-white transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}

                        {(!isEditingVisita || !selectedVisita?.attachments || selectedVisita.attachments.length === 0) &&
                          pendingFiles.length === 0 && (
                            <p className="text-xs font-bold uppercase tracking-widest opacity-50 text-center py-4">
                              No hay archivos adjuntos
                            </p>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end border-t-2 border-[#1a1a1a] pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-[#1a1a1a] bg-white text-[#1a1a1a] font-black uppercase tracking-widest hover:bg-[#e63b2e] hover:text-white transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-[#1a1a1a] bg-[#00cc66] text-white font-black uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-[#00cc66] transition-colors flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          {isEditingVisita ? 'Actualizando...' : 'Guardando...'}
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {isEditingVisita ? 'Actualizar' : 'Guardar'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* Detail Modal */}
          {selectedVisita && !isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto pt-8 sm:pt-10 pb-8 sm:pb-10">
              <div className="bg-white border-2 sm:border-4 border-[#1a1a1a] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] p-0 w-full max-w-3xl flex flex-col relative">
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
                      <p className="font-black uppercase text-base sm:text-lg truncate" title={selectedVisita.responsable}>
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

                  <div className="border-t-2 border-[#1a1a1a] pt-4 sm:pt-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm sm:text-base font-black uppercase tracking-widest flex items-center gap-2">
                        <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" /> Adjuntos{' '}
                        {selectedVisita.attachments && selectedVisita.attachments.length > 0 && (
                          <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 border border-orange-300">
                            {selectedVisita.attachments.length}
                          </span>
                        )}
                      </h3>
                      <label className="cursor-pointer px-3 py-1.5 bg-[#1a1a1a] text-white font-bold uppercase text-[10px] tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" /> Subir Archivo
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          onChange={async (e) => {
                            if (!e.target.files || e.target.files.length === 0) return;
                            setIsUploading(true);
                            try {
                              const currentAttachments = selectedVisita.attachments || [];
                              for (const file of Array.from(e.target.files)) {
                                const userId = getCurrentUserId();
                                const newAttachment = await uploadVisitaAttachment(file, selectedVisita.id, userId);
                                const path = `visitas/${selectedVisita.id}/${Date.now()}_${file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                                currentAttachments.push({ ...newAttachment, path });
                              }
                              await updateVisita(selectedVisita.id, { attachments: currentAttachments as any });
                              setSelectedVisita({ ...selectedVisita, attachments: currentAttachments });
                              toast.success(`${e.target.files.length} archivo(s) subido(s)`);
                            } catch (error) {
                              console.error('Error uploading attachments:', error);
                              toast.error('Error al subir archivos');
                            } finally {
                              setIsUploading(false);
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>

                    {selectedVisita.attachments && selectedVisita.attachments.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {selectedVisita.attachments.map((att: Attachment, idx: number) => (
                          <div
                            key={`att-${idx}`}
                            className="flex items-center justify-between p-2.5 sm:p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8]"
                          >
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 hover:underline truncate max-w-[80%]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Paperclip className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span className="truncate text-xs sm:text-sm font-medium">{att.name}</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachment(selectedVisita.id, att)}
                              className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-[#e63b2e] hover:text-white transition-colors ml-2 flex-shrink-0"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs font-bold uppercase tracking-widest opacity-50 text-center py-6 border-2 border-dashed border-gray-300">
                        No hay archivos adjuntos
                      </p>
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
