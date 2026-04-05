import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import { Toaster } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import { OfflineBanner } from './components/OfflineBanner';
import { SkeletonPage } from './components/Skeleton';
import { AnimatePresence, motion } from 'motion/react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Visitas = lazy(() => import('./pages/Visitas'));
const Tareas = lazy(() => import('./pages/Tareas'));
const Reportes = lazy(() => import('./pages/Reportes'));
const BaseDatos = lazy(() => import('./pages/BaseDatos'));
const Novedades = lazy(() => import('./pages/Novedades'));
const Configuracion = lazy(() => import('./pages/Configuracion'));
const DebugDB = lazy(() => import('./pages/DebugDB'));
const Login = lazy(() => import('./pages/Login'));

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<SkeletonPage layout="cards" cardCount={3} />}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </Suspense>
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
        </Route>
      </Routes>
    </AnimatePresence>
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
      <Toaster position="top-right" richColors aria-live="polite" />
      <OfflineBanner />
      <Router>
        <AnimatedRoutes user={user} />
      </Router>
    </ErrorBoundary>
  );
}
