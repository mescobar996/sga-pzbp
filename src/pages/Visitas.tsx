import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Save, X, MessageSquare, Edit2, Trash2, MapPin, Calendar, Clock, User, FileText, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

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

interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

interface Visita {
  id: string;
  origen: string;
  destino: string;
  fecha: string;
  hora: string;
  responsable: string;
  observaciones: string;
  createdAt: string;
  authorId: string;
  comments?: Comment[];
}

export default function Visitas() {
  const [formData, setFormData] = useState({
    origen: '',
    destino: '',
    fecha: '',
    hora: '',
    responsable: '',
    observaciones: ''
  });

  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [selectedVisita, setSelectedVisita] = useState<Visita | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [isEditingVisita, setIsEditingVisita] = useState(false);
  const [editingVisitaId, setEditingVisitaId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, 'visitas'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const visitasData: Visita[] = [];
      snapshot.forEach((doc) => {
        visitasData.push({ id: doc.id, ...doc.data() } as Visita);
      });
      setVisitas(visitasData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'visitas');
    });

    return () => unsubscribe();
  }, []);

  const handleAddComment = async () => {
    if (!selectedVisita || !newCommentText.trim() || !auth.currentUser) return;

    try {
      const newComment: Comment = {
        id: Date.now().toString(),
        text: newCommentText.trim(),
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || auth.currentUser.email || 'Usuario',
        createdAt: new Date().toISOString()
      };

      const visitaRef = doc(db, 'visitas', selectedVisita.id);
      await updateDoc(visitaRef, {
        comments: [...(selectedVisita.comments || []), newComment]
      });

      setNewCommentText('');
      // Update local state to reflect immediately in modal
      setSelectedVisita(prev => prev ? { ...prev, comments: [...(prev.comments || []), newComment] } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'visitas');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast.error('Debes iniciar sesión para registrar una visita.');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(formData.fecha)) {
      toast.error('La fecha debe tener el formato YYYY-MM-DD.');
      return;
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(formData.hora)) {
      toast.error('La hora debe tener el formato HH:MM.');
      return;
    }

    const responsableRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!responsableRegex.test(formData.responsable)) {
      toast.error('El responsable solo puede contener letras y espacios.');
      return;
    }

    try {
      if (isEditingVisita && editingVisitaId) {
        const visitaRef = doc(db, 'visitas', editingVisitaId);
        await updateDoc(visitaRef, {
          ...formData
        });
        toast.success('Visita actualizada exitosamente');
        setIsEditingVisita(false);
        setEditingVisitaId(null);
      } else {
        await addDoc(collection(db, 'visitas'), {
          ...formData,
          createdAt: new Date().toISOString(),
          authorId: auth.currentUser.uid,
          comments: []
        });

        await addDoc(collection(db, 'notifications'), {
          title: 'Nueva Visita Técnica',
          message: `${formData.origen} -> ${formData.destino}`,
          type: 'visita',
          createdAt: new Date().toISOString(),
          authorId: auth.currentUser.uid
        });

        toast.success('Visita registrada exitosamente');
      }
      setFormData({ origen: '', destino: '', fecha: '', hora: '', responsable: '', observaciones: '' });
    } catch (error) {
      toast.error(isEditingVisita ? 'Error al actualizar la visita' : 'Error al registrar la visita');
      handleFirestoreError(error, isEditingVisita ? OperationType.UPDATE : OperationType.CREATE, 'visitas');
    }
  };

  const handleEditVisita = (visita: Visita) => {
    setFormData({
      origen: visita.origen,
      destino: visita.destino,
      fecha: visita.fecha,
      hora: visita.hora,
      responsable: visita.responsable,
      observaciones: visita.observaciones || ''
    });
    setIsEditingVisita(true);
    setEditingVisitaId(visita.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteVisita = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta visita?')) return;
    try {
      await deleteDoc(doc(db, 'visitas', id));
      toast.success('Visita eliminada exitosamente');
      if (selectedVisita?.id === id) {
        setSelectedVisita(null);
      }
    } catch (error) {
      toast.error('Error al eliminar la visita');
      handleFirestoreError(error, OperationType.DELETE, 'visitas');
    }
  };

  return (
    <div className="font-['Inter'] max-w-4xl mx-auto">
      <h1 className="text-5xl font-black uppercase mb-8 font-['Space_Grotesk'] tracking-tighter">
        {isEditingVisita ? 'Editar Visita' : 'Registro de Visita'}
      </h1>
      
      <form onSubmit={handleSubmit} className="bg-white border-4 border-[#1a1a1a] shadow-[12px_12px_0px_0px_rgba(26,26,26,1)] p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-2">
            <label className="block text-sm font-black uppercase tracking-widest">Origen</label>
            <input 
              type="text" 
              required
              value={formData.origen}
              onChange={(e) => setFormData({...formData, origen: e.target.value})}
              className="w-full p-4 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors"
              placeholder="Ej. Sede Central"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-black uppercase tracking-widest">Destino</label>
            <input 
              type="text" 
              required
              value={formData.destino}
              onChange={(e) => setFormData({...formData, destino: e.target.value})}
              className="w-full p-4 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors"
              placeholder="Ej. Zona Portuaria"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-black uppercase tracking-widest">Fecha</label>
            <input 
              type="date" 
              required
              value={formData.fecha}
              onChange={(e) => setFormData({...formData, fecha: e.target.value})}
              className="w-full p-4 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-black uppercase tracking-widest">Hora</label>
            <input 
              type="time" 
              required
              value={formData.hora}
              onChange={(e) => setFormData({...formData, hora: e.target.value})}
              className="w-full p-4 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-black uppercase tracking-widest">Responsable</label>
            <input 
              type="text" 
              required
              value={formData.responsable}
              onChange={(e) => {
                const val = e.target.value;
                if (/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/.test(val)) {
                  setFormData({...formData, responsable: val});
                }
              }}
              className="w-full p-4 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors"
              placeholder="Nombre del responsable"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-black uppercase tracking-widest">Observaciones</label>
            <textarea 
              rows={4}
              value={formData.observaciones}
              onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
              className="w-full p-4 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold transition-colors resize-none"
              placeholder="Detalles adicionales..."
            />
          </div>
        </div>

        <div className="flex gap-4 justify-end border-t-4 border-[#1a1a1a] pt-8">
          <button 
            type="button"
            onClick={() => {
              setFormData({ origen: '', destino: '', fecha: '', hora: '', responsable: '', observaciones: '' });
              setIsEditingVisita(false);
              setEditingVisitaId(null);
            }}
            className="px-8 py-4 border-4 border-[#1a1a1a] bg-white text-[#1a1a1a] font-black uppercase tracking-widest hover:bg-[#e63b2e] hover:text-white transition-colors flex items-center gap-2"
          >
            <X className="w-5 h-5" /> Cancelar
          </button>
          <button 
            type="submit"
            className="px-8 py-4 border-4 border-[#1a1a1a] bg-[#0055ff] text-white font-black uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-[#0055ff] transition-colors flex items-center gap-2 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1"
          >
            <Save className="w-5 h-5" /> {isEditingVisita ? 'Actualizar Registro' : 'Guardar Registro'}
          </button>
        </div>
      </form>

      {/* Recent Visits List */}
      <div className="mt-12">
        <h2 className="text-3xl font-black uppercase mb-6 font-['Space_Grotesk'] tracking-tighter">Visitas Recientes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visitas.slice(0, 6).map(visita => (
            <div 
              key={visita.id} 
              onClick={() => setSelectedVisita(visita)}
              className="bg-white border-4 border-[#1a1a1a] p-4 cursor-pointer hover:bg-[#f5f0e8] transition-colors shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-black uppercase text-lg truncate pr-2">{visita.origen} &rarr; {visita.destino}</h3>
                  <span className="text-xs font-bold bg-[#1a1a1a] text-white px-2 py-1 uppercase flex-shrink-0">{visita.fecha}</span>
                </div>
                <p className="text-sm font-bold opacity-70 uppercase truncate">Resp: {visita.responsable}</p>
              </div>
              <div className="mt-4 flex justify-between items-center">
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditVisita(visita);
                    }}
                    className="p-1.5 border-2 border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteVisita(visita.id);
                    }}
                    className="p-1.5 border-2 border-[#1a1a1a] hover:bg-[#e63b2e] hover:text-white transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1 text-sm font-bold opacity-70">
                  <MessageSquare className="w-4 h-4" />
                  <span>{visita.comments?.length || 0}</span>
                </div>
              </div>
            </div>
          ))}
          {visitas.length === 0 && (
            <p className="text-sm font-bold uppercase opacity-50 col-span-2">No hay visitas registradas.</p>
          )}
        </div>
      </div>

      {/* Visita Details & Comments Modal */}
      {selectedVisita && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto pt-10 pb-10">
          <div className="bg-white border-4 border-[#1a1a1a] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] p-0 w-full max-w-3xl flex flex-col relative">
            
            {/* Header */}
            <div className="bg-[#1a1a1a] text-white p-6 flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-black uppercase font-['Space_Grotesk'] tracking-widest mb-2">
                  Detalles de Visita
                </h2>
                <div className="flex items-center gap-3 text-[#ffcc00] font-bold uppercase tracking-widest text-sm">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {selectedVisita.origen}</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {selectedVisita.destino}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedVisita(null)}
                className="p-2 hover:bg-[#e63b2e] hover:text-white transition-colors border-2 border-transparent hover:border-white text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="border-2 border-[#1a1a1a] p-4 bg-[#f5f0e8] flex flex-col justify-center">
                  <p className="font-bold uppercase opacity-70 text-xs mb-2 flex items-center gap-1"><Calendar className="w-4 h-4" /> Fecha</p>
                  <p className="font-black uppercase text-lg">{selectedVisita.fecha}</p>
                </div>
                <div className="border-2 border-[#1a1a1a] p-4 bg-[#f5f0e8] flex flex-col justify-center">
                  <p className="font-bold uppercase opacity-70 text-xs mb-2 flex items-center gap-1"><Clock className="w-4 h-4" /> Hora</p>
                  <p className="font-black uppercase text-lg">{selectedVisita.hora}</p>
                </div>
                <div className="border-2 border-[#1a1a1a] p-4 bg-[#f5f0e8] flex flex-col justify-center overflow-hidden">
                  <p className="font-bold uppercase opacity-70 text-xs mb-2 flex items-center gap-1"><User className="w-4 h-4" /> Responsable</p>
                  <p className="font-black uppercase text-lg truncate" title={selectedVisita.responsable}>{selectedVisita.responsable}</p>
                </div>
                {selectedVisita.observaciones && (
                  <div className="col-span-1 md:col-span-3 border-2 border-[#1a1a1a] p-4 bg-white">
                    <p className="font-bold uppercase opacity-70 text-xs mb-2 flex items-center gap-1"><FileText className="w-4 h-4" /> Observaciones</p>
                    <p className="font-medium text-sm leading-relaxed whitespace-pre-wrap">{selectedVisita.observaciones}</p>
                  </div>
                )}
              </div>

              {/* Comments Section */}
              <div className="border-t-4 border-[#1a1a1a] pt-6">
                <h3 className="text-2xl font-black uppercase mb-6 font-['Space_Grotesk'] flex items-center gap-2">
                  <MessageSquare className="w-6 h-6" /> Comentarios
                </h3>
                
                <div className="flex flex-col gap-4 mb-6 max-h-[300px] overflow-y-auto custom-scrollbar pr-4">
                  {selectedVisita.comments?.map((comment) => {
                    const isMe = comment.authorId === auth.currentUser?.uid;
                    return (
                      <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] p-4 border-2 border-[#1a1a1a] ${isMe ? 'bg-[#ffcc00]' : 'bg-[#f5f0e8]'}`}>
                          <div className="flex justify-between items-center gap-4 mb-2 border-b-2 border-[#1a1a1a]/10 pb-2">
                            <span className="font-black text-xs uppercase tracking-widest">{comment.authorName}</span>
                            <span className="text-[10px] font-bold opacity-60 uppercase">{new Date(comment.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap font-medium leading-relaxed">{comment.text}</p>
                        </div>
                      </div>
                    );
                  })}
                  {(!selectedVisita.comments || selectedVisita.comments.length === 0) && (
                    <div className="text-center p-8 border-2 border-dashed border-[#1a1a1a]/30 bg-gray-50">
                      <p className="text-sm font-bold uppercase tracking-widest opacity-50">No hay comentarios aún</p>
                      <p className="text-xs font-medium opacity-40 mt-1">Sé el primero en comentar sobre esta visita.</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    className="flex-1 p-4 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold transition-colors text-sm"
                    placeholder="Escribe un comentario..."
                  />
                  <button
                    type="button"
                    onClick={handleAddComment}
                    className="px-8 py-4 bg-[#0055ff] border-4 border-[#1a1a1a] text-white font-black uppercase tracking-widest text-sm hover:bg-[#1a1a1a] hover:text-[#0055ff] transition-colors shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
