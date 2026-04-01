import { FileText, Download, Calendar, Database, FileSpreadsheet, FileJson } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function Reportes() {
  const [format, setFormat] = useState<'pdf' | 'excel' | 'json'>('pdf');

  const handleGenerateReport = () => {
    toast.loading('Generando reporte...', { id: 'report-gen' });
    setTimeout(() => {
      toast.success(`Reporte generado con éxito en formato ${format.toUpperCase()}`, { id: 'report-gen' });
    }, 1500);
  };

  const handleDownloadRecent = (id: number) => {
    toast.success(`Descargando Reporte Mensual ${id}...`);
  };

  return (
    <div className="font-['Inter'] max-w-6xl mx-auto">
      <h1 className="text-5xl font-black uppercase mb-8 font-['Space_Grotesk'] tracking-tighter">Generación de Reportes</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Report Configuration */}
        <div className="bg-white border-4 border-[#1a1a1a] p-8 shadow-[12px_12px_0px_0px_rgba(26,26,26,1)]">
          <h2 className="text-2xl font-black uppercase mb-6 font-['Space_Grotesk'] border-b-4 border-[#1a1a1a] pb-2 inline-block">Configuración</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                <Database className="w-4 h-4" /> Fuente de Datos
              </label>
              <select className="w-full p-4 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors cursor-pointer">
                <option>Todas las fuentes</option>
                <option>Visitas Técnicas</option>
                <option>Tareas Operativas</option>
                <option>Personal Activo</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Desde
                </label>
                <input type="date" className="w-full p-4 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Hasta
                </label>
                <input type="date" className="w-full p-4 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-black uppercase tracking-widest mb-2">Formato de Exportación</label>
              <div className="flex gap-4">
                <button 
                  onClick={() => setFormat('pdf')}
                  className={`flex-1 py-4 border-4 border-[#1a1a1a] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 hover:translate-x-1 hover:translate-y-1 hover:shadow-none ${format === 'pdf' ? 'bg-[#1a1a1a] text-[#ffcc00] shadow-none translate-x-1 translate-y-1' : 'bg-[#ffcc00] text-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:bg-[#1a1a1a] hover:text-[#ffcc00]'}`}
                >
                  <FileText className="w-5 h-5" /> PDF
                </button>
                <button 
                  onClick={() => setFormat('excel')}
                  className={`flex-1 py-4 border-4 border-[#1a1a1a] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 hover:translate-x-1 hover:translate-y-1 hover:shadow-none ${format === 'excel' ? 'bg-[#1a1a1a] text-[#00cc66] shadow-none translate-x-1 translate-y-1' : 'bg-[#00cc66] text-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:bg-[#1a1a1a] hover:text-[#00cc66]'}`}
                >
                  <FileSpreadsheet className="w-5 h-5" /> Excel
                </button>
                <button 
                  onClick={() => setFormat('json')}
                  className={`flex-1 py-4 border-4 border-[#1a1a1a] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 hover:translate-x-1 hover:translate-y-1 hover:shadow-none ${format === 'json' ? 'bg-[#1a1a1a] text-[#0055ff] shadow-none translate-x-1 translate-y-1' : 'bg-[#0055ff] text-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:bg-[#1a1a1a] hover:text-[#0055ff]'}`}
                >
                  <FileJson className="w-5 h-5" /> JSON
                </button>
              </div>
            </div>

            <button 
              onClick={handleGenerateReport}
              className="w-full py-4 border-4 border-[#1a1a1a] bg-[#1a1a1a] text-white font-black uppercase tracking-widest hover:bg-white hover:text-[#1a1a1a] transition-colors flex items-center justify-center gap-2 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none mt-8"
            >
              <Download className="w-6 h-6" /> Generar Reporte
            </button>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="bg-white border-4 border-[#1a1a1a] p-8 shadow-[12px_12px_0px_0px_rgba(26,26,26,1)]">
          <h2 className="text-2xl font-black uppercase mb-6 font-['Space_Grotesk'] border-b-4 border-[#1a1a1a] pb-2 inline-block">Reportes Recientes</h2>
          
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border-2 border-[#1a1a1a] hover:bg-[#f5f0e8] transition-colors group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="p-2 border-2 border-[#1a1a1a] bg-white group-hover:bg-[#ffcc00] transition-colors">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-tight">Reporte Mensual {i}</h3>
                    <p className="text-xs font-bold opacity-60 uppercase tracking-widest mt-1">Generado: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDownloadRecent(i)}
                  className="p-2 border-2 border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white transition-colors"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
