import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './db/client';
import type { User } from '@supabase/supabase-js';
import { Toaster } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import { OfflineBanner } from './components/OfflineBanner';
import { AnimatePresence, motion } from 'motion/react';

import Dashboard from './pages/Dashboard';
import Visitas from './pages/Visitas';
import Tareas from './pages/Tareas';
import Reportes from './pages/Reportes';
import BaseDatos from './pages/BaseDatos';
import Novedades from './pages/Novedades';
import Configuracion from './pages/Configuracion';
import DebugDB from './pages/DebugDB';
import Login from './pages/Login';
import Notificaciones from './pages/Notificaciones';

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

function AnimatedRoutes({ user }: { user: User | null }) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageTransition>{!user ? <Login /> : <Navigate to="/" />}</PageTransition>} />

        <Route path="/" element={user ? <Layout user={user} /> : <Navigate to="/login" />}>
          <Route
            index
            element={
              <PageTransition>
                <Dashboard />
              </PageTransition>
            }
          />
          <Route
            path="visitas"
            element={
              <PageTransition>
                <Visitas />
              </PageTransition>
            }
          />
          <Route
            path="tareas"
            element={
              <PageTransition>
                <Tareas />
              </PageTransition>
            }
          />
          <Route
            path="novedades"
            element={
              <PageTransition>
                <Novedades />
              </PageTransition>
            }
          />
          <Route
            path="reportes"
            element={
              <PageTransition>
                <Reportes />
              </PageTransition>
            }
          />
          <Route
            path="base-datos"
            element={
              <PageTransition>
                <BaseDatos />
              </PageTransition>
            }
          />
          <Route
            path="configuracion"
            element={
              <PageTransition>
                <Configuracion />
              </PageTransition>
            }
          />
          <Route
            path="debug-db"
            element={
              <PageTransition>
                <DebugDB />
              </PageTransition>
            }
          />
          <Route
            path="notificaciones"
            element={
              <PageTransition>
                <Notificaciones />
              </PageTransition>
            }
          />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
      <Toaster position="top-right" richColors aria-live="polite" />
      <OfflineBanner />
      <Router>
        <AnimatedRoutes user={user} />
      </Router>
    </ErrorBoundary>
  );
}
