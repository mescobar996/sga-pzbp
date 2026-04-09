import React, { useState, useEffect } from 'react';
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
  Calendar,
  User,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useOutletContext } from 'react-router-dom';
import { SkeletonPage } from '../components/Skeleton';
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
    if (!currentNovedad.title?.trim() || !currentNovedad.content?.trim()) return;

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
          title: currentNovedad.title,
          content: currentNovedad.content,
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
      setIsModalOpen(false);
    } catch (error) {
      handleError(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta novedad?')) return;
    try {
      await deleteNovedad(id);
      toast.success('Novedad eliminada');
    } catch (error) {
      handleError(error);
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
              placeholder="BUSCAR NOVEDADES..."
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
                className="bg-white border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] p-5 group"
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
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(novedad)}
                      className="p-1.5 border-2 border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(novedad.id)}
                        className="p-1.5 border-2 border-[#1a1a1a] hover:bg-[#e63b2e] hover:text-white transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto py-10">
          <div className="bg-white border-2 border-[#1a1a1a] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] p-6 w-full max-w-3xl flex flex-col my-8">
            <h2 className="text-2xl font-black uppercase mb-4 font-['Space_Grotesk'] tracking-widest">
              {isEditing ? 'Editar Novedad' : 'Nueva Novedad'}
            </h2>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Título</label>
                <input
                  type="text"
                  value={currentNovedad.title || ''}
                  onChange={(e) => setCurrentNovedad({ ...currentNovedad, title: e.target.value })}
                  className="w-full p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase text-lg transition-colors"
                  placeholder="TÍTULO DE LA NOVEDAD..."
                  required
                />
                </div>

                <div>
                <label className="block text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Fecha</label>
                <input
                  type="date"
                  value={currentNovedad.fecha || ''}
                  onChange={(e) => setCurrentNovedad({ ...currentNovedad, fecha: e.target.value })}
                  className="w-full p-2.5 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors text-sm"
                  required
                />
                </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest opacity-70 mb-1">
                  Contenido (Nota)
                </label>
                <textarea
                  value={currentNovedad.content || ''}
                  onChange={(e) => setCurrentNovedad({ ...currentNovedad, content: e.target.value })}
                  className="w-full h-48 p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-medium resize-none transition-colors text-sm"
                  placeholder="Escribe los detalles de la novedad aquí..."
                  required
                />
              </div>

              {/* Attachments Section */}
              <div className="border-2 border-[#1a1a1a] p-4 bg-white">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-bold uppercase tracking-widest opacity-70">Archivos Adjuntos</label>
                  <label className="cursor-pointer px-3 py-2 bg-[#1a1a1a] text-white font-bold uppercase text-xs tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Subir Archivo
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
                  {currentNovedad.attachments
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
                            className="truncate text-sm font-medium hover:underline"
                          >
                            {att.name}
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachmentsToDelete([...attachmentsToDelete, att])}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-[#e63b2e] hover:text-white transition-colors"
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
                      <div className="flex items-center gap-3 truncate max-w-[80%] opacity-70">
                        {file.type.startsWith('image/') ? (
                          <div className="w-8 h-8 flex-shrink-0 border border-[#1a1a1a] overflow-hidden bg-white flex items-center justify-center">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        ) : (
                          getFileIcon(file.type, 'w-5 h-5 flex-shrink-0')
                        )}
                        <span className="truncate text-sm font-medium">{file.name} (Pendiente)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPendingFiles(pendingFiles.filter((_, i) => i !== idx))}
                        className="p-1 hover:bg-[#e63b2e] hover:text-white transition-colors"
                        title="Cancelar subida"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {(!currentNovedad.attachments ||
                    currentNovedad.attachments.length === 0 ||
                    currentNovedad.attachments.length === attachmentsToDelete.length) &&
                    pendingFiles.length === 0 && (
                      <p className="text-xs font-bold uppercase tracking-widest opacity-50 text-center py-4">
                        No hay archivos adjuntos
                      </p>
                    )}
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-4">
                <button
                  type="button"
                  onClick={() => handleCloseModal()}
                  className="px-4 py-3 border-2 border-[#1a1a1a] bg-white font-black uppercase tracking-widest hover:bg-gray-100 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-3 border-2 border-[#1a1a1a] bg-[#00cc66] text-white font-black uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-[#00cc66] transition-colors shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Guardando...
                    </>
                  ) : isEditing ? (
                    'Guardar Cambios'
                  ) : (
                    'Publicar Novedad'
                  )}
                </button>
              </div>
            </form>
          </div>
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
    </div>
  );
}
