import React, { useState, useEffect } from 'react';
import { getNotifications, deleteNotification, clearAllNotifications, onNotificationsChange } from '../db/notifications';
import { Bell, Trash2, CheckCircle, Search, Clock, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { SkeletonPage } from '../components/Skeleton';
import type { AppNotification } from '../types';

export default function Notificaciones() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('todas');

  useEffect(() => {
    loadNotifications();
    const unsub = onNotificationsChange((notifs) => {
      setNotifications(notifs);
    });
    return unsub;
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Error al cargar las notificaciones');
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('¿Eliminar esta notificación?')) return;
    try {
      await deleteNotification(id);
      toast.success('Notificación eliminada');
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('¿Seguro que quieres eliminar TODAS tus notificaciones? Esta acción no se puede deshacer.')) return;

    try {
      await clearAllNotifications();
      toast.success('Todas las notificaciones fueron eliminadas');
    } catch (error) {
      console.error(error);
      toast.error('Error al limpiar notificaciones');
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'todas' || n.type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return <SkeletonPage title="Centro de Notificaciones" layout="cards" cardCount={4} />;
  }

  // Generate type summary
  const typeCount = notifications.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="font-['Inter'] max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase font-['Space_Grotesk'] tracking-tighter flex items-center gap-3">
            <Bell className="w-8 h-8 text-[#0055ff]" /> Centro de Notificaciones
          </h1>
          <p className="text-sm font-bold opacity-50 uppercase mt-1">
            Gestiona tus alertas, recordatorios y actualizaciones
          </p>
        </div>
        
        {notifications.length > 0 && (
          <button 
            onClick={handleClearAll}
            className="px-4 py-2 border-2 border-[#1a1a1a] bg-white text-[#e63b2e] font-black uppercase tracking-widest text-xs hover:bg-[#e63b2e] hover:text-white transition-colors flex items-center gap-2 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
          >
            <Trash2 className="w-4 h-4" /> Limpiar Todo
          </button>
        )}
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border-2 border-[#1a1a1a] p-3 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] flex items-center gap-3">
          <div className="p-2 bg-[#1a1a1a] text-white"><Bell className="w-4 h-4" /></div>
          <div>
            <p className="font-bold text-2xl font-['Space_Grotesk']">{notifications.length}</p>
            <p className="text-[10px] font-black uppercase opacity-60">Total</p>
          </div>
        </div>
        <div className="bg-white border-2 border-[#1a1a1a] p-3 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] flex items-center gap-3">
          <div className="p-2 bg-[#0055ff] text-white"><CheckCircle className="w-4 h-4" /></div>
          <div>
            <p className="font-bold text-2xl font-['Space_Grotesk']">{typeCount['tarea'] || 0}</p>
            <p className="text-[10px] font-black uppercase opacity-60">Tareas</p>
          </div>
        </div>
        <div className="bg-white border-2 border-[#1a1a1a] p-3 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] flex items-center gap-3">
          <div className="p-2 bg-[#00cc66] text-white"><Clock className="w-4 h-4" /></div>
          <div>
            <p className="font-bold text-2xl font-['Space_Grotesk']">{typeCount['visita'] || 0}</p>
            <p className="text-[10px] font-black uppercase opacity-60">Visitas</p>
          </div>
        </div>
        <div className="bg-white border-2 border-[#1a1a1a] p-3 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] flex items-center gap-3">
          <div className="p-2 bg-[#1a1a1a] text-white border border-[#1a1a1a]"><ShieldAlert className="w-4 h-4" /></div>
          <div>
            <p className="font-bold text-2xl font-['Space_Grotesk']">{typeCount['novedad'] || 0}</p>
            <p className="text-[10px] font-black uppercase opacity-60">Novedades</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-2 border-[#1a1a1a] p-4 mb-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
          <input 
            type="text" 
            placeholder="BUSCAR NOTIFICACIÓN..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white text-xs font-bold uppercase transition-colors outline-none"
          />
        </div>
        <select 
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="p-2 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white text-xs font-bold uppercase outline-none min-w-[150px]"
        >
          <option value="todas">TODOS LOS TIPOS</option>
          <option value="tarea">TAREAS</option>
          <option value="visita">VISITAS</option>
          <option value="novedad">NOVEDADES</option>
        </select>
      </div>

      {/* Notificaciones List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white border-2 border-[#1a1a1a] p-10 text-center shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <h3 className="font-black uppercase text-lg mb-1">Nada por aquí</h3>
            <p className="font-bold text-sm opacity-50 uppercase">No encontramos notificaciones con esos filtros.</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div 
              key={notif.id} 
              className="bg-white border-2 border-[#1a1a1a] p-4 flex flex-col sm:flex-row gap-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all group"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-black px-2 py-0.5 border-2 border-[#1a1a1a] uppercase bg-[#1a1a1a] text-white`}>
                    {notif.type}
                  </span>
                  <span className="text-[10px] font-bold opacity-60 uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3" /> 
                    {new Date(notif.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                <h3 className="font-black uppercase text-lg mb-1 group-hover:text-[#0055ff] transition-colors">{notif.title}</h3>
                <p className="font-medium text-sm opacity-80">{notif.message}</p>
              </div>
              
              <div className="flex sm:flex-col items-center justify-end gap-2 border-t-2 sm:border-t-0 sm:border-l-2 border-[#1a1a1a]/10 pt-3 sm:pt-0 sm:pl-4 mt-2 sm:mt-0">
                <button 
                  onClick={(e) => handleDelete(notif.id, e)}
                  title="Eliminar Notificación"
                  className="w-8 h-8 flex items-center justify-center border-2 border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#e63b2e] hover:border-[#e63b2e] hover:text-white transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
