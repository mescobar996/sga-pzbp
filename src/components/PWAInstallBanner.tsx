import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function PWAInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser mini-infobar from showing
      e.preventDefault();
      // Save event for later trigger
      setInstallPrompt(e);
      // Show custom banner
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Hide if already installed
    window.addEventListener('appinstalled', () => {
      setInstallPrompt(null);
      setShowBanner(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    // Show install prompt
    installPrompt.prompt();
    
    // Wait for response
    const { outcome } = await installPrompt.userChoice;
    console.log(`PWA install choice outcome: ${outcome}`);
    
    // Reset prompt
    setInstallPrompt(null);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-[#ffff00] text-black border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3 font-['Space_Grotesk'] animate-bounce-subtle">
      <div className="flex justify-between items-start">
        <h4 className="font-black uppercase tracking-tight text-sm">Instalar Aplicación</h4>
        <button 
          onClick={() => setShowBanner(false)} 
          className="p-0.5 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-xs font-bold uppercase opacity-85 leading-snug">
        Instalá SGA PZBP-MS en tu dispositivo para ingresar rápido sin usar el navegador y habilitar todas las funciones sin conexión.
      </p>
      <button
        onClick={handleInstallClick}
        className="w-full py-2.5 bg-[#0055ff] text-white border-2 border-black font-black uppercase text-xs tracking-wider hover:bg-black hover:text-white transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
      >
        <Download className="w-4 h-4" /> Instalar Aplicación
      </button>
    </div>
  );
}
