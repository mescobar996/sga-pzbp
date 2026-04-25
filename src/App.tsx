import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState, Suspense, lazy } from 'react';
import { supabase } from './db/client';
import type { User } from '@supabase/supabase-js';
import { Toaster } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import { OfflineBanner } from './components/OfflineBanner';
import { AnimatePresence, motion } from 'motion/react';

// Feature #25 — Lazy loading: pages loaded on demand for faster initial load
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Visitas = lazy(() => import('./pages/Visitas'));
const Tareas = lazy(() => import('./pages/Tareas'));
const Reportes = lazy(() => import('./pages/Reportes'));
const BaseDatos = lazy(() => import('./pages/BaseDatos'));
const Novedades = lazy(() => import('./pages/Novedades'));
const Diligenciamientos = lazy(() => import('./pages/Diligenciamientos'));
const Configuracion = lazy(() => import('./pages/Configuracion'));
const DebugDB = lazy(() => import('./pages/DebugDB'));
const Login = lazy(() => import('./pages/Login'));
const Notificaciones = lazy(() => import('./pages/Notificaciones'));
const AdminUsuarios = lazy(() => import('./pages/AdminUsuarios'));

/** Brutalista loading spinner — shown while lazy pages resolve */
function LazyFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-[#1a1a1a] border-t-[#0055ff] animate-spin"></div>
        <span className="text-xs font-black uppercase tracking-widest opacity-50">Cargando...</span>
      </div>
    </div>
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

function AnimatedRoutes({ user }: { user: User | null }) {
  const location = useLocation();

  return (
    <Suspense fallback={<LazyFallback />}>
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
            path="diligenciamientos"
            element={
              <PageTransition>
                <Diligenciamientos />
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
          <Route
            path="admin-usuarios"
            element={
              <PageTransition>
                <AdminUsuarios />
              </PageTransition>
            }
          />
        </Route>
      </Routes>
    </AnimatePresence>
    </Suspense>
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
