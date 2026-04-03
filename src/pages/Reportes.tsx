import { FileText, Download, Calendar, Database, FileSpreadsheet, FileJson } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Reportes() {
  const [format, setFormat] = useState<'pdf' | 'excel' | 'json'>('pdf');
  const [dataSource, setDataSource] = useState('todas');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('fecha_desc');
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchData = async () => {
    const data: Record<string, any[]> = {};
    
    const fetchCollection = async (colName: string) => {
      const q = query(collection(db, colName));
      const snapshot = await getDocs(q);
      let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Basic client-side date filtering if dates are selected
      if (dateFrom || dateTo) {
        docs = docs.filter((doc: any) => {
          const docDate = doc.createdAt ? new Date(doc.createdAt) : (doc.fecha ? new Date(doc.fecha) : null);
          if (!docDate) return true; // Keep if no date
          
          if (dateFrom && new Date(dateFrom + 'T00:00:00') > docDate) return false;
          if (dateTo && new Date(dateTo + 'T23:59:59') < docDate) return false;
          return true;
        });
      }

      // Sort
      if (sortBy === 'fecha_desc') {
        docs.sort((a: any, b: any) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : (a.fecha ? new Date(a.fecha).getTime() : 0);
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : (b.fecha ? new Date(b.fecha).getTime() : 0);
          return dateB - dateA;
        });
      } else if (sortBy === 'fecha_asc') {
        docs.sort((a: any, b: any) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : (a.fecha ? new Date(a.fecha).getTime() : 0);
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : (b.fecha ? new Date(b.fecha).getTime() : 0);
          return dateA - dateB;
        });
      } else if (sortBy === 'prioridad') {
        const priorityOrder: Record<string, number> = { 'alta': 1, 'media': 2, 'baja': 3 };
        docs.sort((a: any, b: any) => {
          const pA = priorityOrder[a.priority?.toLowerCase()] || 4;
          const pB = priorityOrder[b.priority?.toLowerCase()] || 4;
          return pA - pB;
        });
      }

      return docs;
    };

    if (dataSource === 'todas' || dataSource === 'visitas') data.visitas = await fetchCollection('visitas');
    if (dataSource === 'todas' || dataSource === 'tareas') data.tareas = await fetchCollection('tasks');
    if (dataSource === 'todas' || dataSource === 'personal') data.personal = await fetchCollection('personal');
    if (dataSource === 'todas' || dataSource === 'novedades') data.novedades = await fetchCollection('novedades');

    return data;
  };

  const generatePDF = (data: Record<string, any[]>) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Modern Header
    doc.setFillColor(0, 85, 255); // #0055ff
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('REPORTE DEL SISTEMA', 14, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(230, 240, 255);
    doc.text(`FECHA DE GENERACIÓN: ${new Date().toLocaleDateString()}`, 14, 32);

    let currentY = 50;

    const addTable = (title: string, columns: string[], rows: any[][]) => {
      if (rows.length === 0) return;
      
      doc.setTextColor(0, 85, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(title.toUpperCase(), 14, currentY);
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        head: [columns],
        body: rows,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 9,
          textColor: [40, 40, 40],
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          cellPadding: 5,
        },
        headStyles: {
          fillColor: [0, 85, 255], // #0055ff
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          lineWidth: 0.1,
          lineColor: [0, 85, 255],
        },
        alternateRowStyles: {
          fillColor: [245, 248, 255],
        },
        margin: { top: 10 },
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 15;
    };

    if (data.visitas) {
      const rows = data.visitas.map(v => [
        (v.fecha || 'N/A').toString().toUpperCase(), 
        (v.origen || 'N/A').toString().toUpperCase(), 
        (v.destino || 'N/A').toString().toUpperCase(), 
        (v.responsable || 'N/A').toString().toUpperCase()
      ]);
      addTable('VISITAS TÉCNICAS', ['FECHA', 'ORIGEN', 'DESTINO', 'RESPONSABLE'], rows);
    }

    if (data.tareas) {
      const rows = data.tareas.map(t => [
        (t.title || 'N/A').toString().toUpperCase(), 
        (t.priority || 'N/A').toString().toUpperCase(), 
        (t.status || 'N/A').toString().toUpperCase(), 
        (t.dueDate || 'N/A').toString().toUpperCase()
      ]);
      addTable('TAREAS OPERATIVAS', ['TÍTULO', 'PRIORIDAD', 'ESTADO', 'VENCIMIENTO'], rows);
    }

    if (data.personal) {
      const rows = data.personal.map(p => [
        (p.name || 'N/A').toString().toUpperCase(), 
        (p.role || 'N/A').toString().toUpperCase(), 
        (p.status || 'N/A').toString().toUpperCase()
      ]);
      addTable('PERSONAL ACTIVO', ['NOMBRE', 'ROL', 'ESTADO'], rows);
    }

    if (data.novedades) {
      const rows = data.novedades.map(n => [
        (n.createdAt ? new Date(n.createdAt).toLocaleDateString() : 'N/A').toUpperCase(),
        (n.title || 'N/A').toString().toUpperCase(),
        (n.authorName || 'N/A').toString().toUpperCase(),
        (n.content || 'N/A').toString().toUpperCase()
      ]);
      addTable('NOVEDADES', ['FECHA', 'TÍTULO', 'AUTOR', 'CONTENIDO'], rows);
    }

    doc.save(`Reporte_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const generateExcel = (data: Record<string, any[]>) => {
    const workbook = XLSX.utils.book_new();

    Object.keys(data).forEach(key => {
      if (data[key].length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(data[key]);
        XLSX.utils.book_append_sheet(workbook, worksheet, key.toUpperCase());
      }
    });

    if (workbook.SheetNames.length === 0) {
      const worksheet = XLSX.utils.json_to_sheet([{ message: 'Sin datos para los filtros seleccionados' }]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'REPORTE');
    }

    XLSX.writeFile(workbook, `Reporte_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const generateJSON = (data: Record<string, any[]>) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    toast.loading('Generando reporte...', { id: 'report-gen' });
    
    try {
      const data = await fetchData();
      
      let hasData = false;
      Object.values(data).forEach(arr => {
        if (arr.length > 0) hasData = true;
      });

      if (!hasData) {
        toast.error('No hay datos para los filtros seleccionados', { id: 'report-gen' });
        setIsGenerating(false);
        return;
      }

      if (format === 'pdf') {
        generatePDF(data);
      } else if (format === 'excel') {
        generateExcel(data);
      } else if (format === 'json') {
        generateJSON(data);
      }

      toast.success(`Reporte generado con éxito en formato ${format.toUpperCase()}`, { id: 'report-gen' });
    } catch (error) {
      console.error(error);
      toast.error('Error al generar el reporte', { id: 'report-gen' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadRecent = (id: number) => {
    toast.success(`Descargando Reporte Mensual ${id}...`);
  };

  return (
    <div className="font-['Inter'] max-w-4xl mx-auto">
      <h1 className="text-5xl font-black uppercase mb-8 font-['Space_Grotesk'] tracking-tighter">Generación de Reportes</h1>
      
      <div className="bg-white border-4 border-[#1a1a1a] p-8 shadow-[12px_12px_0px_0px_rgba(26,26,26,1)] mb-12">
        <h2 className="text-2xl font-black uppercase mb-6 font-['Space_Grotesk'] border-b-4 border-[#1a1a1a] pb-2 inline-block">Configuración</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-black uppercase tracking-widest mb-2 flex items-center gap-2">
              <Database className="w-4 h-4" /> Fuente de Datos
            </label>
            <select 
              value={dataSource}
              onChange={(e) => setDataSource(e.target.value)}
              className="w-full p-4 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors cursor-pointer"
            >
              <option value="todas">Todas las fuentes</option>
              <option value="visitas">Visitas Técnicas</option>
              <option value="tareas">Tareas Operativas</option>
              <option value="personal">Personal Activo</option>
              <option value="novedades">Novedades</option>
            </select>
          </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Desde
                </label>
                <input 
                  type="date" 
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full p-4 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors" 
                />
              </div>
              <div>
                <label className="block text-sm font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Hasta
                </label>
                <input 
                  type="date" 
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full p-4 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                Ordenar por
              </label>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full p-4 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors cursor-pointer"
              >
                <option value="fecha_desc">Fecha (Más reciente primero)</option>
                <option value="fecha_asc">Fecha (Más antiguo primero)</option>
                <option value="prioridad">Prioridad (Alta a Baja)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-black uppercase tracking-widest mb-2">Formato de Exportación</label>
              <div className="flex gap-4">
                <button 
                  onClick={() => setFormat('pdf')}
                  className={`flex-1 py-4 border-4 border-[#1a1a1a] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 hover:translate-x-1 hover:translate-y-1 hover:shadow-none ${format === 'pdf' ? 'bg-[#1a1a1a] text-[#0055ff] shadow-none translate-x-1 translate-y-1' : 'bg-[#0055ff] text-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:bg-[#1a1a1a] hover:text-[#0055ff]'}`}
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
              disabled={isGenerating}
              className="w-full py-4 border-4 border-[#1a1a1a] bg-[#1a1a1a] text-white font-black uppercase tracking-widest hover:bg-white hover:text-[#1a1a1a] transition-colors flex items-center justify-center gap-2 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-6 h-6" /> {isGenerating ? 'Generando...' : 'Generar Reporte'}
            </button>
          </div>
        </div>
    </div>
  );
}
