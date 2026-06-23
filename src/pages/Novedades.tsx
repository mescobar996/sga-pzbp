import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  Edit2,
  Search,
  FileText,
  Download,
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
  Calendar,
  User,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useOutletContext } from 'react-router-dom';
import { SkeletonPage } from '../components/Skeleton';
import { ConfirmModal } from '../components/ConfirmModal';
import { FilterBar } from '../components/FilterBar';
import { FormField } from '../components/FormField';
import { DragDropUpload } from '../components/DragDropUpload';
import { getNovedades, addNovedad, updateNovedad, deleteNovedad, uploadNovedadAttachment, onNovedadesChange } from '../db/novedades';
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

interface Novedad {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  attachments?: Attachment[];
  fecha?: string;
}

export default function Novedades() {
  const { isAdmin } = useOutletContext<{ isAdmin: boolean }>();
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('fecha_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean; id: string | null}>({ isOpen: false, id: null });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentNovedad, setCurrentNovedad] = useState<Partial<Novedad>>({
    title: '',
    content: '',
    fecha: new Date().toISOString().split('T')[0],
  });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    if (isModalOpen && !isEditing) {
      const draft = localStorage.getItem('draft_novedad');
      if (draft) {
        setHasDraft(true);
      }
    } else {
      setHasDraft(false);
    }
  }, [isModalOpen, isEditing]);

  const handleLoadDraft = () => {
    try {
      const draft = localStorage.getItem('draft_novedad');
      if (draft) {
        const parsed = JSON.parse(draft);
        setCurrentNovedad((prev) => ({
          ...prev,
          ...parsed,
        }));
        toast.success('Borrador recuperado');
      }
    } catch (e) {
      console.error('Error parsing draft:', e);
    }
    setHasDraft(false);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('draft_novedad');
    setHasDraft(false);
  };

  const handleFieldChange = (fields: Partial<Novedad>) => {
    const updated = { ...currentNovedad, ...fields };
    setCurrentNovedad(updated);
    if (!isEditing) {
      localStorage.setItem('draft_novedad', JSON.stringify({
        title: updated.title,
        content: updated.content,
        fecha: updated.fecha,
      }));
    }
  };

  const getFileIcon = (type: string, className: string) => {
    if (type.startsWith('image/')) return <ImageIcon className={className} />;
    if (type.startsWith('video/')) return <Video className={className} />;
    if (type === 'application/pdf') return <FileText className={className} />;
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv'))
      return <FileSpreadsheet className={className} />;
    return <Paperclip className={className} />;
  };

  useEffect(() => {
    loadNovedades();
    const unsub = onNovedadesChange((data) => {
      setNovedades(data);
      setLoading(false);
    });

    // Auto-refresh when user returns to tab
    const onFocus = () => loadNovedades();
    window.addEventListener('focus', onFocus);

    return () => {
      unsub();
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const loadNovedades = async () => {
    try {
      const data = await withTimeout(getNovedades());
      setNovedades(data);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setCurrentNovedad({
      title: '',
      content: '',
      fecha: new Date().toISOString().split('T')[0],
      attachments: [],
    });
    setPendingFiles([]);
    setAttachmentsToDelete([]);
    setFormErrors({});
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (novedad: Novedad) => {
    setCurrentNovedad({
      ...novedad,
      fecha: novedad.fecha || new Date(novedad.createdAt).toISOString().split('T')[0],
    });
    setPendingFiles([]);
    setAttachmentsToDelete([]);
    setFormErrors({});
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    const hasChanges =
      currentNovedad.title?.trim() ||
      currentNovedad.content?.trim() ||
      pendingFiles.length > 0;
    if (hasChanges && !isUploading) {
      if (!window.confirm('¿Tenés cambios sin guardar? Si cerrás, se van a perder.')) return;
    }
    setIsModalOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // VALIDATIONS
    const errors: Record<string, string> = {};
    if (!currentNovedad.title?.trim()) errors.title = 'El título es obligatorio';
    if (!currentNovedad.content?.trim()) errors.content = 'El contenido es obligatorio';
    if (!currentNovedad.fecha) errors.fecha = 'La fecha es obligatoria';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Por favor, completa los campos requeridos');
      return;
    }
    setFormErrors({});

    setIsUploading(true);
    try {
      let finalAttachments = currentNovedad.attachments ? [...currentNovedad.attachments] : [];
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
          const uploaded = await uploadNovedadAttachment(file, userId);
          finalAttachments.push(uploaded);
        }
      }

      if (isEditing && currentNovedad.id) {
        await updateNovedad(currentNovedad.id, {
          title: currentNovedad.title,
          content: currentNovedad.content,
          fecha: currentNovedad.fecha,
          attachments: finalAttachments as any,
        });
        toast.success('Novedad actualizada');
      } else {
        await addNovedad({
          title: currentNovedad.title!,
          content: currentNovedad.content!,
          fecha: currentNovedad.fecha,
          attachments: finalAttachments,
        });

        await addNotification({
          title: 'Nueva Novedad',
          message: currentNovedad.title!,
          type: 'novedad',
        });

        toast.success('Novedad creada');
      }
      localStorage.removeItem('draft_novedad');
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
      await deleteNovedad(id);
      toast.success('Novedad eliminada');
    } catch (error) {
      handleError(error);
    }
  };

  const handleShareNovedad = async (novedad: Novedad) => {
    const text = `*Novedad*\n\n*Título:* ${novedad.title}\n*Fecha:* ${novedad.fecha || new Date(novedad.createdAt).toLocaleDateString('es-ES')}\n*Autor:* ${novedad.authorName}\n\n*Contenido:*\n${novedad.content}${novedad.attachments && novedad.attachments.length > 0 ? `\n\n*Adjuntos:* ${novedad.attachments.length} archivo(s)` : ''}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Novedad: ${novedad.title}`, text });
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

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Filtered data
    const filtered = novedades.filter(
      (n) =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    if (filtered.length === 0) {
      toast.error('No hay novedades para exportar');
      return;
    }

    // Modern header with gradient effect
    doc.setFillColor(30, 58, 95); // #1e3a5f
    doc.rect(0, 0, pageWidth, 55, 'F');

    // Accent line
    doc.setFillColor(59, 130, 246); // #3b82f6
    doc.rect(0, 55, pageWidth, 3, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.text('REPORTE DE NOVEDADES', 14, 24);

    // Subtitle
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(147, 197, 253); // #93c5fd
    doc.text('Sistema de Gestión de Actividades — Prefectura Naval Argentina', 14, 33);

    // Date
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text(`${dateStr} — ${timeStr}`, 14, 42);

    // Stats box
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, 47, 40, 6, 1, 1, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text(`${filtered.length} registro${filtered.length > 1 ? 's' : ''}`, 18, 51);

    // Prepare table data
    const tableData = filtered.map((n) => {
      const date = new Date(n.createdAt);
      return [
        date.toLocaleDateString('es-ES'),
        date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        n.title,
        n.authorName,
        n.content.length > 100 ? n.content.substring(0, 100) + '...' : n.content,
      ];
    });

    autoTable(doc, {
      startY: 62,
      head: [['Fecha', 'Hora', 'Título', 'Autor', 'Contenido']],
      body: tableData,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        textColor: [17, 24, 39],
        lineColor: [229, 231, 235],
        lineWidth: 0.3,
        cellPadding: 5,
        valign: 'top',
      },
      headStyles: {
        fillColor: [30, 58, 95],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 6,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: 'normal' },
        1: { cellWidth: 18, fontStyle: 'normal' },
        2: { cellWidth: 40, fontStyle: 'bold' },
        3: { cellWidth: 28, fontStyle: 'normal' },
        4: { cellWidth: 'auto', fontStyle: 'normal' },
      },
      margin: { left: 10, right: 10 },
      didDrawPage: () => {
        // Footer on each page
        doc.setFontSize(7);
        doc.setTextColor(156, 163, 175);
        doc.text('SGA PZBP — Prefectura Naval Argentina', pageWidth / 2, pageHeight - 8, { align: 'center' });
      },
    });

    // Final footer
    const finalY = (doc as any).lastAutoTable?.finalY || 62;
    if (finalY < pageHeight - 30) {
      doc.setFillColor(249, 250, 251);
      doc.rect(0, finalY + 10, pageWidth, pageHeight - finalY - 10, 'F');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(`Generado el ${dateStr} a las ${timeStr}`, pageWidth / 2, finalY + 20, { align: 'center' });
    }

    doc.save(`Novedades_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Reporte PDF generado con éxito');
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFrom, dateTo]);

  const filteredNovedades = novedades.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());

    const itemDate = n.fecha ? new Date(n.fecha) : new Date(n.createdAt);

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

  const totalPages = Math.ceil(filteredNovedades.length / itemsPerPage);
  const paginatedNovedades = filteredNovedades.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="font-['Inter'] max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-4xl font-black uppercase font-['Space_Grotesk'] tracking-tighter">Novedades</h1>
        <div className="flex gap-4">
          <button
            onClick={openNewModal}
            className="px-4 py-3 border-2 border-[#1a1a1a] bg-[#0055ff] text-white font-black uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-[#0055ff] transition-colors flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none text-sm"
          >
            <Plus className="w-4 h-4" /> Nueva Novedad
          </button>
        </div>
      </div>

      <FilterBar
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: 'BUSCAR NOVEDADES...'
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
          <SkeletonPage title="Novedades" cardCount={3} layout="list" />
        ) : filteredNovedades.length === 0 ? (
          <div className="text-center p-8 bg-white border-2 border-[#1a1a1a] font-black uppercase text-xl opacity-50">
            No hay novedades que coincidan con los filtros
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {paginatedNovedades.map((novedad) => (
              <motion.div
                key={novedad.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => openEditModal(novedad)}
                className="bg-white border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] p-5 group cursor-pointer hover:bg-[#f5f0e8] transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight font-['Space_Grotesk'] mb-1">
                      {novedad.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest opacity-60">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {novedad.fecha || new Date(novedad.createdAt).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(novedad.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {novedad.authorName}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareNovedad(novedad);
                      }}
                      className="w-[44px] h-[44px] sm:w-[36px] sm:h-[36px] flex items-center justify-center border-2 border-[#1a1a1a] bg-white hover:bg-[#00cc66] hover:text-white transition-colors shrink-0"
                      title="Compartir"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(novedad);
                      }}
                      className="w-[44px] h-[44px] sm:w-[36px] sm:h-[36px] flex items-center justify-center border-2 border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white transition-colors shrink-0"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerDelete(novedad.id);
                        }}
                        className="w-[44px] h-[44px] sm:w-[36px] sm:h-[36px] flex items-center justify-center border-2 border-[#1a1a1a] bg-white hover:bg-[#e63b2e] hover:text-white transition-colors shrink-0"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="prose prose-sm max-w-none mb-3">
                  <p className="whitespace-pre-wrap font-medium leading-relaxed text-sm">{novedad.content}</p>
                </div>

                {novedad.attachments && novedad.attachments.length > 0 && (
                  <div className="mt-4 pt-4 border-t-2 border-[#1a1a1a]/10">
                    <h4 className="text-xs font-bold uppercase tracking-widest opacity-70 mb-3">Archivos Adjuntos</h4>
                    <div className="flex flex-wrap gap-4">
                      {novedad.attachments.map((att, idx) => {
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
                {isEditing ? 'Editar Novedad' : 'Nueva Novedad'}
              </h2>
              <button
                onClick={() => handleCloseModal()}
                className="p-1.5 sm:p-2 hover:bg-[#e63b2e] hover:text-white transition-colors border-2 border-transparent hover:border-white text-white"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6">
              {/* Draft Recovery Alert */}
              {hasDraft && (
                <div className="mb-4 p-3 border-2 border-[#1a1a1a] bg-amber-100 flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1a1a1a]">
                    ¿Querés recuperar tu borrador anterior?
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleLoadDraft}
                      className="px-2.5 py-1 text-[10px] border-2 border-[#1a1a1a] bg-white font-bold hover:bg-[#1a1a1a] hover:text-white uppercase transition-all shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] active:translate-x-px active:translate-y-px active:shadow-none"
                    >
                      Recuperar
                    </button>
                    <button
                      type="button"
                      onClick={handleDiscardDraft}
                      className="px-2 py-1 text-[10px] border border-transparent text-[#e63b2e] font-bold hover:underline uppercase"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 mb-6">
                <FormField label="Título" error={formErrors.title} required>
                  <input
                    type="text"
                    value={currentNovedad.title || ''}
                    onChange={(e) => handleFieldChange({ title: e.target.value })}
                    className="w-full p-2.5 sm:p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors text-xs sm:text-sm"
                    placeholder="TÍTULO DE LA NOVEDAD..."
                    required
                    autoFocus
                  />
                </FormField>

                <FormField label="Fecha" error={formErrors.fecha} required>
                  <input
                    type="date"
                    value={currentNovedad.fecha || ''}
                    onChange={(e) => handleFieldChange({ fecha: e.target.value })}
                    className="w-full p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors text-base sm:text-sm"
                    required
                  />
                </FormField>

                <FormField label="Contenido" error={formErrors.content} required>
                  <textarea
                    rows={4}
                    value={currentNovedad.content || ''}
                    onChange={(e) => handleFieldChange({ content: e.target.value })}
                    className="w-full p-2.5 sm:p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors resize-none text-xs sm:text-sm"
                    placeholder="Escribe los detalles de la novedad aquí..."
                    required
                  />
                </FormField>

                <FormField label="Archivos Adjuntos">
                  <DragDropUpload
                    existingAttachments={(currentNovedad.attachments || []).map(a => ({ name: a.name, url: a.url, type: a.type }))}
                    pendingFiles={pendingFiles}
                    onAddFiles={(files) => setPendingFiles([...pendingFiles, ...files])}
                    onRemovePending={(idx) => setPendingFiles(pendingFiles.filter((_, i) => i !== idx))}
                    onDeleteExisting={(att) => setAttachmentsToDelete([...attachmentsToDelete, att])}
                    isUploading={isUploading}
                  />
                </FormField>
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
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-[#1a1a1a] bg-[#00cc66] text-white font-black uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-[#00cc66] transition-colors flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {isEditing ? 'Actualizar' : 'Publicar'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {previewImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-[#0055ff] transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain border-4 border-white shadow-2xl"
            />
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message="¿Estás seguro de que quieres eliminar esta novedad de forma permanente?"
        onConfirm={() => {
          if (confirmModal.id) handleDelete(confirmModal.id);
          setConfirmModal({ isOpen: false, id: null });
        }}
        onCancel={() => setConfirmModal({ isOpen: false, id: null })}
      />
      </AnimatePresence>
    </div>
  );
}
