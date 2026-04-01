import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import Login from './pages/Login';

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
    return <div className="min-h-screen flex items-center justify-center bg-[#f5f0e8] font-['Space_Grotesk'] text-2xl font-black uppercase">Cargando...</div>;
  }

  return (
    <ErrorBoundary>
      <Toaster position="top-right" richColors />
      <Router>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          
          {/* Protected Routes */}
          <Route path="/" element={user ? <Layout user={user} /> : <Navigate to="/login" />}>
            <Route index element={<Dashboard />} />
            <Route path="visitas" element={<Visitas />} />
            <Route path="tareas" element={<Tareas />} />
            <Route path="novedades" element={<Novedades />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="base-datos" element={<BaseDatos />} />
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
