import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase, getCurrentUserId } from '../db/client';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import {
  Settings,
  User as UserIcon,
  Bell,
  Shield,
  Database,
  Save,
  RefreshCw,
  Moon,
  Sun,
  Globe,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  KeyRound,
  Download,
  Trash2,
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { SkeletonPage } from '../components/Skeleton';

interface UserDocData {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  role: 'admin' | 'user';
}

type TabKey = 'perfil' | 'preferencias' | 'sistema' | 'datos';

export default function Configuracion() {
  const navigate = useNavigate();
  const { user } = useOutletContext<{ user: User }>();
  const [activeTab, setActiveTab] = useState<TabKey>('perfil');
  const [userData, setUserData] = useState<UserDocData | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  // Profile state
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Preferences state
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [language, setLanguage] = useState('es');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // System state
  const [systemStats, setSystemStats] = useState<Record<string, number>>({});
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  // Data management state
  const [exporting, setExporting] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);

  useEffect(() => {
    loadUserData();
    loadSystemStats();
    loadPreferences();
  }, []);

  const loadPreferences = () => {
    try {
      const stored = localStorage.getItem('sgo-prefs');
      if (stored) {
        const prefs = JSON.parse(stored);
        if (typeof prefs.darkMode === 'boolean') setDarkMode(prefs.darkMode);
        if (typeof prefs.notificationsEnabled === 'boolean') setNotificationsEnabled(prefs.notificationsEnabled);
        if (typeof prefs.language === 'string') setLanguage(prefs.language);
        if (typeof prefs.autoRefresh === 'boolean') setAutoRefresh(prefs.autoRefresh);
        if (prefs.darkMode) {
          document.documentElement.classList.add('dark');
        }
      }
    } catch {
      // ignore parse errors
    }
  };

  const loadUserData = async () => {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (data && !error) {
        const userData = data as unknown as UserDocData;
        setUserData(userData);
        setProfileName(userData.name || '');
        setProfileEmail(userData.email || user.email || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setPageLoading(false);
    }
  };

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

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('users').update({
        name: profileName.trim(),
        email: profileEmail.trim(),
      }).eq('id', user.id);
      if (error) throw error;
      setUserData((prev) => (prev ? { ...prev, name: profileName.trim(), email: profileEmail.trim() } : null));
      toast.success('Perfil actualizado correctamente');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Todos los campos de contraseña son obligatorios');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Contraseña actualizada correctamente');
    } catch (error) {
      toast.error('Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = () => {
    const prefs = {
      darkMode,
      notificationsEnabled,
      language,
      autoRefresh,
    };
    localStorage.setItem('sgo-prefs', JSON.stringify(prefs));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    toast.success('Preferencias guardadas correctamente');
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
    { key: 'perfil' as TabKey, label: 'Perfil', icon: UserIcon },
    { key: 'preferencias' as TabKey, label: 'Preferencias', icon: Bell },
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
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#0055ff] text-white border-2 border-[#1a1a1a] shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)]">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-black uppercase font-['Space_Grotesk'] tracking-tighter">
                  Configuración
                </h1>
                <p className="text-sm font-medium opacity-50">Gestioná tu perfil, preferencias y sistema</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-[#1a1a1a] bg-white text-[#1a1a1a] font-black uppercase text-xs hover:bg-[#1a1a1a] hover:text-white transition-all shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
            >
              <LogOut className="w-4 h-4" /> Cerrar Sesión
            </button>
          </div>

          {/* Tabs */}
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

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="bg-white border-2 border-[#1a1a1a] shadow-[6px_6px_0px_0px_rgba(26,26,26,0.3)] p-6"
            >
              {/* PERFIL TAB */}
              {activeTab === 'perfil' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-black uppercase font-['Space_Grotesk'] border-b-4 border-[#1a1a1a] pb-3 mb-6 flex items-center gap-3">
                      <UserIcon className="w-5 h-5" /> Información del Perfil
                    </h2>

                    {/* Avatar */}
                    <div className="flex items-center gap-6 mb-8 p-4 bg-[#f5f0e8] border-2 border-[#1a1a1a]">
                      <div className="w-20 h-20 bg-[#0055ff] text-white flex items-center justify-center text-3xl font-black border-2 border-[#1a1a1a] shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)]">
                        {userData?.name
                          ? userData.name.charAt(0).toUpperCase()
                          : user.email?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-black text-lg">{userData?.name || 'Usuario'}</div>
                        <div className="text-sm opacity-50 font-medium">{userData?.email || user.email}</div>
                        <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-[#0055ff] text-white text-xs font-black uppercase border border-[#1a1a1a]">
                          {userData?.role === 'admin' ? (
                            <Shield className="w-3 h-3" />
                          ) : (
                            <UserIcon className="w-3 h-3" />
                          )}
                          {userData?.role === 'admin' ? 'Administrador' : 'Usuario'}
                        </div>
                      </div>
                    </div>

                    {/* Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                          <UserIcon className="w-3.5 h-3.5" /> Nombre completo
                        </label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold text-sm transition-colors"
                          placeholder="Tu nombre"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5" /> Email
                        </label>
                        <input
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          className="w-full p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold text-sm transition-colors"
                          placeholder="tu@email.com"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSaveProfile}
                      disabled={loading}
                      className="mt-6 px-6 py-3 bg-[#0055ff] text-white border-2 border-[#1a1a1a] font-black uppercase text-sm flex items-center gap-2 hover:bg-[#1a1a1a] hover:text-[#0055ff] transition-all shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" /> {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>

                  {/* Change Password */}
                  <div>
                    <h2 className="text-xl font-black uppercase font-['Space_Grotesk'] border-b-4 border-[#1a1a1a] pb-3 mb-6 flex items-center gap-3">
                      <Lock className="w-5 h-5" /> Cambiar Contraseña
                    </h2>

                    <div className="space-y-5 max-w-lg">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-widest mb-2">
                          Contraseña actual
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full p-3 pr-12 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold text-sm transition-colors"
                            placeholder="••••••••"
                          />
                          <button
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
                          >
                            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase tracking-widest mb-2">
                          Nueva contraseña
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full p-3 pr-12 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold text-sm transition-colors"
                            placeholder="Mínimo 6 caracteres"
                          />
                          <button
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase tracking-widest mb-2">
                          Confirmar nueva contraseña
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold text-sm transition-colors"
                          placeholder="Repetí la contraseña"
                        />
                      </div>
                      <button
                        onClick={handleChangePassword}
                        disabled={loading}
                        className="px-6 py-3 bg-[#1a1a1a] text-white border-2 border-[#1a1a1a] font-black uppercase text-sm flex items-center gap-2 hover:bg-white hover:text-[#1a1a1a] transition-all shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50"
                      >
                        <KeyRound className="w-4 h-4" /> {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* PREFERENCIAS TAB */}
              {activeTab === 'preferencias' && (
                <div className="space-y-8">
                  <h2 className="text-xl font-black uppercase font-['Space_Grotesk'] border-b-4 border-[#1a1a1a] pb-3 mb-6 flex items-center gap-3">
                    <Bell className="w-5 h-5" /> Preferencias del Sistema
                  </h2>

                  <div className="space-y-6">
                    {/* Dark Mode */}
                    <div className="flex items-center justify-between p-4 bg-[#f5f0e8] border-2 border-[#1a1a1a]">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-[#1a1a1a] text-white">
                          {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-black text-sm">Modo Oscuro</div>
                          <div className="text-xs opacity-50 font-medium">Cambiá la apariencia de la interfaz</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setDarkMode(!darkMode)}
                        className={`relative w-14 h-7 border-2 border-[#1a1a1a] transition-colors ${darkMode ? 'bg-[#1a1a1a]' : 'bg-gray-300'}`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 bg-white border border-[#1a1a1a] transition-all ${darkMode ? 'left-[26px]' : 'left-0.5'}`}
                        />
                      </button>
                    </div>

                    {/* Notifications */}
                    <div className="flex items-center justify-between p-4 bg-[#f5f0e8] border-2 border-[#1a1a1a]">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-[#0055ff] text-white">
                          <Bell className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-black text-sm">Notificaciones</div>
                          <div className="text-xs opacity-50 font-medium">
                            Recibir alertas y notificaciones del sistema
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                        className={`relative w-14 h-7 border-2 border-[#1a1a1a] transition-colors ${notificationsEnabled ? 'bg-[#0055ff]' : 'bg-gray-300'}`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 bg-white border border-[#1a1a1a] transition-all ${notificationsEnabled ? 'left-[26px]' : 'left-0.5'}`}
                        />
                      </button>
                    </div>

                    {/* Auto Refresh */}
                    <div className="flex items-center justify-between p-4 bg-[#f5f0e8] border-2 border-[#1a1a1a]">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-[#10b981] text-white">
                          <RefreshCw className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-black text-sm">Actualización Automática</div>
                          <div className="text-xs opacity-50 font-medium">Actualizar datos en tiempo real</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`relative w-14 h-7 border-2 border-[#1a1a1a] transition-colors ${autoRefresh ? 'bg-[#10b981]' : 'bg-gray-300'}`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 bg-white border border-[#1a1a1a] transition-all ${autoRefresh ? 'left-[26px]' : 'left-0.5'}`}
                        />
                      </button>
                    </div>

                    {/* Language */}
                    <div className="p-4 bg-[#f5f0e8] border-2 border-[#1a1a1a]">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-2 bg-[#f59e0b] text-white">
                          <Globe className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-black text-sm">Idioma</div>
                          <div className="text-xs opacity-50 font-medium">Seleccioná el idioma de la interfaz</div>
                        </div>
                      </div>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full p-3 border-2 border-[#1a1a1a] bg-white focus:outline-none font-bold text-sm uppercase cursor-pointer"
                      >
                        <option value="es">Español</option>
                        <option value="en">English</option>
                        <option value="pt">Português</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleSavePreferences}
                    className="px-6 py-3 bg-[#0055ff] text-white border-2 border-[#1a1a1a] font-black uppercase text-sm flex items-center gap-2 hover:bg-[#1a1a1a] hover:text-[#0055ff] transition-all shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                  >
                    <Save className="w-4 h-4" /> Guardar Preferencias
                  </button>
                </div>
              )}

              {/* SISTEMA TAB */}
              {activeTab === 'sistema' && (
                <div className="space-y-8">
                  <h2 className="text-xl font-black uppercase font-['Space_Grotesk'] border-b-4 border-[#1a1a1a] pb-3 mb-6 flex items-center gap-3">
                    <Shield className="w-5 h-5" /> Estado del Sistema
                  </h2>

                  {/* Connection Status */}
                  <div
                    className={`p-4 border-2 flex items-center gap-4 ${
                      connectionStatus === 'connected'
                        ? 'bg-green-50 border-green-400'
                        : connectionStatus === 'error'
                          ? 'bg-red-50 border-red-400'
                          : 'bg-yellow-50 border-yellow-400'
                    }`}
                  >
                    {connectionStatus === 'connected' ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : connectionStatus === 'error' ? (
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    ) : (
                      <RefreshCw className="w-6 h-6 text-yellow-600 animate-spin" />
                    )}
                    <div>
                      <div className="font-black text-sm">
                        {connectionStatus === 'connected'
                          ? 'Conectado a Supabase'
                          : connectionStatus === 'error'
                            ? 'Error de Conexión'
                            : 'Verificando Conexión...'}
                      </div>
                      <div className="text-xs opacity-60 font-medium">
                        {connectionStatus === 'connected'
                          ? 'Todos los servicios operativos'
                          : connectionStatus === 'error'
                            ? 'No se pudo conectar con Supabase'
                            : 'Conectando con los servidores...'}
                      </div>
                    </div>
                    <button
                      onClick={loadSystemStats}
                      className="ml-auto px-4 py-2 bg-white border-2 border-[#1a1a1a] text-xs font-black uppercase flex items-center gap-1.5 hover:bg-[#1a1a1a] hover:text-white transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Actualizar
                    </button>
                  </div>

                  {/* Collection Stats with Sparklines */}
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" /> Métricas Operativas de Bases de Datos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {Object.entries(systemStats).map(([col, count]) => {
                         // Feature #11: Calculate a dynamic mock percentage/sparkline width based on max volume collection
                         const maxCount = Math.max(...Object.values(systemStats), 1);
                         const progress = Math.max(2, Math.round((count / maxCount) * 100));
                         
                         return (
                        <div key={col} className="p-4 bg-white border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:bg-[#f5f0e8] hover:-translate-y-1 transition-transform cursor-default">
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-2 border-2 border-[#1a1a1a] bg-[#00cc66] text-white shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
                              {collectionIcons[col] || <Database className="w-5 h-5" />}
                            </div>
                            <div className="text-3xl font-black font-['Space_Grotesk'] text-[#1a1a1a]">{count}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">
                              {collectionLabels[col] || col}
                            </div>
                            {/* Injected Sparkline/Meter */}
                            <div className="w-full h-2 border-2 border-[#1a1a1a] bg-gray-200 overflow-hidden relative">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                className={`h-full ${col === 'tasks' ? 'bg-[#ff9900]' : col === 'visitas' ? 'bg-[#0055ff]' : 'bg-[#1a1a1a]'}`}
                              ></motion.div>
                            </div>
                          </div>
                        </div>
                      )})}
                    </div>
                  </div>

                  {/* System Info */}
                  <div className="p-4 bg-[#f5f0e8] border-2 border-[#1a1a1a]">
                    <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Info className="w-4 h-4" /> Información del Sistema
                    </h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Versión', value: '1.0.0' },
                        { label: 'Framework', value: 'React + Vite + TypeScript' },
                        { label: 'Base de Datos', value: 'Supabase Postgres' },
                        { label: 'Storage', value: 'Supabase Storage' },
                        { label: 'Autenticación', value: 'Supabase Auth' },
                        { label: 'Usuario UID', value: user.id.slice(0, 20) + '...' },
                        { label: 'Sesión iniciada', value: new Date().toLocaleString('es-ES') },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex justify-between items-center py-2 border-b border-[#1a1a1a]/10 last:border-0"
                        >
                          <span className="text-xs font-bold uppercase opacity-60">{item.label}</span>
                          <span className="text-xs font-black">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* DATOS TAB */}
              {activeTab === 'datos' && (
                <div className="space-y-8">
                  <h2 className="text-xl font-black uppercase font-['Space_Grotesk'] border-b-4 border-[#1a1a1a] pb-3 mb-6 flex items-center gap-3">
                    <Database className="w-5 h-5" /> Gestión de Datos
                  </h2>

                  {/* Export */}
                  <div className="p-6 bg-[#f5f0e8] border-2 border-[#1a1a1a]">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-[#10b981] text-white">
                        <Download className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-black text-lg">Exportar Todos los Datos</div>
                        <div className="text-sm opacity-50 font-medium">
                          Descargá un respaldo completo en Excel con todas las colecciones
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleExportAllData}
                      disabled={exporting}
                      className="px-6 py-3 bg-[#10b981] text-white border-2 border-[#1a1a1a] font-black uppercase text-sm flex items-center gap-2 hover:bg-[#1a1a1a] hover:text-[#10b981] transition-all shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50"
                    >
                      {exporting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Exportando...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" /> Descargar Respaldo Completo
                        </>
                      )}
                    </button>
                  </div>

                  {/* Collection breakdown */}
                  <div className="p-6 bg-[#f5f0e8] border-2 border-[#1a1a1a]">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-[#0055ff] text-white">
                        <BarChart3 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-black text-lg">Resumen de Datos</div>
                        <div className="text-sm opacity-50 font-medium">Cantidad de registros por colección</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(systemStats).map(([col, count]) => (
                        <div
                          key={col}
                          className="flex items-center justify-between py-2 border-b border-[#1a1a1a]/10 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-[#0055ff]">
                              {collectionIcons[col] || <Database className="w-4 h-4" />}
                            </div>
                            <span className="text-sm font-bold uppercase">{collectionLabels[col] || col}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#0055ff] rounded-full"
                                style={{
                                  width: `${systemStats.tasks ? Math.round((count / systemStats.tasks) * 100) : 0}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-black w-8 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="border-2 border-red-400">
                    <button
                      onClick={() => setShowDangerZone(!showDangerZone)}
                      className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <div className="font-black text-sm text-red-800">Zona de Peligro</div>
                      </div>
                      {showDangerZone ? (
                        <ChevronUp className="w-5 h-5 text-red-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-red-600" />
                      )}
                    </button>
                    <AnimatePresence>
                      {showDangerZone && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-6 space-y-4">
                            <p className="text-sm font-medium text-red-700">
                              Estas acciones son irreversibles. Asegurate de hacer un respaldo antes de proceder.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <button
                                onClick={() => navigate('/base-datos')}
                                className="px-5 py-2.5 bg-red-600 text-white border-2 border-[#1a1a1a] font-black uppercase text-xs flex items-center gap-2 hover:bg-[#1a1a1a] hover:text-red-600 transition-all"
                              >
                                <Trash2 className="w-4 h-4" /> Ir a Base de Datos
                              </button>
                            </div>
                            <p className="text-xs opacity-50">
                              La gestión avanzada de datos (borrado masivo, etc.) se realiza desde la sección Base de
                              Datos.
                            </p>
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
