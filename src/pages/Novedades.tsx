import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Plus, Trash2, Edit2, Search, FileText, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface Novedad {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  authorId: string;
  authorName: string;
}

export default function Novedades() {
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentNovedad, setCurrentNovedad] = useState<Partial<Novedad>>({
    title: '',
    content: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, 'novedades'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const novedadesData: Novedad[] = [];
      snapshot.forEach((doc) => {
        novedadesData.push({ id: doc.id, ...doc.data() } as Novedad);
      });
      setNovedades(novedadesData);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, 'novedades');
    });

    return () => unsubscribe();
  }, []);

  const openNewModal = () => {
    setCurrentNovedad({ title: '', content: '' });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (novedad: Novedad) => {
    setCurrentNovedad(novedad);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentNovedad.title?.trim() || !currentNovedad.content?.trim() || !auth.currentUser) return;

    try {
      if (isEditing && currentNovedad.id) {
        const docRef = doc(db, 'novedades', currentNovedad.id);
        await updateDoc(docRef, {
          title: currentNovedad.title,
          content: currentNovedad.content
        });
        toast.success('Novedad actualizada');
      } else {
        await addDoc(collection(db, 'novedades'), {
          title: currentNovedad.title,
          content: currentNovedad.content,
          createdAt: new Date().toISOString(),
          authorId: auth.currentUser.uid,
          authorName: auth.currentUser.displayName || auth.currentUser.email || 'Usuario'
        });

        await addDoc(collection(db, 'notifications'), {
          title: 'Nueva Novedad',
          message: currentNovedad.title,
          type: 'novedad',
          createdAt: new Date().toISOString(),
          authorId: auth.currentUser.uid
        });

        toast.success('Novedad creada');
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, 'novedades');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta novedad?')) return;
    try {
      await deleteDoc(doc(db, 'novedades', id));
      toast.success('Novedad eliminada');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'novedades');
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Add Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Reporte de Novedades", 14, 22);
    
    // Add Subtitle / Date
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 30);
    
    // Filtered data
    const filtered = novedades.filter(n => 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filtered.length === 0) {
      toast.error('No hay novedades para exportar');
      return;
    }

    const tableData = filtered.map(n => [
      new Date(n.createdAt).toLocaleDateString() + ' ' + new Date(n.createdAt).toLocaleTimeString(),
      n.title,
      n.authorName,
      n.content
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Fecha', 'Título', 'Autor', 'Contenido']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [26, 26, 26], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 40 },
        2: { cellWidth: 30 },
        3: { cellWidth: 'auto' }
      },
    });

    doc.save(`Novedades_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Reporte PDF generado');
  };

  const filteredNovedades = novedades.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="font-['Inter'] max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-5xl font-black uppercase font-['Space_Grotesk'] tracking-tighter">Novedades</h1>
        <div className="flex gap-4">
          <button 
            onClick={generatePDF}
            className="px-6 py-4 border-4 border-[#1a1a1a] bg-white font-black uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-white transition-colors flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
          >
            <Download className="w-5 h-5" /> Reporte PDF
          </button>
          <button 
            onClick={openNewModal}
            className="px-6 py-4 border-4 border-[#1a1a1a] bg-[#0055ff] text-white font-black uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-[#0055ff] transition-colors flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
          >
            <Plus className="w-5 h-5" /> Nueva Novedad
          </button>
        </div>
      </div>

      <div className="mb-8 relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="w-6 h-6 text-[#1a1a1a] opacity-50" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="BUSCAR NOVEDADES..."
          className="w-full pl-12 p-4 border-4 border-[#1a1a1a] bg-white focus:bg-[#f5f0e8] focus:outline-none focus:ring-0 font-bold uppercase transition-colors shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]"
        />
      </div>

      <div className="flex flex-col gap-6">
        {loading ? (
          <div className="text-center p-12 font-black uppercase text-2xl animate-pulse">Cargando novedades...</div>
        ) : filteredNovedades.length === 0 ? (
          <div className="text-center p-12 bg-white border-4 border-[#1a1a1a] font-black uppercase text-2xl opacity-50">No hay novedades registradas</div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredNovedades.map((novedad) => (
              <motion.div 
                key={novedad.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border-4 border-[#1a1a1a] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] p-6 group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight font-['Space_Grotesk'] mb-1">{novedad.title}</h3>
                    <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest opacity-60">
                      <span>{new Date(novedad.createdAt).toLocaleString()}</span>
                      <span>•</span>
                      <span>Por: {novedad.authorName}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openEditModal(novedad)}
                      className="p-2 border-2 border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(novedad.id)}
                      className="p-2 border-2 border-[#1a1a1a] hover:bg-[#e63b2e] hover:text-white transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap font-medium leading-relaxed">{novedad.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border-4 border-[#1a1a1a] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] p-6 w-full max-w-3xl flex flex-col my-8">
            <h2 className="text-3xl font-black uppercase mb-6 font-['Space_Grotesk'] tracking-widest">
              {isEditing ? 'Editar Novedad' : 'Nueva Novedad'}
            </h2>
            
            <form onSubmit={handleSave} className="flex flex-col gap-6">
              <div>
                <label className="block text-sm font-bold uppercase tracking-widest opacity-70 mb-2">Título</label>
                <input
                  type="text"
                  value={currentNovedad.title || ''}
                  onChange={(e) => setCurrentNovedad({ ...currentNovedad, title: e.target.value })}
                  className="w-full p-4 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase text-xl transition-colors"
                  placeholder="TÍTULO DE LA NOVEDAD..."
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-widest opacity-70 mb-2">Contenido (Nota)</label>
                <textarea
                  value={currentNovedad.content || ''}
                  onChange={(e) => setCurrentNovedad({ ...currentNovedad, content: e.target.value })}
                  className="w-full h-64 p-4 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-medium resize-none transition-colors"
                  placeholder="Escribe los detalles de la novedad aquí..."
                  required
                />
              </div>
              
              <div className="flex justify-end gap-4 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-4 border-4 border-[#1a1a1a] bg-white font-black uppercase tracking-widest hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-8 py-4 border-4 border-[#1a1a1a] bg-[#00cc66] text-white font-black uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-[#00cc66] transition-colors shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none flex items-center gap-2"
                >
                  {isEditing ? 'Guardar Cambios' : 'Publicar Novedad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
