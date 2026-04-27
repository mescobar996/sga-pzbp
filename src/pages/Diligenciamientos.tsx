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
  Share2,
  Monitor,
  Globe,
  Settings,
  ShieldCheck,
  Layout,
  MoreHorizontal,
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';
import { SkeletonPage } from '../components/Skeleton';
import { ConfirmModal } from '../components/ConfirmModal';
import { FilterBar } from '../components/FilterBar';
import {
  getDiligenciamientos,
  addDiligenciamiento,
  updateDiligenciamiento,
  deleteDiligenciamiento,
  uploadDiligenciamientoAttachment,
  onDiligenciamientosChange,
  getCategories,
  onCategoriesChange,
} from '../db/diligenciamientos';
import { addNotification } from '../db/notifications';
import { getCurrentUserId, supabase, withTimeout } from '../db/client';
import * as LucideIcons from 'lucide-react';

const DEFAULT_CATEGORIES = [
  { id: 'REPARACIONES PC / NOTEBOOK', label: 'REPARACIONES PC / NOTEBOOK', icon: 'Monitor', color: 'bg-[#0055ff]' },
  { id: 'CONFIGURACIONES REDES', label: 'CONFIGURACIONES REDES', icon: 'Globe', color: 'bg-[#00cc66]' },
  { id: 'SOPORTE TÉCNICO', label: 'SOPORTE TÉCNICO', icon: 'Settings', color: 'bg-[#ff9900]' },
  { id: 'MANTENIMIENTO PREVENTIVO', label: 'MANTENIMIENTO PREVENTIVO', icon: 'ShieldCheck', color: 'bg-[#1a1a1a]' },
  { id: 'GESTIÓN ADMINISTRATIVA', label: 'GESTIÓN ADMINISTRATIVA', icon: 'Layout', color: 'bg-[#e63b2e]' },
  { id: 'OTROS', label: 'OTROS', icon: 'MoreHorizontal', color: 'bg-gray-500' },
];

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
  category?: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  attachments?: Attachment[];
  fecha?: string;
}

