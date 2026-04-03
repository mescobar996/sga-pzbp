import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { signOut, User } from 'firebase/auth';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Search, Bell, Settings, User as UserIcon, LogOut, LayoutDashboard, HardHat, ListChecks, BarChart3, Database, PlusSquare, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  authorId: string;
}

export default function Layout({ user }: { user: User }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const sessionStartTime = useRef(new Date().toISOString());

  useEffect(() => {
    // Check if user is admin
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
        console.error("Error checking admin status", error);
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
          if (data.createdAt > sessionStartTime.current && data.authorId !== user.uid) {
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

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Panel de Control' },
    { to: '/visitas', icon: HardHat, label: 'Visitas Técnicas' },
    { to: '/tareas', icon: ListChecks, label: 'Lista de Tareas' },
    { to: '/novedades', icon: FileText, label: 'Novedades' },
    { to: '/reportes', icon: BarChart3, label: 'Reportes' },
    { to: '/base-datos', icon: Database, label: 'Base de Datos' },
  ];

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-[#1a1a1a] font-['Inter']">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-20 bg-[#f5f0e8] border-b-4 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-black text-[#1a1a1a] tracking-tighter uppercase font-['Space_Grotesk']">PREFECTURA NAVAL ARGENTINA</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center bg-white border-2 border-[#1a1a1a] px-3 py-1 shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
            <Search className="text-[#1a1a1a] mr-2 w-5 h-5" />
            <input className="bg-transparent border-none focus:ring-0 text-xs font-bold uppercase tracking-wider outline-none" placeholder="BUSCAR..." type="text" />
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={handleBellClick}
                className="relative p-2 border-2 border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#e63b2e] text-white text-xs font-black px-1.5 py-0.5 rounded-full border-2 border-[#1a1a1a]">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute top-full right-0 mt-4 w-80 bg-white border-4 border-[#1a1a1a] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] z-50 max-h-96 flex flex-col">
                  <div className="p-4 border-b-4 border-[#1a1a1a] bg-[#f5f0e8] flex justify-between items-center shrink-0">
                    <h3 className="font-black uppercase tracking-widest">Notificaciones</h3>
                    <button onClick={() => setShowNotifications(false)} className="text-sm font-bold underline">Cerrar</button>
                  </div>
                  <div className="flex flex-col overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center font-bold opacity-50">No hay notificaciones</div>
                    ) : (
                      notifications.map(notif => (
                        <div key={notif.id} className="p-4 border-b-2 border-[#1a1a1a]/10 hover:bg-[#f5f0e8] transition-colors">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black px-2 py-0.5 border-2 border-[#1a1a1a] uppercase ${notif.type === 'tarea' ? 'bg-[#0055ff] text-white' : notif.type === 'visita' ? 'bg-[#00cc66] text-white' : 'bg-[#0055ff] text-white'}`}>
                              {notif.type}
                            </span>
                            <span className="text-xs font-bold opacity-50">{new Date(notif.createdAt).toLocaleDateString()}</span>
                          </div>
                          <h4 className="font-black text-sm uppercase">{notif.title}</h4>
                          <p className="text-sm font-medium opacity-80 mt-1">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={() => toast.info('Configuración próximamente')}
              className="p-2 border-2 border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
            >
              <Settings className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 ml-2">
              <div className="w-10 h-10 border-2 border-[#1a1a1a] overflow-hidden shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] bg-[#0055ff] flex items-center justify-center">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="w-6 h-6" />
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* SideNavBar */}
      <nav className="fixed left-0 top-20 h-[calc(100vh-80px)] w-64 flex flex-col z-40 bg-[#f5f0e8] border-r-4 border-[#1a1a1a] font-['Space_Grotesk'] font-bold uppercase">
        <div className="p-6 border-b-2 border-[#1a1a1a]">
          <span className="text-xl font-black block">SGA PZBP - MS</span>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-4 p-4 transition-all hover:skew-x-1 ${
                  isActive
                    ? 'bg-[#0055ff] text-white border-2 border-[#1a1a1a] m-2'
                    : 'text-[#1a1a1a] border-b-2 border-[#1a1a1a]/10 hover:bg-[#0055ff] hover:text-white'
                }`
              }
            >
              <item.icon className="w-6 h-6" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
        <div className="p-4 border-t-4 border-[#1a1a1a]">
          <button 
            onClick={() => navigate('/tareas')}
            className="w-full bg-[#0055ff] text-white border-2 border-[#1a1a1a] py-3 shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] font-black flex items-center justify-center gap-2 hover:bg-[#1a1a1a] transition-colors"
          >
            <PlusSquare className="w-5 h-5" />
            NUEVA TAREA
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-4 text-[#e63b2e] mt-4 p-2 hover:underline">
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="ml-64 mt-20 p-8 min-h-screen">
        <Outlet context={{ user, isAdmin }} />
      </main>
    </div>
  );
}
