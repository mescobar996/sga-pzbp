import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import { Toaster } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Visitas from './pages/Visitas';
import Tareas from './pages/Tareas';
import Reportes from './pages/Reportes';
import BaseDatos from './pages/BaseDatos';
import Novedades from './pages/Novedades';
import Configuracion from './pages/Configuracion';
import Login from './pages/Login';
import { AnimatePresence, motion } from 'motion/react';
import { WifiOff } from 'lucide-react';

function AnimatedRoutes({ user }: { user: User | null }) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        
        <Route path="/" element={user ? <Layout user={user} /> : <Navigate to="/login" />}>
          <Route index element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="visitas" element={<PageTransition><Visitas /></PageTransition>} />
          <Route path="tareas" element={<PageTransition><Tareas /></PageTransition>} />
          <Route path="novedades" element={<PageTransition><Novedades /></PageTransition>} />
          <Route path="reportes" element={<PageTransition><Reportes /></PageTransition>} />
          <Route path="base-datos" element={<PageTransition><BaseDatos /></PageTransition>} />
          <Route path="configuracion" element={<PageTransition><Configuracion /></PageTransition>} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <motion.div
      initial={{ y: -50 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-[100] bg-[#e63b2e] text-white text-center py-2 px-4 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
    >
      <WifiOff className="w-4 h-4" />
      Sin conexión a internet - Algunos datos podrían no estar actualizados
    </motion.div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f0e8] font-['Space_Grotesk'] text-2xl font-black uppercase">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#1a1a1a] border-t-[#0055ff] rounded-full animate-spin"></div>
          <span>Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Toaster position="top-right" richColors />
      <OfflineBanner />
      <Router>
        <AnimatedRoutes user={user} />
      </Router>
    </ErrorBoundary>
  );
}