export default function Diligenciamientos() {
  const { isAdmin } = useOutletContext<{ isAdmin: boolean }>();
  const [diligenciamientos, setDiligenciamientos] = useState<Diligenciamiento[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('fecha_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean; id: string | null}>({ isOpen: false, id: null });
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
    const unsubDili = onDiligenciamientosChange((data) => {
      setDiligenciamientos(data);
      setLoading(false);
    });

    const unsubCat = onCategoriesChange((data) => {
      const dbCats = data.map(c => ({ id: c.name, label: c.name, icon: c.icon, color: c.color, isDynamic: true }));
      // Combine defaults (if not already in DB) with DB categories
      const combined = [...dbCats];
      DEFAULT_CATEGORIES.forEach(def => {
        if (!combined.find(c => c.id === def.id)) {
          combined.push(def);
        }
      });
      setCategories(combined);
    });

    // Auto-refresh when user returns to tab
    const onFocus = () => {
      loadDiligenciamientos();
      getCategories().then(data => {
        const dbCats = data.map(c => ({ id: c.name, label: c.name, icon: c.icon, color: c.color, isDynamic: true }));
        const combined = [...dbCats];
        DEFAULT_CATEGORIES.forEach(def => {
          if (!combined.find(c => c.id === def.id)) {
            combined.push(def);
          }
        });
        setCategories(combined);
      });
    };
    window.addEventListener('focus', onFocus);

    return () => {
      unsubDili();
      unsubCat();
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
    setCurrentDiligenciamiento({ 
      title: '', 
      content: '', 
      fecha: '', 
      category: selectedCategory || 'REPARACIONES PC / NOTEBOOK',
      attachments: [] 
    });
    setPendingFiles([]);
    setAttachmentsToDelete([]);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (diligenciamiento: Diligenciamiento) => {
    setCurrentDiligenciamiento({
      ...diligenciamiento,
      category: diligenciamiento.category || 'OTROS'
    });
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
          category: currentDiligenciamiento.category,
          fecha: currentDiligenciamiento.fecha,
          attachments: finalAttachments as any,
        });
        toast.success('Diligenciamiento actualizado');
      } else {
        await addDiligenciamiento({
          title: currentDiligenciamiento.title,
          content: currentDiligenciamiento.content,
          category: currentDiligenciamiento.category,
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

  const triggerDelete = (id: string) => {
    setConfirmModal({ isOpen: true, id });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDiligenciamiento(id);
      toast.success('Diligenciamiento eliminado');
    } catch (error) {
      handleError(error);
    }
  };

  const handleShareDiligenciamiento = async (d: Diligenciamiento) => {
    const text = `*Diligenciamiento*\n\n*Título:* ${d.title}\n*Fecha:* ${d.fecha || new Date(d.createdAt).toLocaleDateString('es-ES')}\n*Autor:* ${d.authorName}\n\n*Contenido:*\n${d.content}${d.attachments && d.attachments.length > 0 ? `\n\n*Adjuntos:* ${d.attachments.length} archivo(s)` : ''}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Diligenciamiento: ${d.title}`, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('Información copiada al portapapeles');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        await navigator.clipboard.writeText(text);
        toast.success('Información copiada al portapapeles');
      }
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

    const matchesCategory = !selectedCategory || d.category === selectedCategory || (selectedCategory === 'OTROS' && !d.category);

    return matchesSearch && matchesDateFrom && matchesDateTo && matchesCategory;
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
    <div className="font-['Inter'] max-w-6xl mx-auto px-3 sm:px-4 pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="p-2 border-2 border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
              title="Volver a Módulos"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black uppercase font-['Space_Grotesk'] tracking-tighter">
              {selectedCategory ? selectedCategory : 'Diligenciamientos'}
            </h1>
            {selectedCategory && (
              <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mt-1">
                MÓDULO OPERATIVO
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={openNewModal}
            className="px-4 py-3 border-2 border-[#1a1a1a] bg-[#0055ff] text-white font-black uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-[#0055ff] transition-colors flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" /> Nuevo Diligenciamiento
          </button>
        </div>
      </div>

      {!selectedCategory ? (
        /* MODULE GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {categories.map((cat) => {
            const count = diligenciamientos.filter(d => 
              d.category === cat.id || (cat.id === 'OTROS' && !d.category)
            ).length;

            const IconComponent = (LucideIcons as any)[cat.icon] || LucideIcons.Layout;

            return (
              <motion.div
                key={cat.id}
                whileHover={{ scale: 1.02, x: 2, y: 2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedCategory(cat.id)}
                className="bg-white border-4 border-[#1a1a1a] p-6 cursor-pointer shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] hover:shadow-none transition-all flex flex-col gap-6 group"
              >
                <div className={`w-16 h-16 ${cat.color} border-4 border-[#1a1a1a] flex items-center justify-center text-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all`}>
                  <IconComponent className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black font-['Space_Grotesk'] uppercase leading-tight mb-2">{cat.label}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black opacity-40 uppercase tracking-widest">{count} REGISTROS</span>
                    <ArrowLeft className="w-5 h-5 rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <>
          <FilterBar
            search={{
              value: searchQuery,
              onChange: setSearchQuery,
              placeholder: `BUSCAR EN ${selectedCategory}...`
            }}
            dateRange={{
              from: { value: dateFrom, onChange: setDateFrom, label: 'DESDE' },
              to: { value: dateTo, onChange: setDateTo, label: 'HASTA' }
            }}
            sort={{
              value: sortBy,
              onChange: setSortBy,
              label: 'ORDENAR POR',
              options: [
                { label: 'Fecha (Más reciente)', value: 'fecha_desc' },
                { label: 'Fecha (Más antiguo)', value: 'fecha_asc' },
                { label: 'Título (A-Z)', value: 'titulo_az' },
                { label: 'Título (Z-A)', value: 'titulo_za' },
              ]
            }}
            onClear={() => {
              setSearchQuery('');
              setDateFrom('');
              setDateTo('');
              setSortBy('fecha_desc');
            }}
          />

          <div className="flex flex-col gap-4">
            {loading ? (
              <SkeletonPage title="Diligenciamientos" cardCount={3} layout="list" />
            ) : filteredDiligenciamientos.length === 0 ? (
              <div className="text-center p-16 bg-white border-2 border-[#1a1a1a] font-black uppercase text-xl opacity-50 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                No hay diligenciamientos en este módulo
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
                    onClick={() => openEditModal(d)}
                    className="bg-white border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] p-5 group cursor-pointer hover:bg-[#f5f0e8] transition-colors"
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
                          {d.category && (
                            <>
                              <span>•</span>
                              <span className="text-[#0055ff]">{d.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareDiligenciamiento(d);
                          }}
                          className="min-h-[44px] p-1.5 border-2 border-[#1a1a1a] hover:bg-[#00cc66] hover:text-white transition-colors"
                          title="Compartir"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(d);
                          }}
                          className="p-1.5 border-2 border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerDelete(d.id);
                            }}
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
        </>
      )}

      <AnimatePresence>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-white border-l-4 border-[#1a1a1a] shadow-[-6px_0px_0px_0px_rgba(26,26,26,1)] w-full max-w-2xl h-full flex flex-col overflow-y-auto"
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
                  <label className="block text-xs font-black uppercase tracking-widest mb-1">Categoría / Módulo</label>
                  <select
                    value={currentDiligenciamiento.category || ''}
                    onChange={(e) => setCurrentDiligenciamiento({ ...currentDiligenciamiento, category: e.target.value })}
                    className="w-full p-2.5 sm:p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors text-xs sm:text-sm"
                    required
                  >
                    <option value="" disabled>Seleccionar Categoría...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>

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
      </AnimatePresence>

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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message="¿Estás seguro de que quieres eliminar este diligenciamiento permanentemente?"
        onConfirm={() => {
          if (confirmModal.id) handleDelete(confirmModal.id);
          setConfirmModal({ isOpen: false, id: null });
        }}
        onCancel={() => setConfirmModal({ isOpen: false, id: null })}
      />
    </div>
  );
}
