import { supabase } from '../db/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Shield, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error logging in', error);
      toast.error('Error al iniciar sesión con Google.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f0e8] font-['Space_Grotesk'] text-[#1a1a1a] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white p-8 lg:p-12 border-4 border-[#1a1a1a] shadow-[12px_12px_0px_0px_rgba(26,26,26,0.3)] max-w-md w-full text-center"
      >
        <div className="w-20 h-20 mx-auto mb-6 border-4 border-[#1a1a1a] bg-[#0055ff] flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(26,26,26,0.3)]">
          <Shield className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-3xl lg:text-4xl font-black uppercase mb-2 tracking-tighter">SGA PZBP - MS</h1>
        <h2 className="text-base lg:text-lg font-bold uppercase mb-2 opacity-70">Prefectura Naval Argentina</h2>
        <p className="text-xs font-medium opacity-50 mb-8 uppercase tracking-wider">Sistema de Gestión de Actividades</p>

        <button
          onClick={handleLogin}
          className="w-full py-4 px-6 bg-[#0055ff] border-4 border-[#1a1a1a] text-white font-black text-lg uppercase tracking-wider hover:bg-[#1a1a1a] hover:text-[#0055ff] transition-all shadow-[6px_6px_0px_0px_rgba(26,26,26,0.3)] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,0.3)] hover:translate-x-1 hover:translate-y-1 flex items-center justify-center gap-3 group"
        >
          Ingresar con Google
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="text-[10px] font-bold uppercase tracking-widest opacity-30 mt-8">Acceso restringido - Solo personal autorizado</p>
      </motion.div>
    </div>
  );
}
