import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { signOut, User } from 'firebase/auth';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  Search,
  Bell,
  Settings,
  User as UserIcon,
  LogOut,
  LayoutDashboard,
  HardHat,
  ListChecks,
  BarChart3,
  Database,
  PlusSquare,
  FileText,
  Menu,
  X,
  ChevronRight,
  ArrowRight,
  MapPin,
  Users,
  Calendar,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'motion/react';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  authorId: string;
  recipientId?: string;
}

interface SearchResult {
  id: string;
  type: 'tarea' | 'visita' | 'novedad' | 'personal' | 'ubicacion';
  title: string;
  subtitle: string;
  detail: string;
  route: string;
  icon: React.ReactNode;
  color: string;
}

export default function Layout({ user }: { user: User }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const sessionStartTime = useRef(new Date().toISOString());
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
    setShowNotifications(false);
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        if (user.email === 'matialeescobar96@gmail.com' && user.emailVerified) {
          setIsAdmin(true);
          return;
        }
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error('Error checking admin status', error);
      }
    };
    checkAdmin();

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: AppNotification[] = [];
      let newUnread = 0;
      const lastRead = localStorage.getItem('lastReadNotification') || '1970-01-01T00:00:00.000Z';

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data() as AppNotification;
          const isForMe = !data.recipientId || data.recipientId === user.uid;
          if (data.createdAt > sessionStartTime.current && data.authorId !== user.uid && isForMe) {
            toast(data.title, { description: data.message });
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(data.title, { body: data.message });
            }
          }
        }
      });

      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() } as AppNotification;
        notifs.push(data);
        if (data.createdAt > lastRead) {
          newUnread++;
        }
      });

      setNotifications(notifs);
      setUnreadCount(newUnread);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      setUnreadCount(0);
      localStorage.setItem('lastReadNotification', new Date().toISOString());
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    setSearching(true);
    setSelectedIndex(-1);
    const term = q.toLowerCase().trim();
    const results: SearchResult[] = [];

    try {
      // Search Tasks
      const tasksSnap = await getDocs(query(collection(db, 'tasks'), limit(200)));
      tasksSnap.forEach((d) => {
        const data = d.data() as any;
        const title = (data.title || '').toLowerCase();
        const desc = (data.description || '').toLowerCase();
        if (title.includes(term) || desc.includes(term)) {
          results.push({
            id: d.id,
            type: 'tarea',
            title: data.title || 'Sin título',
            subtitle: data.priority ? `Prioridad: ${data.priority}` : '',
            detail: data.dueDate ? `Vence: ${data.dueDate}` : data.status ? `Estado: ${data.status}` : '',
            route: '/tareas',
            icon: <ListChecks className="w-4 h-4" />,
            color: 'bg-[#0055ff]',
          });
        }
      });

      // Search Visitas
      const visitasSnap = await getDocs(query(collection(db, 'visitas'), limit(200)));
      visitasSnap.forEach((d) => {
        const data = d.data() as any;
        const origen = (data.origen || '').toLowerCase();
        const destino = (data.destino || '').toLowerCase();
        const resp = (data.responsable || '').toLowerCase();
        const obs = (data.observaciones || '').toLowerCase();
        if (origen.includes(term) || destino.includes(term) || resp.includes(term) || obs.includes(term)) {
          results.push({
            id: d.id,
            type: 'visita',
            title: `${data.origen || 'N/A'} → ${data.destino || 'N/A'}`,
            subtitle: data.responsable ? `Resp: ${data.responsable}` : '',
            detail: data.fecha ? `${data.fecha} ${data.hora || ''}` : '',
            route: '/visitas',
            icon: <HardHat className="w-4 h-4" />,
            color: 'bg-[#00cc66]',
          });
        }
      });

      // Search Novedades
      const novedadesSnap = await getDocs(query(collection(db, 'novedades'), limit(200)));
      novedadesSnap.forEach((d) => {
        const data = d.data() as any;
        const title = (data.title || '').toLowerCase();
        const content = (data.content || '').toLowerCase();
        const author = (data.authorName || '').toLowerCase();
        if (title.includes(term) || content.includes(term) || author.includes(term)) {
          results.push({
            id: d.id,
            type: 'novedad',
            title: data.title || 'Sin título',
            subtitle: data.authorName ? `Por: ${data.authorName}` : '',
            detail: data.createdAt ? new Date(data.createdAt).toLocaleDateString('es-ES') : '',
            route: '/novedades',
            icon: <FileText className="w-4 h-4" />,
            color: 'bg-[#1a1a1a]',
          });
        }
      });

      // Search Personal
      const personalSnap = await getDocs(query(collection(db, 'personal'), limit(200)));
      personalSnap.forEach((d) => {
        const data = d.data() as any;
        const name = (data.name || '').toLowerCase();
        const role = (data.role || '').toLowerCase();
        if (name.includes(term) || role.includes(term)) {
          results.push({
            id: d.id,
            type: 'personal',
            title: data.name || 'Sin nombre',
            subtitle: data.role || '',
            detail: data.status || '',
            route: '/base-datos',
            icon: <Users className="w-4 h-4" />,
            color: 'bg-[#0055ff]',
          });
        }
      });

      // Search Locations
      const locationsSnap = await getDocs(query(collection(db, 'locations'), limit(200)));
      locationsSnap.forEach((d) => {
        const data = d.data() as any;
        const name = (data.name || '').toLowerCase();
        const type = (data.type || '').toLowerCase();
        if (name.includes(term) || type.includes(term)) {
          results.push({
            id: d.id,
            type: 'ubicacion',
            title: data.name || 'Sin nombre',
            subtitle: data.type || '',
            detail: data.status || '',
            route: '/base-datos',
            icon: <MapPin className="w-4 h-4" />,
            color: 'bg-[#00cc66]',
          });
        }
      });

      // Also match nav sections
      const navItems = [
        {
          label: 'panel',
          route: '/',
          title: 'Panel de Control',
          icon: <LayoutDashboard className="w-4 h-4" />,
          color: 'bg-[#0055ff]',
        },
        {
          label: 'visitas',
          route: '/visitas',
          title: 'Visitas Técnicas',
          icon: <HardHat className="w-4 h-4" />,
          color: 'bg-[#00cc66]',
        },
        {
          label: 'tareas',
          route: '/tareas',
          title: 'Lista de Tareas',
          icon: <ListChecks className="w-4 h-4" />,
          color: 'bg-[#0055ff]',
        },
        {
          label: 'novedades',
          route: '/novedades',
          title: 'Novedades',
          icon: <FileText className="w-4 h-4" />,
          color: 'bg-[#1a1a1a]',
        },
        {
          label: 'reportes',
          route: '/reportes',
          title: 'Reportes',
          icon: <BarChart3 className="w-4 h-4" />,
          color: 'bg-[#1a1a1a]',
        },
        {
          label: 'base de datos',
          route: '/base-datos',
          title: 'Base de Datos',
          icon: <Database className="w-4 h-4" />,
          color: 'bg-[#0055ff]',
        },
      ];
      navItems.forEach((item) => {
        if (item.label.includes(term) || item.title.toLowerCase().includes(term)) {
          results.unshift({
            id: `nav-${item.route}`,
            type: 'tarea',
            title: item.title,
            subtitle: 'Sección del sistema',
            detail: '',
            route: item.route,
            icon: item.icon,
            color: item.color,
          });
        }
      });

      setSearchResults(results.slice(0, 20));
      setSearchOpen(true);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Error al buscar');
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSelectedIndex(-1);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.trim().length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleSearchSelect = (result: SearchResult) => {
    setSearchQuery('');
    setSearchOpen(false);
    setSearchResults([]);
    navigate(result.route);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && searchResults[selectedIndex]) {
        handleSearchSelect(searchResults[selectedIndex]);
      } else if (searchResults.length > 0) {
        handleSearchSelect(searchResults[0]);
      }
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
      searchInputRef.current?.blur();
    }
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Panel de Control' },
    { to: '/visitas', icon: HardHat, label: 'Visitas Técnicas' },
    { to: '/tareas', icon: ListChecks, label: 'Lista de Tareas' },
    { to: '/novedades', icon: FileText, label: 'Novedades' },
    { to: '/reportes', icon: BarChart3, label: 'Reportes' },
    { to: '/base-datos', icon: Database, label: 'Base de Datos' },
  ];

  const userName = user.displayName || user.email?.split('@')[0] || 'Usuario';
  const userEmail = user.email || '';

  const typeIcon = (type: string) => {
    switch (type) {
      case 'tarea':
        return <ListChecks className="w-3.5 h-3.5" />;
      case 'visita':
        return <HardHat className="w-3.5 h-3.5" />;
      case 'novedad':
        return <FileText className="w-3.5 h-3.5" />;
      case 'personal':
        return <Users className="w-3.5 h-3.5" />;
      case 'ubicacion':
        return <MapPin className="w-3.5 h-3.5" />;
      default:
        return <Search className="w-3.5 h-3.5" />;
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case 'tarea':
        return 'TAREA';
      case 'visita':
        return 'VISITA';
      case 'novedad':
        return 'NOVEDAD';
      case 'personal':
        return 'PERSONAL';
      case 'ubicacion':
        return 'UBICACIÓN';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-[#1a1a1a] font-['Inter']">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* TopAppBar */}
      <header className="fixed top-0 left-0 w-full z-50 h-16 lg:h-20 bg-[#f5f0e8] border-b-4 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,0.3)]">
        <div className="flex justify-between items-center px-4 lg:px-6 h-full">
          <div className="flex items-center gap-3 lg:gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center border-2 border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,0.3)] cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="text-lg lg:text-2xl font-black text-[#1a1a1a] tracking-tighter uppercase font-['Space_Grotesk'] truncate max-w-[200px] lg:max-w-none">
              <span className="hidden sm:inline">PREFECTURA NAVAL ARGENTINA</span>
              <span className="sm:hidden">PNA</span>
            </span>
          </div>

          <div className="flex items-center gap-2 lg:gap-6">
            {/* Desktop Search */}
            <div className="hidden md:block relative" ref={searchRef}>
              <div className="flex items-center bg-white border-2 border-[#1a1a1a] px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(26,26,26,0.3)]">
                <Search className="text-[#1a1a1a] mr-2 w-4 h-4" />
                <input
                  ref={searchInputRef}
                  className="bg-transparent border-none focus:ring-0 text-xs font-bold uppercase tracking-wider outline-none w-48 lg:w-64 text-[#1a1a1a] placeholder:text-[#1a1a1a]/40"
                  placeholder="BUSCAR EN TODO EL SISTEMA..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => {
                    if (searchResults.length > 0) setSearchOpen(true);
                  }}
                  aria-label="Buscar en el sistema"
                  autoComplete="off"
                />
                {searching && (
                  <div className="w-3 h-3 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin ml-2"></div>
                )}
              </div>

              {/* Search Results Dropdown */}
              <AnimatePresence>
                {searchOpen && searchQuery.trim().length >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white border-4 border-[#1a1a1a] shadow-[8px_8px_0px_0px_rgba(26,26,26,0.3)] z-50 max-h-[70vh] overflow-hidden flex flex-col"
                    style={{ minWidth: '480px' }}
                  >
                    <div className="p-3 border-b-4 border-[#1a1a1a] bg-[#f5f0e8] flex justify-between items-center shrink-0">
                      <span className="text-xs font-black uppercase tracking-widest">
                        {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} para "{searchQuery}"
                      </span>
                      <span className="text-[10px] font-bold opacity-40">↑↓ navegar · ↵ abrir · esc cerrar</span>
                    </div>
                    <div className="overflow-y-auto max-h-[calc(70vh-44px)]">
                      {searchResults.length === 0 && !searching ? (
                        <div className="p-8 text-center">
                          <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          <p className="text-sm font-bold opacity-50">Sin resultados</p>
                          <p className="text-xs font-medium opacity-30 mt-1">Probá con otro término de búsqueda</p>
                        </div>
                      ) : (
                        searchResults.map((result, idx) => (
                          <button
                            key={`${result.type}-${result.id}`}
                            onClick={() => handleSearchSelect(result)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={`w-full text-left p-3 border-b-2 border-[#1a1a1a]/5 transition-colors flex items-start gap-3 ${
                              idx === selectedIndex ? 'bg-[#0055ff] text-white' : 'hover:bg-[#f5f0e8]'
                            }`}
                          >
                            <div className={`p-2 border-2 border-[#1a1a1a] ${result.color} text-white shrink-0 mt-0.5`}>
                              {typeIcon(result.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span
                                  className={`text-xs font-black uppercase truncate ${idx === selectedIndex ? 'text-white' : ''}`}
                                >
                                  {result.title}
                                </span>
                                <span
                                  className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 border shrink-0 ${
                                    idx === selectedIndex
                                      ? 'border-white/30 text-white/70'
                                      : 'border-[#1a1a1a]/20 opacity-50'
                                  }`}
                                >
                                  {typeLabel(result.type)}
                                </span>
                              </div>
                              {result.subtitle && (
                                <p
                                  className={`text-[11px] font-medium truncate ${idx === selectedIndex ? 'text-white/80' : 'opacity-60'}`}
                                >
                                  {result.subtitle}
                                </p>
                              )}
                              {result.detail && (
                                <p
                                  className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${idx === selectedIndex ? 'text-white/50' : 'opacity-40'}`}
                                >
                                  {result.detail}
                                </p>
                              )}
                            </div>
                            <ArrowRight
                              className={`w-4 h-4 shrink-0 mt-1 ${idx === selectedIndex ? 'text-white' : 'opacity-20'}`}
                            />
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={handleBellClick}
                className="relative p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center border-2 border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,0.3)] cursor-pointer"
                aria-label={`Notificaciones${unreadCount > 0 ? `, ${unreadCount} sin leer` : ''}`}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#e63b2e] text-white text-xs font-black px-1.5 py-0.5 rounded-full border-2 border-[#1a1a1a]">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-80 bg-white border-4 border-[#1a1a1a] shadow-[8px_8px_0px_0px_rgba(26,26,26,0.3)] z-50 max-h-96 flex flex-col"
                  >
                    <div className="p-4 border-b-4 border-[#1a1a1a] bg-[#f5f0e8] flex justify-between items-center shrink-0">
                      <h3 className="font-black uppercase tracking-widest text-sm">Notificaciones</h3>
                      <button onClick={() => setShowNotifications(false)} className="text-sm font-bold underline">
                        Cerrar
                      </button>
                    </div>
                    <div className="flex flex-col overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="font-bold text-sm opacity-50">No hay notificaciones</p>
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((notif) => (
                          <div
                            key={notif.id}
                            className="p-4 border-b-2 border-[#1a1a1a]/10 hover:bg-[#f5f0e8] transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 border-2 border-[#1a1a1a] uppercase ${notif.type === 'tarea' ? 'bg-[#0055ff] text-white' : notif.type === 'visita' ? 'bg-[#00cc66] text-white' : 'bg-[#0055ff] text-white'}`}
                              >
                                {notif.type}
                              </span>
                              <span className="text-xs font-bold opacity-50">
                                {new Date(notif.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <h4 className="font-black text-sm uppercase">{notif.title}</h4>
                            <p className="text-sm font-medium opacity-80 mt-1">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Settings */}
            <button
              onClick={() => navigate('/configuracion')}
              className="hidden lg:flex p-2.5 min-w-[44px] min-h-[44px] items-center justify-center border-2 border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,0.3)] cursor-pointer"
              aria-label="Configuración"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* User Avatar */}
            <div className="flex items-center gap-2 lg:ml-2">
              <div className="w-9 h-9 lg:w-10 lg:h-10 border-2 border-[#1a1a1a] overflow-hidden shadow-[2px_2px_0px_0px_rgba(26,26,26,0.3)] bg-[#0055ff] flex items-center justify-center">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Foto de usuario"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserIcon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                )}
              </div>
              <div className="hidden lg:block">
                <p className="text-xs font-black uppercase leading-tight">{userName}</p>
                <p className="text-[10px] font-bold opacity-50 uppercase truncate max-w-[120px]">{userEmail}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* SideNavBar - Desktop */}
      <nav className="hidden lg:flex fixed left-0 top-20 h-[calc(100vh-80px)] w-64 flex-col z-40 bg-[#f5f0e8] border-r-4 border-[#1a1a1a] font-['Space_Grotesk'] font-bold uppercase">
        <div className="p-6 border-b-2 border-[#1a1a1a]">
          <span className="text-xl font-black block">SGA PZBP - MS</span>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-4 p-4 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0055ff] focus-visible:ring-offset-2 ${
                  isActive
                    ? 'bg-[#0055ff] text-white border-2 border-[#1a1a1a] m-2 shadow-[2px_2px_0px_0px_rgba(26,26,26,0.3)]'
                    : 'text-[#1a1a1a] border-b-2 border-[#1a1a1a]/10 hover:bg-[#0055ff] hover:text-white'
                }`
              }
            >
              <item.icon className="w-6 h-6 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
        <div className="p-4 border-t-4 border-[#1a1a1a]">
          <button
            onClick={() => navigate('/tareas')}
            className="w-full bg-[#0055ff] text-white border-2 border-[#1a1a1a] py-3 shadow-[2px_2px_0px_0px_rgba(26,26,26,0.3)] font-black flex items-center justify-center gap-2 hover:bg-[#1a1a1a] hover:text-white transition-colors cursor-pointer"
          >
            <PlusSquare className="w-5 h-5" />
            NUEVA TAREA
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-[#e63b2e] mt-4 p-3 min-h-[44px] hover:underline font-bold text-sm cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </nav>

      {/* SideNavBar - Mobile */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="lg:hidden fixed left-0 top-16 h-[calc(100vh-64px)] w-72 flex flex-col z-50 bg-[#f5f0e8] border-r-4 border-[#1a1a1a] shadow-[8px_0px_0px_0px_rgba(26,26,26,0.2)] font-['Space_Grotesk'] font-bold uppercase"
          >
            <div className="p-4 border-b-2 border-[#1a1a1a]">
              {/* Mobile Search */}
              <div className="flex items-center bg-white border-2 border-[#1a1a1a] px-3 py-2">
                <Search className="text-[#1a1a1a] mr-2 w-4 h-4" />
                <input
                  className="bg-transparent border-none focus:ring-0 text-xs font-bold uppercase tracking-wider outline-none w-full text-[#1a1a1a] placeholder:text-[#1a1a1a]/40"
                  placeholder="BUSCAR..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  aria-label="Buscar en el sistema"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-4 p-4 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0055ff] focus-visible:ring-offset-2 ${
                      isActive
                        ? 'bg-[#0055ff] text-white border-2 border-[#1a1a1a] m-2 shadow-[2px_2px_0px_0px_rgba(26,26,26,0.3)]'
                        : 'text-[#1a1a1a] border-b-2 border-[#1a1a1a]/10 hover:bg-[#0055ff] hover:text-white'
                    }`
                  }
                >
                  <item.icon className="w-6 h-6 shrink-0" />
                  <span>{item.label}</span>
                  <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                </NavLink>
              ))}
            </div>
            <div className="p-4 border-t-4 border-[#1a1a1a]">
              <button
                onClick={() => {
                  navigate('/tareas');
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-[#0055ff] text-white border-2 border-[#1a1a1a] py-3 shadow-[2px_2px_0px_0px_rgba(26,26,26,0.3)] font-black flex items-center justify-center gap-2 hover:bg-[#1a1a1a] hover:text-white transition-colors"
              >
                <PlusSquare className="w-5 h-5" />
                NUEVA TAREA
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 text-[#e63b2e] mt-4 p-2 hover:underline font-bold text-sm"
              >
                <LogOut className="w-5 h-5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Mobile Search Results Overlay */}
      <AnimatePresence>
        {searchOpen && searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm pt-16"
            onClick={() => {
              setSearchOpen(false);
              setSearchResults([]);
            }}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border-b-4 border-[#1a1a1a] shadow-[0_8px_0px_0px_rgba(26,26,26,0.2)] max-h-[70vh] overflow-y-auto"
            >
              <div className="p-3 border-b-4 border-[#1a1a1a] bg-[#f5f0e8] flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-widest">
                  {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchResults([]);
                  }}
                  className="text-sm font-bold underline"
                >
                  Cerrar
                </button>
              </div>
              {searchResults.map((result, idx) => (
                <button
                  key={`mobile-${result.type}-${result.id}`}
                  onClick={() => handleSearchSelect(result)}
                  className="w-full text-left p-4 border-b-2 border-[#1a1a1a]/10 hover:bg-[#f5f0e8] transition-colors flex items-start gap-3"
                >
                  <div className={`p-2 border-2 border-[#1a1a1a] ${result.color} text-white shrink-0`}>
                    {typeIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black uppercase truncate">{result.title}</p>
                    {result.subtitle && <p className="text-xs font-medium opacity-60 truncate">{result.subtitle}</p>}
                    {result.detail && (
                      <p className="text-[10px] font-bold uppercase tracking-wider opacity-40 mt-0.5">
                        {result.detail}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="lg:ml-64 mt-16 lg:mt-20 p-4 lg:p-8 min-h-screen transition-all duration-200">
        <Outlet context={{ user, isAdmin }} />
      </main>
    </div>
  );
}
