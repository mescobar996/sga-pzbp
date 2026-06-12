import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '../db/client';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import {
  Settings,
  Shield,
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
  HardHat,
  ListChecks,
  FileText,
  MapPin,
  Users,
  BarChart3,
  Bell,
  Download,
  Trash2,
  LogOut,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { SkeletonPage } from '../components/Skeleton';

type TabKey = 'sistema' | 'datos';

export default function Configuracion() {
  const navigate = useNavigate();
  const { user } = useOutletContext<{ user: User }>();
  const [activeTab, setActiveTab] = useState<TabKey>('sistema');
  const [pageLoading, setPageLoading] = useState(true);

  // System state
  const [systemStats, setSystemStats] = useState<Record<string, number>>({});
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  // Data management state
  const [exporting, setExporting] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);

  useEffect(() => {
    loadSystemStats();
    setPageLoading(false);
  }, []);

  const loadSystemStats = async () => {
    setConnectionStatus('checking');
    try {
      const collections = ['tasks', 'visitas', 'novedades', 'personal', 'locations', 'task_history', 'notifications'];
      const stats: Record<string, number> = {};

      for (const col of collections) {
        try {
          const { count, error } = await supabase.from(col).select('*', { count: 'exact', head: true });
          stats[col] = count ?? 0;
        } catch {
          stats[col] = 0;
        }
      }

      setSystemStats(stats);
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Error loading system stats:', error);
      setConnectionStatus('error');
    }
  };

  const handleExportAllData = async () => {
    setExporting(true);
    try {
      const collections = ['tasks', 'visitas', 'novedades', 'personal', 'locations', 'task_history'];
      const workbook = XLSX.utils.book_new();

      for (const col of collections) {
        const { data, error } = await supabase.from(col).select('*');
        if (data && data.length > 0 && !error) {
          const worksheet = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(workbook, worksheet, col.toUpperCase());
        }
      }

      XLSX.writeFile(workbook, `Respaldo_Completo_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Datos exportados correctamente');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Error al exportar los datos');
    } finally {
      setExporting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Sesión cerrada correctamente');
    } catch {
      toast.error('Error al cerrar sesión');
    }
  };

  const tabs = [
    { key: 'sistema' as TabKey, label: 'Sistema', icon: Shield },
    { key: 'datos' as TabKey, label: 'Datos', icon: Database },
  ];

  const collectionIcons: Record<string, React.ReactNode> = {
    tasks: <ListChecks className="w-5 h-5" />,
    visitas: <HardHat className="w-5 h-5" />,
    novedades: <FileText className="w-5 h-5" />,
    personal: <Users className="w-5 h-5" />,
    locations: <MapPin className="w-5 h-5" />,
    task_history: <BarChart3 className="w-5 h-5" />,
    notifications: <Bell className="w-5 h-5" />,
  };

  const collectionLabels: Record<string, string> = {
    tasks: 'Tareas Operativas',
    visitas: 'Visitas Técnicas',
    novedades: 'Novedades',
    personal: 'Personal',
    locations: 'Ubicaciones',
    task_history: 'Historial de Tareas',
    notifications: 'Notificaciones',
  };

  return (
    <div className="font-['Inter'] max-w-5xl mx-auto">
      {pageLoading ? (
        <SkeletonPage title="Configuración" cardCount={2} layout="cards" />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#0055ff] text-white border-2 border-[#1a1a1a] shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)]">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-black uppercase font-['Space_Grotesk'] tracking-tighter">
                  Configuración
                </h1>
                <p className="text-sm font-medium opacity-50">Gestioná el sistema y los datos</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-[#1a1a1a] bg-white text-[#1a1a1a] font-black uppercase text-xs hover:bg-[#1a1a1a] hover:text-white transition-all shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
            >
              <LogOut className="w-4 h-4" /> Cerrar Sesión
            </button>
          </div>

          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3 border-2 border-[#1a1a1a] font-black uppercase text-xs tracking-wider whitespace-nowrap transition-all shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none ${
                    isActive
                      ? 'bg-[#1a1a1a] text-white translate-x-0.5 translate-y-0.5 shadow-none'
                      : 'bg-white text-[#1a1a1a] hover:bg-[#f5f0e8]'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {tab.label}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="bg-white border-2 border-[#1a1a1a] shadow-[6px_6px_0px_0px_rgba(26,26,26,0.3)] p-6"
            >
              {activeTab === 'sistema' && (
                <div className="space-y-8">
                  <h2 className="text-xl font-black uppercase font-['Space_Grotesk'] border-b-4 border-[#1a1a1a] pb-3 mb-6 flex items-center gap-3">
                    <Shield className="w-5 h-5" /> Estado del Sistema
                  </h2>
                  <div className={`p-4 border-2 flex items-center gap-4 ${connectionStatus === 'connected' ? 'bg-green-50 border-green-400' : connectionStatus === 'error' ? 'bg-red-50 border-red-400' : 'bg-yellow-50 border-yellow-400'}`}>
                    {connectionStatus === 'connected' ? <CheckCircle className="w-6 h-6 text-green-600" /> : connectionStatus === 'error' ? <AlertTriangle className="w-6 h-6 text-red-600" /> : <RefreshCw className="w-6 h-6 text-yellow-600 animate-spin" />}
                    <div>
                      <div className="font-black text-sm">{connectionStatus === 'connected' ? 'Conectado a Supabase' : connectionStatus === 'error' ? 'Error de Conexión' : 'Verificando Conexión...'}</div>
                      <div className="text-xs opacity-60 font-medium">{connectionStatus === 'connected' ? 'Todos los servicios operativos' : connectionStatus === 'error' ? 'No se pudo conectar con Supabase' : 'Conectando...'}</div>
                    </div>
                    <button onClick={loadSystemStats} className="ml-auto px-4 py-2 bg-white border-2 border-[#1a1a1a] text-xs font-black uppercase flex items-center gap-1.5 hover:bg-[#1a1a1a] hover:text-white transition-all"><RefreshCw className="w-3.5 h-3.5" /> Actualizar</button>
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" /> Métricas Operativas de Bases de Datos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {Object.entries(systemStats).map(([col, count]) => {
                         const maxCount = Math.max(...Object.values(systemStats), 1);
                         const progress = Math.max(2, Math.round((count / maxCount) * 100));
                         return (
                        <div key={col} className="p-4 bg-white border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-2 border-2 border-[#1a1a1a] bg-[#00cc66] text-white shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">{collectionIcons[col] || <Database className="w-5 h-5" />}</div>
                            <div className="text-3xl font-black font-['Space_Grotesk'] text-[#1a1a1a]">{count}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">{collectionLabels[col] || col}</div>
                            <div className="w-full h-2 border-2 border-[#1a1a1a] bg-gray-200 overflow-hidden relative">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, ease: 'easeOut' }} className={`h-full ${col === 'tasks' ? 'bg-[#ff9900]' : col === 'visitas' ? 'bg-[#0055ff]' : 'bg-[#1a1a1a]'}`}></motion.div>
                            </div>
                          </div>
                        </div>
                      )})}
                    </div>
                  </div>
                  <div className="p-4 bg-[#f5f0e8] border-2 border-[#1a1a1a]">
                    <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2"><Info className="w-4 h-4" /> Información del Sistema</h3>
                    <div className="space-y-3">
                      {[ { label: 'Versión', value: '1.0.0' }, { label: 'Framework', value: 'React + Vite + TS' }, { label: 'Base de Datos', value: 'Supabase Postgres' }, { label: 'Usuario UID', value: user.id.slice(0, 10) + '...' }].map((item) => (
                        <div key={item.label} className="flex justify-between items-center py-2 border-b border-[#1a1a1a]/10 last:border-0">
                          <span className="text-xs font-bold uppercase opacity-60">{item.label}</span>
                          <span className="text-xs font-black">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'datos' && (
                <div className="space-y-8">
                  <h2 className="text-xl font-black uppercase font-['Space_Grotesk'] border-b-4 border-[#1a1a1a] pb-3 mb-6 flex items-center gap-3">
                    <Database className="w-5 h-5" /> Gestión de Datos
                  </h2>
                  <div className="p-6 bg-[#f5f0e8] border-2 border-[#1a1a1a]">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-[#10b981] text-white"><Download className="w-6 h-6" /></div>
                      <div>
                        <div className="font-black text-lg">Exportar Todos los Datos</div>
                        <div className="text-sm opacity-50 font-medium">Respaldo completo en Excel</div>
                      </div>
                    </div>
                    <button onClick={handleExportAllData} disabled={exporting} className="px-6 py-3 bg-[#10b981] text-white border-2 border-[#1a1a1a] font-black uppercase text-sm flex items-center gap-2 hover:bg-[#1a1a1a] hover:text-[#10b981] transition-all shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)] disabled:opacity-50">
                      {exporting ? 'Exportando...' : 'Descargar Respaldo'}
                    </button>
                  </div>
                  <div className="border-2 border-red-400">
                    <button onClick={() => setShowDangerZone(!showDangerZone)} className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 transition-colors">
                      <div className="flex items-center gap-3"><AlertTriangle className="w-5 h-5 text-red-600" /><div className="font-black text-sm text-red-800">Zona de Peligro</div></div>
                      {showDangerZone ? <ChevronUp className="w-5 h-5 text-red-600" /> : <ChevronDown className="w-5 h-5 text-red-600" />}
                    </button>
                    <AnimatePresence>
                      {showDangerZone && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="p-6">
                            <button onClick={() => navigate('/base-datos')} className="px-5 py-2.5 bg-red-600 text-white border-2 border-[#1a1a1a] font-black uppercase text-xs hover:bg-[#1a1a1a] transition-all">Ir a Base de Datos</button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
