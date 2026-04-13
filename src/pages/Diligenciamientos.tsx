import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Search,
  FileText,
  Upload,
  X,
  Paperclip,
  Image as ImageIcon,
  FileSpreadsheet,
  Video,
  ChevronLeft,
  ChevronRight,
  Save,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';
import { SkeletonPage } from '../components/Skeleton';
import {
  getDiligenciamientos,
  addDiligenciamiento,
  updateDiligenciamiento,
  deleteDiligenciamiento,
  uploadDiligenciamientoAttachment,
  onDiligenciamientosChange,
} from '../db/diligenciamientos';
import { addNotification } from '../db/notifications';
import { getCurrentUserId, supabase, withTimeout } from '../db/client';

function handleError(error: unknown) {
  console.error('Error:', error);
  toast.error('Error al procesar la solicitud');
}

interface Attachment {
  name: string;
  url: string;
  type: string;
}

interface Diligenciamiento {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  attachments?: Attachment[];
}

export default function Diligenciamientos() {
  const { isAdmin } = useOutletContext<{ isAdmin: boolean }>();
  const [diligenciamientos, setDiligenciamientos] = useState<Diligenciamiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('fecha_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDiligenciamiento, setCurrentDiligenciamiento] = useState<Partial<Diligenciamiento>>({
    title: '',
    content: '',
    fecha: '',
  });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const getFileIcon = (type: string, className: string) => {
    if (type.startsWith('image/')) return <ImageIcon className={className} />;
    if (type.startsWith('video/')) return <Video className={className} />;
    if (type === 'application/pdf') return <FileText className={className} />;
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv'))
      return <FileSpreadsheet className={className} />;
    return <Paperclip className={className} />;
  };

  useEffect(() => {
    loadDiligenciamientos();
    const unsub = onDiligenciamientosChange((data) => {
      setDiligenciamientos(data);
      setLoading(false);
    });

    // Auto-refresh when user returns to tab
    const onFocus = () => loadDiligenciamientos();
    window.addEventListener('focus', onFocus);

    return () => {
      unsub();
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const loadDiligenciamientos = async () => {
    try {
      const data = await withTimeout(getDiligenciamientos());
      setDiligenciamientos(data);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setCurrentDiligenciamiento({ title: '', content: '', fecha: '', attachments: [] });
    setPendingFiles([]);
    setAttachmentsToDelete([]);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (diligenciamiento: Diligenciamiento) => {
    setCurrentDiligenciamiento(diligenciamiento);
    setPendingFiles([]);
    setAttachmentsToDelete([]);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    const hasChanges =
      currentDiligenciamiento.title?.trim() ||
      currentDiligenciamiento.content?.trim() ||
      pendingFiles.length > 0;
    if (hasChanges && !isUploading) {
      if (!window.confirm('¿Tenés cambios sin guardar? Si cerrás, se van a perder.')) return;
    }
    setIsModalOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDiligenciamiento.title?.trim() || !currentDiligenciamiento.content?.trim()) return;

    setIsUploading(true);
    try {
      let finalAttachments = currentDiligenciamiento.attachments ? [...currentDiligenciamiento.attachments] : [];
      const userId = getCurrentUserId();

      // Handle deletions
      if (attachmentsToDelete.length > 0) {
        for (const att of attachmentsToDelete) {
          const path = att.url.split('/object/public/attachments/')[1] || att.url.split('/attachments/')[1] || '';
          if (path) {
            try {
              await supabase.storage.from('attachments').remove([path]);
            } catch (error) {
              console.error('Error deleting file:', error);
            }
          }
          finalAttachments = finalAttachments.filter((a) => a.url !== att.url);
        }
      }

      // Handle new uploads
      if (pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          const uploaded = await uploadDiligenciamientoAttachment(file, userId);
          finalAttachments.push(uploaded);
        }
      }

      if (isEditing && currentDiligenciamiento.id) {
        await updateDiligenciamiento(currentDiligenciamiento.id, {
          title: currentDiligenciamiento.title,
          content: currentDiligenciamiento.content,
          fecha: currentDiligenciamiento.fecha,
          attachments: finalAttachments as any,
        });
        toast.success('Diligenciamiento actualizado');
      } else {
        await addDiligenciamiento({
          title: currentDiligenciamiento.title,
          content: currentDiligenciamiento.content,
          fecha: currentDiligenciamiento.fecha,
          attachments: finalAttachments,
        });

        await addNotification({
          title: 'Nuevo Diligenciamiento',
          message: currentDiligenciamiento.title!,
          type: 'novedad',
        });

        toast.success('Diligenciamiento creado');
      }
      setIsModalOpen(false);
    } catch (error) {
      handleError(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este diligenciamiento?')) return;
    try {
      await deleteDiligenciamiento(id);
      toast.success('Diligenciamiento eliminado');
    } catch (error) {
      handleError(error);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFrom, dateTo]);

  const filteredDiligenciamientos = diligenciamientos.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.content.toLowerCase().includes(searchQuery.toLowerCase());

    const itemDate = d.fecha ? new Date(d.fecha) : new Date(d.createdAt);

    let matchesDateFrom = true;
    if (dateFrom) {
      matchesDateFrom = itemDate >= new Date(dateFrom + 'T00:00:00');
    }

    let matchesDateTo = true;
    if (dateTo) {
      matchesDateTo = itemDate <= new Date(dateTo + 'T23:59:59');
    }

    return matchesSearch && matchesDateFrom && matchesDateTo;
  }).sort((a, b) => {
    const dateA = a.fecha ? new Date(a.fecha) : new Date(a.createdAt);
    const dateB = b.fecha ? new Date(b.fecha) : new Date(b.createdAt);
    if (sortBy === 'fecha_desc') return dateB.getTime() - dateA.getTime();
    if (sortBy === 'fecha_asc') return dateA.getTime() - dateB.getTime();
    if (sortBy === 'titulo_az') return a.title.localeCompare(b.title, 'es');
    if (sortBy === 'titulo_za') return b.title.localeCompare(a.title, 'es');
    return 0;
  });

  const totalPages = Math.ceil(filteredDiligenciamientos.length / itemsPerPage);
  const paginatedDiligenciamientos = filteredDiligenciamientos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="font-['Inter'] max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-4xl font-black uppercase font-['Space_Grotesk'] tracking-tighter">Diligenciamientos</h1>
        <div className="flex gap-4">
          <button
            onClick={openNewModal}
            className="px-4 py-3 border-2 border-[#1a1a1a] bg-[#0055ff] text-white font-black uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-[#0055ff] transition-colors flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none text-sm"
          >
            <Plus className="w-4 h-4" /> Nuevo Diligenciamiento
          </button>
        </div>
      </div>

      <div className="mb-6 bg-white border-2 border-[#1a1a1a] p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative md:col-span-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-[#1a1a1a] opacity-50" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="BUSCAR DILIGENCIAMIENTOS..."
              autoComplete="off"
              className="w-full pl-10 p-2 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors text-xs"
            />
          </div>
          <div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full p-2.5 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors text-xs"
              title="Fecha Desde"
            />
          </div>
          <div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full p-2.5 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors text-xs"
              title="Fecha Hasta"
            />
          </div>
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full p-2 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors cursor-pointer text-xs"
            >
              <option value="fecha_desc">Fecha (Más reciente)</option>
              <option value="fecha_asc">Fecha (Más antiguo)</option>
              <option value="titulo_az">Título (A-Z)</option>
              <option value="titulo_za">Título (Z-A)</option>
            </select>
          </div>
        </div>
        {(searchQuery || dateFrom || dateTo) && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase opacity-60">Filtros activos:</span>
            {searchQuery && (
              <span className="text-[10px] font-bold bg-[#f5f0e8] border border-[#1a1a1a] px-2 py-0.5 uppercase">
                &quot;{searchQuery}&quot;
              </span>
            )}
            {dateFrom && (
              <span className="text-[10px] font-bold bg-[#f5f0e8] border border-[#1a1a1a] px-2 py-0.5 uppercase">
                Desde: {dateFrom}
              </span>
            )}
            {dateTo && (
              <span className="text-[10px] font-bold bg-[#f5f0e8] border border-[#1a1a1a] px-2 py-0.5 uppercase">
                Hasta: {dateTo}
              </span>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setDateFrom('');
                setDateTo('');
              }}
              className="text-[10px] font-bold text-[#e63b2e] hover:underline uppercase ml-auto"
            >
              Limpiar
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {loading ? (
          <SkeletonPage title="Diligenciamientos" cardCount={3} layout="list" />
        ) : filteredDiligenciamientos.length === 0 ? (
          <div className="text-center p-8 bg-white border-2 border-[#1a1a1a] font-black uppercase text-xl opacity-50">
            No hay diligenciamientos que coincidan con los filtros
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {paginatedDiligenciamientos.map((d) => (
              <motion.div
                key={d.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] p-5 group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight font-['Space_Grotesk'] mb-1">
                      {d.title}
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest opacity-60">
                      <span>{d.fecha ? new Date(d.fecha + 'T00:00:00').toLocaleDateString('es-ES') : new Date(d.createdAt).toLocaleString()}</span>
                      <span>•</span>
                      <span>Por: {d.authorName}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(d)}
                      className="p-1.5 border-2 border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="p-1.5 border-2 border-[#1a1a1a] hover:bg-[#e63b2e] hover:text-white transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="prose prose-sm max-w-none mb-3">
                  <p className="whitespace-pre-wrap font-medium leading-relaxed text-sm">{d.content}</p>
                </div>

                {d.attachments && d.attachments.length > 0 && (
                  <div className="mt-4 pt-4 border-t-2 border-[#1a1a1a]/10">
                    <h4 className="text-xs font-bold uppercase tracking-widest opacity-70 mb-3">Archivos Adjuntos</h4>
                    <div className="flex flex-wrap gap-4">
                      {d.attachments.map((att, idx) => {
                        const isImage = att.type.startsWith('image/');
                        return (
                          <div
                            key={idx}
                            onClick={() => (isImage ? setPreviewImage(att.url) : window.open(att.url, '_blank'))}
                            className="flex flex-col border-2 border-[#1a1a1a] bg-[#f5f0e8] hover:bg-[#1a1a1a] hover:text-white transition-colors group w-48 overflow-hidden cursor-pointer"
                            title={att.name}
                          >
                            {isImage ? (
                              <div className="h-32 w-full border-b-2 border-[#1a1a1a] bg-white overflow-hidden">
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                            ) : (
                              <div className="h-32 w-full border-b-2 border-[#1a1a1a] bg-white flex items-center justify-center text-[#1a1a1a]">
                                {getFileIcon(
                                  att.type,
                                  'w-12 h-12 opacity-50 group-hover:opacity-100 transition-opacity',
                                )}
                              </div>
                            )}
                            <div className="p-3 flex items-center gap-2">
                              {getFileIcon(att.type, 'w-4 h-4 flex-shrink-0')}
                              <span className="text-xs font-bold truncate">{att.name}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 border-2 border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-black uppercase tracking-widest text-sm">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 border-2 border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

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
                {isEditing ? 'Editar Diligenciamiento' : 'Nuevo Diligenciamiento'}
              </h2>
              <button
                onClick={() => handleCloseModal()}
                className="p-1.5 sm:p-2 hover:bg-[#e63b2e] hover:text-white transition-colors border-2 border-transparent hover:border-white text-white"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest">Título</label>
                  <input
                    type="text"
                    value={currentDiligenciamiento.title || ''}
                    onChange={(e) => setCurrentDiligenciamiento({ ...currentDiligenciamiento, title: e.target.value })}
                    className="w-full p-2.5 sm:p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors text-xs sm:text-sm"
                    placeholder="TÍTULO DEL DILIGENCIAMIENTO..."
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest">Fecha</label>
                  <input
                    type="date"
                    value={currentDiligenciamiento.fecha || ''}
                    onChange={(e) => setCurrentDiligenciamiento({ ...currentDiligenciamiento, fecha: e.target.value })}
                    className="w-full p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors text-base sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest">Contenido</label>
                  <textarea
                    rows={4}
                    value={currentDiligenciamiento.content || ''}
                    onChange={(e) =>
                      setCurrentDiligenciamiento({ ...currentDiligenciamiento, content: e.target.value })
                    }
                    className="w-full p-2.5 sm:p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors resize-none text-xs sm:text-sm"
                    placeholder="Describe los detalles del diligenciamiento aquí..."
                    required
                  />
                </div>

                {/* Attachments Section */}
                <div className="border-2 border-[#1a1a1a] p-3 sm:p-4 bg-white">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <Paperclip className="w-4 h-4" /> Archivos Adjuntos
                    </label>
                    <label className="cursor-pointer px-3 py-1.5 bg-[#1a1a1a] text-white font-bold uppercase text-[10px] tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2">
                      <Upload className="w-3.5 h-3.5" /> Subir Archivos
                      <input
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
                    {/* Existing Attachments */}
                    {currentDiligenciamiento.attachments
                      ?.filter((a) => !attachmentsToDelete.includes(a))
                      .map((att, idx) => (
                        <div
                          key={`att-${idx}`}
                          className="flex items-center justify-between p-2 border-2 border-[#1a1a1a] bg-[#f5f0e8]"
                        >
                          <div className="flex items-center gap-3 truncate max-w-[80%]">
                            {att.type.startsWith('image/') ? (
                              <div
                                className="w-8 h-8 flex-shrink-0 border border-[#1a1a1a] overflow-hidden bg-white cursor-pointer"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setPreviewImage(att.url);
                                }}
                              >
                                <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              getFileIcon(att.type, 'w-5 h-5 flex-shrink-0')
                            )}
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-xs font-medium hover:underline"
                            >
                              {att.name}
                            </a>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAttachmentsToDelete([...attachmentsToDelete, att])}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-[#e63b2e] hover:text-white transition-colors ml-2"
                            title="Eliminar archivo"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}

                    {/* Pending Attachments */}
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

                    {(!currentDiligenciamiento.attachments || currentDiligenciamiento.attachments.length === 0) &&
                      pendingFiles.length === 0 && (
                        <p className="text-xs font-black uppercase tracking-widest opacity-50 text-center py-4">
                          No hay archivos adjuntos
                        </p>
                      )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end border-t-2 border-[#1a1a1a] pt-4">
                <button
                  type="button"
                  onClick={() => handleCloseModal()}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-[#1a1a1a] bg-white text-[#1a1a1a] font-black uppercase tracking-widest hover:bg-[#e63b2e] hover:text-white transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-[#1a1a1a] bg-[#0055ff] text-white font-black uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-[#0055ff] transition-colors flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {isEditing ? 'Actualizar' : 'Crear'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain border-2 border-white"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewImage(null);
              }}
              className="absolute top-2 right-2 p-2 bg-white border-2 border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
