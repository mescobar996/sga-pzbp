import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/');
    } catch (error) {
      console.error('Error logging in', error);
      toast.error('Error al iniciar sesión con Google.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f0e8] font-['Space_Grotesk'] text-[#1a1a1a]">
      <div className="bg-white p-12 border-4 border-[#1a1a1a] shadow-[12px_12px_0px_0px_rgba(26,26,26,1)] max-w-md w-full text-center">
        <h1 className="text-4xl font-black uppercase mb-2 tracking-tighter">SGA PZBP - MS</h1>
        <h2 className="text-xl font-bold uppercase mb-8 opacity-70">Prefectura Naval Argentina</h2>
        
        <button
          onClick={handleLogin}
          className="w-full py-4 px-6 bg-[#ffcc00] border-4 border-[#1a1a1a] text-[#1a1a1a] font-black text-xl uppercase tracking-wider hover:bg-[#1a1a1a] hover:text-[#ffcc00] transition-all shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1"
        >
          Ingresar con Google
        </button>
      </div>
    </div>
  );
}
